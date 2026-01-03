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

## Session Context (Last Updated: 2026-01-03 - Session 4)

> **Purpose:** This section maintains continuity between development sessions. Update this at the end of each session.

### Current Project Phase

**Phase:** UI/UX Transformation (Visual Redesign Only) - **FINAL PHASE (Phase 7)**
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
| 14 | Modals & Dialogs | COMPLETED |
| 15 | **Toast Notifications** | **PENDING - NEXT** |
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
- `ConfirmDialog` - Reusable confirmation modal (NEW - Session 4)

**Typography:** Outfit font family (configured in Tailwind)

### Session 4 Work (2026-01-03)

**Focus: Modals & Dialogs Audit + ConfirmDialog Implementation**

**1. Modal & Dialog Audit Results:**

| Modal | File | Status |
|-------|------|--------|
| Node Configuration Modal | `NodeConfigPanel.tsx` | Already redesigned |
| Workflow Stats Modal | `WorkflowBuilder.tsx` | Already redesigned |
| Template Preview Modal | `Templates.tsx` | Already redesigned |

| Native `window.confirm()` Locations | File | Line | Status |
|-------------------------------------|------|------|--------|
| Node deletion (config modal) | `NodeConfigPanel.tsx` | 172 | REPLACED |
| Workflow deletion | `WorkflowsList.tsx` | 142 | REPLACED |
| Schedule deletion | `Schedules.tsx` | 94 | REPLACED |

**2. Created `ConfirmDialog` Component** (`frontend/src/components/ConfirmDialog.tsx`)
   - **Reusable confirmation modal** replacing all `window.confirm()` calls
   - **Warm Forge Styling:**
     - Backdrop: `bg-forge-950/80 backdrop-blur-sm`
     - Container: `bg-forge-900/95 backdrop-blur-xl border-forge-700/50`
     - Glass-morphism effect with dark theme
   - **Variant Support:**
     - `danger` (default): Red icon/button for destructive actions (Trash2 icon)
     - `warning`: Amber icon/button for cautionary actions (AlertTriangle icon)
     - `default`: Ember gradient for neutral confirmations
   - **Props:**
     - `isOpen`, `onConfirm`, `onCancel` (required)
     - `title`, `message` (required)
     - `confirmLabel`, `cancelLabel` (optional, defaults: "Confirm"/"Cancel")
     - `variant` (optional, default: "danger")
   - **Keyboard Support:**
     - Escape key → Cancel
     - Enter key → Confirm
   - **Animation:** `animate-in fade-in zoom-in-95 duration-200`

**3. Updated WorkflowBuilder Keyboard Behavior** (`frontend/src/pages/WorkflowBuilder.tsx`)
   - **Removed Backspace deletion:** Added `deleteKeyCode={null}` to ReactFlow component to disable default behavior
   - **Delete key now shows ConfirmDialog:** Instead of immediate deletion, pressing Delete opens the styled confirmation modal
   - **Added State:** `isDeleteConfirmOpen` to control dialog visibility
   - **Node name displayed in confirmation message**

**4. Replaced `window.confirm()` in NodeConfigPanel** (`frontend/src/components/NodeConfigPanel.tsx`)
   - Added `isDeleteConfirmOpen` state
   - `handleDelete()` now opens ConfirmDialog
   - `handleConfirmDelete()` performs actual deletion
   - Wrapped return in React fragment to include ConfirmDialog
   - Node label displayed in confirmation message

**5. Replaced `window.confirm()` in WorkflowsList** (`frontend/src/pages/WorkflowsList.tsx`)
   - Added `workflowToDelete` state: `{ id: string; name: string } | null`
   - `handleDeleteWorkflow()` now sets `workflowToDelete` state
   - `handleConfirmDeleteWorkflow()` performs actual deletion
   - Workflow name displayed in confirmation message

**6. Replaced `window.confirm()` in Schedules** (`frontend/src/pages/Schedules.tsx`)
   - Added `scheduleToDelete` state: `{ id: string; workflowName: string } | null`
   - `handleDelete()` updated to accept `workflowName` parameter
   - `handleConfirmDelete()` performs actual deletion
   - Workflow name displayed in confirmation message

### Files Modified This Session

- `frontend/src/components/ConfirmDialog.tsx` - **NEW FILE** - Reusable confirmation dialog component
- `frontend/src/pages/WorkflowBuilder.tsx` - Delete key now shows ConfirmDialog, Backspace disabled
- `frontend/src/components/NodeConfigPanel.tsx` - Replaced window.confirm with ConfirmDialog
- `frontend/src/pages/WorkflowsList.tsx` - Replaced window.confirm with ConfirmDialog
- `frontend/src/pages/Schedules.tsx` - Replaced window.confirm with ConfirmDialog

### ConfirmDialog Usage Pattern

```tsx
import ConfirmDialog from '../components/ConfirmDialog';

// State
const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

// Trigger
const handleDelete = (id: string, name: string) => {
  setItemToDelete({ id, name });
};

// Confirm action
const handleConfirmDelete = () => {
  if (!itemToDelete) return;
  deleteMutation.mutate(itemToDelete.id);
  setItemToDelete(null);
};

// JSX
<ConfirmDialog
  isOpen={itemToDelete !== null}
  onConfirm={handleConfirmDelete}
  onCancel={() => setItemToDelete(null)}
  title="Delete Item"
  message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="danger"
/>
```

### Next Up: Toast Notifications

**Remaining Phase 7 items:**

1. **Toast Notifications** (NEXT)
   - Currently using `react-hot-toast` with default styling
   - Need to audit where toasts are used
   - Apply Warm Forge dark theme styling

2. **Loading States & Skeletons**
   - Many pages already have dark-themed loading skeletons
   - Need to audit for any remaining light-themed loading states

3. **Empty States**
   - Need to audit all empty states for dark theme consistency
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
6. All modals/dialogs now complete - custom ConfirmDialog replaces all browser confirms
7. ConfirmDialog component is reusable for any future confirmation needs
