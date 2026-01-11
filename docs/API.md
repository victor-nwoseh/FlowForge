# FlowForge API Reference

Complete REST API documentation for FlowForge workflow automation platform.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3001/api` |
| Production | `https://api.flowforge.app/api` |

## Authentication

FlowForge uses JWT (JSON Web Token) for API authentication.

### Obtaining a Token

Tokens are obtained via the `/auth/login` or `/auth/register` endpoints.

### Using the Token

Include the token in the `Authorization` header for all protected endpoints:

```
Authorization: Bearer <your-jwt-token>
```

### Token Expiration

- Tokens expire after **7 days** by default (configurable via `JWT_EXPIRES_IN`)
- Expired tokens return `401 Unauthorized`
- Obtain a new token by logging in again

### Protected vs Public Endpoints

| Endpoint Type | Authentication Required |
|---------------|------------------------|
| Auth (register, login) | No |
| OAuth Callbacks | No |
| Webhooks | No |
| All other endpoints | Yes |

---

## Endpoints

### Authentication

#### Register User

Create a new user account.

```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400 Bad Request` - Invalid email format or password too short
- `409 Conflict` - Email already registered

---

#### Login User

Authenticate and receive a JWT token.

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials

---

#### Get Current User Profile

Get the authenticated user's profile.

```
GET /auth/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Workflows

#### List Workflows

Get all workflows for the authenticated user.

```
GET /workflows
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Filter by workflow name (optional) |

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Daily Report Workflow",
    "description": "Sends daily sales report to Slack",
    "userId": "507f1f77bcf86cd799439012",
    "isActive": true,
    "nodes": [...],
    "edges": [...],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z"
  }
]
```

---

#### Create Workflow

Create a new workflow.

```
POST /workflows
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "My Workflow",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "node-1",
      "type": "webhook",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Webhook Trigger" }
    },
    {
      "id": "node-2",
      "type": "slack",
      "position": { "x": 100, "y": 250 },
      "data": {
        "channel": "#general",
        "message": "Hello from FlowForge!"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "My Workflow",
  "description": "Workflow description",
  "userId": "507f1f77bcf86cd799439012",
  "isActive": true,
  "nodes": [...],
  "edges": [...],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

#### Get Workflow

Get a single workflow by ID.

```
GET /workflows/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "My Workflow",
  "description": "Workflow description",
  "userId": "507f1f77bcf86cd799439012",
  "isActive": true,
  "nodes": [...],
  "edges": [...],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Workflow not found or belongs to another user

---

#### Update Workflow

Update an existing workflow.

```
PUT /workflows/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (partial update allowed):**
```json
{
  "name": "Updated Workflow Name",
  "nodes": [...],
  "edges": [...]
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Updated Workflow Name",
  ...
}
```

---

#### Delete Workflow

Delete a workflow.

```
DELETE /workflows/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Workflow deleted successfully"
}
```

---

#### Execute Workflow

Manually trigger a workflow execution.

```
POST /workflows/:id/execute
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (optional):**
```json
{
  "triggerData": {
    "customField": "customValue"
  }
}
```

**Response (202 Accepted):**
```json
{
  "executionId": "507f1f77bcf86cd799439013",
  "message": "Workflow execution started"
}
```

---

#### Duplicate Workflow

Create a copy of an existing workflow.

```
POST /workflows/:id/duplicate
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "name": "My Workflow (Copy)",
  ...
}
```

---

### Executions

#### List Executions

Get execution history for the authenticated user.

```
GET /executions
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `workflowId` | string | Filter by workflow ID (optional) |
| `status` | string | Filter by status: pending, running, completed, failed (optional) |
| `limit` | number | Number of results (default: 20, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "workflowId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "status": "completed",
    "triggerSource": "manual",
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": "2024-01-15T10:30:05.000Z"
  }
]
```

---

#### Get Execution Details

Get detailed execution information including logs.

```
GET /executions/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "workflowId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "status": "completed",
  "triggerSource": "manual",
  "triggerData": {},
  "logs": [
    {
      "nodeId": "node-1",
      "nodeType": "webhook",
      "status": "success",
      "message": "Webhook trigger processed",
      "output": { "received": true },
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "nodeId": "node-2",
      "nodeType": "slack",
      "status": "success",
      "message": "Message sent to #general",
      "output": { "ts": "1234567890.123456" },
      "timestamp": "2024-01-15T10:30:02.000Z"
    }
  ],
  "startedAt": "2024-01-15T10:30:00.000Z",
  "completedAt": "2024-01-15T10:30:05.000Z"
}
```

---

### OAuth Connections

#### Initiate Slack OAuth

Redirect user to Slack authorization page.

```
GET /auth/slack
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- `302 Redirect` to Slack OAuth authorization URL

---

#### Slack OAuth Callback

Handle Slack OAuth callback (called by Slack).

