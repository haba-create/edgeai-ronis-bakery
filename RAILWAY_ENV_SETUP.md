# 🚨 REQUIRED Railway Environment Variables

**CRITICAL**: Set these EXACT environment variables in Railway dashboard:

```
NODE_ENV=production
NEXTAUTH_URL=https://edgeai-ronis-bakery-production.up.railway.app
NEXTAUTH_SECRET=onV636Bmw+lHpz8vHDHPaoX+UkUTf3doEFbSZH8xau8=
OPENAI_API_KEY=your_openai_api_key_here
```

## Why These Are Critical:

1. **NODE_ENV=production** - Enables production database path
2. **NEXTAUTH_URL** - MUST match your Railway domain exactly
3. **NEXTAUTH_SECRET** - Required for authentication to work
4. **OPENAI_API_KEY** - Required for AI features

## Steps:
1. Go to Railway Dashboard → Your Project → Variables
2. Click "New Variable" for each one above
3. Copy the key and value exactly
4. Save and let Railway redeploy

**Without these, the app will fail to start properly!**