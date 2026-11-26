# API Contract: Vendor and Budget Service

## 1. Data Dictionary

### 1.1 Vendor Resource

| Field | Type | Source | Rule |
|---|---|---|---|
| vendor_id | integer | Server | Unique and immutable. |
| wedding_id | integer | Server / authorised context | Must reference an existing wedding. |
| vendor_name | string | Client | Required; maximum 150 characters. |
| service_type | string enum | Client | Venue, Catering, Photography, Decoration, Music or Other. |
| vendor_email | string | Client | Required; valid email; maximum 255 characters. |
| vendor_phone_number | string | Client | Optional; maximum 20 characters. |
| contract_total | number | Client | Required; greater than zero; must not exceed the available wedding budget or be less than existing scheduled payments. |

A complete vendor returned by the API has this shape:

```json
{
  "vendor_id": 1,
  "wedding_id": 1,
  "vendor_name": "Dream Photography",
  "service_type": "Photography",
  "vendor_email": "dream@example.com",
  "vendor_phone_number": "01012345678",
  "contract_total": 15000
}
```

### 1.2 Budget Resource

| Field | Type | Source | Rule |
|---|---|---|---|
| budget_id | integer | Server | Unique and immutable. |
| wedding_id | integer | Server / authorised context | Must reference an existing wedding; one budget per wedding. |
| total_amount | number | Client | Required; greater than zero; cannot be less than committed contracts. |

A complete budget returned by the API has this shape:

```json
{
  "budget_id": 1,
  "wedding_id": 1,
  "total_amount": 100000
}
```

### 1.3 Payment Resource

| Field | Type | Source | Rule |
|---|---|---|---|
| payment_id | integer | Server | Unique and immutable. |
| vendor_id | integer | Client | Must reference an existing vendor belonging to the authorised wedding. |
| payment_amount | number | Client | Required; greater than zero; total scheduled payments must not exceed the vendor contract amount. |
| payment_due_date | string (YYYY-MM-DD) | Client | Required; valid calendar date. |
| payment_status | string enum | Server / controlled update | Pending, Paid, Confirmed or Overdue. New payments start as Pending or Overdue if the due date has passed. |

A complete payment returned by the API has this shape:

```json
{
  "payment_id": 1,
  "vendor_id": 1,
  "payment_amount": 5000,
  "payment_due_date": "2027-11-01",
  "payment_status": "Pending"
}
```

### 1.4 Budget Summary

The following fields are calculated by the server
and are not directly editable by the client.

| Field | Type | Source | Rule |
|---|---|---|---|
| total_amount | number | Server | Total wedding budget. |
| committed_amount | number | Server | Sum of vendor contract amounts. |
| paid_amount | number | Server | Sum of Paid and Confirmed payments. |
| remaining_amount | number | Server | Total budget minus committed amount. |
| usage_percentage | number | Server | Committed amount divided by total budget multiplied by 100; zero if no budget is set. |
| budget_warning | boolean | Server | True when budget usage reaches or exceeds 80%. |

Example budget summary:

```json
{
  "total_amount": 100000,
  "committed_amount": 15000,
  "paid_amount": 5000,
  "remaining_amount": 85000,
  "usage_percentage": 15,
  "budget_warning": false
}
```
## 2. REST API Endpoints

The Vendor and Budget Service exposes REST API endpoints
for vendor management, budget management and payment
scheduling and tracking.

### 2.1 Vendor Management Endpoints

| Method | Endpoint | Description | Success Status |
|---|---|---|---|
| GET | /api/vendors | Retrieve all vendors. | 200 OK |
| GET | /api/vendors?service_type=Photography | Search vendors by service type. | 200 OK |
| GET | /api/vendors/:id | Retrieve a specific vendor. | 200 OK |
| POST | /api/vendors | Create a new vendor. | 201 Created |
| PUT | /api/vendors/:id | Update vendor details. | 200 OK |
| DELETE | /api/vendors/:id | Delete a vendor without linked payments. | 204 No Content |

### 2.2 Budget Management Endpoints

| Method | Endpoint | Description | Success Status |
|---|---|---|---|
| GET | /api/budget | Retrieve the wedding budget. | 200 OK |
| PUT | /api/budget | Set or update the wedding budget. | 200 OK |
| GET | /api/budget/summary | Retrieve calculated budget statistics and warnings. | 200 OK |

### 2.3 Payment Management Endpoints

| Method | Endpoint | Description | Success Status |
|---|---|---|---|
| GET | /api/payments | Retrieve all scheduled payments. | 200 OK |
| GET | /api/payments/:id | Retrieve a specific payment. | 200 OK |
| POST | /api/payments | Schedule a new vendor payment. | 201 Created |
| PATCH | /api/payments/:id/status | Update the payment status. | 200 OK |

All endpoints operate within the authorised wedding
context. The server is responsible for validating
incoming requests and enforcing business rules.


## 3. Request and Response JSON Contracts

All requests containing a body use the application/json
content type.

### 3.1 Create Vendor

POST /api/vendors

Request body:

