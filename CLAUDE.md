# Claude Code Instructions

## Project Overview
Multi-tenant bakery management system with AI-powered chatbots for different user roles (Admin, Owner, Supplier, Driver, Customer).

## Development Commands

### Build & Test
```bash
npm run build
npm run lint
npm run dev
```

### Database
```bash
curl -X POST http://localhost:3000/api/seed
```

### Deployment
```bash
# Railway deployment
railway up
```

## Environment Variables (Production)
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=+GBRy9u6YdJ8SJYsScZoQXEz08Lt3WkgqYmAHf+aOEg=
OPENAI_API_KEY=your-openai-api-key
```

## Default Login Credentials
- **Admin**: admin@ronisbakery.com / password123
- **Owner**: owner@ronisbakery.com / password123  
- **Supplier**: supplier@hjb.com / password123
- **Driver**: driver@edgeai.com / password123

## Key Files
- `src/agents/` - AI chatbot implementations
- `src/components/apps/` - Role-specific UI components
- `railway.json` - Railway deployment config
- `Dockerfile` - Production container
- `src/utils/db.ts` - Database utilities

## Testing Notes
- Always test authentication flows after changes
- Verify chatbots work with database access
- Check Railway deployment health endpoint: `/api/health`
- Test multi-tenant data isolation

## Recent Issues Fixed
- 502 Railway deployment error (Next.js standalone server)
- Docker build error (missing public directory)
- Authentication infinite loops
- Chatbot UI overlaps