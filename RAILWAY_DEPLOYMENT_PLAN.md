# 🚀 Railway.app Deployment Plan

## Current Status Analysis

### ✅ What We Have:
- Next.js application with TypeScript
- Docker configuration (Dockerfile)
- Railway configuration (railway.json)
- SQLite database (local file-based)
- Environment variables in .env.local
- OpenAI integration for chatbots

### ⚠️ Known Issues to Address:
- SQLite is file-based (not ideal for Railway)
- Some errors exist (as mentioned)
- Need persistent storage solution
- Environment variables need migration

## 📋 Deployment Strategy Options

### Option 1: Docker Deployment (Recommended) 🐳
**Pros:**
- Consistent environment
- Already have Dockerfile
- All dependencies included
- Better control over build process

**Cons:**
- Larger deployment size
- Longer build times

### Option 2: GitHub Direct Deployment 🔗
**Pros:**
- Automatic deployments on push
- Simpler CI/CD
- Faster builds

**Cons:**
- Need to ensure all dependencies work
- Less control over environment

## 🎯 Recommended Approach: Docker + PostgreSQL

### Step 1: Database Migration Strategy

#### A. Update Database Configuration
```typescript
// src/utils/db.ts - Production-ready database config
import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const isProd = process.env.NODE_ENV === 'production';

export async function getDb() {
  if (isProd && process.env.DATABASE_URL) {
    // PostgreSQL for production
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    return pool;
  } else {
    // SQLite for development
    return open({
      filename: './ronis_bakery.db',
      driver: sqlite3.Database
    });
  }
}
```

#### B. Schema Migration Script
```sql
-- PostgreSQL schema (to be created)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50),
  tenant_id INTEGER REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  tenant_id INTEGER REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add other tables...
```

### Step 2: Environment Configuration

#### Railway Environment Variables:
```bash
# Production Environment Variables
NODE_ENV=production
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=your-generated-secret-here
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Optional
RAILWAY_ENVIRONMENT=production
PORT=3000
```

### Step 3: Updated Dockerfile for Production

```dockerfile
# Production-optimized Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache \
    postgresql-client \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy dependency files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install only production runtime dependencies
RUN apk add --no-cache libc6-compat postgresql-client

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy startup script
COPY --chown=nextjs:nodejs startup.js ./

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js || exit 1

CMD ["node", "server.js"]
```

### Step 4: Health Check Script

```javascript
// health-check.js
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  timeout: 2000,
  path: '/api/health'
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode == 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('ERROR:', err);
  process.exit(1);
});

request.end();
```

### Step 5: API Health Endpoint

```typescript
// src/pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check database connection
    const db = await getDb();
    
    // Simple query to verify connection
    if (process.env.NODE_ENV === 'production') {
      await db.query('SELECT 1');
    } else {
      await db.get('SELECT 1');
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '0.1.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🚂 Railway Deployment Steps

### 1. Prepare GitHub Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Railway Project Setup
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Choose "Deploy from GitHub repo"
4. Select your repository

### 3. Add PostgreSQL Database
1. In Railway dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set DATABASE_URL

### 4. Configure Environment Variables
In Railway dashboard → Variables:
```
NEXTAUTH_SECRET=<generate-with-openssl>
NEXTAUTH_URL=https://<your-app>.railway.app
OPENAI_API_KEY=<your-api-key>
NODE_ENV=production
```

### 5. Deploy
```bash
# Option A: Deploy via GitHub
git push origin main

# Option B: Deploy via Railway CLI
railway login
railway link
railway up
```

### 6. Post-Deployment Tasks
1. Run database migrations
2. Seed initial data
3. Test all endpoints
4. Monitor logs

## 🔧 Troubleshooting Guide

### Common Issues:

1. **Build Failures**
   - Check Node version compatibility
   - Ensure all dependencies are in package.json
   - Review build logs in Railway

2. **Database Connection**
   - Verify DATABASE_URL is set
   - Check SSL settings for PostgreSQL
   - Test connection with health endpoint

3. **Environment Variables**
   - Double-check all required vars are set
   - No quotes needed in Railway UI
   - Use Railway CLI to verify: `railway variables`

4. **Memory Issues**
   - Add to railway.json:
   ```json
   {
     "deploy": {
       "maxMemory": "512MB"
     }
   }
   ```

## 📊 Monitoring & Logs

### Railway Dashboard:
- Deployment logs
- Runtime logs
- Resource usage
- Environment variables

### Custom Logging:
```typescript
// Enhanced logging for production
import { logger } from '@/utils/logger';

logger.info('Application started', {
  environment: process.env.NODE_ENV,
  railway: process.env.RAILWAY_ENVIRONMENT,
  version: process.env.npm_package_version
});
```

## 🎯 Quick Deployment Checklist

- [ ] Update database configuration for PostgreSQL
- [ ] Add health check endpoint
- [ ] Update Dockerfile for production
- [ ] Commit all changes to GitHub
- [ ] Create Railway project
- [ ] Add PostgreSQL service
- [ ] Configure environment variables
- [ ] Deploy and monitor
- [ ] Run database migrations
- [ ] Test all functionality

## 💡 Alternative: Quick Docker Deploy

If you want to deploy quickly with current SQLite:

1. **Update railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "always"
  },
  "volumes": [
    {
      "mount": "/app/data",
      "name": "sqlite-data"
    }
  ]
}
```

2. **Deploy:**
```bash
railway login
railway link
railway up
```

This maintains SQLite with persistent volume storage.

## 🚀 Next Steps

1. Choose deployment strategy (PostgreSQL recommended)
2. Implement necessary code changes
3. Test locally with production settings
4. Deploy to Railway
5. Monitor and iterate

Ready to proceed with deployment! 🎉