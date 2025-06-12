import React, { useState } from 'react';
import { Product } from '@/models/types';
import ProductGrid from './ProductGrid';
import ShoppingCart from './ShoppingCart';
import CustomerChatbot from './CustomerChatbot';
import { FiShoppingCart, FiMessageCircle, FiX } from 'react-icons/fi';

interface ProductWithSupplier extends Product {
  supplier_name?: string;
}

interface CustomerPortalProps {
  products: ProductWithSupplier[];
  categories: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ products, categories }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartItem = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.product.id === productId 
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-amber-600">Roni&apos;s Bakery</h1>
              <span className="ml-2 text-sm text-gray-500">Fresh Kosher Delights</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              {/* Cart Button */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors"
              >
                <FiShoppingCart className="h-6 w-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              
              {/* Chat Button */}
              <button
                onClick={() => setShowChatbot(true)}
                className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <FiMessageCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              All Products
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedCategory === category
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-gray-600 hover:text-amber-600'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Search */}
        <div className="md:hidden mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Product Grid */}
        <ProductGrid 
          products={filteredProducts} 
          onAddToCart={addToCart}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
        />
      </main>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCart(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <ShoppingCart 
              items={cartItems}
              onUpdateItem={updateCartItem}
              onRemoveItem={removeFromCart}
              onClose={() => setShowCart(false)}
            />
          </div>
        </div>
      )}

      {/* Customer Chatbot */}
      {showChatbot && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowChatbot(false)} />
          <div className="absolute right-4 bottom-4 top-4 w-full max-w-md bg-white rounded-lg shadow-xl">
            <CustomerChatbot 
              onClose={() => setShowChatbot(false)}
              onAddToCart={addToCart}
              products={products}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;