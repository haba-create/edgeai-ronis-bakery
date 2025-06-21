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

## 🚨 CRITICAL: Release Process & Testing Requirements

### MANDATORY TESTING PROTOCOL
**UNLESS YOU HAVE TESTED IN THE BROWSER LIKE A HUMAN IT IS NOT DONE.**

1. **Browser Testing Requirements**
   - Test ALL features in actual browser on Docker deployment
   - Login with each role and test their specific features
   - Verify chatbot responses match expected functionality
   - Test new features with real user interactions
   - Validate email notifications are sent/received

2. **Docker Desktop Testing**
   - MUST test on the deployed Docker version (not dev server)
   - Use the exact port configured (e.g., localhost:3003)
   - Test with production environment variables
   - Verify database changes persist

3. **Release Notes Requirements**
   - List ALL differences between versions
   - Include what works AND what doesn't work
   - Provide testing status for each feature
   - Document any known issues or limitations
   - Include browser testing results

4. **Release Process**
   ```
   1. Complete all development
   2. Build and deploy to Docker Desktop
   3. Perform FULL browser testing on Docker deployment
   4. Create comprehensive release notes
   5. Ask user: "Are you happy with this release?"
   6. If YES → Push to GitHub
   7. If NO → Fix issues and repeat from step 1
   ```

5. **Testing Checklist**
   - [ ] Login works for all roles
   - [ ] Chatbots respond correctly for each role
   - [ ] New features accessible through UI
   - [ ] Database operations work correctly
   - [ ] Email notifications sent (if applicable)
   - [ ] No console errors in browser
   - [ ] Performance is acceptable
   - [ ] Multi-tenant isolation verified

### Example Browser Test Flow
```
1. Open http://localhost:3003 in Chrome/Firefox
2. Login as owner@ronisbakery.com
3. Open chatbot
4. Type: "Compare prices for Plain Bagels"
5. Verify: Should show prices from multiple suppliers
6. Type: "Generate an auto order"
7. Verify: Should create optimized order recommendations
8. Check email for order confirmations
```

### Release Notes Template
```markdown
# Release Notes - vX.X.X

## Testing Status
- Browser Testing: ✅ PASSED / ❌ FAILED
- Docker Deployment: ✅ PASSED / ❌ FAILED
- All Features Working: ✅ YES / ❌ NO

## What's New
- Feature 1: [Status]
- Feature 2: [Status]

## What Works
- List all working features

## What Doesn't Work
- List any broken features

## Browser Test Results
- Role: Owner - Feature X: ✅ PASSED
- Role: Driver - Feature Y: ❌ FAILED

## Recommendation
READY FOR RELEASE / NOT READY - [Reason]
```

**THIS IS A SYSTEM PROMPT - ALWAYS FOLLOW THESE TESTING REQUIREMENTS**