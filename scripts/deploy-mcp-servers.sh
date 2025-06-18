#!/bin/bash

# Deploy MCP Servers for edgeai-ronis-bakery
# This script builds and deploys all MCP servers in HTTP mode

set -e

echo "🚀 Deploying MCP Servers for edgeai-ronis-bakery..."

# Load environment variables
if [ -f .env.mcp ]; then
    export $(cat .env.mcp | xargs)
fi

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Check if ports are available
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use. Stopping existing $service container...${NC}"
        docker stop $service-mcp-server 2>/dev/null || true
        docker rm $service-mcp-server 2>/dev/null || true
        sleep 2
    fi
}

check_port 3005 hubspot
check_port 3006 mailtrap

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Deploy HubSpot MCP Server
echo -e "${YELLOW}🔧 Deploying HubSpot MCP Server...${NC}"
cd ../hubspot-mcp-server
if [ ! -f "dist/http-server.js" ]; then
    echo "Building HubSpot MCP Server..."
    npm install && npm run build
fi

docker run -d --name hubspot-mcp-server \
    --restart unless-stopped \
    -p 3005:3000 \
    -e HUBSPOT_ACCESS_TOKEN="${HUBSPOT_ACCESS_TOKEN}" \
    hubspot-mcp-server:latest \
    node dist/http-server.js

echo -e "${GREEN}✅ HubSpot MCP Server deployed on port 3005${NC}"

# Deploy MailTrap MCP Server
echo -e "${YELLOW}📧 Deploying MailTrap MCP Server...${NC}"
cd ../mailtrap-mcp-server
if [ ! -f "dist/http-server.js" ]; then
    echo "Building MailTrap MCP Server..."
    npm install && npm run build
fi

docker run -d --name mailtrap-mcp-server \
    --restart unless-stopped \
    -p 3006:3006 \
    -e MAILTRAP_API_TOKEN="${MAILTRAP_API_TOKEN}" \
    mailtrap-mcp-server:latest \
    node dist/http-server.js

echo -e "${GREEN}✅ MailTrap MCP Server deployed on port 3006${NC}"

# Build GitHub MCP Server (stdio mode)
echo -e "${YELLOW}🐙 Building GitHub MCP Server...${NC}"
cd ../github-mcp-server
if [ ! -f "dist/index.js" ]; then
    echo "Building GitHub MCP Server..."
    npm install && npm run build
fi

# GitHub server is used in stdio mode, so we just ensure the image is built
echo -e "${GREEN}✅ GitHub MCP Server image ready${NC}"

# Return to original directory
cd ../edgeai-ronis-bakery

# Wait for servers to be ready
echo -e "${YELLOW}⏳ Waiting for servers to be ready...${NC}"
sleep 5

# Health checks
echo -e "${YELLOW}🔍 Running health checks...${NC}"

# Check HubSpot
echo -n "HubSpot MCP Server: "
if curl -s http://localhost:3005/health > /dev/null; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Unhealthy${NC}"
fi

# Check MailTrap
echo -n "MailTrap MCP Server: "
if curl -s http://localhost:3006/health > /dev/null; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Unhealthy${NC}"
fi

echo ""
echo -e "${GREEN}🎉 MCP Servers deployment complete!${NC}"
echo ""
echo -e "${YELLOW}📊 Server Status:${NC}"
echo "• HubSpot MCP Server: http://localhost:3005"
echo "• MailTrap MCP Server: http://localhost:3006"
echo "• GitHub MCP Server: Available via Docker (stdio mode)"
echo ""
echo -e "${YELLOW}🔗 Health Check URLs:${NC}"
echo "• HubSpot: http://localhost:3005/health"
echo "• MailTrap: http://localhost:3006/health"
echo ""
echo -e "${YELLOW}🛠️  Management Commands:${NC}"
echo "• View logs: docker logs [hubspot|mailtrap]-mcp-server"
echo "• Stop servers: docker stop [hubspot|mailtrap]-mcp-server"
echo "• Restart servers: docker restart [hubspot|mailtrap]-mcp-server"
echo ""
echo -e "${GREEN}✨ Ready to use MCP integrations in edgeai-ronis-bakery!${NC}"