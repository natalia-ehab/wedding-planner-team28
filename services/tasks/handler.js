const { authenticate, authorize } = require("./middleware/auth");
const repo = require("./taskrepo");

// Build monthly timeline and calculate progress
function buildTimeline(tasks, weddingDate) {
    const wedding = new Date(weddingDate);
    const months = {};

    let completedTasks = 0;

    for (const task of tasks) {
        const dueDate = new Date(task.task_due_date);

        const monthsRemaining =
            (wedding.getFullYear() - dueDate.getFullYear()) * 12 +
            (wedding.getMonth() - dueDate.getMonth());

        const monthKey = monthsRemaining < 0
            ? "Overdue"
            : `${monthsRemaining} months remaining`;

        if (!months[monthKey]) {
            months[monthKey] = {
                totalTasks: 0,
                completedTasks: 0,
                progress: 0,
                tasks: []
            };
        }

        months[monthKey].totalTasks++;

        if (task.task_status === "completed") {
            months[monthKey].completedTasks++;
            completedTasks++;
        }

        months[monthKey].tasks.push(task);
    }

    for (const month of Object.values(months)) {
        month.progress = Math.round(
            (month.completedTasks / month.totalTasks) * 100
        );
    }

    return {
        overall: {
            totalTasks: tasks.length,
            completedTasks,
            progress: tasks.length
                ? Math.round((completedTasks / tasks.length) * 100)
                : 0
        },
        months
    };
}

// Generate default wedding-planning checklist
async function generateChecklist(weddingId, weddingDate) {
    const existingTasks = await repo.getChecklistTasks(weddingId);

    const checklist = [
        {
            title: "Book Wedding Venue",
            monthsBefore: 12,
            category: "Venue"
        },
        {
            title: "Book Photographer",
            monthsBefore: 10,
            category: "Photography"
        },
        {
            title: "Choose Wedding Catering",
            monthsBefore: 8,
            category: "Catering"
        },
        {
            title: "Send Wedding Invitations",
            monthsBefore: 3,
            category: "Invitations"
        },
        {
            title: "Confirm Final Guest Count",
            monthsBefore: 1,
            category: "Guests"
        }
    ];

    const createdTasks = [];

    for (const item of checklist) {
        if (existingTasks.some(task => task.task_title === item.title)) {
            continue;
        }

        const dueDate = new Date(weddingDate);
        dueDate.setMonth(dueDate.getMonth() - item.monthsBefore);

        const task = await repo.createTask({
            wedding_id: weddingId,
            task_title: item.title,
            task_category: item.category,
            task_priority: "medium",
            task_due_date: dueDate.toISOString().split("T")[0],
            task_status: "not started",
            source: "default_checklist"
        });

        createdTasks.push(task);
    }

    return createdTasks;
}
// Check whether the authenticated user owns the wedding
async function checkWeddingOwnership(weddingId, userId) {
    const wedding = await repo.getWeddingOwner(weddingId);

    if (!wedding) {
        return {
            statusCode: 404,
            message: "Wedding not found"
        };
    }

    if (Number(wedding.owner_id) !== Number(userId)) {
        return {
            statusCode: 403,
            message: "You do not have access to this wedding"
        };
    }

    return null;
}

