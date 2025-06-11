#!/bin/bash

# Generate environment variables for Roni's Bakery application

echo "🔐 Generating secure environment variables..."

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "📝 Environment variables needed:"
echo ""
echo "# NextAuth Configuration"
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\""
echo "NEXTAUTH_URL=\"http://localhost:3004\""
echo ""
echo "# OpenAI Configuration (replace with your actual API key)"
echo "OPENAI_API_KEY=\"your_openai_api_key_here\""
echo ""
echo "# Database Configuration"
echo "DATABASE_URL=\"file:./ronis_bakery.db\""
echo ""

# Create .env.local file
cat > .env.local << EOF
# NextAuth Configuration
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3004"

# OpenAI Configuration (replace with your actual API key)
OPENAI_API_KEY="your_openai_api_key_here"

# Database Configuration  
DATABASE_URL="file:./ronis_bakery.db"

# Node Environment
NODE_ENV="development"
EOF

echo "✅ Created .env.local file with secure configuration"
echo ""
echo "🚨 IMPORTANT: Update the OPENAI_API_KEY in .env.local with your actual OpenAI API key"
echo ""
echo "🐳 To rebuild Docker with these environment variables:"
echo "   docker build -t ronis-bakery ."
echo "   docker run -d --name ronis-bakery-container -p 3004:3000 --env-file .env.local ronis-bakery"