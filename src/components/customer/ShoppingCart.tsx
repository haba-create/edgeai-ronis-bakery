import React, { useState } from 'react';
import { CartItem } from './CustomerPortal';
import { FiMinus, FiPlus, FiTrash2, FiShoppingBag } from 'react-icons/fi';

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateItem: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onClose
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleQuantityChange = (productId: number, change: number) => {
    const item = items.find(i => i.product.id === productId);
    if (item) {
      const newQuantity = Math.max(0, item.quantity + change);
      onUpdateItem(productId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    
    try {
      const orderData = {
        customer_info: customerInfo,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        total_amount: getTotalPrice(),
        notes: customerInfo.notes
      };

      const response = await fetch('/api/customer-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        alert('Order placed successfully! We\'ll contact you with delivery details.');
        onClose();
        // Clear cart
        items.forEach(item => onRemoveItem(item.product.id));
      } else {
        throw new Error('Failed to place order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-4">Add some delicious items to get started!</p>
            <button
              onClick={onClose}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.map((item) => (
          <div key={item.product.id} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900">{item.product.name}</h4>
              <p className="text-xs text-gray-500">
                £{item.product.price.toFixed(2)} per {item.product.unit}
              </p>
              {item.product.kosher_certified && (
                <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  ✓ Kosher
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleQuantityChange(item.product.id, -1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <FiMinus className="h-3 w-3" />
              </button>
              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item.product.id, 1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <FiPlus className="h-3 w-3" />
              </button>
            </div>
            
            <div className="text-right">
              <div className="font-medium text-sm">
                £{(item.product.price * item.quantity).toFixed(2)}
              </div>
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="text-red-500 hover:text-red-700 mt-1"
              >
                <FiTrash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total and Checkout */}
      <div className="border-t p-4 space-y-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total:</span>
          <span>£{getTotalPrice().toFixed(2)}</span>
        </div>

        {/* Customer Information Form */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Delivery Information</h4>
          <input
            type="text"
            placeholder="Your name"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="email"
            placeholder="Email address"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <textarea
            placeholder="Delivery address"
            value={customerInfo.address}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            rows={2}
          />
          <textarea
            placeholder="Special instructions (optional)"
            value={customerInfo.notes}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            rows={2}
          />
        </div>

        <button
          onClick={handleCheckout}
          disabled={isCheckingOut || !customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address}
          className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isCheckingOut ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center">
              <FiShoppingBag className="h-5 w-5 mr-2" />
              Place Order
            </div>
          )}
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          We&apos;ll contact you to confirm delivery details and payment.
        </p>
      </div>
    </div>
  );
};

export default ShoppingCart;