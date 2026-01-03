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

## Session Context (Last Updated: 2026-01-03 - Session 3)

> **Purpose:** This section maintains continuity between development sessions. Update this at the end of each session.

### Current Project Phase

**Phase:** UI/UX Transformation (Visual Redesign Only) - **FINAL PHASE**
**Constraint:** NO changes to functionality, logic, or behavior. Only visual design and user experience.

### UI/UX Redesign Progress

| # | Component | Status |
|---|-----------|--------|
| 1 | Landing Page (NEW) | COMPLETED |
| 2 | Login Page | COMPLETED |
| 3 | Register Page | COMPLETED |
| 4 | Navbar/Navigation (Dock) | COMPLETED |
| 5 | Workflows List Page | COMPLETED |
| 6 | Workflow Builder Page (Canvas + Toolbar) | COMPLETED |
| 7 | Node Palette (Sidebar Component) | COMPLETED |
| 8 | Node Configuration Modal | COMPLETED |
| 9 | Executions List Page | COMPLETED |
| 10 | Execution Details Page | COMPLETED |
| 11 | Integrations Page | COMPLETED |
| 12 | Schedules Page | COMPLETED |
| 13 | Templates Page | COMPLETED |
| 14 | **Modals & Dialogs** | **PENDING - NEXT** |
| 15 | Toast Notifications | PENDING |
| 16 | Loading States & Skeletons | PENDING |
| 17 | Empty States | PENDING |

### Design System: "Warm Forge"

The established design language across all completed components:

**Color Palette (defined in `frontend/tailwind.config.js`):**
```
Forge (Dark Neutrals):
- forge-950: #0a0908 (deepest background)
- forge-900: #121110 (primary background)
- forge-800: #231f1c (cards, panels)
- forge-700: #2e2924 (borders)
- forge-50:  #f5f2ef (primary text)

Ember (Orange Accents):
- ember-500: #b34700 (base)
- ember-300: #e65c00 (primary accent - MAIN BRAND COLOR)
- ember-200: #ff751a (hover states)

Bronze/Gold (Supporting):
- bronze-300: #a67c52
- gold-50: #ffd11a (highlights)
```

**Key Design Patterns:**
- Glass-morphism: `bg-forge-900/80 backdrop-blur-xl`
- Borders: `border-forge-700/50`
- Text hierarchy: `text-forge-50` (primary), `text-forge-400` (secondary)
- Active states: `bg-ember-500/20 text-ember-300 ring-1 ring-ember-500/30`
- Hover: `hover:border-ember-500/40 hover:shadow-ember-sm`
- Cards: Dark with subtle category accent borders
- Primary buttons: `bg-gradient-to-r from-ember-500 to-ember-400` with shadow
- Secondary buttons: `bg-forge-800/60 text-forge-300 border border-forge-700/50`
- Status badges: Semantic colors (emerald=success, amber=warning, red=error/danger)

**Premium Components:**
- `LiquidMetalButton` - Animated metallic sweep effect button
- `Dock` - Bottom-fixed navigation with Framer Motion magnification
- `TrueFocus` - Animated blur focus effect for logo
- `TextType` - GSAP typing animation
- `GlareHover`, `StarBorder` - Interactive card effects

**Typography:** Outfit font family (configured in Tailwind)

### Session 3 Work (2026-01-03)

**Completed this session:**

1. **Integrations Page Redesign** (`frontend/src/pages/Integrations.tsx`)
   - **4-Quarter Card Layout:**
     - Q1: Icon + Service Name + Connected badge
     - Q2: Description
     - Q3: Email/Workspace info
     - Q4: Disconnect/Connect button (always at bottom via `flex flex-col` + `mt-auto`)
   - **Service-Specific Accents:**
     - Slack: `border-l-violet-500/60` + violet icon background
     - Gmail: `border-l-rose-500/60` + rose icon background
     - Google Sheets: `border-l-emerald-500/60` + emerald icon background
   - **Connected Status:** Animated emerald pulse dot badge
   - **Not Connected Status:** Muted forge badge with AlertCircle icon
   - **Account Info:** Monospace font in dark badge container
   - **Action Buttons:**
     - Connect: Ember gradient with external link icon
     - Disconnect: `bg-red-500/10 text-red-400 border-red-500/30`
   - **Loading State:** 3 skeleton cards with shimmer effect

