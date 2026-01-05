# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
```bash
# Install all dependencies (both frontend and backend)
npm run install:all

# Start Docker services (MongoDB + Redis)
npm run docker:up
# OR
docker-compose up -d

# Copy environment template
cp backend/.env.example backend/.env
# Then configure required environment variables
```

### Running the Application
```bash
# Start backend development server (runs on port 3001)
npm run dev:backend
# OR from backend directory
cd backend && npm run start:dev

# Start frontend development server (runs on port 5173)
npm run dev:frontend
# OR from frontend directory
cd frontend && npm run dev
```

### Building
```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build
```

### Testing
```bash
# Run backend tests
cd backend && npm test
```

### Docker
```bash
# Stop Docker services
npm run docker:down
# OR
docker-compose down
```

## Architecture Overview

FlowForge is a workflow automation platform with a **monorepo structure** containing separate frontend and backend applications.

### Backend Architecture (NestJS)

**Core Workflow Execution System:**
- **Workflow Executor** (workflows/services/workflow-executor.service.ts): Main execution engine that processes workflows by traversing nodes in topological order
- **Node Handler Registry** (workflows/services/node-handler-registry.service.ts): Central registry that maps node types to their handler implementations
- **Node Handlers** (workflows/handlers/): Individual handlers for each node type (http, delay, condition, variable, slack, email, sheets, webhook, loop)
- **Workflow Processor** (workflows/processors/workflow-execution.processor.ts): Bull queue processor for asynchronous workflow execution

**Node Handler Pattern:**
All node handlers implement the `INodeHandler` interface:
```typescript
interface INodeHandler {
  execute(nodeData: any, context: ExecutionContext): Promise<NodeHandlerResponse>;
}
```

**Execution Flow:**
1. Workflow triggered (manual/webhook/scheduled)
2. Execution record created in database
3. Job added to Bull queue (workflow-execution)
4. Processor executes workflow via WorkflowExecutorService
5. Nodes executed in topological order with variable replacement
6. Execution logs and results stored in MongoDB
7. Real-time updates sent via WebSocket (ExecutionGateway)

**Key Modules:**
- **UsersModule**: User authentication and management
- **AuthModule**: JWT-based authentication with Passport
- **WorkflowsModule**: Workflow CRUD, execution, and node handlers
- **ExecutionsModule**: Execution tracking, logging, and WebSocket gateway
- **ConnectionsModule**: OAuth connections to Slack/Google (encrypted token storage)
- **SchedulesModule**: Cron-based workflow scheduling
- **TemplatesModule**: Pre-built workflow templates with seeding

**Queue System:**
- Bull queue backed by Redis for async workflow execution
- Retry logic: 3 attempts with exponential backoff (1s delay)
- Jobs auto-removed on completion, preserved on failure

### Frontend Architecture (React + Vite)

**State Management:**
- Zustand for global state (auth, workflow builder)
- TanStack Query for server state and caching

**Key Pages:**
- **WorkflowBuilder**: React Flow-based visual workflow editor with canvas and toolbar
- **WorkflowsList**: Grid view of all workflows
- **ExecutionDetails**: Real-time execution monitoring with logs
- **Integrations**: OAuth connection management

**Real-time Updates:**
- Socket.io client connects to backend ExecutionGateway
- Live execution progress, node completion, and status updates

**API Communication:**
- Axios with proxy configuration (Vite proxy at /api → localhost:3001)
- Base API service in services/api.ts

### Database & Services

**MongoDB Collections:**
- `users`: User accounts with hashed passwords (bcrypt)
- `workflows`: Workflow definitions (nodes + edges)
- `executions`: Execution history with logs and status
- `connections`: Encrypted OAuth tokens (AES encryption via crypto-js)
- `schedules`: Cron schedules linked to workflows
- `templates`: Seeded workflow templates

**Redis:**
- Bull queue storage
- Job state and retry management

## Environment Configuration

Required environment variables in `backend/.env`:

**Core:**
- `MONGODB_URI`: MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `JWT_SECRET`, `JWT_EXPIRES_IN`: Authentication
- `ENCRYPTION_KEY`: 32-char hex key for OAuth token encryption (generate with `openssl rand -hex 16`)

**External Services:**
- `SLACK_WEBHOOK_URL`: Incoming webhook for Slack notifications
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email sending
- `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`: Service account for Sheets API
- `WEBHOOK_BASE_URL`: Public URL for webhook triggers (use ngrok for local dev)

**OAuth (Multi-User):**
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `FRONTEND_URL`: Frontend base URL for OAuth redirects

See README.md for detailed OAuth setup instructions.

## Adding New Node Types

1. Create handler in `backend/src/workflows/handlers/` implementing `INodeHandler`
2. Register handler in `NodeHandlerRegistryService` constructor
3. Add node type to frontend workflow builder palette
4. Update frontend node rendering logic in WorkflowBuilder.tsx

## Code Patterns

**Variable Replacement:**
The system supports `{{variable}}` syntax throughout node configurations. Variables are resolved from:
- `context.variables`: User-defined variables
- `context.trigger`: Trigger payload data
- `context[nodeId]`: Output from previous nodes
- `context.loop`: Loop iteration data (currentItem, currentIndex)

**Error Handling:**
- Nodes can set `continueOnError: true` to proceed on failure
- Sensitive data (passwords, tokens, keys) is redacted in logs
- Failed executions store detailed error context

**WebSocket Events:**
- `execution:started`
- `execution:progress` (completed/total nodes)
- `execution:node-completed`
- `execution:completed` (success/failed)

## Important Notes

- Backend runs on port 3001, frontend on 5173
- All API routes prefixed with `/api`
- CORS enabled for `http://localhost:5173`
- Passwords hashed with bcrypt
- OAuth tokens encrypted with AES-256
- Bull queue jobs have 3 retry attempts with exponential backoff
- Topological sort ensures correct node execution order
- Loop nodes support nested iterations and branch conditions

---

## Session Context

> **Purpose:** This section maintains continuity between development sessions. Update this at the end of each session.
