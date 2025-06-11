#!/bin/bash

# Railway Deployment Script
# This script helps prepare and deploy the app to Railway

echo "🚀 Railway Deployment Helper"
echo "=========================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n📋 Checking prerequisites..."

if ! command_exists railway; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
else
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
fi

if ! command_exists git; then
    echo -e "${RED}❌ Git not installed${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Git installed${NC}"
fi

# Check if in git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    echo "Initialize with: git init"
    exit 1
else
    echo -e "${GREEN}✅ Git repository found${NC}"
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo "Commit your changes before deploying"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Generate NextAuth secret if needed
echo -e "\n🔐 Generating NextAuth secret..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Generated: ${NEXTAUTH_SECRET}${NC}"
echo "(Save this in Railway environment variables)"

# Check Railway login
echo -e "\n🔑 Checking Railway authentication..."
if ! railway whoami >/dev/null 2>&1; then
    echo -e "${YELLOW}Please login to Railway:${NC}"
    railway login
fi

# Link to Railway project
echo -e "\n🔗 Linking to Railway project..."
if ! railway status >/dev/null 2>&1; then
    echo -e "${YELLOW}No Railway project linked${NC}"
    echo "Options:"
    echo "1. Link existing project: railway link"
    echo "2. Create new project: railway init"
    read -p "Choose option (1/2): " option
    
    if [ "$option" = "1" ]; then
        railway link
    elif [ "$option" = "2" ]; then
        railway init
    else
        echo -e "${RED}Invalid option${NC}"
        exit 1
    fi
fi

# Display current Railway project
echo -e "\n📦 Current Railway project:"
railway status

# Environment variables checklist
echo -e "\n📝 Environment Variables Checklist"
echo "Make sure these are set in Railway dashboard:"
echo "- [ ] NODE_ENV=production"
echo "- [ ] NEXTAUTH_URL=https://your-app.up.railway.app"
echo "- [ ] NEXTAUTH_SECRET=${NEXTAUTH_SECRET}"
echo "- [ ] OPENAI_API_KEY=your-key-here"

# Deployment options
echo -e "\n🚀 Deployment Options:"
echo "1. Deploy with current Dockerfile"
echo "2. Deploy with production Dockerfile"
echo "3. Deploy via GitHub (if connected)"
echo "4. View deployment guide"
echo "5. Exit"

read -p "Choose option (1-5): " deploy_option

case $deploy_option in
    1)
        echo -e "\n${GREEN}Deploying with current Dockerfile...${NC}"
        railway up
        ;;
    2)
        echo -e "\n${GREEN}Deploying with production Dockerfile...${NC}"
        # Temporarily rename Dockerfiles
        mv Dockerfile Dockerfile.dev
        mv Dockerfile.production Dockerfile
        railway up
        # Restore original names
        mv Dockerfile Dockerfile.production
        mv Dockerfile.dev Dockerfile
        ;;
    3)
        echo -e "\n${GREEN}Pushing to GitHub for automatic deployment...${NC}"
        git push origin main
        echo "Check Railway dashboard for deployment status"
        ;;
    4)
        echo -e "\n${GREEN}Opening deployment guide...${NC}"
        if command_exists open; then
            open RAILWAY_DEPLOYMENT_PLAN.md
        else
            cat RAILWAY_DEPLOYMENT_PLAN.md
        fi
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Post-deployment steps
echo -e "\n📋 Post-Deployment Steps:"
echo "1. Check deployment logs: railway logs"
echo "2. Open deployed app: railway open"
echo "3. Monitor health: curl https://your-app.up.railway.app/api/health"
echo "4. Run database migrations if needed"

echo -e "\n${GREEN}✅ Deployment process completed!${NC}"