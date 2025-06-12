# 🚀 Railway Deployment Quick Fix

## Copy these exact values to Railway Environment Variables:

```
NODE_ENV=production
NEXTAUTH_URL=https://edgeai-ronis-bakery-production.up.railway.app
NEXTAUTH_SECRET=onV636Bmw+lHpz8vHDHPaoX+UkUTf3doEFbSZH8xau8=
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
HOSTNAME=0.0.0.0
```

## Steps:
1. Go to Railway Dashboard → Your Project → Variables
2. Add/Update each variable above
3. Make sure to replace `your_openai_api_key_here` with your actual OpenAI API key
4. Save changes
5. Railway will automatically redeploy

## After deployment:
- Visit: https://edgeai-ronis-bakery-production.up.railway.app
- Check health: https://edgeai-ronis-bakery-production.up.railway.app/api/health

## Test Credentials:
- Admin: `admin@ronisbakery.com` / `password123`
- Owner: `owner@ronisbakery.com` / `password123`
- Supplier: `supplier@hjb.com` / `password123`
- Driver: `driver@edgeai.com` / `password123`