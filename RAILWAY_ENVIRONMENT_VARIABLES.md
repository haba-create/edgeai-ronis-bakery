# 🔑 Railway Environment Variables

## Required Variables for Deployment

Add these **exact** key-value pairs in Railway dashboard → Variables:

### 1. NODE_ENV
```
Key: NODE_ENV
Value: production
```

### 2. NEXTAUTH_URL
```
Key: NEXTAUTH_URL
Value: https://edgeai-ronis-bakery-production.up.railway.app
```

### 3. NEXTAUTH_SECRET
```
Key: NEXTAUTH_SECRET
Value: [Generate with command below]
```

**Generate your secret:**
```bash
openssl rand -base64 32
```
**Example output:** `abc123def456ghi789jkl012mno345pqr678==`

### 4. OPENAI_API_KEY
```
Key: OPENAI_API_KEY
Value: sk-[your-openai-api-key]
```

**Get your OpenAI API key:**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API → API Keys
3. Create new secret key
4. Copy the key (starts with `sk-...`)

## 📋 Copy-Paste Template

For quick setup, copy these and replace the values:

```
NODE_ENV=production
NEXTAUTH_URL=https://edgeai-ronis-bakery-production.up.railway.app
NEXTAUTH_SECRET=your-generated-32-char-secret
OPENAI_API_KEY=sk-your-openai-api-key-here
PORT=3000
HOSTNAME=0.0.0.0
```

## ✅ Verification

After setting variables:
1. Railway will automatically redeploy
2. Check deployment logs for errors
3. Visit your app URL to test
4. Check health endpoint: `/api/health`

## 🚨 Important Notes

- **NEXTAUTH_SECRET**: Must be at least 32 characters
- **NEXTAUTH_URL**: Must match your Railway domain exactly
- **OPENAI_API_KEY**: Must have sufficient credits and GPT access
- **No quotes needed**: Railway handles values automatically

## 🔧 Troubleshooting

**If deployment fails:**
1. Check all 4 variables are set correctly
2. Verify no extra spaces in values
3. Ensure OpenAI key is valid
4. Check Railway build logs for specific errors