# FlowForge

[![CI](https://github.com/victor-nwoseh/FlowForge/actions/workflows/ci.yml/badge.svg)](https://github.com/victor-nwoseh/FlowForge/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-124%20passing-success)
![Coverage](https://img.shields.io/badge/coverage-85%25%2B%20critical%20services-brightgreen)
![Uptime](https://img.shields.io/badge/uptime-99%25%2B-success)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A production multi-tenant SaaS workflow automation platform with 124 automated tests, GitHub Actions CI/CD, and OAuth 2.0 integrations. Build powerful automations by connecting services like Slack, Gmail, and Google Sheets without writing code.

---

### 🚀 **Production Deployment**

**Live Application:** [flowforge-frontend-production.up.railway.app](https://flowforge-frontend-production.up.railway.app/)
**Demo Video:** [Watch 2 minute walkthrough](https://drive.google.com/file/d/1p-NlPutYT7if5ugHHAU6WNTY3nLL8x6x/view?usp=sharing)
**Test Coverage:** 124 tests (72 unit, 52 E2E) across 12 test suites with 85%+ coverage on critical services
**CI/CD:** Automated testing and deployment via GitHub Actions
**Architecture:** Multi-tenant with AES-256 encrypted OAuth tokens, real-time WebSocket monitoring, Redis-backed job queues

---

<p align="center">
  <img src="https://raw.githubusercontent.com/victor-nwoseh/FlowForge/main/docs/images/workflow-builder.png" alt="FlowForge Visual Workflow Builder" width="800">
</p>

<p align="center">
  <em>Visual workflow builder with drag-and-drop interface and real-time execution monitoring</em>
</p>

---

## Overview

FlowForge is an open-source workflow automation platform inspired by tools like Zapier and n8n. It enables users to create automated workflows through a visual drag-and-drop interface, connecting various services and triggers to automate repetitive tasks. Each user maintains isolated credentials, ensuring secure multi-tenant operation with encrypted OAuth token storage.

## Features

- **Visual Workflow Builder** - Drag-and-drop interface powered by React Flow for creating complex automation workflows
- **Per-User OAuth Authentication** - Secure Slack, Gmail, and Google Sheets integrations with isolated credentials per user
- **Scheduled Workflows** - Trigger workflows on a schedule using cron expressions with Bull queue backing
- **Advanced Conditional Branching** - If/else logic with support for multiple operators (==, !=, >, <, >=, <=)
- **Loop Iterations** - Process arrays of data with loop nodes supporting custom variables and nested iterations
- **Real-Time Execution Monitoring** - Live progress updates via WebSocket showing node-by-node execution status
- **7+ Pre-Built Templates** - Ready-to-use workflow templates to get started quickly
- **Multi-User Isolation** - Each user's workflows use their own OAuth tokens with AES-256 encrypted storage
- **Variable Replacement System** - Dynamic data passing between nodes using `{{variable}}` syntax

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | NestJS, TypeScript, MongoDB, Redis, Bull Queue |
| **Frontend** | React 18, TypeScript, Vite, React Flow, TanStack Query, Zustand, Tailwind CSS |
| **Real-Time** | Socket.io |
| **Authentication** | JWT, Passport, bcrypt |
| **Testing** | Jest, Supertest |
| **DevOps** | Docker, Docker Compose |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **npm** (bundled with Node.js)
- **Git** ([Download](https://git-scm.com/))

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/victor-nwoseh/flowforge.git
   cd flowforge
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` with your configuration (see [Environment Variables](#environment-variables) section).

3. **Start MongoDB and Redis**
   ```bash
   docker-compose up -d
   ```

4. **Install backend dependencies**
   ```bash
   cd backend && npm install
   ```

5. **Install frontend dependencies**
   ```bash
   cd ../frontend && npm install
   ```

6. **Start the backend server**
   ```bash
   cd ../backend && npm run start:dev
   ```
   Backend runs at http://localhost:3001

7. **Start the frontend server** (in a new terminal)
   ```bash
   cd frontend && npm run dev
   ```
   Frontend runs at http://localhost:5173

8. **Open your browser**

   Navigate to http://localhost:5173 and create an account to get started.

## Environment Variables

Configure these variables in `backend/.env`:

### Core Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/flowforge` |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secure-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `ENCRYPTION_KEY` | 32-char hex key for OAuth token encryption | Generate with `openssl rand -hex 16` |
| `FRONTEND_URL` | Frontend base URL for redirects | `http://localhost:5173` |

### OAuth Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SLACK_CLIENT_ID` | Slack OAuth client ID | `123456789.987654321` |
| `SLACK_CLIENT_SECRET` | Slack OAuth client secret | `abc123def456` |
| `SLACK_REDIRECT_URI` | Slack OAuth callback URL | `http://localhost:3001/api/auth/slack/callback` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-abc123` |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL | `http://localhost:3001/api/auth/google/callback` |

### External Services (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Incoming webhook for legacy Slack notifications | `https://hooks.slack.com/services/XXX/XXX/XXX` |
| `SMTP_HOST` | SMTP server for email sending | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username/email | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password (use App Password for Gmail) | `xxxx-xxxx-xxxx-xxxx` |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Service account email for Sheets API | `service@project.iam.gserviceaccount.com` |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Service account private key | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `WEBHOOK_BASE_URL` | Public URL for webhook triggers | `https://your-domain.ngrok.io` |

## OAuth Setup

### Slack OAuth Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and sign in
2. Click **Create New App** > **From scratch**
3. Enter app name (e.g., "FlowForge") and select your workspace
4. Navigate to **OAuth & Permissions** in the sidebar
5. Under **Scopes**, add Bot Token Scopes:
   - `chat:write` - Send messages
   - `channels:read` - View channel list
6. Under **Redirect URLs**, add:
   - Development: `http://localhost:3001/api/auth/slack/callback`
   - Production: `https://your-domain.com/api/auth/slack/callback`
7. Go to **Basic Information** and copy **Client ID** and **Client Secret**
8. Add to your `.env`:
   ```env
   SLACK_CLIENT_ID=your_client_id
   SLACK_CLIENT_SECRET=your_client_secret
   SLACK_REDIRECT_URI=http://localhost:3001/api/auth/slack/callback
   ```

### Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create/select a project
2. Navigate to **APIs & Services** > **OAuth consent screen**
   - Configure consent screen (External for testing, Internal for organization)
   - Add scopes: `email`, `profile`, `gmail.send`, `spreadsheets`
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Select **Web application** as the application type
6. Under **Authorized redirect URIs**, add:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
7. Copy **Client ID** and **Client Secret**
8. Navigate to **APIs & Services** > **Library** and enable:
   - Gmail API
   - Google Sheets API
9. Add to your `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
   ```

### Security Notes

- OAuth tokens are encrypted in the database using AES-256 with `ENCRYPTION_KEY`
- Generate a secure encryption key: `openssl rand -hex 16`
- Never commit `.env` to version control
- If the encryption key changes, all stored tokens become unreadable

## Running Tests

FlowForge includes comprehensive test coverage with 124 tests across 12 test suites.

```bash
# Navigate to backend directory
cd backend

# Run unit tests (72 tests)
npm test

# Run integration/e2e tests (52 tests) - requires Docker services running
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

### Test Coverage

| Service | Coverage |
|---------|----------|
| Workflow Executor | 78.96% |
| Connections Service | 89.65% |
| Schedules Service | 83.33% |
| Condition Handler | 95% |
| Loop Handler | 97.36% |
| Email Handler | 97.61% |
| Slack Handler | 83.72% |

## Project Structure

```
flowforge/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── auth/           # Authentication module (JWT, OAuth)
│   │   ├── users/          # User management
│   │   ├── workflows/      # Workflow CRUD and execution
│   │   │   ├── handlers/   # Node type handlers
│   │   │   └── services/   # Workflow executor, registry
│   │   ├── executions/     # Execution tracking, WebSocket gateway
│   │   ├── connections/    # OAuth token management
│   │   ├── schedules/      # Cron scheduling
│   │   └── templates/      # Pre-built workflow templates
│   └── test/               # E2E tests
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── store/          # Zustand state management
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API client services
│   └── public/             # Static assets
├── docker-compose.yml      # MongoDB + Redis services
└── README.md
```

## Node Types

| Type | Description |
|------|-------------|
| **Webhook** | Trigger workflows via HTTP POST requests |
| **HTTP Request** | Make GET/POST/PUT/DELETE requests to external APIs |
| **Condition** | If/else branching based on variable comparisons |
| **Loop** | Iterate over arrays with access to `{{loop.item}}` and `{{loop.index}}` |
| **Variable** | Create or update workflow variables |
| **Delay** | Pause execution for a specified duration |
| **Slack** | Send messages to Slack channels (OAuth) |
| **Email** | Send emails via Gmail (OAuth) |
| **Google Sheets** | Read from or append to Google Sheets |

## API Reference

See [docs/API.md](docs/API.md) for complete API documentation.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/workflows` | List user workflows |
| POST | `/api/workflows` | Create workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow |
| POST | `/api/webhooks/:workflowId` | Webhook trigger |
| GET | `/api/executions` | List execution history |
| GET | `/api/connections` | List OAuth connections |
| POST | `/api/schedules` | Create scheduled trigger |

## Deployment

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Quick Deploy Options

- **Railway** - One-click deployment with MongoDB and Redis add-ons
- **Docker** - Production-ready multi-stage Dockerfiles included
- **Manual** - Deploy to any Node.js hosting with MongoDB and Redis access

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and data flow diagrams
- [API Reference](docs/API.md) - Complete REST API documentation
- [User Guide](docs/USER_GUIDE.md) - How to create workflows and connect integrations
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Slack calls return `404` or `invalid_payload` | Verify webhook URL belongs to correct workspace/channel |
| SMTP login fails (`534-5.7.14...`) | Use App Password with 2FA enabled, not regular password |
| Google Sheets `PERMISSION_DENIED` | Share spreadsheet with service account email |
| Webhook handler never receives data | Ensure `WEBHOOK_BASE_URL` points to public URL/tunnel |
| Tests fail with memory error | Tests are configured with `maxWorkers: 1` to prevent this |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure all tests pass before submitting a PR:
```bash
cd backend && npm test && npm run test:e2e
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Victor Nwoseh**
- GitHub: [@victor-nwoseh](https://github.com/victor-nwoseh)
- Portfolio: [victor-nwoseh.vercel.app](https://victor-nwoseh.vercel.app/)
- Email: victor.nwoseh05@gmail.com

---

Built with NestJS, React, and MongoDB
