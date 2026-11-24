# Task and Timeline Management Service Specification

**Service Owner:** Natalia Ehab

## 1. Service Overview

The Task and Timeline Management Service helps couples and wedding planners organize wedding preparation activities, monitor deadlines, and track task completion progress. It provides task management, monthly timeline organization, progress tracking, and automatic overdue detection.

## 2. Main Functionalities

### 2.1 Task Management
- Create tasks with a title, category, priority, and due date.
- View and search existing tasks.
- Edit task information.
- Delete tasks.
- Validate that task due dates do not exceed the wedding date.

### 2.2 Monthly Timeline
- Organize tasks into monthly groups based on the wedding date and task due dates.
- Display tasks according to the months remaining before the wedding.
- Calculate progress for each month.
- Display overall wedding preparation progress.

### 2.3 Task Status Management
- Support three statuses: Not Started, In Progress, and Completed.
- Allow only the following transitions:
  - Not Started → In Progress
  - In Progress → Completed
- Reject invalid status transitions with HTTP 409.

### 2.4 Automatic Overdue Detection
- Automatically identify tasks whose due dates have passed and whose status is not Completed.
- Use a scheduled job to check for overdue tasks.
- Display overdue tasks in the system.

### 2.5 Default Checklist Generator
- Generate a default wedding preparation checklist.
- Calculate task due dates relative to the wedding date.
- Create tasks automatically to help couples organize preparations.

## 3. Business Rules

1. Every task must belong to an existing wedding.
2. A task must have a valid title, category, priority, and due date.
3. A task's due date cannot be later than its wedding date.
4. New tasks must have the initial status Not Started.
5. Task statuses must follow the defined transition workflow.
6. Invalid status transitions must return HTTP 409 Conflict.
7. A task is considered overdue when its due date is earlier than the current date and its status is not Completed.
8. Only authorized users can access or modify tasks belonging to their wedding.
9. Monthly and overall progress must be calculated using task completion data.
10. Tasks generated from vendor payment due dates must be received through the agreed cross-service API integration.

## 4. Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/tasks | Create a task |
| GET | /api/tasks | Retrieve and filter tasks |
| PUT | /api/tasks/{id} | Update a task |
| DELETE | /api/tasks/{id} | Delete a task |
| PATCH | /api/tasks/{id}/status | Update task status |
| GET | /api/tasks/timeline | Retrieve monthly timeline |
| GET | /api/tasks/progress | Calculate task progress |
| GET | /api/tasks/overdue | Retrieve overdue tasks |

## 5. Access Control

- Couple: Can manage tasks belonging to their own wedding.
- Planner: Can manage tasks belonging to weddings assigned to them, subject to backend permissions.
- Unauthorized access must return HTTP 401 or 403 as appropriate.

## 6. Expected Outcome

The service should allow couples and planners to organize wedding tasks, monitor preparation progress, follow deadlines, and identify overdue activities through a set of validated REST API endpoints.