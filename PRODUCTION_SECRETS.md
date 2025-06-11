# 🔐 Production Secrets - Railway Deployment

## Generated NextAuth Secret
```
+GBRy9u6YdJ8SJYsScZoQXEz08Lt3WkgqYmAHf+aOEg=
```

## Railway Environment Variables (Copy-Paste Ready)

### For Railway Dashboard → Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `NEXTAUTH_URL` | `https://your-app.up.railway.app` |
| `NEXTAUTH_SECRET` | `+GBRy9u6YdJ8SJYsScZoQXEz08Lt3WkgqYmAHf+aOEg=` |
| `OPENAI_API_KEY` | `your-openai-api-key` |

### Copy-Paste Format:
```
NODE_ENV=production
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=+GBRy9u6YdJ8SJYsScZoQXEz08Lt3WkgqYmAHf+aOEg=
OPENAI_API_KEY=your-openai-api-key
```

## Important Notes:
- **NEXTAUTH_SECRET**: Keep this secret secure
- **NEXTAUTH_URL**: Replace with your actual Railway app URL
- **OPENAI_API_KEY**: Replace with your OpenAI API key
- Generated on: 2025-06-10

## Default Login Credentials:
- Admin: admin@ronisbakery.com / password123
- Owner: owner@ronisbakery.com / password123
- Supplier: supplier@hjb.com / password123
- Driver: driver@edgeai.com / password123

**IMPORTANT**: Change these passwords in production!