import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ClientChatbot from './ClientChatbot';
import Dashboard from '../Dashboard';
import InventoryView from '../InventoryView';
import OrdersView from '../OrdersView';
import OrderingSchedule from '../OrderingSchedule';
import ChatInterface from '../ChatInterface';
import { FiShoppingCart, FiMapPin, FiClock, FiStar, FiSearch, FiGrid, FiPackage, FiShoppingBag, FiCalendar, FiMessageCircle } from 'react-icons/fi';

// Dynamically import map component
const ClientMap = dynamic(() => import('./ClientMap'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
});

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  preparationTime: number;
}

interface CartItem extends Product {
  quantity: number;
}

export default function ClientApp() {
  const [activeView, setActiveView] = useState<'shop' | 'dashboard' | 'inventory' | 'orders' | 'schedule' | 'chat'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // Mock products data
  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: 1,
        name: "Fresh Sourdough Bread",
        description: "Artisanal sourdough with perfect crust",
        price: 4.99,
        category: "breads",
        image: "🍞",
        rating: 4.8,
        reviews: 234,
        preparationTime: 15
      },
      {
        id: 2,
        name: "Chocolate Croissant",
        description: "Buttery croissant with Belgian chocolate",
        price: 3.50,
        category: "pastries",
        image: "🥐",
        rating: 4.9,
        reviews: 456,
        preparationTime: 10
      },
      {
        id: 3,
        name: "Bagel with Cream Cheese",
        description: "New York style bagel, toasted to perfection",
        price: 5.99,
        category: "bagels",
        image: "🥯",
        rating: 4.7,
        reviews: 189,
        preparationTime: 5
      },
      {
        id: 4,
        name: "Blueberry Muffin",
        description: "Fresh blueberries in a fluffy muffin",
        price: 2.99,
        category: "muffins",
        image: "🧁",
        rating: 4.6,
        reviews: 167,
        preparationTime: 0
      },
      {
        id: 5,
        name: "Cappuccino",
        description: "Italian espresso with steamed milk foam",
        price: 3.99,
        category: "drinks",
        image: "☕",
        rating: 4.8,
        reviews: 512,
        preparationTime: 3
      },
      {
        id: 6,
        name: "Avocado Toast",
        description: "Smashed avocado on sourdough with poached egg",
        price: 8.99,
        category: "sandwiches",
        image: "🥑",
        rating: 4.7,
        reviews: 298,
        preparationTime: 12
      }
    ];
    setProducts(mockProducts);
  }, []);

  const categories = [
    { id: 'all', name: 'All Items', icon: '🍽️' },
    { id: 'breads', name: 'Breads', icon: '🍞' },
    { id: 'pastries', name: 'Pastries', icon: '🥐' },
    { id: 'bagels', name: 'Bagels', icon: '🥯' },
    { id: 'muffins', name: 'Muffins', icon: '🧁' },
    { id: 'sandwiches', name: 'Sandwiches', icon: '🥪' },
    { id: 'drinks', name: 'Drinks', icon: '☕' }
  ];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedTime = Math.max(...cart.map(item => item.preparationTime));

  const placeOrder = () => {
    const order = {
      id: Date.now(),
      items: cart,
      total: cartTotal + 2.50, // delivery fee
      estimatedDelivery: new Date(Date.now() + (estimatedTime + 30) * 60000),
      status: 'preparing',
      trackingEnabled: true
    };
    setActiveOrder(order);
    setCart([]);
    setShowCart(false);
    setShowMap(true);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Roni's Bakery - Client Portal</h1>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <FiMapPin className="mr-1" />
                  <span>Belsize Park • {activeView === 'shop' ? 'Shop & Order' : activeView.charAt(0).toUpperCase() + activeView.slice(1)}</span>
                </div>
              </div>
              {activeView === 'shop' && (
                <button
                  onClick={() => setShowCart(true)}
                  className="relative p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiShoppingCart size={20} />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              )}
            </div>
            
            {/* Search Bar - Only show for shop view */}
            {activeView === 'shop' && (
              <div className="mt-4 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="px-4">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveView('shop')}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === 'shop'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiShoppingCart className="inline mr-2" size={16} />
                Shop & Order
              </button>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiGrid className="inline mr-2" size={16} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('inventory')}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === 'inventory'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiPackage className="inline mr-2" size={16} />
                Inventory
              </button>
              <button
                onClick={() => setActiveView('orders')}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiShoppingBag className="inline mr-2" size={16} />
                Orders
              </button>
              <button
                onClick={() => setActiveView('schedule')}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === 'schedule'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiCalendar className="inline mr-2" size={16} />
                Schedule
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiMessageCircle className="inline mr-2" size={16} />
                AI Assistant
              </button>
            </nav>
          </div>
        </div>

        {/* Category Filters - Only show for shop view */}
        {activeView === 'shop' && (
          <div className="bg-white border-b">
            <div className="px-4 py-2 flex space-x-2 overflow-x-auto">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {(() => {
            switch (activeView) {
              case 'shop':
                return showMap ? (
                  <div className="h-full">
                    <div className="bg-white border-b px-4 py-3">
                      <h2 className="text-lg font-semibold">Track Your Order</h2>
                      <p className="text-sm text-gray-600">
                        Estimated delivery: {activeOrder?.estimatedDelivery.toLocaleTimeString()}
                      </p>
                    </div>
                    <ClientMap order={activeOrder} />
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Active Order Banner */}
                    {activeOrder && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-green-800">Order in Progress!</p>
                            <p className="text-sm text-green-600">
                              Your order will arrive by {activeOrder.estimatedDelivery.toLocaleTimeString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowMap(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Track Order
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredProducts.map(product => (
                        <div key={product.id} className="bg-white rounded-lg shadow-sm border p-4">
                          <div className="text-4xl mb-3 text-center">{product.image}</div>
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                          
                          <div className="flex items-center mb-3">
                            <div className="flex items-center text-yellow-500">
                              <FiStar className="fill-current" />
                              <span className="ml-1 text-sm">{product.rating}</span>
                            </div>
                            <span className="text-sm text-gray-500 ml-2">({product.reviews})</span>
                            {product.preparationTime > 0 && (
                              <div className="ml-auto flex items-center text-sm text-gray-500">
                                <FiClock className="mr-1" />
                                {product.preparationTime} min
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold">£{product.price.toFixed(2)}</span>
                            <button
                              onClick={() => addToCart(product)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              case 'dashboard':
                return (
                  <div className="p-4">
                    <Dashboard />
                  </div>
                );
              case 'inventory':
                return (
                  <div className="p-4">
                    <InventoryView />
                  </div>
                );
              case 'orders':
                return (
                  <div className="p-4">
                    <OrdersView />
                  </div>
                );
              case 'schedule':
                return (
                  <div className="p-4">
                    <OrderingSchedule />
                  </div>
                );
              case 'chat':
                return (
                  <div className="h-full">
                    <ChatInterface />
                  </div>
                );
              default:
                return null;
            }
          })()}
        </div>
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b">
                <h2 className="text-xl font-semibold">Your Cart</h2>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 mt-8">Your cart is empty</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl">{item.image}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">£{item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t p-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>£{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>£2.50</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>£{(cartTotal + 2.50).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Estimated preparation: {estimatedTime} minutes
                    </p>
                  </div>
                  
                  <button
                    onClick={placeOrder}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Place Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chatbot - Only show for shopping view */}
      {activeView === 'shop' && <ClientChatbot />}
    </div>
  );
}