2. **Schedules Page Redesign** (`frontend/src/pages/Schedules.tsx`)
   - **Page Header:** Clock icon badge + title in forge-50
   - **Table Container:** Glass-morphism with dark theme
   - **Header Row:** `bg-forge-800/60` with uppercase forge-400 text
   - **Workflow Links:** `text-ember-400` with hover underline
   - **Cron Display:** Monospace `text-forge-50` + human-readable description in `text-forge-500`
   - **Status Badges:**
     - Active: Emerald with animated pulse dot
     - Inactive: Muted forge with static dot
   - **Row Styling:** `opacity-70` for inactive rows, hover state `bg-forge-800/40`
   - **Action Buttons:**
     - Pause: `bg-amber-500/10 text-amber-400` (amber = warning)
     - Activate: `bg-emerald-500/10 text-emerald-400` (emerald = go)
     - Delete: `bg-red-500/10 text-red-400` (red = danger)
     - Fixed width `w-24` for Pause/Activate consistency
   - **Empty State:** Dark card with Calendar icon and ember gradient CTA
   - **Loading State:** Skeleton table rows

3. **Templates Page Redesign** (`frontend/src/pages/Templates.tsx`)
   - **Page Header:** LayoutTemplate icon badge + title
   - **Search Input:** Dark `bg-forge-800/60` with ember focus ring
   - **Category Filter Pills:**
     - Active: `bg-ember-500/20 text-ember-300 border-ember-500/40`
     - Inactive: `bg-forge-800/60 text-forge-400 border-forge-700/50`
   - **Template Cards:** Glass-morphism with consistent 5-row structure:
     - Row 1: Icon + Name + Badges (category + difficulty)
     - Row 2: Description (`h-12` fixed height)
     - Row 3: Tags (`h-7` fixed height)
     - Row 4: Usage count with amber star
     - Row 5: Use Template (ember gradient) + Preview buttons
   - **Category Badges (Dark Theme):**
     - Sales: Emerald
     - Marketing: Violet
     - Operations: Blue
     - Finance: Amber
     - Support: Orange
     - General: Muted forge
   - **Difficulty Badges (Dark Theme):**
     - Beginner: Emerald
     - Intermediate: Amber
     - Advanced: Red
   - **Tags:** `bg-forge-800/60 border-forge-700/40 text-forge-500`
   - **Preview Modal:** Complete dark theme overhaul:
     - Backdrop: `bg-forge-950/80 backdrop-blur-sm`
     - Container: `bg-forge-900/95 backdrop-blur-xl border-forge-700/50`
     - Node cards: `bg-forge-800/60 border-forge-700/40`
     - Edge pills: `bg-ember-500/15 text-ember-300` with arrow icons
     - Close button: X icon with hover state
     - Import button: Ember gradient
   - **Loading State:** 6 skeleton cards
   - **Empty State:** Dark card with FileText icon

### Files Modified This Session

- `frontend/src/pages/Integrations.tsx` - Complete visual overhaul with 4-quarter layout
- `frontend/src/pages/Schedules.tsx` - Complete visual overhaul with dark table
- `frontend/src/pages/Templates.tsx` - Complete visual overhaul with aligned cards + preview modal

### Next Up: Phase 7 - Shared Components & Polish

**This is the FINAL PHASE of the UI/UX transformation.**

**Approach for Phase 7:**
Before creating a redesign plan for each category, first **audit the codebase** and provide a comprehensive list of all instances, so the user knows exactly what to review after implementation.

**Components to address:**

1. **Modals & Dialogs** (NEXT)
   - Already redesigned: Node Configuration Modal, Template Preview Modal
   - Need to audit codebase for any other modals/dialogs

2. **Toast Notifications**
   - Currently using `react-hot-toast`
   - Need to audit where toasts are used and their current styling

3. **Loading States & Skeletons**
   - Many pages already have dark-themed loading skeletons (added during page redesigns)
   - Need to audit for any remaining light-themed loading states

4. **Empty States**
   - User believes Workflows List is the only empty state needing redesign
   - Need to confirm by checking all pages with potential empty states
   - Use empty test account: `victor6@test.com` / `password123`

### Tools Available

- **Puppeteer MCP** installed for visual testing (navigate, screenshot, click, fill, evaluate)
- Dev servers typically running: Frontend (5173), Backend (3001), Docker (MongoDB + Redis)

### Test Accounts

- **Main account (has data):** `victor@test.com` / `password123`
- **Empty account (no data):** `victor6@test.com` / `password123`

### Important Context for Resuming

1. User has given **complete creative autonomy** over UI/UX - maximize this
2. **Zero functionality changes** - only visual/UX improvements
3. Always verify changes visually using Puppeteer
4. The design should feel like a "craftsman's forge" - warm, industrial, premium
5. For Phase 7, **audit first, then plan** - provide inventory before redesign plans
6. Two modals already redesigned: Node Configuration Modal, Template Preview Modal
