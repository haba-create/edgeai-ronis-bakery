#!/bin/bash

echo "=================================="
echo "ADMIN CHATBOT TEST SCRIPT"
echo "=================================="
echo ""

# Test on Docker deployment (port 3003)
echo "Testing on DOCKER deployment (port 3003):"
echo "-----------------------------------------"

# 1. Health check
echo "1. Health Check:"
curl -s http://localhost:3003/api/health | jq .
echo ""

# 2. Test admin agent directly
echo "2. Testing Admin Agent API directly:"
curl -X POST http://localhost:3003/api/admin-agent \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=mock-session" \
  -d '{"message": "How many users are in the system?"}' | jq .
echo ""

# 3. Check if OpenAI is configured
echo "3. Checking OpenAI configuration:"
curl -s http://localhost:3003/api/test | jq '.environment.OPENAI_API_KEY' | grep -v "null\|undefined\|your_openai_api_key_here" && echo "OpenAI: CONFIGURED" || echo "OpenAI: NOT CONFIGURED"
echo ""

# 4. Test unified agent
echo "4. Testing Unified Agent:"
curl -X POST http://localhost:3003/api/unified-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "How many users do we have?", "role": "admin"}' | jq .
echo ""

# 5. Check Docker logs for errors
echo "5. Recent Docker logs (errors/warnings):"
docker logs ronis-bakery-production --tail 20 | grep -E "(ERROR|WARN|error|Error)" || echo "No errors found in recent logs"
echo ""

echo "=================================="
echo "TEST COMPLETE"
echo "=================================="
echo ""
echo "WHAT TO CHECK:"
echo "1. Is health check returning 'healthy'?"
echo "2. Is admin-agent returning an error or response?"
echo "3. Is OpenAI configured properly?"
echo "4. Are there any errors in the logs?"
echo ""
echo "TO VIEW REAL-TIME LOGS:"
echo "1. Open browser to http://localhost:3003/login"
echo "2. Login as admin@ronisbakery.com / password123"
echo "3. Navigate to http://localhost:3003/logs"
echo "=================================="