# 🍞 Roni's Bakery - Multi-Tenant Management System

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-username/edgeai-ronis-bakery)

A comprehensive multi-tenant bakery management system with AI-powered chatbots for different user roles.

## 🚀 Quick Deploy to Railway

### 1. Deploy on Railway
1. Click the "Deploy on Railway" button above
2. Or go to [Railway.app](https://railway.app) → "New Project" → "Deploy from GitHub repo"
3. Select this repository

### 2. Set Environment Variables
In Railway dashboard → Variables, add these **exact** key-value pairs:

```
NODE_ENV=production
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=32CharacterRandomStringGeneratedBelow
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Generate NEXTAUTH_SECRET
Run this command locally to generate your secret:
```bash
openssl rand -base64 32
```
Copy the output and use it as your `NEXTAUTH_SECRET` value.

### 4. Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API → API Keys
3. Create a new secret key
4. Copy the key (starts with `sk-...`)

## 📋 Railway Environment Variables

Copy these exact keys and replace the values:

| Key | Value | Example |
|-----|--------|---------|
| `NODE_ENV` | `production` | `production` |
| `NEXTAUTH_URL` | `https://your-app.up.railway.app` | `https://ronis-bakery-production.up.railway.app` |
| `NEXTAUTH_SECRET` | `[32-char random string]` | `abc123def456ghi789jkl012mno345pqr678` |
| `OPENAI_API_KEY` | `sk-...your-key...` | `sk-1234567890abcdef...` |

## 🔐 Default Login Credentials

After deployment, login with these accounts:

| Role | Email | Password | Features |
|------|-------|----------|----------|
| **Admin** | admin@ronisbakery.com | password123 | System management, tenant overview |
| **Owner** | owner@ronisbakery.com | password123 | Inventory, orders, business analytics |
| **Supplier** | supplier@hjb.com | password123 | Order fulfillment, driver coordination |
| **Driver** | driver@edgeai.com | password123 | Delivery tracking, route optimization |

## 🤖 AI Chatbot Features

Each user role has a specialized AI assistant:

- **Admin**: System monitoring, user management, analytics
- **Owner**: Inventory management, purchase orders, business insights  
- **Supplier**: Order processing, delivery coordination, performance tracking
- **Driver**: Route optimization, delivery completion, earnings tracking

## 🔍 Verify Deployment

After deployment:
1. Visit your Railway app URL
2. Check health: `https://your-app.up.railway.app/api/health`
3. Login with admin credentials
4. Test the AI chatbot in bottom-right corner

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Authentication**: NextAuth.js with JWT
- **Database**: SQLite (auto-configured)
- **AI**: OpenAI GPT with function calling
- **Styling**: Tailwind CSS
- **Deployment**: Docker on Railway

## 📱 Key Features

### Multi-Role Dashboards
- **Admin**: System administration and monitoring
- **Owner**: Bakery operations and supply management
- **Supplier**: Order fulfillment and delivery coordination
- **Driver**: Delivery tracking and earnings

### AI-Powered Operations
- Role-specific chatbots with database access
- Natural language inventory management
- Automated order processing
- Intelligent delivery optimization

### Production Ready
- Multi-tenant architecture
- Comprehensive logging
- Health monitoring
- Docker containerization

## 🆘 Troubleshooting

### Common Issues:

**Build Fails**
- Check all environment variables are set
- Verify OpenAI API key is valid
- Review Railway build logs

**App Crashes**
- Ensure NEXTAUTH_SECRET is exactly 32+ characters
- Verify NEXTAUTH_URL matches your Railway domain
- Check OpenAI API key has sufficient credits

**Login Issues**
- Use exact email addresses from credentials table
- Password is case-sensitive: `password123`
- Try different user roles if one fails

**Chatbot Not Working**
- Verify OpenAI API key is correct
- Check Railway logs for API errors
- Ensure API key has GPT-4 access

### Get Help:
1. Check Railway logs in dashboard
2. Test health endpoint: `/api/health`  
3. Verify environment variables are set correctly

## 🎯 Next Steps

After successful deployment:
1. **Change default passwords** in production
2. **Add your own data** via the admin panel
3. **Customize branding** and styling
4. **Scale up** with PostgreSQL if needed

---

**Ready to deploy?** Click the Railway button above and follow the environment variable setup! 🚀