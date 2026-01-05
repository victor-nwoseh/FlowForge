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

**Tech Stack:**
- React 18 + TypeScript + Vite
- React Flow (reactflow) for workflow canvas visualization
- Zustand for global state (auth, workflow builder stores)
- TanStack Query for server state and caching
- Socket.io-client for real-time updates
- Tailwind CSS + GSAP + Motion for styling and animations
- react-hot-toast for notifications

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
The system supports `{{path}}` syntax throughout node configurations. Variables are resolved from:
- `{{variables.name}}` or `{{variable.name}}`: User-defined variables
- `{{trigger.field}}`: Trigger payload data (e.g., webhook body)
- `{{nodeId.field}}`: Output from previous nodes by node ID
- `{{loop.item}}`: Current iteration item
- `{{loop.index}}`: Current iteration index (0-based)
- `{{loop.count}}`: Total items in loop array
- `{{loop.customVar}}`: Custom loop variable name if defined

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

## Key File Paths

**Backend Core:**
- `backend/src/workflows/services/workflow-executor.service.ts`: Main execution engine
- `backend/src/workflows/services/node-handler-registry.service.ts`: Handler registration
- `backend/src/workflows/handlers/`: Node type implementations
- `backend/src/workflows/utils/variable-replacement.util.ts`: Variable resolution logic
- `backend/src/executions/gateways/execution.gateway.ts`: WebSocket gateway

**Frontend Core:**
- `frontend/src/pages/WorkflowBuilder.tsx`: Visual workflow editor
- `frontend/src/store/workflow.store.ts`: Workflow state management
- `frontend/src/store/auth.store.ts`: Auth state with localStorage persistence
- `frontend/src/hooks/useExecutionSocket.ts`: Real-time execution updates
- `frontend/src/types/workflow.types.ts`: Workflow type definitions

---

## Session Continuity (Updated: January 2025)

This section enables seamless resumption of development work across sessions.

### Project Status Summary

**Completed (Weeks 1-5):**
- ✅ Full NestJS backend with 7 modules (Auth, Users, Workflows, Executions, Connections, Schedules, Templates)
- ✅ React/Vite frontend with 11 pages and comprehensive component library
- ✅ JWT authentication with per-user OAuth (Slack, Google) - encrypted token storage
- ✅ React Flow visual workflow builder with 10+ node types
- ✅ Bull queue execution engine with topological sort and retry logic
- ✅ 9 node handlers: HTTP, Delay, Condition, Variable, Slack, Email, Sheets, Webhook, Loop
- ✅ Variable replacement system (`{{variable.name}}`, `{{loop.item}}`, `{{trigger.field}}`, etc.)
- ✅ Conditional branching with dual outputs (true/false branches)
- ✅ Loop nodes for array iteration with custom variables
- ✅ Scheduled triggers via Bull repeatable jobs with cron expressions
- ✅ Real-time WebSocket updates via Socket.io ExecutionGateway
- ✅ Template library with 7 pre-built workflows
- ✅ Multi-tenant isolation (User A's workflows use User A's OAuth tokens)
- ✅ Docker Compose setup for MongoDB + Redis

**Current Gaps:**
- ❌ **Zero test coverage** - No unit, integration, or E2E tests exist
- ❌ **Minimal documentation** - Basic README only, no API docs or user guides
- ❌ **Not deployed** - Runs only on localhost, no CI/CD pipeline

### Week 6 Scope: Production Readiness

**Goal:** Transform FlowForge into a production-ready, portfolio-worthy platform.

**Phase 1 - Testing:**
| Priority | Area | Description |
|----------|------|-------------|
| High | Backend Unit Tests | Services, handlers, utilities (Jest + NestJS testing) |
| High | Backend Integration Tests | API endpoints, database operations |
| Medium | Frontend Unit Tests | Components, hooks, stores (Vitest + React Testing Library) |
| Medium | E2E Tests | Critical user flows (Playwright or Cypress) |

**Phase 2 - Documentation:**
| Priority | Area | Description |
|----------|------|-------------|
| High | README Overhaul | Comprehensive setup, features, screenshots |
| High | API Documentation | OpenAPI/Swagger for all endpoints |
| Medium | Architecture Diagrams | System design, data flow, sequence diagrams |
| Medium | User Guides | How to create workflows, connect integrations |

