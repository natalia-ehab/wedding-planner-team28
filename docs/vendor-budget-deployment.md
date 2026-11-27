\# Vendor and Budget Management – Cloud Deployment



\## 1. Technology Stack



| Layer | Technology |

|---|---|

| Presentation | HTML, CSS and JavaScript |

| Application | Node.js and Express.js |

| Database | Neon PostgreSQL |

| Cloud Environment | Floci AWS Emulator |

| Authentication | JWT and bcrypt |

| External API | Resend Email API |

| Version Control | Git and GitHub |



\## 2. Cloud Architecture



The frontend is hosted using Amazon S3 and communicates with backend services through API Gateway. AWS Lambda executes the authentication and business logic, while Neon PostgreSQL provides persistent data storage.



Amazon EventBridge schedules the payment reminder Lambda to identify overdue payments and request reminder emails through the Resend API.



\## 3. AWS Services



| AWS Service | Purpose |

|---|---|

| AWS Lambda | Backend service execution |

| Amazon API Gateway | REST API routing |

| Amazon S3 | Frontend hosting |

| AWS IAM | Cloud service permissions |

| Amazon EventBridge | Scheduled payment reminder processing |



\## 4. Deployment Resources



| Resource | Name |

|---|---|

| Authentication Lambda | wedding-planner-auth |

| Vendor and Budget Lambda | vendor-budget-service |

| Payment Reminder Lambda | vendor-payment-reminder |

| REST API | wedding-planner-vendor-budget-api |

| S3 Bucket | wedding-planner-vendor-budget |

| IAM Role | vendor-budget-role |

| EventBridge Rule | vendor-payment-daily-check |

| Schedule | rate(1 day) |

| Lambda Runtime | Node.js 22.x |



\## 5. Deployment Process



1\. Start Docker Desktop and the Floci environment.

2\. Configure the AWS CLI profile.

3\. Configure the Neon database connection.

4\. Create the required IAM role and permissions.

5\. Package the backend services and their dependencies.

6\. Deploy the Lambda functions.

7\. Configure API Gateway routes and integrations.

8\. Configure the EventBridge schedule.

9\. Update the frontend API endpoints.

10\. Upload frontend files to Amazon S3.

11\. Verify authentication, API responses and database connectivity.



\## 6. Environment Configuration



The application uses environment variables for database credentials, JWT configuration, external API credentials and service integration endpoints. Sensitive configuration files are excluded from GitHub and deployment archives.



\## 7. Local Cloud Endpoints



Frontend:



http://localhost:4566/wedding-planner-vendor-budget/index.html



Vendor and Budget API:



http://localhost:4566/restapis/8d702ed4f6/dev/\_user\_request\_/api



Authentication API:



http://localhost:4566/restapis/8d702ed4f6/dev/\_user\_request\_/auth



\## 8. Version Control



\- Repository: wedding-planner-team28

\- Developer branch: radwa

\- Implementation commit: 6ccebb4



\## 9. Deployment Limitations



The current deployment operates within the local Floci environment rather than public AWS infrastructure. Guest and Task integration temporarily uses host-based endpoints until the team completes its shared deployment.



Reminder emails currently use a test recipient. Production email delivery requires appropriate sender configuration.



The shared authentication configuration and database schema must be coordinated with the other team members before the final merge.

