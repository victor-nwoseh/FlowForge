# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- API rate limiting
- Workflow versioning and rollback
- Team collaboration features
- Additional node types (Webhooks, Discord, Telegram)
- Workflow import/export

---

## [1.0.0] - 2026-01-11

### Added

#### Core Platform
- Visual workflow builder with React Flow drag-and-drop canvas
- NestJS backend with modular architecture (7 modules)
- MongoDB database with Mongoose ODM
- Redis-backed Bull queue for asynchronous workflow execution
- Docker Compose setup for local development

#### Authentication & Security
- JWT-based authentication with Passport
- User registration and login
- Per-user OAuth connections (Slack, Google)
- AES-256 encryption for OAuth token storage
- Multi-tenant isolation (users can only access their own data)

#### Node Types (9 handlers)
- **Webhook**: Trigger workflows via HTTP POST
- **HTTP Request**: Make external API calls (GET/POST/PUT/DELETE)
- **Condition**: If/else branching with multiple operators
- **Loop**: Array iteration with `{{loop.item}}` and `{{loop.index}}`
- **Variable**: Create and update workflow variables
- **Delay**: Pause execution for specified duration
- **Slack**: Send messages to Slack channels (OAuth)
- **Email**: Send emails via Gmail (OAuth)
- **Google Sheets**: Read from and append to spreadsheets

#### Workflow Execution
- Topological sort for correct node execution order
- Variable replacement system (`{{variable}}` syntax)
- Conditional branching with true/false output handles
- Loop nodes with nested iteration support
- continueOnError flag for fault tolerance
- Execution logging with detailed node-by-node status
- Retry logic (3 attempts with exponential backoff)

#### Real-Time Features
- Socket.io WebSocket gateway for live updates
- Execution progress events (started, node-completed, progress, completed)
- Live node status visualization in workflow builder
- No-refresh execution monitoring

#### Scheduling
- Cron-based workflow scheduling
- Bull repeatable jobs for scheduled triggers
- Schedule management (create, toggle, delete)
- Next run time calculation and display

#### Templates
- 7 pre-built workflow templates
- Categories: notifications, data-sync, monitoring, marketing
- Template import functionality

#### Frontend
- React 18 with TypeScript and Vite
- React Flow for workflow visualization
- Zustand for global state management
- TanStack Query for server state
- Tailwind CSS for styling
- GSAP and Motion for animations
- Responsive design

#### Testing
- Jest testing framework configured
- 72 unit tests across 7 test suites
- 52 E2E integration tests across 5 test suites
- >70% code coverage on critical services
- Test utilities and mock factories

#### Documentation
- Comprehensive README with setup instructions
- API documentation with all endpoints
- Architecture documentation with Mermaid diagrams
- User guide for end users
- Deployment guide for Railway/Render
- Contributing guidelines

### Security
- Passwords hashed with bcrypt
- OAuth tokens encrypted at rest (AES-256)
- JWT authentication for all protected routes
- WebSocket authentication via token handshake
- Sensitive data redaction in logs
- Per-user data isolation

---

## [0.5.0] - 2026-01-08 (Week 5)

### Added
- Loop node for array iteration
- Nested loop support
- Custom loop variable names
- Conditional branching improvements
- Branch visualization in UI

### Changed
- Improved topological sort algorithm
- Better error handling in executor

---

## [0.4.0] - 2026-01-01 (Week 4)

### Added
- Scheduled workflow triggers
- Cron expression support
- Bull repeatable jobs integration
- Schedule management UI
- Template library with 7 templates

### Changed
- Refactored execution processor
- Improved WebSocket event structure

---

## [0.3.0] - 2025-12-25 (Week 3)

### Added
- Per-user OAuth authentication
- Slack OAuth integration
- Google OAuth integration (Gmail + Sheets)
- Encrypted token storage
- Token refresh for Google
- Integrations management page

### Security
- AES-256 encryption for OAuth tokens
- Secure token storage in MongoDB

---

## [0.2.0] - 2025-12-18 (Week 2)

### Added
- Workflow execution engine
- Node handler registry
- HTTP Request handler
- Delay handler
- Condition handler
- Variable handler
- Slack handler (webhook-based)
- Email handler (SMTP)
- Execution logging
- WebSocket real-time updates

### Changed
- Moved from synchronous to queue-based execution
- Added Bull queue for async processing

---

## [0.1.0] - 2025-12-11 (Week 1)

### Added
- Initial project setup
- NestJS backend scaffolding
- React + Vite frontend scaffolding
- MongoDB connection
- Redis connection
- User authentication (register/login)
- Basic workflow CRUD operations
- React Flow integration
- Visual workflow builder UI
- Node palette component
- Custom node component

---

## Development History

This project was developed over 6 weeks as a portfolio project demonstrating full-stack development skills.

| Week | Focus Area |
|------|------------|
| 1 | Project setup, auth, basic CRUD |
| 2 | Execution engine, node handlers |
| 3 | OAuth integrations, security |
| 4 | Scheduling, templates |
| 5 | Loops, advanced branching |
| 6 | Testing, documentation, deployment |

---

## Links

- [GitHub Repository](https://github.com/victor-nwoseh/flowforge)
- [Documentation](docs/)
- [API Reference](docs/API.md)