exports.handler = async (event) => {
    try {
        const method = event.httpMethod;
        const path = event.path || "";
        const taskId = event.pathParameters?.taskId;

        // Authenticate every incoming request
        const authResult = authenticate(event);

        if (authResult.error) {
            return response(authResult.error.statusCode, {
                message: authResult.error.message
            });
        }
        const user = authResult.user;

        // Authorize the user's role
const roleError = authorize(user, ["couple"]);

if (roleError) {
    return response(roleError.statusCode, {
        message: roleError.message
    });
}

        // POST /tasks/generate-checklist
if (method === "POST" && path.endsWith("/tasks/generate-checklist")) {
    const body = JSON.parse(event.body || "{}");
    const weddingId = body.wedding_id;

    if (!weddingId) {
        return response(400, { message: "wedding_id is required" });
    }
const ownershipError = await checkWeddingOwnership(
    weddingId,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}
    const wedding = await repo.getWeddingDate(weddingId);

    if (!wedding || !wedding.wedding_date) {
        return response(404, {
            message: "Wedding not found or wedding date is not set"
        });
    }

    const createdTasks = await generateChecklist(
        weddingId,
        wedding.wedding_date
    );

    return response(201, {
        message: "Checklist generated successfully",
        createdCount: createdTasks.length,
        tasks: createdTasks
    });
}
// POST /tasks/from-payment - Create task from payment
if (method === "POST" && path.endsWith("/tasks/from-payment")) {
    const body = JSON.parse(event.body || "{}");

    const {
        payment_id,
        wedding_id,
        payment_due_date,
        vendor_name
    } = body;

    if (!payment_id || !wedding_id || !payment_due_date) {
        return response(400, {
            message: "payment_id, wedding_id and payment_due_date are required"
        });
    }
const ownershipError = await checkWeddingOwnership(
    wedding_id,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}
    const existingTask = await repo.getPaymentTask(payment_id);

    if (existingTask) {
        return response(200, {
            message: "Payment task already exists",
            task: existingTask
        });
    }

    const wedding = await repo.getWeddingDate(wedding_id);

    if (!wedding || !wedding.wedding_date) {
        return response(404, {
            message: "Wedding not found or wedding date is not set"
        });
    }

    if (
        new Date(payment_due_date) > new Date(wedding.wedding_date)
    ) {
        return response(400, {
            message: "Payment due date cannot be after the wedding date"
        });
    }

    const task = await repo.createTask({
        wedding_id,
        task_title: `Payment Due - ${vendor_name || "Vendor"}`,
        task_description: `Payment reference: ${payment_id}`,
        task_category: "Payment",
        task_priority: "high",
        task_due_date: payment_due_date,
        task_status: "not started",
        source: `payment:${payment_id}`
    });

    return response(201, {
        message: "Payment task created successfully",
        task
    });
}

        // POST /tasks - Create a task
        if (method === "POST" && path.endsWith("/tasks")) {
            const task = JSON.parse(event.body || "{}");
const ownershipError = await checkWeddingOwnership(
    task.wedding_id,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}
            if (!task.wedding_id || !task.task_title || !task.task_due_date) {
                return response(400, {
                    message: "wedding_id, task_title and task_due_date are required"
                });
            }

           const wedding = await repo.getWeddingDate(task.wedding_id);

if (!wedding) {
    return response(404, { message: "Wedding not found" });
}

if (!wedding.wedding_date) {
    return response(400, { message: "Wedding date is not set" });
}

if (new Date(task.task_due_date) > new Date(wedding.wedding_date)) {
    return response(400, {
        message: "Task due date cannot be after the wedding date"
    });
}

task.task_status = "not started";
const result = await repo.createTask(task);
return response(201, result);
        }
        
// GET /tasks/overdue - Get overdue tasks
if (method === "GET" && path.endsWith("/tasks/overdue")) {
    const weddingId = event.queryStringParameters?.weddingId;

    if (!weddingId) {
        return response(400, { message: "weddingId is required" });
    }
const ownershipError = await checkWeddingOwnership(
    weddingId,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}
    const wedding = await repo.getWeddingDate(weddingId);

    if (!wedding) {
        return response(404, { message: "Wedding not found" });
    }

    const overdueTasks = await repo.getOverdueTasks(weddingId);

    return response(200, {
        count: overdueTasks.length,
        tasks: overdueTasks
    });
}

// GET /tasks/timeline - Monthly wedding timeline
if (method === "GET" && path.endsWith("/tasks/timeline")) {
    const weddingId = event.queryStringParameters?.weddingId;

    if (!weddingId) {
        return response(400, { message: "weddingId is required" });
    }
const ownershipError = await checkWeddingOwnership(
    weddingId,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}
    const wedding = await repo.getWeddingDate(weddingId);

    if (!wedding || !wedding.wedding_date) {
        return response(404, {
            message: "Wedding not found or wedding date is not set"
        });
    }

    const tasks = await repo.getTasksForTimeline(weddingId);
    const timeline = buildTimeline(tasks, wedding.wedding_date);

    return response(200, timeline);
}

        // GET /tasks - Get all tasks or search
if (method === "GET" && path.endsWith("/tasks")) {
    const weddingId = event.queryStringParameters?.weddingId;

    if (!weddingId) {
        return response(400, {
            message: "weddingId is required"
        });
    }

    const ownershipError = await checkWeddingOwnership(
        weddingId,
        user.user_id
    );

    if (ownershipError) {
        return response(ownershipError.statusCode, {
            message: ownershipError.message
        });
    }

    const searchTerm = event.queryStringParameters?.search;

    if (searchTerm) {
        const results = await repo.searchTasks(weddingId, searchTerm);
        return response(200, results);
    }

    const results = await repo.getAllTasks(weddingId);
    return response(200, results);
}

        // GET /tasks/{taskId}
        if (method === "GET" && taskId) {
            const result = await repo.getTaskById(taskId);

            if (!result) {
                return response(404, { message: "Task not found" });
            }
const ownershipError = await checkWeddingOwnership(
    result.wedding_id,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}
            return response(200, result);
        }

        
// PUT /tasks/{taskId}
if (method === "PUT" && taskId) {
    const task = JSON.parse(event.body || "{}");

    const existingTask = await repo.getTaskById(taskId);

    if (!existingTask) {
        return response(404, { message: "Task not found" });
    }
const ownershipError = await checkWeddingOwnership(
    existingTask.wedding_id,
    user.user_id
);

if (ownershipError) {
    return response(ownershipError.statusCode, {
        message: ownershipError.message
    });
}

    // Merge existing values with the requested changes
    const updatedTask = {
        ...existingTask,
        ...task
    };

    // Validate required fields after merging
    if (!updatedTask.task_title || !updatedTask.task_due_date) {
        return response(400, {
            message: "task_title and task_due_date are required"
        });
    }

    // Validate task status workflow
    const allowedTransitions = {
        "not started": "in progress",
        "in progress": "completed",
        "completed": null
    };

    if (
        task.task_status &&
        task.task_status !== existingTask.task_status &&
        allowedTransitions[existingTask.task_status] !== task.task_status
    ) {
        return response(409, {
            message: `Invalid status transition from ${existingTask.task_status} to ${task.task_status}`
        });
    }

    // Validate wedding date
    const wedding = await repo.getWeddingDate(existingTask.wedding_id);

    if (!wedding || !wedding.wedding_date) {
        return response(400, {
            message: "Wedding date is not available"
        });
    }

    if (new Date(updatedTask.task_due_date) > new Date(wedding.wedding_date)) {
        return response(400, {
            message: "Task due date cannot be after the wedding date"
        });
    }

    const result = await repo.updateTask(taskId, updatedTask);

    return response(200, result);
}


        // DELETE /tasks/{taskId}
if (method === "DELETE" && taskId) {
    const existingTask = await repo.getTaskById(taskId);

    if (!existingTask) {
        return response(404, {
            message: "Task not found"
        });
    }

    const ownershipError = await checkWeddingOwnership(
        existingTask.wedding_id,
        user.user_id
    );

    if (ownershipError) {
        return response(ownershipError.statusCode, {
            message: ownershipError.message
        });
    }

    await repo.deleteTask(taskId);

    return response(200, {
        message: "Task deleted successfully"
    });
}
        return response(404, {
            message: "Route not found"
        });

    } catch (error) {
        console.error(error);

        return response(500, {
            message: "Internal server error"
        });
    }
};

// Scheduled overdue-task checker
exports.checkOverdueTasks = async () => {
    try {
        const overdueTasks = await repo.getAllOverdueTasks();

        console.log(
            `Overdue check completed. Found ${overdueTasks.length} overdue tasks.`
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                count: overdueTasks.length,
                tasks: overdueTasks
            })
        };
    } catch (error) {
        console.error("Overdue check failed:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Overdue check failed"
            })
        };
    }
};

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
}
