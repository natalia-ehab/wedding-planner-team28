
# Lab 3 — Vendor and Budget Service Architecture

## 1. Application Goal

The Vendor and Budget Service helps couples manage wedding vendors, monitor their wedding budget, schedule payments and track payment statuses. The service prevents users from exceeding their wedding budget or scheduling payments that exceed vendor contract amounts.

The application follows a three-layer architecture:

- Presentation Layer: HTML, CSS and JavaScript.
- Application Layer: Node.js and Express REST API.
- Data Layer: Local JSON storage initially, followed by Neon PostgreSQL.

## 2. Functional Scope

### Vendor Management
- Add, view, update and delete vendors.
- Search vendors by service type.
- Manage vendor contract amounts.

### Budget Management
- Set and update the total wedding budget.
- Calculate committed, paid and remaining amounts.
- Calculate budget usage percentage.
- Display warnings when budget usage reaches 80%.
- Prevent vendor contracts from exceeding the total budget.

### Payment Scheduling and Tracking
- Schedule vendor payments.
- Track pending, paid, confirmed and overdue payments.
- Prevent scheduled payments from exceeding vendor contract amounts.
- Update payment statuses.

### Service Integration
- Retrieve confirmed guest counts from the Guest Service.
- Create payment-related tasks through the Task Service.
- Support automated payment reminders.

## 3. Request Flow

### Add Vendor

User → Frontend Form → POST /api/vendors → API Validation → Data Layer

The user enters vendor details. The frontend sends the data as JSON. The API validates the input and checks the available budget. If the request is valid, the vendor is stored and the API returns 201 Created with the vendor details.

### View Vendors

Frontend → GET /api/vendors → API → Data Layer

The API retrieves the stored vendors and returns 200 OK with a JSON array.

### Set Wedding Budget

Frontend → PUT /api/budget → API Validation → Data Layer

The API validates the budget amount and ensures that it is not lower than the existing committed contracts. The updated budget is returned to the frontend.

### Schedule Payment

Frontend → POST /api/payments → API Validation → Data Layer

The API checks that the vendor exists and that the total scheduled payments do not exceed the vendor contract amount. A valid payment is stored and returned with 201 Created.

### Update Payment Status

Frontend → PATCH /api/payments/:id/status → API Validation → Data Layer

The API validates the requested status transition, updates the payment and returns 200 OK.

### View Budget Summary

Frontend → GET /api/budget/summary → API → Data Layer

The API calculates the committed amount, paid amount, remaining budget and budget usage percentage.

## 4. Trust Boundaries

The browser is considered an untrusted environment. All incoming requests must be validated by the backend, even when frontend validation is already implemented.

The API is responsible for:

- Validating required fields and data types.
- Validating vendor details and payment amounts.
- Enforcing wedding budget limits.
- Enforcing vendor contract limits.
- Preventing deletion of vendors with linked payments.
- Validating payment status transitions.
- Checking authentication and user permissions.
- Returning consistent HTTP status codes and error messages.

The data layer is accessed through the backend service rather than directly from the browser.

Database credentials and sensitive configuration values must be stored in environment variables and must not be exposed to the frontend.

