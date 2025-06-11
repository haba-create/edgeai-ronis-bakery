# 🚀 Quick Railway Deployment Guide

## Option 1: Deploy with Current Setup (SQLite) - FASTEST ⚡

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Create New Project
```bash
railway init
```

### 4. Set Environment Variables
```bash
# Generate NextAuth secret
openssl rand -base64 32

# Add to Railway (copy the output above)
railway variables set NEXTAUTH_SECRET="your-generated-secret"
railway variables set NEXTAUTH_URL="https://your-app.up.railway.app"
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set NODE_ENV="production"
```

### 5. Deploy
```bash
railway up
```

### 6. Open Your App
```bash
railway open
```

---

## Option 2: Deploy via GitHub (Recommended) 🔗

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. On Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-deploy!

### 3. Configure Environment
In Railway dashboard → Variables tab, add:
```
NEXTAUTH_SECRET=<generate-with-openssl>
NEXTAUTH_URL=https://<your-app>.railway.app
OPENAI_API_KEY=<your-key>
NODE_ENV=production
```

---

## Option 3: Use Our Helper Script 🛠️

```bash
# Run the deployment helper
./scripts/deploy-railway.sh
```

This will guide you through the entire process!

---

## 🔍 Verify Deployment

### Check Health
```bash
curl https://your-app.up.railway.app/api/health
```

### View Logs
```bash
railway logs
```

### Monitor in Dashboard
Visit your Railway dashboard to see:
- Deployment status
- Resource usage
- Logs
- Environment variables

---

## ⚠️ Important Notes

1. **First Deploy**: May take 5-10 minutes
2. **SQLite Data**: Will reset on each deploy (use PostgreSQL for persistence)
3. **Errors**: Check logs with `railway logs`
4. **Domain**: Get your app URL from Railway dashboard

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Check logs
railway logs

# Common fix: Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### App Crashes
- Check environment variables are set
- Verify NEXTAUTH_SECRET is valid
- Check OpenAI API key is correct

### Database Issues
- SQLite file may not persist
- Consider upgrading to PostgreSQL:
  ```bash
  railway add postgresql
  ```

---

## 🎉 Success!

Your app should be live at:
```
https://<your-project>.up.railway.app
```

Default login credentials:
- Admin: `admin@ronisbakery.com` / `password123`
- Owner: `owner@ronisbakery.com` / `password123`
- Supplier: `supplier@hjb.com` / `password123`
- Driver: `driver@edgeai.com` / `password123`