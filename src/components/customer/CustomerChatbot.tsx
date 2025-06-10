import React, { useState, useRef, useEffect } from 'react';
import { Product } from '@/models/types';
import { FiX, FiSend, FiShoppingCart } from 'react-icons/fi';

interface CustomerChatbotProps {
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  products: Product[];
}

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  products?: Product[];
}

const CustomerChatbot: React.FC<CustomerChatbotProps> = ({ onClose, onAddToCart, products }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your personal shopping assistant at Roni's Bakery. I can help you find the perfect kosher products, recommend items based on your needs, check availability, and add items to your cart. What can I help you with today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/customer-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          products: products,
          context: {
            role: 'customer',
            sessionId: 'customer-session-' + Date.now()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'I apologize, but I\'m having trouble responding right now. Please try again.',
        isBot: true,
        timestamp: new Date(),
        products: data.recommendedProducts || []
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I\'m sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-amber-50">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-sm font-bold">🛍️</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Shopping Assistant</h3>
            <p className="text-xs text-gray-500">Powered by AI • Always here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.isBot 
                ? 'bg-gray-100 text-gray-900' 
                : 'bg-amber-600 text-white'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Product Recommendations */}
              {message.products && message.products.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Recommended for you:</p>
                  {message.products.slice(0, 3).map((product) => (
                    <div key={product.id} className="bg-white rounded-lg p-2 border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-xs text-gray-900">{product.name}</h5>
                          <p className="text-xs text-gray-500">£{product.price?.toFixed(2)} per {product.unit}</p>
                          {product.kosher_certified && (
                            <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              ✓ Kosher
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onAddToCart(product, 1)}
                          className="ml-2 bg-amber-600 text-white p-1 rounded text-xs hover:bg-amber-700 transition-colors"
                        >
                          <FiShoppingCart className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs mt-2 opacity-75">{formatTime(message.timestamp)}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">Assistant is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about products, get recommendations, check availability..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <FiSend className="h-4 w-4" />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "What's popular today?",
            "Show me kosher breads",
            "Fresh produce available?",
            "Coffee and beverages"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerChatbot;