# FlowForge Deployment Guide

This guide walks you through deploying FlowForge to production using Railway, with alternatives for Render and manual deployment.

## Prerequisites

Before deploying, ensure you have:

| Requirement | Purpose | Sign Up |
|-------------|---------|---------|
| GitHub Account | Source code hosting, CI/CD | [github.com](https://github.com) |
| Railway Account | Application hosting | [railway.app](https://railway.app) |
| MongoDB Atlas Account | Database hosting | [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) |
| Redis Cloud Account | Queue/cache hosting | [redis.com](https://redis.com) or [upstash.com](https://upstash.com) |
| Slack App | OAuth integration | [api.slack.com/apps](https://api.slack.com/apps) |
| Google Cloud Project | OAuth integration | [console.cloud.google.com](https://console.cloud.google.com) |

---

## Step 1: Set Up MongoDB Atlas

MongoDB Atlas provides a free tier that's perfect for getting started.

### Create Account and Cluster

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Try Free** and create an account
3. Choose your organization name
4. Click **Create a cluster**
5. Select **FREE - Shared** tier
6. Choose a cloud provider (AWS recommended) and region closest to your users
7. Click **Create Cluster** (takes 3-5 minutes to provision)

### Create Database User

1. In the left sidebar, click **Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Enter a username (e.g., `flowforge-admin`)
5. Click **Autogenerate Secure Password** and **copy the password**
6. Under "Database User Privileges", select **Read and write to any database**
7. Click **Add User**

### Configure Network Access

1. In the left sidebar, click **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`)
   - This is required for Railway/Render as their IPs change
   - For production, consider using a VPN or private networking
4. Click **Confirm**

### Get Connection String

1. Go back to **Database** in the sidebar
2. Click **Connect** on your cluster
3. Select **Connect your application**
4. Copy the connection string, it looks like:
   ```
   mongodb+srv://flowforge-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your database user password
6. Add the database name before the `?`:
   ```
   mongodb+srv://flowforge-admin:yourpassword@cluster0.xxxxx.mongodb.net/flowforge?retryWrites=true&w=majority
   ```
7. **Save this connection string** for your environment variables

---

## Step 2: Set Up Redis Cloud

Redis Cloud provides a free tier for caching and queue storage.

### Option A: Redis Cloud

1. Go to [redis.com/try-free](https://redis.com/try-free)
2. Create an account
3. Click **Create subscription**
4. Select **Fixed plan** > **Free** tier
5. Choose a cloud provider and region
6. Click **Create subscription**
7. Once created, click on your database
8. Copy the **Public endpoint** and **Default user password**
9. Your Redis URL format:
   ```
   redis://default:password@host:port
   ```

### Option B: Upstash (Serverless Alternative)

1. Go to [upstash.com](https://upstash.com)
2. Create an account
3. Click **Create Database**
4. Select a region
5. Copy the **UPSTASH_REDIS_REST_URL** or standard Redis URL
6. This is your `REDIS_URL`

### Connection Details

Save these for environment variables:

| Variable | Example |
|----------|---------|
| `REDIS_HOST` | `redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com` |
| `REDIS_PORT` | `12345` |
| `REDIS_PASSWORD` | `yourpassword` |

Or as a single URL:
```
REDIS_URL=redis://default:yourpassword@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

---

## Step 3: Configure OAuth Applications

Update your Slack and Google OAuth apps with production redirect URIs.

### Update Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your FlowForge app
3. Go to **OAuth & Permissions**
4. Under **Redirect URLs**, add your production URL:
   ```
   https://your-app.railway.app/api/auth/slack/callback
   ```
   (Replace `your-app.railway.app` with your actual domain)
5. Click **Save URLs**

### Update Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-app.railway.app/api/auth/google/callback
   ```
6. Click **Save**

> **Note**: You'll get your Railway domain after deployment. You may need to update these URLs and redeploy.

---

## Step 4: Prepare Repository

Ensure your repository is ready for deployment.

### Verify Project Structure

```
flowforge/
├── backend/
│   ├── Dockerfile          # Backend Docker configuration
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile          # Frontend Docker configuration
│   ├── package.json
│   └── src/
├── docker-compose.yml      # Local development
└── README.md
```

### Create Backend Dockerfile

If not already present, create `backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
```

### Create Frontend Dockerfile

If not already present, create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Create Frontend nginx.conf

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Push to GitHub

```bash
git add .
git commit -m "Add production Dockerfiles"
git push origin main
```

---

## Step 5: Deploy to Railway

Railway provides simple deployment from GitHub with automatic builds.

### Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **Start a New Project**
3. Select **Deploy from GitHub repo**
4. Connect your GitHub account if not already connected
5. Select your FlowForge repository
6. Railway will detect your project structure

### Deploy Backend Service

1. In your Railway project, click **New Service**
2. Select **GitHub Repo** > your FlowForge repo
3. Configure the service:
   - **Root Directory**: `backend`
   - **Builder**: Dockerfile
4. Click **Deploy**

### Configure Backend Environment Variables

1. Click on the backend service
2. Go to **Variables** tab
3. Add the following variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `REDIS_HOST` | Your Redis host |
| `REDIS_PORT` | Your Redis port |
| `REDIS_PASSWORD` | Your Redis password (if applicable) |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 16` |
| `SLACK_CLIENT_ID` | Your Slack app client ID |
| `SLACK_CLIENT_SECRET` | Your Slack app client secret |
| `SLACK_REDIRECT_URI` | `https://your-backend.railway.app/api/auth/slack/callback` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.railway.app/api/auth/google/callback` |
| `FRONTEND_URL` | `https://your-frontend.railway.app` |

### Deploy Frontend Service

1. Click **New Service** again
2. Select **GitHub Repo** > your FlowForge repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Builder**: Dockerfile
4. Add environment variable:
   - `VITE_API_URL`: `https://your-backend.railway.app`
5. Click **Deploy**

### Get Your Domains

1. Click on each service
2. Go to **Settings** > **Networking**
3. Click **Generate Domain** or add a custom domain
4. Note down both domains:
   - Backend: `https://flowforge-backend-xxx.railway.app`
   - Frontend: `https://flowforge-frontend-xxx.railway.app`

### Update OAuth Redirect URIs

Now that you have your domains:

1. Update `SLACK_REDIRECT_URI` in backend variables
2. Update `GOOGLE_REDIRECT_URI` in backend variables
3. Update `FRONTEND_URL` in backend variables
4. Update your Slack app redirect URLs (Step 3)
5. Update your Google OAuth redirect URLs (Step 3)
6. Redeploy backend service

---

## Step 6: Configure Custom Domain (Optional)

### Add Custom Domain in Railway

1. Go to your service **Settings**
2. Under **Networking**, click **Add Custom Domain**
3. Enter your domain (e.g., `api.flowforge.app` for backend)
4. Railway will show DNS records to configure

### Configure DNS

Add the following records in your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `your-backend.railway.app` |
| CNAME | `app` | `your-frontend.railway.app` |

Or for root domain:
| Type | Name | Value |
|------|------|-------|
| A | `@` | Railway's IP address |

### Update Environment Variables

After DNS propagates (can take up to 48 hours):

1. Update `FRONTEND_URL` to `https://app.yourdomain.com`
2. Update OAuth redirect URIs to use your custom domain
3. Update Slack and Google OAuth apps with new redirect URLs

---

## Step 7: Set Up CI/CD with GitHub Actions

Automate deployments on every push to main.

### Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Run backend tests
        run: cd backend && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy Backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          railway up --service backend

      - name: Deploy Frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd frontend
          railway up --service frontend
```

### Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add `RAILWAY_TOKEN`:
   - Get from Railway: **Account Settings** > **Tokens** > **Create Token**

---

## Alternative: Deploy to Render

Render is another excellent option for deployment.

### Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Deploy Backend

1. Click **New** > **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `flowforge-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Instance Type**: Free (or paid for better performance)
4. Add environment variables (same as Railway)
5. Click **Create Web Service**

### Deploy Frontend

1. Click **New** > **Static Site**
2. Connect your repository
3. Configure:
   - **Name**: `flowforge-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL`: Your backend URL
5. Click **Create Static Site**

### Configure Redirects (Render)

Create `frontend/public/_redirects`:

```
/* /index.html 200
```

This enables client-side routing for the SPA.

---

## Alternative: Manual Deployment

For VPS or dedicated servers.

### Server Requirements

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+
- Docker and Docker Compose
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt)

### Deployment Steps

1. **SSH into your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone repository**
   ```bash
   git clone https://github.com/victor-nwoseh/flowforge.git
   cd flowforge
   ```

3. **Create production environment file**
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   # Add all production environment variables
   ```

4. **Build and run with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

5. **Configure Nginx reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl;
       server_name api.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Set up SSL with Certbot**
   ```bash
   sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
   ```

---

## Monitoring and Logs

### Railway Logs

1. Go to your service in Railway
2. Click **Deployments** to see deployment logs
3. Click **Logs** for runtime logs
4. Use filters to search for specific errors

### Render Logs

1. Go to your service in Render
2. Click **Logs** tab
3. Filter by log level or search

### MongoDB Atlas Monitoring

1. Go to your cluster in Atlas
2. Click **Metrics** for performance graphs
3. Set up **Alerts** for:
   - High CPU usage
   - Low disk space
   - Connection spikes

### Setting Up Error Tracking (Sentry)

1. Create account at [sentry.io](https://sentry.io)
2. Create a new project for Node.js
3. Install Sentry in backend:
   ```bash
   npm install @sentry/node
   ```
4. Initialize in `main.ts`:
   ```typescript
   import * as Sentry from '@sentry/node';
   Sentry.init({ dsn: process.env.SENTRY_DSN });
   ```
5. Add `SENTRY_DSN` to environment variables

---

## Troubleshooting Deployment

### Build Fails

**Symptom**: Docker build fails during deployment

**Solutions**:
1. Test build locally first:
   ```bash
   cd backend && docker build -t test .
   ```
2. Check for missing dependencies in package.json
3. Verify Dockerfile syntax
4. Check build logs for specific errors

### Application Crashes on Start

**Symptom**: Service deploys but crashes immediately

**Solutions**:
1. Check environment variables are set correctly
2. Verify MongoDB connection string is valid
3. Check Redis connection details
4. Look at runtime logs for error messages
5. Ensure PORT matches what Railway/Render expects

### Database Connection Fails

**Symptom**: "MongoServerError: connection refused"

**Solutions**:
1. Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Check connection string format is correct
3. Verify database user credentials
4. Ensure cluster is in "Active" state

### OAuth Redirect Fails

**Symptom**: "redirect_uri_mismatch" error

**Solutions**:
1. Verify redirect URI in environment matches exactly:
   - Same protocol (https vs http)
   - Same domain
   - Same path
   - No trailing slash differences
2. Update OAuth app settings in Slack/Google
3. Wait a few minutes for changes to propagate
4. Redeploy after updating variables

### WebSocket Connection Fails

**Symptom**: Real-time updates don't work

**Solutions**:
1. Ensure WebSocket upgrade headers are passed through proxy
2. Check CORS settings allow your frontend domain
3. Verify Socket.io client connects to correct URL
4. Check for firewall blocking WebSocket connections

### SSL Certificate Issues

**Symptom**: "NET::ERR_CERT_INVALID" in browser

**Solutions**:
1. Railway/Render: SSL is automatic, wait for provisioning
2. Custom domain: Verify DNS is configured correctly
3. Manual: Run `certbot renew` if certificate expired

---

## Production Checklist

Before going live, verify:

- [ ] MongoDB Atlas cluster is running
- [ ] Redis Cloud database is active
- [ ] All environment variables are set
- [ ] OAuth redirect URIs are updated
- [ ] SSL certificates are valid
- [ ] CORS allows production frontend URL
- [ ] Database indexes are created
- [ ] Error tracking is configured
- [ ] Backup strategy is in place
- [ ] Monitoring alerts are configured
- [ ] Rate limiting is considered
- [ ] Secrets are not exposed in logs

---

## Scaling Considerations

### Horizontal Scaling

- Railway and Render support multiple instances
- Redis enables queue sharing across instances
- Use Redis adapter for Socket.io in multi-instance setup

### Database Scaling

- MongoDB Atlas auto-scales storage
- Upgrade cluster tier for more CPU/RAM
- Add read replicas for read-heavy workloads

### Performance Optimization

- Enable MongoDB indexes on frequently queried fields
- Use Redis caching for repeated API calls
- Implement rate limiting to prevent abuse
- Consider CDN for frontend assets

---

## Cost Estimation

### Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Railway | $5 credit/month |
| Render | 750 hours/month |
| MongoDB Atlas | 512MB storage |
| Redis Cloud | 30MB |
| Upstash | 10K commands/day |

### Production Costs (Estimated)

| Service | ~Monthly Cost |
|---------|---------------|
| Railway (Hobby) | $5-20 |
| MongoDB Atlas (M10) | $57 |
| Redis Cloud (1GB) | $7 |
| Custom Domain | $10-15/year |

Total estimated: **$70-90/month** for a production setup

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting-deployment) section
2. Review service-specific documentation:
   - [Railway Docs](https://docs.railway.app)
   - [Render Docs](https://render.com/docs)
   - [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
3. Open an issue on GitHub with:
   - Error messages
   - Environment (Railway/Render/Manual)
   - Steps to reproduce