```json
{
  "vendor_name": "Dream Photography",
  "service_type": "Photography",
  "vendor_email": "dream@example.com",
  "vendor_phone_number": "01012345678",
  "contract_total": 15000
}
```

Response: 201 Created

```json
{
  "vendor_id": 1,
  "wedding_id": 1,
  "vendor_name": "Dream Photography",
  "service_type": "Photography",
  "vendor_email": "dream@example.com",
  "vendor_phone_number": "01012345678",
  "contract_total": 15000
}
```

### 3.2 Update Vendor

PUT /api/vendors/1

Request body:

```json
{
  "vendor_name": "Dream Photography",
  "service_type": "Photography",
  "vendor_email": "dream@example.com",
  "vendor_phone_number": "01012345678",
  "contract_total": 20000
}
```

Response: 200 OK

```json
{
  "vendor_id": 1,
  "wedding_id": 1,
  "vendor_name": "Dream Photography",
  "service_type": "Photography",
  "vendor_email": "dream@example.com",
  "vendor_phone_number": "01012345678",
  "contract_total": 20000
}
```

### 3.3 Delete Vendor

DELETE /api/vendors/1

Response: 204 No Content

No response body is returned after successful deletion.
A vendor with linked payments cannot be deleted.

### 3.4 Set or Update Budget

PUT /api/budget

Request body:

```json
{
  "total_amount": 100000
}
```

Response: 200 OK

```json
{
  "budget_id": 1,
  "wedding_id": 1,
  "total_amount": 100000
}
```

### 3.5 Schedule Payment

POST /api/payments

Request body:

```json
{
  "vendor_id": 1,
  "payment_amount": 5000,
  "payment_due_date": "2027-11-01"
}
```

Response: 201 Created

```json
{
  "payment_id": 1,
  "vendor_id": 1,
  "payment_amount": 5000,
  "payment_due_date": "2027-11-01",
  "payment_status": "Pending"
}
```

### 3.6 Update Payment Status

PATCH /api/payments/1/status

Request body:

```json
{
  "payment_status": "Paid"
}
```

Response: 200 OK

```json
{
  "payment_id": 1,
  "vendor_id": 1,
  "payment_amount": 5000,
  "payment_due_date": "2027-11-01",
  "payment_status": "Paid"
}
```

The authorised vendor can subsequently confirm the payment.

### 3.7 Retrieve Resources

GET /api/vendors and GET /api/payments return JSON arrays.

GET /api/vendors/:id, GET /api/payments/:id and
GET /api/budget return individual resource objects.

GET /api/budget/summary returns the calculated budget
summary object defined in Section 1.4.

All successful GET requests return 200 OK.


## 4. Error Responses and HTTP Status Codes

The API returns consistent HTTP status codes and JSON
error responses when a request fails.

### 4.1 HTTP Status Codes

| Status Code | Meaning | Example |
|---|---|---|
| 200 OK | Successful retrieval or update. | Updating a vendor. |
| 201 Created | Resource successfully created. | Scheduling a payment. |
| 204 No Content | Resource successfully deleted. | Deleting a vendor. |
| 400 Bad Request | Invalid or missing input. | Negative payment amount. |
| 401 Unauthorized | Authentication is missing or invalid. | Request without a valid token. |
| 403 Forbidden | User lacks the required permission. | A couple attempting to confirm a vendor payment. |
| 404 Not Found | Resource does not exist or is outside the authorised wedding context. | Vendor ID not found. |
| 409 Conflict | Request violates a business rule. | Contract exceeds the available budget. |
| 500 Internal Server Error | Unexpected server failure. | Data storage failure. |

### 4.2 Error Response Format

All API error responses use the following JSON structure:

```json
{
  "error": "Error message describing the problem."
}
```

### 4.3 Validation Error

Status: 400 Bad Request

```json
{
  "error": "Please enter valid vendor details."
}
```

### 4.4 Resource Not Found

Status: 404 Not Found

```json
{
  "error": "Vendor not found."
}
```

### 4.5 Business Rule Conflicts

Status: 409 Conflict

Examples:

```json
{
  "error": "Please set the wedding budget first."
}
```

```json
{
  "error": "Contract total exceeds the remaining budget."
}
```

```json
{
  "error": "Total payments cannot exceed the vendor contract amount."
}
```

```json
{
  "error": "Cannot delete a vendor with linked payments."
}
```

```json
{
  "error": "Contract total cannot be less than scheduled payments."
}
```

```json
{
  "error": "Budget cannot be less than committed contracts."
}
```

```json
{
  "error": "Invalid payment status transition."
}
```

### 4.6 Internal Server Error

Status: 500 Internal Server Error

```json
{
  "error": "An unexpected server error occurred."
}
```

Internal implementation details, database credentials
and stack traces must not be exposed to the client.


## 5. Payment Status Transitions

The Vendor and Budget Service controls payment status
transitions to ensure consistency and prevent invalid
payment updates.

### 5.1 Payment Status Definitions

