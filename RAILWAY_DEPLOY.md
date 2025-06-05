# 🚄 Railway Deployment Guide - EdgeAI Roni's Bakery

## ✅ Docker Container Tested and Working!

The EdgeAI Roni's Bakery application has been successfully tested with your OpenAI API key and is ready for Railway deployment.

### 🔑 Environment Variables for Railway

Set these environment variables in your Railway project:

```bash
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
APP_NAME=Roni's Coffee Shop Ordering System
LOCATION=Belsize Park, London
```

### 🚀 Railway Deployment Steps

1. **Go to Railway**
   - Visit: https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose: `haba-create/edgeai-ronis-bakery`

3. **Configure Environment Variables**
   - Go to your project → Variables
   - Add all the environment variables listed above
   - **IMPORTANT**: Make sure to set the `OPENAI_API_KEY`

4. **Deployment Settings** (Railway will auto-detect these)
   - **Build Method**: Dockerfile ✅
   - **Port**: 3000 ✅
   - **Health Check**: `/api/dashboard` ✅
   - **Start Command**: `node server.js` ✅

5. **Deploy**
   - Railway will automatically build and deploy
   - Build time: ~3-5 minutes
   - You'll get a public URL like: `https://your-app-name.up.railway.app`

### 🧪 Testing Your Deployment

Once deployed, test these endpoints:

1. **Main Application**
   ```bash
   curl https://your-app-name.up.railway.app
   ```

2. **Initialize Database** (Run this first!)
   ```bash
   curl -X POST https://your-app-name.up.railway.app/api/seed
   ```

3. **Health Check**
   ```bash
   curl https://your-app-name.up.railway.app/api/dashboard
   ```

4. **AI Chatbot Test**
   - Visit the main URL in your browser
   - Try the AI chatbot features

### 📱 Application Features Available

#### 🏪 Multi-Platform Access
- **Main Portal**: `/` - Roni's Bakery ordering interface
- **Supplier Portal**: `/supplier-portal` - Supplier management
- **Delivery Tracking**: `/delivery-tracking` - Real-time GPS map

#### 🤖 AI-Powered Features (OpenAI Integration)
- **Smart Ordering Assistant**: Ask about inventory, orders, deliveries
- **Supplier Chat**: Automated supplier communication
- **Delivery Tracking**: "Where is my delivery?" queries
- **Inventory Management**: Stock level alerts and recommendations

#### 🗺️ London GPS Tracking
- **6 Roni's Branches**: Belsize Park, Hampstead, West Hampstead, Muswell Hill, Brent Cross, Swiss Cottage
- **6 Major Suppliers**: Real supplier network across London
- **24 Active Deliveries**: Complete delivery matrix with live tracking
- **Interactive Map**: Real-time driver locations updated every 10 seconds

#### 💬 Example AI Queries
Try these with the chatbot:
- "Show me all active deliveries"
- "When will order #3005 arrive?"
- "What's our current stock of flour?"
- "Which products need reordering?"
- "Track delivery from Heritage Jewish Breads"

### 🔧 Technical Details

- **Framework**: Next.js 14 + TypeScript
- **Database**: SQLite (automatically initialized)
- **AI Model**: OpenAI GPT-4o-mini
- **Maps**: Leaflet with real-time GPS
- **Container**: Docker with security hardening
- **Health Monitoring**: Built-in health checks

### 📊 Monitoring & Logs

- **Railway Logs**: View in Railway dashboard
- **Health Status**: Monitor via `/api/dashboard`
- **Database Status**: SQLite with automatic backups
- **Performance**: Railway provides metrics

### 🎉 Your AI-Powered Bakery is Ready!

Once deployed on Railway, you'll have a fully functional AI-powered ordering and delivery system for Roni's Bakery with:

✅ **Working OpenAI Integration**  
✅ **Real-time GPS Tracking**  
✅ **Multi-portal System**  
✅ **Automatic Database Setup**  
✅ **Production-ready Docker Container**  
✅ **Health Monitoring**  

Visit your Railway URL and start managing bakery operations with AI! 🍞🤖