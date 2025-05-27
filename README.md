# EdgeAI - Roni's Bakery Multi-Platform Ordering System

A comprehensive multi-platform ordering and delivery tracking system for Roni's Bakery, featuring AI-powered inventory management, real-time GPS tracking, and multi-user portals.

## 🌟 Features

### 🏪 Multi-Platform Architecture
- **Client Portal**: Main Roni's Bakery ordering interface with inventory management
- **Supplier Portal**: Order management and delivery coordination for suppliers
- **Delivery Tracking**: Real-time GPS tracking of all deliveries across London

### 🤖 AI-Powered Chatbots
- **OpenAI GPT-4o-mini Integration**: Advanced conversational AI for all portals
- **Function Calling**: Real-time database queries and order management
- **Delivery Status Queries**: Ask about delivery locations, ETAs, and driver info
- **Inventory Management**: Smart ordering recommendations and stock alerts

### 🗺️ Interactive London Map
- **Real-time GPS Tracking**: Live driver locations with 10-second updates
- **6 Roni's Branches**: Belsize Park, Hampstead, West Hampstead, Muswell Hill, Brent Cross, Swiss Cottage
- **6 Major Suppliers**: Comprehensive delivery network across London
- **24 Active Deliveries**: Complete supplier-to-branch delivery matrix
- **Professional Icons**: Custom map markers with emojis and detailed popups

## 🚀 Getting Started

### Prerequisites
- Node.js 18.15.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/haba-create/edgeai-ronis-bakery.git
   cd edgeai-ronis-bakery
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   Add your OpenAI API key to \`.env.local\`:
   \`\`\`
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

4. **Run the application**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗺️ Application Structure

### Client Portal (\`/\`)
- Dashboard with inventory overview and alerts
- AI-powered ordering assistant
- Real-time stock management

### Supplier Portal (\`/supplier-portal\`)
- Order management and status updates
- Driver assignment and scheduling
- AI chatbot for delivery tracking

### Delivery Tracking (\`/delivery-tracking\`)
- Interactive London map with live GPS tracking
- Comprehensive delivery monitoring
- Multi-branch delivery visualization

## 🤖 AI Chatbot Examples

### Client Chatbot
- "Show me all active deliveries"
- "When will order #3005 arrive?"
- "Track my delivery from Heritage Jewish Breads"

### Supplier Chatbot
- "Show my current orders"
- "Track order #3010"
- "Update order status to shipped"

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite
- **AI**: OpenAI GPT-4o-mini
- **Maps**: Leaflet with React
- **Data Fetching**: SWR

## 📍 London Network

### Roni's Branches (6)
- Belsize Park, Hampstead, West Hampstead
- Muswell Hill, Brent Cross, Swiss Cottage

### Suppliers (6)
- Belsize Bakery Fresh, Heritage Jewish Breads
- Artisan Pastries London, Premium Deli Supplies
- FreshDairy London, Kosher Chicken Co

### Active Deliveries (24)
Complete delivery matrix with real-time GPS tracking

---

**Built with ❤️ for the future of bakery operations**
EOF < /dev/null