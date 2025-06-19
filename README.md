# 🍞 Roni's Bakery - AI-Powered Multi-Tenant Ordering System

## 🎯 Overview

Roni's Bakery is a comprehensive multi-tenant platform for bakery and cafe operations, featuring AI-powered chatbots for different user roles, intelligent supply chain management, and automated ordering with price optimization. Located in Belsize Park, London, this system demonstrates how AI can streamline food service operations.

## 🚀 Key Features

### 🤖 AI-Powered Chatbots
- **Role-specific assistants** for Admin, Owner, Supplier, Driver, and Customer
- **OpenAI GPT-4o-mini** with intelligent tool calling
- **LangSmith integration** for conversation tracing and analytics
- **Multi-language support** and context-aware responses

### 📊 Smart Inventory & Ordering
- **Automatic price comparison** across 25+ suppliers
- **AI-driven ordering recommendations** with cost optimization
- **Multi-supplier competition** for every product category
- **Inventory prediction** with demand forecasting
- **Real-time stock monitoring** with automated alerts

### 📧 Automated Communications
- **MailTrap MCP integration** for email notifications
- **Order confirmations** sent automatically to suppliers
- **Low stock alerts** with supplier recommendations
- **Weekly business summaries** with cost-saving insights
- **Delivery updates** and quality issue reports

### 🌐 Multi-Tenant Architecture
- **Scalable tenant management** with individual configurations
- **Role-based access control** (RBAC)
- **Tenant-specific analytics** and reporting
- **Isolated data** with shared global suppliers

### 📍 Logistics & Delivery
- **Real-time GPS tracking** for delivery drivers
- **Route optimization** and delivery scheduling
- **Driver earnings tracking** with performance metrics
- **Customer delivery notifications**

## 🛠 Technology Stack

### Frontend
- **Next.js 14** with TypeScript
- **React** with modern hooks and context
- **Tailwind CSS** for responsive design
- **Leaflet Maps** for delivery tracking
- **Chart.js** for analytics visualization

### Backend
- **Next.js API Routes** with serverless functions
- **NextAuth.js** for authentication
- **SQLite** with comprehensive multi-tenant schema
- **OpenAI API** for AI chatbot functionality
- **LangSmith** for conversation analytics

### AI & Integrations
- **Model Context Protocol (MCP)** servers:
  - **HubSpot MCP** - CRM management
  - **MailTrap MCP** - Email notifications
  - **GitHub MCP** - Repository management
- **Anthropic Claude** integration capability
- **LangChain** for AI orchestration

### Infrastructure
- **Docker** containerization with multi-stage builds
- **SQLite** for development and production
- **Environment-based configuration**
- **Health monitoring** and logging

## 📈 Business Intelligence

### Analytics Dashboard
- **Daily sales metrics** and trends
- **Product performance tracking**
- **Supplier performance analytics**
- **Customer behavior insights**
- **Delivery efficiency metrics**
- **Cost optimization reports**

### Automated Insights
- **Demand forecasting** using historical data
- **Seasonal trend analysis**
- **Supplier price tracking** and alerts
- **Inventory optimization** recommendations
- **Customer lifetime value** calculations

## 🏪 Product Catalog

### Current Inventory (75+ Products)
- **Bakery Products**: Bagels, breads, pastries
- **Specialty Coffee**: Single-origin, blends, decaf
- **Artisan Teas**: Premium loose leaf, matcha
- **Fresh Produce**: Seasonal fruits and vegetables
- **Deli Items**: Meats, cheeses, spreads
- **Vegan/Gluten-Free**: Alternative options
- **Eco Packaging**: Sustainable disposables

### Supplier Network (25+ Suppliers)
- **Local Artisan Bakeries**: Galeta, Bread Ahead
- **Coffee Roasters**: Caravan, Union, Monmouth
- **Tea Specialists**: Postcard Teas, Rare Tea Company
- **Produce Suppliers**: New Covent Garden Market
- **Specialty Food**: Deliciously Ella, Whole Foods
- **Packaging**: EcoPackaging Solutions

## 👥 User Roles & Capabilities

### 🏢 Admin Users
- **System management** and tenant oversight
- **Global analytics** across all tenants
- **User management** and role assignments
- **System health monitoring**
- **Supplier relationship management**

### 🍞 Cafe/Restaurant Owners
- **Inventory management** with AI insights
- **Automated ordering** with price optimization
- **Supplier performance monitoring**
- **Business analytics** and reporting
- **Cost optimization** recommendations

### 🚚 Suppliers
- **Order management** and fulfillment tracking
- **Product catalog** management
- **Delivery coordination**
- **Performance metrics** and feedback
- **Invoice and payment** tracking

### 🚗 Delivery Drivers
- **Delivery assignment** and tracking
- **GPS navigation** and route optimization
- **Earnings tracking** with performance bonuses
- **Real-time status** updates
- **Customer communication**

### 🛒 Customers
- **Product browsing** with AI recommendations
- **Order placement** and tracking
- **Delivery updates** and notifications
- **Loyalty program** integration
- **Feedback and reviews**

## 🎨 User Interface

### Responsive Design
- **Mobile-first** approach for all user roles
- **Progressive Web App** capabilities
- **Dark/light mode** toggle
- **Accessibility** compliance (WCAG 2.1)
- **Multi-language** support ready

### Role-Specific Dashboards
- **Customized interfaces** for each user type
- **Real-time data** updates
- **Interactive charts** and visualizations
- **Quick actions** and shortcuts
- **Contextual help** and guidance

## 🔧 Development Setup

