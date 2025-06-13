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

### Local Development
```bash
# Start development server
npm run dev

# Start production server locally
npm run build && npm run start
```

## Environment Variables (Local)
```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
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
- `src/utils/db.ts` - Database utilities
- `src/pages/` - Next.js pages and API routes
- `.env.local` - Environment configuration

## Testing Notes
- Always test authentication flows after changes
- Verify chatbots work with database access
- Test multi-tenant data isolation
- Use `/test` page for debugging environment issues

## Recent Issues Fixed
- Authentication infinite loops
- Chatbot UI overlaps
- Database connection path issues
- ESLint configuration and build errors