**Phase 3 - Deployment:**
| Priority | Area | Description |
|----------|------|-------------|
| High | Docker Production Builds | Multi-stage Dockerfiles, optimized images |
| High | Railway Deployment | Backend + Frontend + MongoDB + Redis |
| High | GitHub Actions CI/CD | Automated testing, building, deployment |
| Medium | Monitoring | Health checks, logging, error tracking |

### Current Session State

**Last Action:** Initial Week 6 planning discussion
**Next Action:** Awaiting Phase 1 (Testing) instructions from user

### Critical Files for Testing Phase

**Backend files requiring test coverage (priority order):**
1. `backend/src/workflows/services/workflow-executor.service.ts` - Core execution engine
2. `backend/src/workflows/handlers/*.handler.ts` - All 9 node handlers
3. `backend/src/workflows/utils/variable-replacement.util.ts` - Variable resolution
4. `backend/src/workflows/utils/topological-sort.util.ts` - Execution ordering
5. `backend/src/auth/auth.service.ts` - Authentication logic
6. `backend/src/connections/connections.service.ts` - OAuth token management
7. `backend/src/executions/executions.service.ts` - Execution tracking

**Frontend files requiring test coverage (priority order):**
1. `frontend/src/store/workflow.store.ts` - Workflow state management
2. `frontend/src/store/auth.store.ts` - Auth state
3. `frontend/src/hooks/useExecutionSocket.ts` - WebSocket hook
4. `frontend/src/pages/WorkflowBuilder.tsx` - Main workflow editor
5. `frontend/src/components/NodeConfigPanel.tsx` - Node configuration

### API Endpoints Reference

```
Auth:
  POST /api/auth/register     - User registration
  POST /api/auth/login        - User login
  GET  /api/auth/profile      - Get current user (protected)
  GET  /api/auth/slack/callback  - Slack OAuth callback
  GET  /api/auth/google/callback - Google OAuth callback

Workflows:
  POST   /api/workflows           - Create workflow
  GET    /api/workflows           - List user workflows
  GET    /api/workflows/:id       - Get workflow by ID
  PUT    /api/workflows/:id       - Update workflow
  DELETE /api/workflows/:id       - Delete workflow
  POST   /api/workflows/:id/execute - Trigger manual execution

Webhooks:
  POST /api/webhooks/:workflowId  - Webhook trigger endpoint

Executions:
  GET /api/executions        - List execution history
  GET /api/executions/:id    - Get execution details

Connections:
  GET    /api/connections     - List OAuth connections
  DELETE /api/connections/:id - Remove connection

Schedules:
  POST   /api/schedules       - Create schedule
  GET    /api/schedules       - List schedules
  PUT    /api/schedules/:id   - Update schedule
  DELETE /api/schedules/:id   - Delete schedule

Templates:
  GET /api/templates      - List templates
  GET /api/templates/:id  - Get template by ID
```

### MongoDB Collections Schema Summary

```
users: { email, password (bcrypt), createdAt }
workflows: { name, description, nodes[], edges[], userId, isActive, timestamps }
executions: { workflowId, userId, status, triggerData, triggerSource, logs[], error, timing }
connections: { userId, service, accessToken (AES), refreshToken (AES), metadata, timestamps }
schedules: { workflowId, userId, cronExpression, isActive, repeatableJobId, timing }
templates: { name, category, workflow, difficulty, tags, usageCount, timestamps }
```

### Node Types Implemented

| Type | Handler | Description |
|------|---------|-------------|
| `http` | HttpRequestHandler | HTTP GET/POST/PUT/DELETE requests |
| `delay` | DelayHandler | Pause execution (ms) |
| `condition` | ConditionHandler | If-else branching |
| `variable` | VariableHandler | Create/update variables |
| `slack` | SlackHandler | Send Slack messages (OAuth) |
| `email` | EmailHandler | Send emails (SMTP) |
| `sheets` | SheetsHandler | Google Sheets read/append |
| `webhook` | WebhookHandler | Webhook trigger node |
| `loop` | LoopHandler | Array iteration with branches |

### Resume Instructions

When resuming development:
1. Read this CLAUDE.md file for full context
2. Check "Current Session State" section above for last/next actions
3. User will provide phase-specific instructions (Testing → Documentation → Deployment)
4. Follow the priority order within each phase
5. Update "Current Session State" at end of each session
