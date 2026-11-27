\# Vendor and Budget Management – Testing Documentation



\## 1. Testing Overview



The Vendor and Budget Management Service was tested locally and through the Floci cloud environment. Testing covered database operations, business rules, authentication, authorization, service integration and automated payment reminders.



\## 2. Functional Testing



| Test Case | Expected Result | Status |

|---|---|---|

| Add vendor | Vendor saved successfully | Passed |

| Edit vendor | Vendor details updated | Passed |

| Delete vendor | Unlinked vendor removed | Passed |

| Search by service type | Matching vendors displayed | Passed – Local |

| Set wedding budget | Budget saved successfully | Passed |

| Budget calculation | Correct committed and remaining amounts | Passed |

| Budget warning | Warning displayed at 80% usage | Passed – Local |

| Exceed wedding budget | Operation rejected | Passed |

| Schedule payment | Payment saved in Neon | Passed |

| Exceed vendor contract | Payment rejected | Passed |

| Mark payment as paid | Status updated to Paid | Passed |

| Vendor confirms payment | Status updated to Confirmed | Passed – Local |

| Overdue payment detection | Status updated automatically | Passed |



\## 3. Security Testing



| Test Case | Expected Result | Status |

|---|---|---|

| Valid login | JWT generated | Passed |

| Missing JWT | HTTP 401 | Passed |

| Invalid JWT | HTTP 401 | Passed |

| Unauthorized role | HTTP 403 | Passed |

| Unauthorized wedding access | HTTP 403 | Passed |

| Cross-wedding resource access | HTTP 404 | Passed |

| Couple attempts payment confirmation | Request rejected | Passed |

| Vendor accesses another vendor's payment | HTTP 404 | Passed |



\## 4. Integration Testing



| Integration | Actual Result | Status |

|---|---|---|

| Neon PostgreSQL | Persistent database operations | Passed |

| Guest Service | Two confirmed guests retrieved | Passed |

| Task Service | Payment 12 generated Task 2 | Passed – Local |

| Task synchronization retry | Existing task returned without duplication | Passed – Local |

| Resend Email API | One successful email request | Passed |

| Reminder timestamp | Timestamp recorded in Neon | Passed |



\## 5. Cloud Testing



| Component | Actual Result | Status |

|---|---|---|

| AWS Lambda | Authentication and Vendor services executed | Passed |

| API Gateway | Authenticated API requests successful | Passed |

| Amazon S3 | Frontend uploaded and displayed | Passed |

| IAM | Lambda execution role configured | Configured |

| EventBridge | Daily rule and Lambda target configured | Configured |

| Reminder Lambda | One overdue payment processed | Passed |



\## 6. Testing Evidence



\- Total budget: 160,000 EGP.

\- Committed amount: 50,000 EGP.

\- Paid amount: 25,000 EGP.

\- Remaining amount: 110,000 EGP.

\- Budget usage: 31.25%.

\- Confirmed guests: 2.

\- Payment and task integration reference: payment:12.

\- Reminder test: one payment updated, one email request successful and zero email failures.



\## 7. Remaining Verification



Final verification includes deployed vendor operations, cloud task creation and failure recovery, duplicate email prevention and confirmation of email delivery. The Guest and Task services currently use local integration endpoints and must be connected to the team's final deployed endpoints.



\## 8. Final Cloud Testing Results



\- Vendor search: Passed.

\- Cloud payment scheduling: Passed.

\- Automatic task creation: Passed.

\- Task synchronization retry: Passed.

\- Couple payment status update: Passed.

\- Vendor payment confirmation: Passed.

\- Vendor guest count retrieval: Passed.

\- Resend email delivery: Passed.

\- Gmail inbox receipt: Verified.

\- Payment and task integration reference: payment:14.



Remaining verification:

\- Task Service failure recovery.

\- Duplicate email prevention.

\- Final integration with team-deployed endpoints.

