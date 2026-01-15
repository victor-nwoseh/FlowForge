# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Start Docker services (MongoDB + Redis)
docker-compose up -d

# Start backend (port 3001)
npm run dev:backend

# Start frontend (port 5173)
npm run dev:frontend

# Run backend unit tests (72 tests)
cd backend && npm test

# Run e2e tests (52 tests, requires Docker services)
cd backend && npm run test:e2e

# Run a single test file
cd backend && npx jest src/workflows/handlers/condition.handler.spec.ts

# Build for production
cd backend && npm run build
cd frontend && npm run build
```

## Architecture Overview

FlowForge is a workflow automation platform (monorepo with backend/ and frontend/).

### Backend (NestJS)

**Modules:** Auth, Users, Workflows, Executions, Connections, Schedules, Templates

**Workflow Execution Flow:**
1. User triggers execution → job added to Bull queue (Redis-backed)
2. `WorkflowExecutorService` loads workflow and sorts nodes topologically
3. Nodes execute in order via handlers from `NodeHandlerRegistryService`
4. Real-time updates emitted via WebSocket (`ExecutionGateway`)
5. Results stored in MongoDB

**Node Handler Pattern:**
```typescript
interface INodeHandler {
  execute(nodeData: any, context: ExecutionContext): Promise<NodeHandlerResponse>;
}
```
Handlers: `http`, `delay`, `condition`, `variable`, `slack`, `email`, `sheets`, `webhook`, `loop`

**Variable Replacement System:**
- `{{variables.name}}` - User-defined variables
- `{{trigger.field}}` - Webhook/trigger payload
- `{{nodeId.field}}` - Output from previous node
- `{{loop.item}}`, `{{loop.index}}`, `{{loop.count}}` - Loop context

### Frontend (React + Vite)

- **React Flow** for visual workflow canvas
- **Zustand** for state (`auth.store.ts`, `workflow.store.ts`)
- **TanStack Query** for API state
- **Socket.io-client** for real-time updates
- API proxy: `/api` → `localhost:3001`

## Key Files

**Backend execution engine:**
- `backend/src/workflows/services/workflow-executor.service.ts` - Main executor
- `backend/src/workflows/services/node-handler-registry.service.ts` - Handler registry
- `backend/src/workflows/handlers/` - Node type implementations
- `backend/src/workflows/utils/variable-replacement.util.ts` - Variable resolution
- `backend/src/executions/gateways/execution.gateway.ts` - WebSocket gateway

**Frontend:**
- `frontend/src/pages/WorkflowBuilder.tsx` - Visual editor
- `frontend/src/hooks/useExecutionSocket.ts` - Real-time updates

## Adding New Node Types

1. Create handler in `backend/src/workflows/handlers/` implementing `INodeHandler`
2. Register in `NodeHandlerRegistryService` constructor
3. Add node to frontend palette in `WorkflowBuilder.tsx`

## Testing Notes

- Jest configured with `maxWorkers: 1` and 4GB heap to prevent memory issues
- Unit tests: `backend/src/**/*.spec.ts`
- E2E tests: `backend/test/*.e2e-spec.ts`
- ERROR logs during tests are expected (verifying error handling)

## Environment Variables

Required in `backend/.env`:
- `MONGODB_URI`, `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`, `ENCRYPTION_KEY` (32-char hex for OAuth token encryption)
- `FRONTEND_URL` (for CORS and OAuth redirects)

OAuth (optional):
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
