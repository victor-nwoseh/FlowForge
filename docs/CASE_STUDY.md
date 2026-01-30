# Building FlowForge: A Production Multi-Tenant SaaS Platform in 10 Weeks

FlowForge is a workflow automation platform (similar to Zapier) that lets users create complex automations through a visual drag-and-drop interface. Over 10 weeks, I built it from scratch—architecting a multi-tenant system with OAuth 2.0 integrations, real-time WebSocket monitoring, and 124 automated tests across unit and end-to-end suites.

This is the story of how I built it, the technical challenges I faced, and what I learned about building production software independently.

🔗 **[Live Application](https://flowforge-frontend-production.up.railway.app/)**
💻 **[GitHub Repository](https://github.com/victor-nwoseh/FlowForge)**
🎥 **[Demo Video](https://drive.google.com/file/d/1p-NlPutYT7if5ugHHAU6WNTY3nLL8x6x/view)**

---

## Why Build This?

I wanted to build something that demonstrated three things:

**Complex system architecture** - Multi-tenant isolation, OAuth flows, queue-based execution, and real-time updates all working together in one system.

**Production-ready practices** - Comprehensive testing (124 tests), CI/CD automation, encrypted credential storage, and actual production deployment with monitoring.

**Real-world integrations** - Working with external APIs (Slack, Gmail, Google Sheets) through OAuth, handling token refresh, and managing per-user credentials securely.

Workflow automation platforms like Zapier are excellent reference examples because they require solving genuinely hard problems: queue-based execution for handling workflows asynchronously, per-user credential management with OAuth token isolation, visual workflow building with complex UI state, and real-time monitoring through WebSocket communication.

This project let me tackle all of these challenges in one cohesive system.

---

## Technical Stack

### Backend: NestJS + TypeScript

I chose **NestJS** over raw Express because:
- Built-in dependency injection made testing easier—I could mock services cleanly
- Modular architecture scaled well as the project grew from 3 modules to 7
- Native TypeScript support caught errors at compile time, especially with complex type definitions
- Passport integration simplified OAuth flows for Slack and Google

### Database: MongoDB

I went with **MongoDB** for flexibility:
- Workflow definitions have variable node configurations—different node types need completely different fields (Slack nodes need channel IDs, condition nodes need operators, loop nodes need array paths)
- The nested document structure fit the workflow data model naturally (nodes array, edges array, each with their own nested data)
- Schema flexibility let me iterate quickly during development without migrations

### Queue: Bull + Redis

For asynchronous workflow execution, I used **Bull**:
- Mature library with retry logic out of the box (3 attempts with exponential backoff)
- Repeatable jobs for scheduled workflows with cron expression support
- Redis as backing store gave me fast job processing and persistence across service restarts

### Frontend: React + React Flow

**React Flow** was essential for the visual workflow builder—it handles drag-and-drop node positioning, edge connections with validation, custom node rendering, and canvas controls (zoom, pan, fit view).

I paired it with **Zustand** for global state management (much lighter than Redux, perfect for this scale) and **TanStack Query** for server state caching and automatic refetching.

---

## Technical Challenge #1: Topological Sort for Node Execution Order

### The Problem

Workflows are directed acyclic graphs (DAGs). Users connect nodes visually, creating dependencies: "Run Node A, then Node B, then Node C." But they might connect them in random order—Node C created first, then A, then B.

When executing a workflow, I can't just iterate through nodes in the order they were created. I need to respect dependencies: Node B can't run until Node A completes, even if Node B appears first in the array.

### The Solution

I implemented topological sort using Kahn's algorithm:

1. **Build adjacency list** from edges: `{ 'nodeA': ['nodeB'], 'nodeB': ['nodeC'] }`
2. **Calculate in-degrees** (number of incoming edges) for each node
3. **Start with nodes that have zero in-degree** (no dependencies)
4. **Process nodes in order**, decrementing in-degrees as we go
5. **Detect cycles** if we can't process all nodes

**Code Implementation:**
```typescript
private topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach(edge => {
    adjacencyList.get(edge.source).push(edge.target);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
  });

  // Find starting nodes (in-degree = 0)
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  // Process in dependency order
  const sorted: Node[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    const node = nodes.find(n => n.id === nodeId);
    sorted.push(node);

    // Decrement in-degrees of neighbors
    adjacencyList.get(nodeId).forEach(neighborId => {
      const newDegree = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) queue.push(neighborId);
    });
  }

  // Detect cycles
  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains a cycle');
  }

  return sorted;
}
```

### Why This Matters

This is foundational computer science applied to a real-world problem. Without topological sort, workflows with dependencies would execute in the wrong order, producing incorrect results. With it, users can build complex workflows with confidence that execution will always respect dependencies.

---

## Technical Challenge #2: Multi-Tenant OAuth Token Isolation

### The Problem

Each user needs to connect their own Slack workspace or Google account. FlowForge can't use a single shared API key—it must store and use each user's individual OAuth tokens securely.

But OAuth tokens are sensitive credentials. If they leak, an attacker could send Slack messages or read Gmail on behalf of the user. The database must never store tokens in plaintext.

### The Solution

I implemented per-user token storage with AES-256 encryption:

**OAuth Flow:**
1. User clicks "Connect Slack" in FlowForge
2. FlowForge redirects to Slack OAuth with a state parameter (CSRF protection)
3. User approves permissions in Slack
4. Slack redirects back with an authorization code
5. FlowForge exchanges code for access token
6. **Before storing**, FlowForge encrypts the token using AES-256
7. Encrypted token saved to MongoDB with `userId` association

**Execution Flow:**
1. When executing a workflow, FlowForge fetches the user's connection (filtered by `userId`)
2. Decrypts the token using the encryption key from environment variables
3. Uses decrypted token to call Slack API
4. Token never exposed to other users or stored in logs

**Code Implementation:**
```typescript
// Encryption (before saving to database)
const encryptToken = (token: string): string => {
  return CryptoJS.AES.encrypt(
    token,
    process.env.ENCRYPTION_KEY
  ).toString();
};

// Decryption (before using with API)
const decryptToken = (encryptedToken: string): string => {
  const bytes = CryptoJS.AES.decrypt(
    encryptedToken,
    process.env.ENCRYPTION_KEY
  );
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Usage in Slack handler
const connection = await this.connectionsService.findOne({
  userId: context.userId,
  service: 'slack'
});

if (!connection) {
  throw new Error('Slack not connected');
}

const accessToken = decryptToken(connection.accessToken);
await this.slackClient.postMessage(channel, message, accessToken);
```

### Why This Matters

This is true multi-tenant architecture. Every MongoDB query is filtered by `userId`, ensuring complete data isolation. Even if the database is compromised, tokens are useless without the encryption key. This pattern scales to any number of users without security concerns.

---

## Technical Challenge #3: Variable Replacement with Nested Contexts

### The Problem

Users need to pass data between nodes dynamically. A webhook might receive `{ "name": "John", "email": "john@example.com" }`, and the user wants to send a Slack message saying "Hello {{trigger.name}}, your order is ready."

But it gets complex fast:
- **Trigger data**: `{{trigger.name}}`
- **Previous node output**: `{{http-request-1.status}}`
- **User-defined variables**: `{{variables.orderId}}`
- **Loop context**: `{{loop.item}}` and `{{loop.index}}`

All of these need to work together, with proper error handling if a variable doesn't exist.

### The Solution

I built a recursive variable replacement engine that merges multiple context sources:

**Context Structure:**
```typescript
interface ExecutionContext {
  trigger: any;           // Initial trigger data
  variables: any;         // User-defined variables
  nodes: Map<string, any>; // Output from each node (keyed by nodeId)
  loop?: {                // Loop-specific context
    item: any;
    index: number;
  };
}
```

**Replacement Engine:**
```typescript
private replaceVariables(input: any, context: ExecutionContext): any {
  if (typeof input === 'string') {
    return input.replace(/\{\{(.+?)\}\}/g, (match, path) => {
      const value = this.resolveVariablePath(path, context);
      return value !== undefined ? value : match; // Keep original if not found
    });
  }

  if (Array.isArray(input)) {
    return input.map(item => this.replaceVariables(item, context));
  }

  if (typeof input === 'object' && input !== null) {
    const result = {};
    for (const key in input) {
      result[key] = this.replaceVariables(input[key], context);
    }
    return result;
  }

  return input;
}

private resolveVariablePath(path: string, context: ExecutionContext): any {
  const parts = path.trim().split('.');
  const [source, ...rest] = parts;

  let value;
  if (source === 'trigger') {
    value = context.trigger;
  } else if (source === 'variables') {
    value = context.variables;
  } else if (source === 'loop') {
    value = context.loop;
  } else {
    // Assume it's a node ID
    value = context.nodes.get(source);
  }

  // Navigate nested path
  for (const key of rest) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }

  return value;
}
```

### Why This Matters

This makes FlowForge truly flexible. Users can build complex workflows where data flows naturally from trigger → processing → output, with full support for nested objects, arrays, and loop iterations. The recursive replacement handles deeply nested template strings, making workflows feel dynamic and powerful.

---

## Technical Challenge #4: Real-Time WebSocket Updates During Execution

### The Problem

Workflow execution happens asynchronously in a Bull queue—the API returns immediately with an execution ID, then processing happens in the background. Users would be stuck refreshing the page to see if their workflow completed.

I needed real-time updates: when a node completes, the UI should update instantly, showing which node is running, which succeeded, which failed.

### The Solution

I implemented a **WebSocket gateway** with Socket.io that emits events during execution:

**Architecture:**

1. **Frontend connects** to WebSocket server on page load with JWT token
2. **Backend validates JWT** and joins user to room `user:${userId}`
3. **During workflow execution**, executor emits events to that room
4. **Frontend listens** for events and updates UI

**Backend (WebSocket Gateway):**
```typescript
@WebSocketGateway({ cors: true })
export class ExecutionGateway {
  @WebSocketServer()
  server: Server;

  afterInit() {
    // Middleware to authenticate WebSocket connections
    this.server.use((socket, next) => {
      const token = socket.handshake.auth.token;
      try {
        const payload = this.jwtService.verify(token);
        socket.data.userId = payload.sub;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId;
    client.join(`user:${userId}`); // Join user-specific room
  }

  emitExecutionUpdate(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
```

**Executor (Emitting Events):**
```typescript
async executeWorkflow(workflowId: string, userId: string) {
  const workflow = await this.loadWorkflow(workflowId);
  const sortedNodes = this.topologicalSort(workflow.nodes, workflow.edges);

  // Emit start event
  this.gateway.emitExecutionUpdate(userId, 'execution:started', {
    workflowId,
    totalNodes: sortedNodes.length
  });

  for (const node of sortedNodes) {
    // Emit node progress
    this.gateway.emitExecutionUpdate(userId, 'execution:progress', {
      nodeId: node.id,
      status: 'running'
    });

    const result = await this.executeNode(node, context);

    // Emit node completion
    this.gateway.emitExecutionUpdate(userId, 'execution:node-completed', {
      nodeId: node.id,
      status: result.success ? 'success' : 'failed',
      output: result.data
    });
  }

  // Emit final completion
  this.gateway.emitExecutionUpdate(userId, 'execution:completed', {
    workflowId,
    status: 'success'
  });
}
```

**Frontend (Listening for Events):**
```typescript
useEffect(() => {
  const socket = io('http://localhost:3001', {
    auth: { token: getAuthToken() }
  });

  socket.on('execution:progress', (data) => {
    setExecutingNodeId(data.nodeId);
  });

  socket.on('execution:node-completed', (data) => {
    updateNodeStatus(data.nodeId, data.status);
  });

  socket.on('execution:completed', (data) => {
    setExecutionComplete(true);
  });

  return () => socket.disconnect();
}, []);
```

### Why This Matters

Real-time updates transform the user experience. Instead of a loading spinner, users see their workflow come to life—watching each node execute in sequence, seeing data flow through the system. It makes FlowForge feel responsive and professional, like a SaaS product should.

The room-based isolation (`user:${userId}`) ensures users only see their own execution updates, maintaining multi-tenant security even in real-time communication.

---

## Testing: 124 Tests Across 12 Suites

I wrote tests **as I built features**, not after. This gave me confidence to refactor and prevented regressions as the system grew more complex.

### Unit Tests (72 tests, 7 suites)

I tested individual services and handlers in isolation:
- `WorkflowExecutorService` - Topological sort correctness, variable replacement edge cases, error handling with `continueOnError`
- `ConnectionsService` - Token encryption/decryption, token refresh logic, multi-user isolation
- Node handlers (Condition, Loop, Slack, Email) - Logic validation, error scenarios, context handling

**Example: Testing the Condition Handler**
```typescript
describe('ConditionHandler', () => {
  it('should route to true branch when condition is met', async () => {
    const node = {
      id: 'condition-1',
      type: 'condition',
      data: {
        field: '{{trigger.age}}',
        operator: '>',
        value: '18'
      }
    };

    const context = {
      trigger: { age: 25 },
      variables: {},
      nodes: new Map()
    };

    const result = await conditionHandler.execute(node, context);

    expect(result.branch).toBe('true');
    expect(result.success).toBe(true);
  });

  it('should handle missing variables gracefully', async () => {
    const node = {
      id: 'condition-2',
      type: 'condition',
      data: {
        field: '{{trigger.nonexistent}}',
        operator: '==',
        value: 'test'
      }
    };

    const context = {
      trigger: {},
      variables: {},
      nodes: new Map()
    };

    const result = await conditionHandler.execute(node, context);

    expect(result.branch).toBe('false');
  });
});
```

### E2E Tests (52 tests, 5 suites)

I tested full workflows end-to-end with real MongoDB, Redis, and queue processing:
- Workflow CRUD operations with authentication
- OAuth connection flows (mocked external APIs)
- Schedule creation and automatic execution via cron
- WebSocket event emission during execution
- Complete workflow execution from trigger to completion

**Challenge: Testing Async Execution**

Queue-based execution is async, so E2E tests needed to wait for jobs to complete. I built a helper function:
```typescript
async function waitForExecution(
  executionId: string,
  expectedStatus: string,
  timeout = 5000
): Promise<Execution> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const execution = await executionsRepo.findById(executionId);

    if (execution.status === expectedStatus) {
      return execution;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Execution did not reach ${expectedStatus} within ${timeout}ms`);
}
```

**Example E2E Test:**
```typescript
it('should execute workflow and emit WebSocket events', async () => {
  const workflow = await createTestWorkflow();
  const mockSocket = createMockSocketClient(authToken);

  const { body } = await request(app.getHttpServer())
    .post(`/api/workflows/${workflow.id}/execute`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(201);

  const execution = await waitForExecution(body.executionId, 'completed', 5000);

  expect(execution.status).toBe('completed');
  expect(execution.logs).toHaveLength(workflow.nodes.length);

  const events = mockSocket.getEmittedEvents();
  expect(events).toContainEqual(
    expect.objectContaining({
      event: 'execution:completed',
      data: { workflowId: workflow.id }
    })
  );
});
```

### CI/CD Integration

All 124 tests run on every push via **GitHub Actions**:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install
      - run: cd backend && npm test

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
```

The CI pipeline prevents broken code from being merged and gives me confidence that refactoring won't break existing functionality.

**Result: 85%+ test coverage on critical services, with several handlers exceeding 95% (condition: 95%, loop: 97%, email: 98%).**

---

## Deployment: From Code to Production

### Infrastructure

- **Backend:** Deployed on Railway (containerized NestJS app running in Node.js 18)
- **Frontend:** Static build on Railway served with Nginx
- **Database:** MongoDB Atlas (free M0 cluster with 512MB storage)
- **Redis:** Railway add-on for Bull queue persistence
- **Monitoring:** Custom `/health` endpoint + Railway logs + MongoDB Atlas monitoring

### Production Checklist

Before deploying, I ensured:

✅ **Environment variables managed securely** - Never committed `.env`, used Railway's environment variable UI
✅ **CORS configured** for production domain - `FRONTEND_URL` in backend config
✅ **MongoDB indexes created** for performance - Indexed `userId` on all user-scoped collections
✅ **OAuth redirect URIs updated** - Slack and Google OAuth configured with production callback URLs
✅ **Health endpoint** for Railway monitoring - Returns service status, MongoDB connection, Redis connection, uptime
✅ **Error logging** for production debugging - Structured logs with timestamps and request IDs

### Health Monitoring

Railway uses the `/health` endpoint to monitor service status:
```typescript
@Get('health')
async healthCheck() {
  const mongoStatus = await this.checkMongoConnection();
  const redisStatus = await this.checkRedisConnection();

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongo: mongoStatus ? 'connected' : 'disconnected',
    redis: redisStatus ? 'connected' : 'disconnected'
  };
}
```

Railway restarts the service automatically if health checks fail for 2 minutes.

### Uptime: 99%+

The system has been running in production since early January 2026 with 99%+ uptime. Railway's health checks have restarted the service twice, but recovery was automatic within 30 seconds.

---

## What I Learned

### 1. Testing Saves Time (Eventually)

Writing tests as I built features felt slow at first. Each handler took 30-40% longer to write with tests. But when I refactored the executor logic to add loop support, those tests caught **6 regressions** immediately. Without tests, I would have spent hours debugging production issues.

**Lesson:** Test-first development pays off when you're working alone. You are your own QA team.

### 2. Documentation Matters for Future You

When I came back to FlowForge after a few days away, my `ARCHITECTURE.md` documentation saved me hours. I'd forgotten why I chose topological sort over a simpler approach, and the doc reminded me: "Simple iteration breaks when users create dependencies."

**Lesson:** Document your design decisions while they're fresh. Your future self (or a teammate) will thank you.

### 3. Multi-Tenant is Deceptively Hard

Per-user token isolation sounds simple: "Just filter by `userId`." But it touches every layer of the system:
- Database queries must filter by `userId` (one missed filter = data leak)
- WebSocket events must go to the right user's room (one mistake = privacy violation)
- OAuth flows must associate tokens with the correct account (one bug = security breach)

**Lesson:** Security requires paranoia. I added `userId` checks defensively at every layer, even when it felt redundant.

### 4. Real-Time Updates Are Worth the Complexity

Adding WebSocket support added significant complexity: authentication in WebSocket handshake, room management, event emission from deep in the execution logic. But the UX improvement was dramatic. Watching nodes light up as they execute makes FlowForge feel **alive**.

**Lesson:** Features that delight users are worth the engineering investment. Real-time updates transformed FlowForge from a tool to an experience.

---

## What's Next

If I continue building FlowForge, I'd add:

1. **More integrations** - Discord webhooks, Notion database updates, Airtable records, Stripe payment webhooks
2. **Error retry UI** - Let users manually retry failed workflow steps from the execution detail page
3. **Workflow versioning** - Track changes to workflows over time, with rollback capability
4. **Collaborative editing** - Operational transformation for real-time multi-user workflow building
5. **Usage analytics dashboard** - Show users which workflows run most often, average execution time, failure rates

But for now, FlowForge achieves what I set out to prove: **I can build production-ready, multi-tenant software with professional testing, deployment, and architectural practices.**

---

## Wrapping Up

Building FlowForge taught me more than any tutorial or course could. Over 10 weeks, I:

- Architected a multi-tenant SaaS system from scratch with complete user isolation
- Wrote 124 tests covering unit and E2E scenarios, achieving 85%+ coverage
- Deployed to production with 99%+ uptime using Railway, MongoDB Atlas, and Redis
- Integrated with real OAuth providers (Slack, Google) with encrypted token storage
- Documented the entire system architecture with diagrams and design rationale
- Implemented complex algorithms (topological sort, variable replacement, WebSocket pub/sub)

If you're looking for a developer who can:
- Build production software independently
- Write comprehensive tests from day one
- Make intentional architectural decisions
- Document systems clearly for team collaboration
- Learn quickly and solve hard problems

**I'd love to connect.**

📧 **Email:** victor.nwoseh05@gmail.com
🔗 **LinkedIn:** [linkedin.com/in/victor-nwoseh](https://linkedin.com/in/victor-nwoseh/)
💼 **Portfolio:** [victor-nwoseh.vercel.app](https://victor-nwoseh.vercel.app/)
💻 **GitHub:** [github.com/victor-nwoseh](https://github.com/victor-nwoseh)

---

**Thanks for reading!** If you have questions about FlowForge's architecture, testing strategy, or implementation details, feel free to reach out. I'm always happy to discuss technical design decisions.
