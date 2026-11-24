
const pool = require("./db");

// Get all tasks for a wedding
async function getAllTasks(weddingId) {
    const result = await pool.query(
        "SELECT * FROM task WHERE wedding_id = $1 ORDER BY task_due_date ASC",
        [weddingId]
    );
    return result.rows;
}

// Get one task by ID
async function getTaskById(taskId) {
    const result = await pool.query(
        "SELECT * FROM task WHERE task_id = $1",
        [taskId]
    );
    return result.rows[0];
}

// Create a task
async function createTask(task) {
    const {
        wedding_id,
        task_title,
        task_description,
        task_category,
        task_priority,
        task_due_date,
        task_status,
        task_assigned_to, 
        source
    } = task;

    const result = await pool.query(
        `INSERT INTO task (
            wedding_id, task_title, task_description,
            task_category, task_priority, task_due_date,
            task_status, task_assigned_to,source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            wedding_id, task_title, task_description,
            task_category, task_priority, task_due_date,
            task_status || "not started", task_assigned_to, source || "manual"
        ]
    );

    return result.rows[0];
}

// Update a task
async function updateTask(taskId, task) {
    const {
        task_title,
        task_description,
        task_category,
        task_priority,
        task_due_date,
        task_status,
        task_assigned_to
    } = task;

    const result = await pool.query(
        `UPDATE task SET
            task_title = $1,
            task_description = $2,
            task_category = $3,
            task_priority = $4,
            task_due_date = $5,
            task_status = $6,
            task_assigned_to = $7
        WHERE task_id = $8
        RETURNING *`,
        [
            task_title, task_description, task_category,
            task_priority, task_due_date, task_status,
            task_assigned_to, taskId
        ]
    );

    return result.rows[0];
}

// Delete a task
async function deleteTask(taskId) {
    const result = await pool.query(
        "DELETE FROM task WHERE task_id = $1 RETURNING *",
        [taskId]
    );

    return result.rows[0];
}


// Search tasks by title or description
async function searchTasks(weddingId, searchTerm) {
    const result = await pool.query(
        `SELECT * FROM task
         WHERE wedding_id = $1
         AND (
             task_title ILIKE $2
             OR task_description ILIKE $2
         )
         ORDER BY task_due_date ASC`,
        [weddingId, `%${searchTerm}%`]
    );

    return result.rows;
}


// Get wedding date for task due-date validation
async function getWeddingDate(weddingId) {
    const result = await pool.query(
        "SELECT wedding_date FROM wedding WHERE wedding_id = $1",
        [weddingId]
    );

    return result.rows[0];
}

// Get wedding owner for access control
async function getWeddingOwner(weddingId) {
    const result = await pool.query(
        "SELECT owner_id FROM wedding WHERE wedding_id = $1",
        [weddingId]
    );

    return result.rows[0];
}

// Get tasks and wedding date for the monthly timeline
async function getTasksForTimeline(weddingId) {
    const result = await pool.query(
        `SELECT task.*, wedding.wedding_date
         FROM task
         JOIN wedding ON task.wedding_id = wedding.wedding_id
         WHERE task.wedding_id = $1
         ORDER BY task.task_due_date ASC`,
        [weddingId]
    );

    return result.rows;
}

// Get existing tasks for checklist generation
async function getChecklistTasks(weddingId) {
    const result = await pool.query(
        `SELECT task_title
         FROM task
         WHERE wedding_id = $1
         AND source = 'default_checklist'`,
        [weddingId]
    );

    return result.rows;
}

// Get overdue tasks for a wedding
async function getOverdueTasks(weddingId) {
    const result = await pool.query(
        `SELECT *
         FROM task
         WHERE wedding_id = $1
         AND task_due_date < CURRENT_DATE
         AND task_status != 'completed'
         ORDER BY task_due_date ASC`,
        [weddingId]
    );

    return result.rows;
}

// Get all overdue tasks across all weddings
async function getAllOverdueTasks() {
    const result = await pool.query(
        `SELECT *
         FROM task
         WHERE task_due_date < CURRENT_DATE
         AND task_status != 'completed'
         ORDER BY task_due_date ASC`
    );

    return result.rows;
}

// Check whether a payment task already exists
async function getPaymentTask(paymentId) {
    const result = await pool.query(
        `SELECT *
         FROM task
         WHERE source = $1`,
        [`payment:${paymentId}`]
    );

    return result.rows[0];
}

module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    searchTasks,
    getWeddingDate,
    getTasksForTimeline,
    getChecklistTasks,
    getOverdueTasks,
    getAllOverdueTasks,
    getPaymentTask,
    getWeddingOwner
};
