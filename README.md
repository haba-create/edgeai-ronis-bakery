# EdgeAI - Multi-Tenant Food Service Management Platform

A comprehensive multi-tenant platform for restaurants, cafes, suppliers, and delivery drivers featuring AI-powered assistants, real-time tracking, and advanced analytics.

## 🌟 System Overview

### 🏗️ Multi-Tenant Architecture
- **Scalable SaaS Platform**: Support unlimited restaurants, cafes, and food businesses
- **Complete Data Isolation**: Each tenant's data is securely segregated
- **Role-Based Access Control**: Distinct interfaces for different user types
- **Subscription Management**: Flexible plans with configurable limits

### 🤖 AI-Powered Assistants
- **OpenAI Agents SDK Integration**: Advanced conversational AI with function calling
- **Database Tools**: Real-time access to tenant-specific data
- **Role-Specific Intelligence**: Specialized agents for each user type
- **Multi-Turn Conversations**: Context-aware interactions with business systems

### 🗺️ Real-Time Operations
- **GPS Tracking**: Live driver locations with route optimization
- **Interactive Maps**: Comprehensive delivery network visualization
- **Smart Analytics**: 12 months of historical data with forecasting
- **Mobile-Optimized**: Professional mobile interface for drivers

## 🔐 Authentication & Access

### User Roles & Access Levels

| Role | Access | Dashboard | AI Assistant Capabilities |
|------|--------|-----------|---------------------------|
| **Admin** | System-wide management | `/admin` | System monitoring, tenant management, analytics |
| **Client** | Restaurant/cafe operations | `/dashboard` | Inventory management, ordering, analytics |
| **Supplier** | Multi-tenant order management | `/supplier` | Order processing, delivery coordination |
| **Driver** | Delivery operations | `/driver` | Navigation, delivery tracking, earnings |

### Demo Credentials

```bash
# System Administrator
Email: admin@ronisbakery.com
Password: password123
Access: Full system administration

# Restaurant Owner (Client)
Email: owner@ronisbakery.com  
Password: password123
Access: Restaurant operations management

# Supplier Manager
Email: supplier@hjb.com
Password: password123
Access: Multi-restaurant order management

# Delivery Driver
Email: driver@edgeai.com
Password: password123
Access: Mobile delivery operations
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.15.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/haba-create/edgeai-ronis-bakery.git
   cd edgeai-ronis-bakery
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Add your OpenAI API key and NextAuth secret
   ```

4. **Initialize the database**
   ```bash
   npm run dev
   # Navigate to http://localhost:3000/api/seed (POST request)
   ```

5. **Access the platform**
   ```bash
   # Open http://localhost:3000
   # Login with demo credentials
   ```

## 📊 AI Agent Capabilities

### 🏪 Client Agent (Restaurant Operations)
- **Inventory Management**: "Show me items running low" → Real-time stock analysis
- **Smart Ordering**: "Create orders for critical items" → Automated purchase orders
- **Analytics**: "What are my top-selling products?" → Data-driven insights
- **Forecasting**: "Predict next week's demand" → AI-powered predictions

**Example Tools:**
- `get_inventory_status` - Real-time stock monitoring
- `create_purchase_order` - Automated ordering system
- `get_inventory_analytics` - Business intelligence
- `update_product_consumption` - Stock level updates

### 📦 Supplier Agent (Multi-Tenant Operations)
- **Order Management**: "Show pending orders from all restaurants" → Cross-tenant visibility
- **Driver Coordination**: "Assign driver to order #3421" → Delivery management
- **Performance Tracking**: "What's my delivery success rate?" → KPI monitoring
- **Route Optimization**: "Optimize today's delivery routes" → Efficiency improvement

**Example Tools:**
- `get_pending_orders` - Multi-tenant order queue
- `assign_driver` - Delivery coordination
- `get_supplier_performance` - Analytics dashboard
- `update_delivery_status` - Real-time updates

### 🚗 Driver Agent (Mobile Operations)
- **Active Deliveries**: "What's my next delivery?" → Real-time assignments
- **Navigation**: "Get directions to Heritage Breads" → GPS routing
- **Status Updates**: "Mark delivery as completed" → Status management
- **Earnings**: "How much have I earned today?" → Financial tracking

**Example Tools:**
- `get_driver_assignments` - Delivery queue
- `update_location` - GPS tracking
- `complete_delivery` - Status updates
- `get_driver_earnings` - Financial analytics

### ⚙️ Admin Agent (System Management)
- **System Health**: "Show system performance metrics" → Infrastructure monitoring
- **Tenant Management**: "Create new tenant for Joe's Cafe" → Multi-tenancy
- **Analytics**: "Show platform usage statistics" → Business intelligence
- **User Management**: "List all active drivers" → Account administration

## 🗂️ Application Structure

### Authentication Flow
```
/ → Login Page → Role-Based Redirect
├── /admin (Admin Dashboard)
├── /dashboard (Client Operations)  
├── /supplier (Supplier Portal)
└── /driver (Mobile Delivery App)
```

