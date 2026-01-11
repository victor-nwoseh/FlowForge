# Contributing to FlowForge

Welcome to FlowForge! We're excited that you're interested in contributing. This document provides guidelines and information about how to contribute to this project.

## Welcome

FlowForge is an open-source workflow automation platform. Whether you're fixing bugs, improving documentation, or proposing new features, your contributions are welcome!

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git
- A code editor (VS Code recommended)

### Setting Up Your Development Environment

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy of the repository.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/flowforge.git
   cd flowforge
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/victor-nwoseh/flowforge.git
   ```

4. **Install dependencies**

   ```bash
   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

5. **Set up environment**

   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

6. **Start services**

   ```bash
   # Start MongoDB and Redis
   docker-compose up -d

   # Start backend (terminal 1)
   cd backend && npm run start:dev

   # Start frontend (terminal 2)
   cd frontend && npm run dev
   ```

7. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Making Changes

1. **Make your changes** in your feature branch
2. **Write tests** for new features or bug fixes
3. **Ensure all tests pass**
   ```bash
   cd backend && npm test && npm run test:e2e
   ```
4. **Commit your changes** with a descriptive message
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** to the main repository

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Code Style

### General Guidelines

- Use **TypeScript** for all code (both frontend and backend)
- Follow existing code formatting (Prettier configuration is included)
- Use **ESLint** and fix all warnings before committing
- Write descriptive variable and function names
- Add **JSDoc comments** for public methods and complex logic

### TypeScript

- Enable strict mode
- Avoid `any` type when possible; use proper interfaces
- Use interfaces for object shapes, types for unions/primitives

### Backend (NestJS)

- Follow NestJS module structure
- Use dependency injection
- Implement interfaces for services
- Add validation decorators to DTOs

### Frontend (React)

- Use functional components with hooks
- Keep components focused and small
- Use TypeScript interfaces for props
- Prefer composition over inheritance

### File Organization

```
# Backend
backend/src/
├── module-name/
│   ├── dto/           # Data transfer objects
│   ├── schemas/       # Mongoose schemas
│   ├── interfaces/    # TypeScript interfaces
│   ├── module-name.controller.ts
│   ├── module-name.service.ts
│   ├── module-name.module.ts
│   └── module-name.service.spec.ts  # Unit tests

# Frontend
frontend/src/
├── components/        # Reusable components
├── pages/            # Page components
├── hooks/            # Custom hooks
├── store/            # Zustand stores
├── services/         # API services
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

### Examples

```bash
feat(workflows): add loop node for array iteration

fix(auth): resolve token refresh race condition

docs(readme): update installation instructions

test(executor): add unit tests for conditional branching

refactor(connections): extract encryption logic to utility
```

## Testing Requirements

### Unit Tests

- Write unit tests for all new services and handlers
- Place tests in `.spec.ts` files next to the source file
- Use Jest mocks for external dependencies
- Aim for >70% code coverage on critical services

```bash
# Run unit tests
cd backend && npm test

# Run with coverage
cd backend && npm run test:cov
```

### Integration Tests (E2E)

- Write E2E tests for new API endpoints
- Place tests in `backend/test/` directory
- Tests should cover the full request/response cycle

```bash
# Run E2E tests (requires Docker services running)
cd backend && npm run test:e2e
```

### Manual Testing

- Test UI changes in multiple browsers (Chrome, Firefox, Safari)
- Test responsive design on different screen sizes
- Verify real-time WebSocket updates work correctly

## Pull Request Process

### Before Submitting

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**
   ```bash
   cd backend && npm run lint && npm test && npm run test:e2e
   cd ../frontend && npm run lint && npm run build
   ```

3. **Update documentation** if needed

### Submitting Your PR

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the PR template:
   - **Title**: Clear, concise description
   - **Description**: What changes were made and why
   - **Related Issues**: Link any related issues
   - **Screenshots**: Include for UI changes

### PR Title Format

Follow the same format as commit messages:

```
feat(workflows): add loop node for array iteration
fix(auth): resolve token refresh race condition
```

### After Submitting

- Respond to review feedback promptly
- Make requested changes in new commits
- Once approved, maintainers will merge your PR

## Reporting Bugs

### Before Reporting

1. Check existing issues to avoid duplicates
2. Try to reproduce the bug on the latest version
3. Gather relevant information (logs, screenshots)

### How to Report

1. Go to [GitHub Issues](https://github.com/victor-nwoseh/flowforge/issues)
2. Click "New Issue"
3. Select "Bug Report" template
4. Include:
   - **Description**: Clear description of the bug
   - **Steps to Reproduce**: Numbered steps to reproduce
   - **Expected Behavior**: What should happen
   - **Actual Behavior**: What actually happens
   - **Environment**: OS, Node version, browser
   - **Screenshots/Logs**: If applicable

## Feature Requests

### Before Requesting

1. Check existing issues for similar requests
2. Consider if it fits the project scope
3. Think through the implementation

### How to Request

1. Go to [GitHub Issues](https://github.com/victor-nwoseh/flowforge/issues)
2. Click "New Issue"
3. Select "Feature Request" template
4. Include:
   - **Description**: What feature you'd like
   - **Use Case**: Why you need this feature
   - **Proposed Solution**: How you think it could work
   - **Alternatives**: Other approaches you've considered

### Feature Discussion

- Major features should be discussed before implementation
- Open an issue to discuss the approach
- Wait for maintainer feedback before starting work

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good intentions

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security Issues**: Email directly (do not open public issues)

## Recognition

Contributors will be recognized in:
- The project README
- Release notes for significant contributions

Thank you for contributing to FlowForge!
