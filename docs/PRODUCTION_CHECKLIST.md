# Production Checklist

Use this checklist to verify FlowForge is properly deployed and functioning.

## Infrastructure

- [x] MongoDB Atlas cluster created and connected
- [x] Redis Cloud instance created and connected
- [x] Railway backend service deployed
- [x] Railway frontend service deployed
- [x] Environment variables configured in Railway (both services)
- [x] Health check endpoint working: `/api/health`

## Security

- [x] JWT_SECRET is strong random string (min 32 characters)
- [x] ENCRYPTION_KEY is 32-character hex string for OAuth token encryption
- [x] MongoDB database user has strong password
- [x] Redis password configured
- [x] OAuth secrets not committed to git (in .env only)
- [x] CORS configured for production frontend domain only
- [x] Passwords hashed with bcrypt
- [x] OAuth tokens encrypted with AES-256

## OAuth Configuration

- [x] Slack app created in Slack API dashboard
- [x] Slack redirect URI set to production: `https://[backend-url]/api/auth/slack/callback`
- [x] Slack scopes configured: `chat:write`, `channels:read`
- [x] Google OAuth credentials created in Google Cloud Console
- [x] Google redirect URI set to production: `https://[backend-url]/api/auth/google/callback`
- [x] Gmail API enabled in Google Cloud Console
- [x] Google Sheets API enabled in Google Cloud Console
- [x] OAuth consent screen configured

## CI/CD

- [x] GitHub Actions CI workflow created (`.github/workflows/ci.yml`)
- [x] Backend tests run on every push
- [x] Frontend build verified on every push
- [x] Build status badge added to README
- [x] Railway auto-deploys on push to main (built-in feature)

## Documentation

- [x] README.md with features, setup, architecture overview
- [x] docs/API.md with complete endpoint reference
- [x] docs/USER_GUIDE.md for end users
- [x] docs/ARCHITECTURE.md with Mermaid diagrams
- [x] docs/DEPLOYMENT.md with Railway setup guide
- [x] CONTRIBUTING.md with code style and PR process
- [x] CHANGELOG.md with version history
- [x] LICENSE (MIT)

## Testing

- [x] Unit tests passing (72 tests)
- [x] E2E tests passing (52 tests)
- [x] Total: 124 tests across 12 suites

## Production Verification

Manually verify these in the deployed application:

- [ ] Register new user account
- [ ] Login with registered account
- [ ] Connect Slack via OAuth
- [ ] Connect Google via OAuth
- [ ] Create workflow with multiple nodes
- [ ] Execute workflow and see real-time progress
- [ ] View execution logs
- [ ] Import template from Templates page
- [ ] Health check returns `mongodb: connected`, `redis: connected`

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://flowforge-frontend-production.up.railway.app |
| Backend API | https://flowforge-backend-production.up.railway.app/api |
| Health Check | https://flowforge-backend-production.up.railway.app/api/health |

## Not Implemented (By Design)

These features were evaluated and skipped for v1.0:

- **Sentry Error Tracking** - Overkill for portfolio project, can add later if needed
- **Automated Database Backups** - Requires paid MongoDB Atlas tier, no real user data yet
- **Rate Limiting** - Can add if abuse becomes an issue
- **Log Rotation** - Railway handles log management automatically
