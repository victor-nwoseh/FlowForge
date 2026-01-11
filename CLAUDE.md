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
# Run backend unit tests (configured with 4GB heap to prevent memory issues)
cd backend && npm test

# Run e2e integration tests (requires MongoDB + Redis running)
cd backend && npm run test:e2e

# Run tests in watch mode
cd backend && npm run test:watch

# Run tests with coverage
cd backend && npm run test:cov
```

**Note:** Jest is configured with `maxWorkers: 1` and 4GB heap allocation to prevent memory exhaustion on systems with limited RAM. See `backend/jest.config.js` and `backend/package.json` test script.

**Total Test Coverage:** 124 tests across 12 test suites (7 unit + 5 e2e)

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

**Backend Core (with JSDoc):**
- `backend/src/workflows/services/workflow-executor.service.ts`: Main execution engine *(JSDoc documented)*
- `backend/src/workflows/services/node-handler-registry.service.ts`: Handler registration
- `backend/src/workflows/handlers/`: Node type implementations
- `backend/src/workflows/utils/variable-replacement.util.ts`: Variable resolution logic
- `backend/src/executions/gateways/execution.gateway.ts`: WebSocket gateway
- `backend/src/connections/connections.service.ts`: OAuth token management *(JSDoc documented)*
- `backend/src/schedules/schedules.service.ts`: Cron scheduling *(JSDoc documented)*

**Frontend Core (with JSDoc):**
- `frontend/src/pages/WorkflowBuilder.tsx`: Visual workflow editor *(JSDoc documented)*
- `frontend/src/store/workflow.store.ts`: Workflow state management
- `frontend/src/store/auth.store.ts`: Auth state with localStorage persistence
- `frontend/src/hooks/useExecutionSocket.ts`: Real-time execution updates *(JSDoc documented)*
- `frontend/src/types/workflow.types.ts`: Workflow type definitions

**Documentation:**
- `README.md`: Comprehensive project documentation with features, setup, architecture
- `LICENSE`: MIT License (Victor Nwoseh, 2026)
- `CONTRIBUTING.md`: Contribution guidelines, code style, PR process
- `CHANGELOG.md`: Version history from v0.1.0 to v1.0.0
- `docs/ARCHITECTURE.md`: System architecture with 7 Mermaid diagrams
- `docs/API.md`: Complete API reference with examples
- `docs/USER_GUIDE.md`: End-user documentation for workflow creation
- `docs/DEPLOYMENT.md`: Railway/Render deployment guides with CI/CD

**Backend Unit Tests:**
- `backend/src/test/test-utils.ts`: Test utilities and mock factories
- `backend/src/workflows/services/workflow-executor.service.spec.ts`: Workflow execution tests
- `backend/src/connections/connections.service.spec.ts`: OAuth connection tests
- `backend/src/schedules/schedules.service.spec.ts`: Schedule management tests
- `backend/src/workflows/handlers/condition.handler.spec.ts`: Condition handler tests
- `backend/src/workflows/handlers/loop.handler.spec.ts`: Loop handler tests
- `backend/src/workflows/handlers/slack.handler.spec.ts`: Slack handler tests
- `backend/src/workflows/handlers/email.handler.spec.ts`: Email handler tests

**Backend E2E Tests:**
- `backend/test/test-helpers.ts`: E2E test utilities (user registration, workflow creation)
- `backend/test/workflows.e2e-spec.ts`: Workflows API endpoints tests
- `backend/test/oauth.e2e-spec.ts`: OAuth authorization and callback tests
- `backend/test/schedules.e2e-spec.ts`: Schedules API tests
- `backend/test/executions.e2e-spec.ts`: Executions API tests
- `backend/test/websocket.e2e-spec.ts`: WebSocket real-time event tests

---

## Session Continuity (Updated: January 2026)

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

**Week 6 Progress (Testing Phase - COMPLETE):**
- ✅ Jest testing framework installed and configured
- ✅ Test utilities and mock factories created
- ✅ 7 unit test suites created (72 tests total, all passing)
- ✅ 5 e2e integration test suites created (52 tests total, all passing)
- ✅ **Total: 124 tests across 12 test suites**

**Week 6 Progress (Documentation Phase - COMPLETE):**
- ✅ Comprehensive README.md with features, setup, architecture overview
- ✅ MIT LICENSE file
- ✅ docs/ARCHITECTURE.md with 7 Mermaid diagrams (system, auth, OAuth, execution, security, DB schema, deployment)
- ✅ docs/API.md with complete endpoint reference and examples
- ✅ docs/USER_GUIDE.md for end users
- ✅ docs/DEPLOYMENT.md with Railway/Render guides and GitHub Actions CI/CD
- ✅ CONTRIBUTING.md with code style, commit format, PR process
- ✅ CHANGELOG.md with full version history (v0.1.0 to v1.0.0)
- ✅ JSDoc comments added to 5 critical files

**Remaining:**
- ❌ Not deployed - Runs only on localhost, no CI/CD pipeline active

### Week 6 Scope: Production Readiness

**Goal:** Transform FlowForge into a production-ready, portfolio-worthy platform.

**Phase 1 - Testing (COMPLETE):**
| Step | Status | Description |
|------|--------|-------------|
| 1 | ✅ Complete | Install Jest and testing dependencies |
| 2 | ✅ Complete | Create test utilities and mock factories |
| 3 | ✅ Complete | Test WorkflowExecutorService (10 tests) |
| 4 | ✅ Complete | Test ConnectionsService (10 tests) |
| 5 | ✅ Complete | Test SchedulesService (9 tests) |
| 6 | ✅ Complete | Test Node Handlers - condition, loop, slack, email (43 tests) |
| 7 | ✅ Complete | E2E: Workflows API tests (9 tests) |
| 8 | ✅ Complete | E2E: OAuth authorization tests (6 tests) |
| 9 | ✅ Complete | E2E: Schedules API tests (10 tests) |
| 10 | ✅ Complete | E2E: Executions API tests (9 tests) |
| 11 | ✅ Complete | E2E: WebSocket real-time tests (18 tests) |
| 12 | ✅ Complete | Coverage reporting configured |

**Phase 2 - Documentation (COMPLETE):**
| Step | Status | Description |
|------|--------|-------------|
| 13 | ✅ Complete | README.md overhaul - comprehensive setup, features, architecture |
| 14 | ✅ Complete | docs/ARCHITECTURE.md - 7 Mermaid diagrams |
| 15 | ✅ Complete | docs/API.md - complete endpoint reference with examples |
| 16 | ✅ Complete | docs/USER_GUIDE.md - end-user workflow creation guide |
| 17 | ✅ Complete | docs/DEPLOYMENT.md - Railway/Render/GitHub Actions |
| 18 | ✅ Complete | Architecture diagrams (included in step 14) |
| 19 | ✅ Complete | JSDoc comments to 5 critical files |
| 20 | ✅ Complete | CONTRIBUTING.md - code style, PR process |
| 21 | ✅ Complete | LICENSE - MIT License |
| 22 | ✅ Complete | CHANGELOG.md - version history v0.1.0 to v1.0.0 |

**Phase 3 - Deployment:**
| Priority | Area | Description |
|----------|------|-------------|
| High | Docker Production Builds | Multi-stage Dockerfiles, optimized images |
| High | Railway Deployment | Backend + Frontend + MongoDB + Redis |
| High | GitHub Actions CI/CD | Automated testing, building, deployment |
| Medium | Monitoring | Health checks, logging, error tracking |

### Current Session State

**Date:** January 11, 2026
**Phase:** Phase 1 COMPLETE, Phase 2 COMPLETE - Ready for Phase 3 (Deployment)
**Last Action:** Completed all Phase 2 documentation tasks (Steps 13-22), added JSDoc to 5 files, verified unit tests pass (72/72)
**Next Action:** Begin Phase 3 - Deployment (Docker production builds, Railway/Render deployment, GitHub Actions CI/CD)

**All Phase 2 files committed to git.**

### Phase 1 Testing - COMPLETE SUMMARY

**Final Test Results (Verified January 8, 2026):**
- **Unit Tests:** 7 suites, 72 tests - ALL PASSING
- **E2E Tests:** 5 suites, 52 tests - ALL PASSING
- **Total:** 12 suites, 124 tests

**Test Commands:**
```bash
cd backend && npm test        # Unit tests (~24s)
cd backend && npm run test:e2e    # E2E tests (~27s)
cd backend && npm run test:cov    # Coverage report
```

**Unit Test Suites (72 tests):**
| Test File | Tests | Critical Logic Verified |
|-----------|-------|------------------------|
| `workflow-executor.service.spec.ts` | 10 | Topological sort, WebSocket events, conditional branching, loop iterations, continueOnError, userId context |
| `connections.service.spec.ts` | 10 | Token encryption/decryption, Google token refresh, CRUD operations |
| `schedules.service.spec.ts` | 9 | Bull job creation, cron validation, toggle active status, job removal |
| `condition.handler.spec.ts` | 16 | All operators (==, !=, >, <, >=, <=), variable replacement, error handling |
| `loop.handler.spec.ts` | 12 | Array initialization, nested loops, error handling, JSON parsing |
| `slack.handler.spec.ts` | 10 | OAuth token usage, Slack API calls, variable replacement, error handling |
| `email.handler.spec.ts` | 11 | Gmail OAuth, token refresh, validation, sendMail errors |

**E2E Test Suites (52 tests):**
| Test File | Tests | Description |
|-----------|-------|-------------|
| `workflows.e2e-spec.ts` | 9 | CRUD operations, execute workflow, user isolation |
| `oauth.e2e-spec.ts` | 6 | Slack/Google OAuth redirects and callbacks |
| `schedules.e2e-spec.ts` | 10 | Create, toggle, delete schedules with Bull jobs |
| `executions.e2e-spec.ts` | 9 | List, filter by workflowId, user isolation |
| `websocket.e2e-spec.ts` | 18 | Socket.io connection, events, room isolation |

**Coverage Results (All Critical Services >70%):**
| Service | Lines | Status |
|---------|-------|--------|
| `workflow-executor.service.ts` | 78.96% | ✅ |
| `connections.service.ts` | 89.65% | ✅ |
| `schedules.service.ts` | 83.33% | ✅ |
| `condition.handler.ts` | 95% | ✅ |
| `loop.handler.ts` | 97.36% | ✅ |
| `email.handler.ts` | 97.61% | ✅ |
| `slack.handler.ts` | 83.72% | ✅ |

**Test Infrastructure Files:**
| File | Purpose |
|------|---------|
| `backend/jest.config.js` | Unit test config with `maxWorkers: 1` |
| `backend/test/jest-e2e.json` | E2E test config with `forceExit: true` |
| `backend/test/setup.ts` | E2E environment setup |
| `backend/test/test-helpers.ts` | Utilities: `registerTestUser()`, `createWorkflow()`, `generateObjectId()` |
| `backend/src/test/test-utils.ts` | Unit test mocks: `mockRepository()`, `mockConfigService()`, etc. |

**Known Issues Resolved:**
1. **Memory Exhaustion:** Fixed with `maxWorkers: 1` + 4GB heap allocation
2. **Jest Not Exiting:** Fixed with `forceExit: true` in jest-e2e.json
3. **Supertest Import:** Use `import request from 'supertest'` (not `* as request`)
4. **E2E Node Types:** Use `webhook`/`http` (not `trigger`/`action`)
5. **Execution userId:** Pass strings to Mongoose (auto-converts to ObjectId)

**Test Output Note:** ERROR logs during tests are EXPECTED - they verify error handling works correctly

### Phase 2 Documentation - COMPLETE SUMMARY

**Completed January 11, 2026**

**Documentation Files Created:**
| File | Size | Description |
|------|------|-------------|
| `README.md` | ~15KB | Comprehensive project documentation with features, setup, architecture overview |
| `LICENSE` | ~1KB | MIT License (Victor Nwoseh, 2026) |
| `CONTRIBUTING.md` | ~10KB | Code style, commit format, testing requirements, PR process |
| `CHANGELOG.md` | ~6KB | Version history from v0.1.0 (Week 1) to v1.0.0 (Week 6) |
| `docs/ARCHITECTURE.md` | ~12KB | 7 Mermaid diagrams: system, auth flow, OAuth, execution, security, DB schema, deployment |
| `docs/API.md` | ~21KB | Complete API reference with all endpoints, request/response examples, cURL samples |
| `docs/USER_GUIDE.md` | ~21KB | End-user guide: getting started, integrations, nodes, variables, scheduling |
| `docs/DEPLOYMENT.md` | ~19KB | Railway/Render deployment, MongoDB Atlas, Redis Cloud, GitHub Actions CI/CD |

**JSDoc Comments Added To:**
| File | Purpose |
|------|---------|
| `workflow-executor.service.ts` | Core execution engine documentation |
| `connections.service.ts` | OAuth token management documentation |
| `schedules.service.ts` | Cron scheduling documentation |
| `useExecutionSocket.ts` | WebSocket hook documentation |
| `WorkflowBuilder.tsx` | React Flow editor documentation |

**Key Documentation Features:**
- Mermaid diagrams render on GitHub for visual architecture understanding
- API docs include cURL examples for all endpoints
- User guide covers all 9 node types with configuration examples
- Deployment guide includes complete GitHub Actions workflow YAML
- Contributing guide follows Conventional Commits format

**Issues Resolved During Documentation:**
1. **UTF-16 Encoding:** README.md had null bytes - rewrote with UTF-8
2. **GitHub Secret Scanning:** MongoDB connection string triggered alert - changed to obvious placeholders

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
1. Read this CLAUDE.md file for full context (especially "Current Session State")
2. **Phase 1 (Testing) is 100% COMPLETE** - 124 tests passing, coverage verified
3. **Phase 2 (Documentation) is 100% COMPLETE** - All docs created, JSDoc added
4. **Next: Phase 3 (Deployment)** - Docker production builds, Railway/Render deployment, GitHub Actions CI/CD
5. Update "Current Session State" section at end of each session

**Phase 3 Deployment Tasks (Suggested Order):**
1. Create production Dockerfiles (multi-stage builds for backend + frontend)
2. Set up MongoDB Atlas cluster (free tier)
3. Set up Redis Cloud instance (free tier)
4. Deploy backend to Railway or Render
5. Deploy frontend to Vercel or Netlify (or same platform as backend)
6. Configure environment variables on hosting platform
7. Set up GitHub Actions CI/CD workflow
8. Test deployed application end-to-end
9. Update README with live demo URL

### Quick Verification Commands

Before starting new work, verify tests still pass:
```bash
cd backend && npm test && npm run test:e2e
# Expected: 72 unit tests + 52 e2e tests = 124 total, all passing
```