### Prerequisites
```bash
Node.js 18+
Docker Desktop
OpenAI API Key
LangSmith Account (optional)
MailTrap Account (optional)
```

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd edgeai-ronis-bakery

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Initialize database
curl -X POST http://localhost:3000/api/seed
curl -X POST http://localhost:3000/api/expand-database

# Start development
npm run dev
```

### Docker Deployment
```bash
# Build image
docker build -t edgeai-ronis-bakery:latest .

# Run container
docker run -d --name ronis-bakery -p 3000:3000 \
  -e OPENAI_API_KEY=your_key \
  -e LANGSMITH_API_KEY=your_key \
  -e MAILTRAP_API_TOKEN=your_token \
  edgeai-ronis-bakery:latest
```

## 🔐 Default Login Credentials

### Test Accounts
- **Admin**: admin@ronisbakery.com / password123
- **Owner**: owner@ronisbakery.com / password123  
- **Supplier**: supplier@hjb.com / password123
- **Driver**: driver@edgeai.com / password123

## 🧪 Testing

### Automated Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests with Puppeteer
npm run test:e2e

# Test all chatbots
curl -X POST http://localhost:3000/api/test-chatbots
```

### Manual Testing
- **Test credentials** in CLAUDE.md
- **API endpoints** documentation
- **Chatbot conversations** for each role
- **MCP server** integrations

## 📊 API Documentation

### Core Endpoints
- `GET /api/health` - System health check
- `POST /api/seed` - Initialize database
- `POST /api/expand-database` - Add suppliers/products
- `GET /api/auto-order` - Generate order recommendations
- `POST /api/auto-order` - Create optimized orders
- `GET /api/supplier-prices` - Compare supplier pricing

### Chatbot Endpoints
- `POST /api/unified-agent` - Universal AI assistant
- `POST /api/admin-agent` - Admin-specific tools
- `POST /api/owner-agent` - Owner business tools
- `POST /api/supplier-agent` - Supplier management
- `POST /api/driver-chat` - Driver assistance

### MCP Integration
- `POST /api/test-mcp-integration` - Test MCP servers
- MCP tools available through chatbot interfaces
- Email automation through MailTrap MCP

## 🔒 Security & Compliance

### Authentication
- **NextAuth.js** with multiple providers
- **Role-based access control** (RBAC)
- **Session management** with secure tokens
- **API route protection**

### Data Protection
- **Multi-tenant data isolation**
- **Encrypted environment variables**
- **Input validation** and sanitization
- **SQL injection prevention**

### Compliance
- **GDPR-ready** data handling
- **PCI DSS** considerations for payments
- **Food safety** tracking capabilities
- **Audit logging** for all operations

## 🌟 AI Features Deep Dive

### Chatbot Capabilities
- **Natural language** inventory queries
- **Intelligent price comparisons**
- **Automated order generation**
- **Supplier performance analysis**
- **Cost optimization insights**
- **Delivery coordination**

### Machine Learning
- **Demand forecasting** using historical data
- **Seasonal pattern** recognition
- **Customer behavior** prediction
- **Inventory optimization** algorithms
- **Price trend** analysis

### LangSmith Integration
- **Conversation tracing** and analytics
- **Performance monitoring**
- **Usage analytics** and insights
- **A/B testing** capabilities
- **Quality assurance** tracking

## 📧 Email Automation

### MailTrap MCP Integration
- **Order confirmations** to suppliers
- **Low stock alerts** to managers
- **Weekly business summaries**
- **Delivery notifications**
- **Quality issue reports**

### Email Templates
- Professional HTML email designs
- Customizable branding and content
- Multi-language support ready
- Mobile-responsive layouts

## 📅 Future Roadmap

### Short Term (Q1 2025)
- [ ] **Mobile applications** for iOS/Android
- [ ] **Voice interface** integration
- [ ] **Advanced analytics** dashboard
- [ ] **Customer loyalty** program
- [ ] **Payment integration** (Stripe/PayPal)

### Medium Term (Q2-Q3 2025)
- [ ] **Franchise management** tools
- [ ] **Kitchen display** systems
- [ ] **POS system** integration
- [ ] **Accounting software** connectors
- [ ] **Marketplace integration** (UberEats, etc.)

### Long Term (Q4 2025+)
- [ ] **AI recipe** recommendations
- [ ] **Predictive maintenance** for equipment
- [ ] **Sustainability tracking**
- [ ] **Blockchain** supply chain verification
- [ ] **IoT sensor** integration

## 🤝 Contributing

### Development Guidelines
- Follow **TypeScript** best practices
- Maintain **comprehensive tests**
- Document **API changes**
- Use **conventional commits**
- Follow **security guidelines**

### Code Structure
```
src/
├── pages/           # Next.js pages and API routes
├── components/      # React components
├── agents/          # AI chatbot logic and tools
├── utils/           # Utility functions and services
├── data/            # Database schemas and seed data
└── styles/          # CSS and styling
```

## 📞 Support & Contact

### Documentation
- **CLAUDE.md** - Development instructions
- **API Documentation** - Endpoint references
- **Deployment Guide** - Production setup
- **Troubleshooting** - Common issues

### Community
- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Community support
- **Wiki** - Extended documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o-mini API
- **Anthropic** for Claude and MCP framework
- **LangSmith** for conversation analytics
- **MailTrap** for email testing infrastructure
- **Next.js** team for the excellent framework
- **Vercel** for deployment platform

---

**Roni's Bakery** - Revolutionizing food service operations with AI-powered automation and intelligent supply chain management. 🥯☕️🤖