```
GET /auth/slack/callback
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from Slack |
| `state` | string | State parameter for CSRF protection |

**Response:**
- `302 Redirect` to frontend `/integrations?slack=success` or `?slack=error`

---

#### Initiate Google OAuth

Redirect user to Google authorization page.

```
GET /auth/google
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- `302 Redirect` to Google OAuth authorization URL

---

#### Google OAuth Callback

Handle Google OAuth callback (called by Google).

```
GET /auth/google/callback
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from Google |
| `state` | string | State parameter for CSRF protection |

**Response:**
- `302 Redirect` to frontend `/integrations?google=success` or `?google=error`

---

#### List Connections

Get all OAuth connections for the authenticated user.

```
GET /connections
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "userId": "507f1f77bcf86cd799439012",
    "service": "slack",
    "metadata": {
      "teamName": "My Workspace",
      "teamId": "T12345678"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439016",
    "userId": "507f1f77bcf86cd799439012",
    "service": "google",
    "metadata": {
      "email": "user@gmail.com"
    },
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
]
```

> **Note:** Access tokens and refresh tokens are never returned in API responses.

---

#### Disconnect Service

Remove an OAuth connection.

```
DELETE /connections/:service
```

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `service` | string | Service name: `slack` or `google` |

**Response (200 OK):**
```json
{
  "message": "Slack connection removed successfully"
}
```

---

### Schedules

#### List Schedules

Get all schedules for the authenticated user.

```
GET /schedules
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439017",
    "workflowId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "cronExpression": "0 9 * * 1-5",
    "isActive": true,
    "lastRunAt": "2024-01-15T09:00:00.000Z",
    "nextRunAt": "2024-01-16T09:00:00.000Z",
    "createdAt": "2024-01-10T10:30:00.000Z"
  }
]
```

---

#### Create Schedule

Create a scheduled trigger for a workflow.

```
POST /schedules
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "workflowId": "507f1f77bcf86cd799439011",
  "cronExpression": "0 9 * * 1-5"
}
```

**Common Cron Expressions:**
| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Every day at 9:00 AM |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 */2 * * *` | Every 2 hours |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | First day of each month |

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439017",
  "workflowId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "cronExpression": "0 9 * * 1-5",
  "isActive": true,
  "repeatableJobId": "bull:workflow-execution:507f1f77bcf86cd799439011:::0 9 * * 1-5",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

#### Toggle Schedule

Enable or disable a schedule.

```
PATCH /schedules/:id/toggle
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "isActive": false
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439017",
  "isActive": false,
  ...
}
```

---

#### Delete Schedule

Remove a scheduled trigger.

```
DELETE /schedules/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Schedule deleted successfully"
}
```

---

### Templates

#### List Templates

Get available workflow templates.

```
GET /templates
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category (optional) |

**Categories:** `notifications`, `data-sync`, `monitoring`, `marketing`

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439018",
    "name": "Slack Notification on Webhook",
    "description": "Send a Slack message when a webhook is received",
    "category": "notifications",
    "difficulty": "beginner",
    "tags": ["slack", "webhook", "notifications"],
    "usageCount": 150,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### Get Template

Get a single template with full workflow definition.

```
GET /templates/:id
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439018",
  "name": "Slack Notification on Webhook",
  "description": "Send a Slack message when a webhook is received",
  "category": "notifications",
  "difficulty": "beginner",
  "tags": ["slack", "webhook", "notifications"],
  "workflow": {
    "nodes": [...],
    "edges": [...]
  },
  "usageCount": 150,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Webhooks

#### Trigger Workflow via Webhook

Trigger a workflow execution via external webhook.

```
POST /webhooks/:workflowId
```

**No authentication required** - Webhooks are public endpoints.

**Request Body:** Any JSON payload

```json
{
  "event": "order.created",
  "data": {
    "orderId": "12345",
    "customer": "John Doe",
    "total": 99.99
  }
}
```

**Response (202 Accepted):**
```json
{
  "executionId": "507f1f77bcf86cd799439019",
  "message": "Workflow triggered successfully"
}
```

**Errors:**
- `404 Not Found` - Workflow not found
- `400 Bad Request` - Workflow is not active

---

## WebSocket Events

