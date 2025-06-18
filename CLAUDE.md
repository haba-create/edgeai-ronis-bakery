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

## MCP Integration
The application now includes Model Context Protocol (MCP) server integrations:

### Available MCP Servers
- **HubSpot MCP Server**: CRM management and contact operations
- **MailTrap MCP Server**: Email sending and inbox management 
- **GitHub MCP Server**: Repository and issue management

### MCP Deployment
```bash
# Deploy all MCP servers
./scripts/deploy-mcp-servers.sh

# Individual server startup
cd ../mailtrap-mcp-server && npm run http  # Port 3006
cd ../hubspot-mcp-server && npm run http   # Port 3005
```

### MCP Tools Available
- `hubspot_create_contact` - Create HubSpot contacts
- `hubspot_search_contacts` - Search HubSpot CRM
- `mailtrap_send_email` - Send emails via MailTrap
- `mailtrap_get_inboxes` - Get MailTrap sandbox inboxes
- `github_create_issue` - Create GitHub issues
- `github_list_repositories` - List GitHub repositories

### Environment Configuration
Copy `.env.mcp` and update with your tokens:
- `MAILTRAP_API_TOKEN` - MailTrap API token
- `HUBSPOT_ACCESS_TOKEN` - HubSpot private app token  
- `GITHUB_PERSONAL_ACCESS_TOKEN` - GitHub PAT

## Recent Issues Fixed
- Authentication infinite loops
- Chatbot UI overlaps
- Database connection path issues
- ESLint configuration and build errors
- MCP server integration and tool registry setup