### Database Architecture
```sql
-- Multi-tenant isolation
tenants (id, name, slug, subscription_plan)
users (tenant_id, role, email)
products (tenant_id, name, category, stock)
purchase_orders (tenant_id, supplier_id, status)

-- Cross-tenant relationships  
tenant_suppliers (tenant_id, supplier_id)
tenant_drivers (tenant_id, driver_id)
```

### AI Agent Framework
```typescript
// Role-specific agents with database tools
const clientAgent = new Agent({
  tools: [inventoryTools, orderingTools, analyticsTools]
});

const supplierAgent = new Agent({  
  tools: [orderManagementTools, driverTools, performanceTools]
});

const driverAgent = new Agent({
  tools: [deliveryTools, navigationTools, earningsTools]
});
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Authentication**: NextAuth.js with JWT sessions
- **Styling**: Tailwind CSS with mobile-responsive design
- **Database**: SQLite with multi-tenant schema
- **AI**: OpenAI Agents SDK with function calling
- **Maps**: Leaflet with real-time GPS tracking
- **Data Fetching**: SWR with tenant-aware queries

## 📱 Mobile Experience

### Driver Mobile App Features
- **iPhone-Style Interface**: Professional mobile design with phone frame
- **Touch-Optimized Navigation**: Large buttons and swipe-friendly interactions
- **Real-Time GPS**: Live location tracking and route optimization
- **Status Bar Integration**: Battery, signal, and time display
- **Offline Capability**: Works in areas with poor connectivity

## 📊 Business Intelligence

### Historical Data (12 Months)
- **Daily Sales Analytics**: Revenue, orders, customer metrics
- **Product Performance**: Sales trends, seasonal patterns
- **Customer Behavior**: Engagement patterns, lifetime value
- **Supplier Performance**: Delivery rates, quality scores
- **Driver Analytics**: Earnings, efficiency, ratings

### Subscription Management
- **Flexible Plans**: Free, Basic, Premium, Enterprise
- **Usage Limits**: Configurable per subscription tier
- **Multi-Tenant Billing**: Separate billing per restaurant
- **Analytics Dashboards**: Plan usage and performance metrics

## 🔒 Security Features

- **Tenant Isolation**: Complete data separation per restaurant
- **Role-Based Permissions**: Granular access control
- **JWT Sessions**: Secure authentication with automatic refresh
- **Audit Logging**: Complete activity tracking
- **API Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive data sanitization

## 🐳 Docker Deployment

### Local Development
```bash
# Build and run with Docker
docker build -t edgeai-ronis-bakery .
docker run -p 3001:3000 --env-file .env.docker edgeai-ronis-bakery
```

### Production Deployment
```bash
# Railway deployment
railway login
railway link [project-id]
railway deploy
```

## 📚 Documentation

- **[Multi-Tenant Implementation](./MULTITENANT_README.md)** - Architecture details
- **[AI Agents Implementation](./AGENTS_IMPLEMENTATION.md)** - Agent system guide
- **[Multi-App System Overview](./MULTI_APP_SYSTEM.md)** - Legacy demo documentation

## 🎯 Use Cases

### For Restaurant Owners
- Monitor inventory levels across multiple locations
- Automate ordering with AI-powered recommendations
- Track supplier performance and delivery times
- Analyze sales trends and customer behavior

### For Suppliers
- Manage orders from multiple restaurants efficiently
- Coordinate delivery schedules and driver assignments
- Monitor performance metrics and customer satisfaction
- Optimize routes for maximum efficiency

### For Delivery Drivers  
- Receive real-time delivery assignments
- Navigate with GPS optimization
- Track earnings and performance metrics
- Communicate with restaurants and customers

### For Platform Administrators
- Monitor system health and performance
- Manage tenant subscriptions and limits
- Analyze platform usage and growth metrics
- Provide technical support and maintenance

## 🚀 Getting Started Examples

### Restaurant Owner Workflow
1. Login to `/dashboard` with restaurant credentials
2. Chat: "What items are running low in inventory?"
3. AI Agent analyzes stock levels and suggests reorders
4. Approve automated purchase orders
5. Track delivery status and update inventory

### Supplier Workflow  
1. Login to `/supplier` portal
2. Chat: "Show me all pending orders from my restaurants"
3. AI Agent displays cross-tenant order queue
4. Assign drivers and optimize delivery routes
5. Update order status and track performance

### Driver Workflow
1. Login to `/driver` mobile app
2. Chat: "What's my next delivery?"
3. AI Agent shows assigned deliveries with navigation
4. Complete deliveries with proof of delivery
5. Track daily earnings and performance

## 📈 Roadmap

- **Advanced Analytics**: Machine learning insights and predictions
- **Mobile Apps**: Native iOS and Android applications
- **Payment Integration**: Stripe/PayPal for subscription billing
- **API Platform**: Public API for third-party integrations
- **White-Label Solution**: Custom branding per tenant
- **Multi-Language Support**: Internationalization
- **Advanced Notifications**: Real-time push notifications
- **Offline Mode**: Full offline capability for mobile users

---

**Built with ❤️ for the future of food service operations**

*A complete multi-tenant platform that scales from single restaurants to enterprise food service networks.*