| Status | Description |
|---|---|
| Pending | A scheduled payment that has not yet been paid and is not overdue. |
| Overdue | An unpaid payment whose due date has passed. |
| Paid | A payment marked as paid by the authorised couple. |
| Confirmed | A payment confirmed as received by the authorised vendor. |

### 5.2 Allowed Status Transitions

| Current Status | New Status | Responsible Actor |
|---|---|---|
| Pending | Overdue | Automated system |
| Pending | Paid | Authorised couple |
| Overdue | Paid | Authorised couple |
| Paid | Confirmed | Authorised vendor |

### 5.3 Invalid Status Transitions

The following status transitions are not permitted:

- Pending to Confirmed.
- Overdue to Confirmed.
- Paid to Pending.
- Paid to Overdue.
- Confirmed to any other status.

Invalid status transitions return 409 Conflict.

Unauthorised status updates return 403 Forbidden.

### 5.4 Automatic Overdue Detection

The system automatically checks pending payments
against their due dates.

If the current date is later than the payment due
date, the payment status changes to Overdue.

Paid and Confirmed payments are not affected by
the overdue detection process.

### 5.5 Budget Impact

- Pending and Overdue payments are not included
  in the paid amount.
- Paid and Confirmed payments are included
  in the paid amount.
- Confirming a payment does not increase the paid
  amount again.
- Payment status changes do not affect the
  committed contract amount.
- Remaining budget is calculated as the total
  budget minus the committed contract amount.

### 5.6 Final Payment Status

Confirmed is the final payment status.
No further status transitions are permitted.


## 6. API Test Cases

The following test cases define the expected behaviour
of the Vendor and Budget Service REST API.

### 6.1 Vendor Management Tests

| Test ID | Test Scenario | Expected Result |
|---|---|---|
| V01 | Create a vendor with valid details. | 201 Created |
| V02 | Create a vendor with missing required fields. | 400 Bad Request |
| V03 | Retrieve all vendors. | 200 OK |
| V04 | Search vendors by service type. | 200 OK with matching vendors |
| V05 | Update an existing vendor. | 200 OK |
| V06 | Retrieve a non-existing vendor. | 404 Not Found |
| V07 | Delete a vendor without linked payments. | 204 No Content |
| V08 | Delete a vendor with linked payments. | 409 Conflict |
| V09 | Create a vendor before setting the budget. | 409 Conflict |
| V10 | Create a vendor whose contract exceeds the remaining budget. | 409 Conflict |
| V11 | Reduce a vendor contract below scheduled payments. | 409 Conflict |

### 6.2 Budget Management Tests

| Test ID | Test Scenario | Expected Result |
|---|---|---|
| B01 | Set a valid wedding budget. | 200 OK |
| B02 | Set a negative or zero budget. | 400 Bad Request |
| B03 | Retrieve the budget summary. | 200 OK with correct calculations |
| B04 | Reduce the budget below committed contracts. | 409 Conflict |
| B05 | Budget usage reaches exactly 80%. | Budget warning is true |
| B06 | Budget usage is below 80%. | Budget warning is false |
| B07 | Budget usage exceeds 80% without exceeding the total budget. | Budget warning is true |

### 6.3 Payment Management Tests

| Test ID | Test Scenario | Expected Result |
|---|---|---|
| P01 | Schedule a valid payment. | 201 Created |
| P02 | Schedule a payment with a negative amount. | 400 Bad Request |
| P03 | Schedule a payment for a non-existing vendor. | 404 Not Found |
| P04 | Schedule payments exceeding the vendor contract amount. | 409 Conflict |
| P05 | Schedule a payment with an invalid date. | 400 Bad Request |
| P06 | Schedule a payment with a past due date. | 201 Created with Overdue status |
| P07 | Mark a pending payment as paid. | 200 OK |
| P08 | Mark an overdue payment as paid. | 200 OK |
| P09 | Confirm a paid payment as the authorised vendor. | 200 OK |
| P10 | Change a pending payment directly to confirmed. | 409 Conflict |
| P11 | Change a confirmed payment to another status. | 409 Conflict |
| P12 | Confirm a paid payment and retrieve the budget summary. | Paid amount remains unchanged |
| P13 | Run overdue detection on an unpaid payment whose due date has passed. | Status changes to Overdue |

### 6.4 Security and Authorisation Tests

| Test ID | Test Scenario | Expected Result |
|---|---|---|
| S01 | Access a protected endpoint without authentication. | 401 Unauthorized |
| S02 | A couple attempts to confirm a vendor payment. | 403 Forbidden |
| S03 | Access a vendor belonging to another wedding. | 404 Not Found |
| S04 | A vendor attempts to update the wedding budget. | 403 Forbidden |
| S05 | Submit a client-generated vendor ID or wedding ID when creating a vendor. | 400 Bad Request |

### 6.5 Test Execution

The API test cases will be executed after the backend
implementation using an HTTP API testing tool.

Each test will record:

- Test ID.
- Request method and endpoint.
- Request body, where applicable.
- Expected result.
- Actual result.
- Pass or Fail status.

The test cases are currently planned and have not yet
been executed against the REST API.