FlowForge uses Socket.io for real-time execution updates.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to FlowForge');
});
```

### Events

#### execution:started

Emitted when a workflow execution begins.

```javascript
socket.on('execution:started', (data) => {
  console.log(data);
  // {
  //   executionId: "507f1f77bcf86cd799439019",
  //   workflowId: "507f1f77bcf86cd799439011",
  //   timestamp: "2024-01-15T10:30:00.000Z"
  // }
});
```

#### execution:node-completed

Emitted when a node finishes execution.

```javascript
socket.on('execution:node-completed', (data) => {
  console.log(data);
  // {
  //   executionId: "507f1f77bcf86cd799439019",
  //   nodeId: "node-2",
  //   nodeType: "slack",
  //   status: "success",
  //   timestamp: "2024-01-15T10:30:02.000Z"
  // }
});
```

#### execution:progress

Emitted periodically with overall progress.

```javascript
socket.on('execution:progress', (data) => {
  console.log(data);
  // {
  //   executionId: "507f1f77bcf86cd799439019",
  //   completed: 3,
  //   total: 5,
  //   percentage: 60
  // }
});
```

#### execution:completed

Emitted when the entire workflow finishes.

```javascript
socket.on('execution:completed', (data) => {
  console.log(data);
  // {
  //   executionId: "507f1f77bcf86cd799439019",
  //   status: "completed", // or "failed"
  //   timestamp: "2024-01-15T10:30:05.000Z"
  // }
});
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `400` | Bad Request | Invalid request body, missing required fields |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist or belongs to another user |
| `409` | Conflict | Duplicate resource (e.g., email already registered) |
| `422` | Unprocessable Entity | Validation error |
| `500` | Internal Server Error | Server-side error |

### Validation Errors

Validation errors include details about which fields failed:

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 6 characters"
  ],
  "error": "Bad Request"
}
```

---

## Rate Limiting

Currently, FlowForge does not implement rate limiting. For production deployments, consider adding:

- **API Rate Limits**: 100 requests per minute per user
- **Webhook Rate Limits**: 60 requests per minute per workflow
- **Execution Limits**: 100 executions per hour per user

---

## Examples

### cURL Examples

#### Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

#### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

#### Create a Workflow

```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Hello World Workflow",
    "description": "A simple test workflow",
    "nodes": [
      {
        "id": "trigger-1",
        "type": "webhook",
        "position": {"x": 100, "y": 100},
        "data": {"label": "Webhook Trigger"}
      },
      {
        "id": "http-1",
        "type": "http",
        "position": {"x": 100, "y": 250},
        "data": {
          "method": "POST",
          "url": "https://httpbin.org/post",
          "body": "{\"message\": \"Hello from FlowForge!\"}"
        }
      }
    ],
    "edges": [
      {"id": "e1", "source": "trigger-1", "target": "http-1"}
    ]
  }'
```

#### Execute a Workflow

```bash
curl -X POST http://localhost:3001/api/workflows/WORKFLOW_ID/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"triggerData": {"test": true}}'
```

#### List Executions

```bash
curl http://localhost:3001/api/executions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Trigger via Webhook

```bash
curl -X POST http://localhost:3001/api/webhooks/WORKFLOW_ID \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {"key": "value"}}'
```

#### Create a Schedule

```bash
curl -X POST http://localhost:3001/api/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "workflowId": "WORKFLOW_ID",
    "cronExpression": "0 9 * * *"
  }'
```

#### Connect Slack (in browser)

Navigate to:
```
http://localhost:3001/api/auth/slack
```

> **Note:** OAuth flows must be initiated from a browser due to redirects.

---

## Node Configuration Reference

### Webhook Node

```json
{
  "type": "webhook",
  "data": {
    "label": "Webhook Trigger"
  }
}
```

### HTTP Request Node

```json
{
  "type": "http",
  "data": {
    "method": "POST",
    "url": "https://api.example.com/endpoint",
    "headers": {
      "Content-Type": "application/json",
      "X-API-Key": "{{variables.apiKey}}"
    },
    "body": "{\"data\": \"{{trigger.payload}}\"}"
  }
}
```

### Condition Node

```json
{
  "type": "condition",
  "data": {
    "leftOperand": "{{trigger.status}}",
    "operator": "==",
    "rightOperand": "success"
  }
}
```

Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`

### Loop Node

```json
{
  "type": "loop",
  "data": {
    "array": "{{trigger.items}}",
    "itemVariable": "item"
  }
}
```

Access in downstream nodes: `{{loop.item}}`, `{{loop.index}}`, `{{loop.count}}`

### Variable Node

```json
{
  "type": "variable",
  "data": {
    "variableName": "processedCount",
    "value": "{{loop.index + 1}}"
  }
}
```

### Delay Node

```json
{
  "type": "delay",
  "data": {
    "duration": 5000
  }
}
```

Duration in milliseconds.

### Slack Node

```json
{
  "type": "slack",
  "data": {
    "channel": "#general",
    "message": "New order received: {{trigger.orderId}}"
  }
}
```

Requires Slack OAuth connection.

### Email Node

```json
{
  "type": "email",
  "data": {
    "to": "recipient@example.com",
    "subject": "Order Confirmation",
    "body": "Your order {{trigger.orderId}} has been confirmed."
  }
}
```

Requires Google OAuth connection.

### Google Sheets Node

```json
{
  "type": "sheets",
  "data": {
    "action": "append",
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "range": "Sheet1!A:C",
    "values": [
      ["{{trigger.name}}", "{{trigger.email}}", "{{trigger.date}}"]
    ]
  }
}
```

Actions: `read`, `append`
