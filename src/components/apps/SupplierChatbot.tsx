import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiX, FiPackage, FiTruck, FiBarChart2 } from 'react-icons/fi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
}

export default function SupplierChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your Supply Chain Assistant. I can help with orders, inventory, deliveries, and analytics. What do you need help with?",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: ['Check orders', 'Inventory status', 'Driver locations', 'Today\'s analytics']
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = getAIResponse(input);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responses.text,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: responses.suggestions
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (query: string): { text: string; suggestions?: string[] } => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('order') || lowerQuery.includes('pending')) {
      return {
        text: "You have 3 pending orders:\n\n📦 ORD-001 (Belsize Park) - £125.50 - URGENT\n• 20 Challah loaves, 50 Plain bagels, 15 Rye loaves\n• Requested by 2:30 PM\n\n📦 ORD-002 (Hampstead) - £85.00\n• 15 Challah loaves, 10 Babka\n• Requested by 3:30 PM\n\n📦 ORD-003 (West Hampstead) - £96.00 - Ready for dispatch\n• 40 Everything bagels, 40 Sesame bagels\n• Driver: Sarah L.",
        suggestions: ['Confirm ORD-001', 'View all orders', 'Check driver status']
      };
    }

    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
      return {
        text: "Current inventory levels:\n\n✅ Challah Bread: 45 loaves (Good)\n✅ Plain Bagels: 120 units (Good)\n⚠️ Everything Bagels: 15 units (Low - restock needed)\n✅ Rye Bread: 30 loaves (Good)\n🚨 Babka: 8 units (Critical - urgent restock)\n\nRecommendation: Increase Babka production by 50% for tomorrow's orders.",
        suggestions: ['Update stock', 'Production schedule', 'Order forecast', 'Low stock alerts']
      };
    }

    if (lowerQuery.includes('driver') || lowerQuery.includes('delivery')) {
      return {
        text: "Active delivery fleet:\n\n🚚 Michael K. - En route to Belsize Park\n• ETA: 15 minutes\n• 2 more stops after\n\n🚚 Sarah L. - Delivering to West Hampstead\n• ETA: 8 minutes\n• 1 more stop\n\n🚚 David R. - Returning from Muswell Hill\n• Available in 20 minutes\n\nAll drivers are on schedule. Average delivery time today: 28 minutes.",
        suggestions: ['Assign new delivery', 'Driver routes', 'Delivery history']
      };
    }

    if (lowerQuery.includes('analytics') || lowerQuery.includes('performance')) {
      return {
        text: "Today's Performance Summary:\n\n📊 Orders: 23 completed (+15% vs yesterday)\n💰 Revenue: £1,245.50 (+8%)\n⏱️ Avg Prep Time: 42 min (+5 min vs target)\n✅ On-time Rate: 96% (-2% vs target)\n🚚 Delivery Success: 100%\n\nTop performing items:\n1. Challah Bread (45% of revenue)\n2. Bagels (30% of revenue)\n3. Babka (15% of revenue)",
        suggestions: ['Weekly report', 'Customer feedback', 'Optimize routes', 'Forecast tomorrow']
      };
    }

    if (lowerQuery.includes('urgent') || lowerQuery.includes('priority')) {
      return {
        text: "⚠️ URGENT ACTIONS REQUIRED:\n\n1. ORD-001 (Belsize Park) needs confirmation - Customer waiting\n2. Babka stock critically low - Only 8 units left\n3. Driver needed for 4:00 PM Brent Cross delivery\n\nWould you like me to help prioritize these tasks?",
        suggestions: ['Handle ORD-001', 'Restock Babka', 'Assign driver', 'View all urgents']
      };
    }

    if (lowerQuery.includes('forecast') || lowerQuery.includes('predict')) {
      return {
        text: "Tomorrow's Forecast (based on historical data):\n\n📈 Expected Orders: 28-32\n💰 Projected Revenue: £1,450-1,600\n\nRecommended Production:\n• Challah: 60 loaves (+33%)\n• Plain Bagels: 150 units\n• Everything Bagels: 80 units (+100%)\n• Babka: 25 units (+200%)\n\nPeak hours: 7-9 AM, 12-2 PM",
        suggestions: ['Adjust production', 'Schedule staff', 'Pre-order supplies']
      };
    }

    return {
      text: "I can help you with:\n• Order management and status updates\n• Inventory levels and restocking\n• Driver tracking and assignments\n• Performance analytics\n• Demand forecasting\n\nWhat would you like to know?",
      suggestions: ['Check orders', 'View inventory', 'Track drivers', 'See analytics']
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSend();
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all ${
          isOpen ? 'hidden' : 'flex'
        } items-center justify-center z-40`}
      >
        <FiMessageSquare size={24} />
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="p-4 bg-green-600 text-white rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                🤖
              </div>
              <div>
                <h3 className="font-semibold">Supply Chain Assistant</h3>
                <p className="text-xs opacity-90">Heritage Jewish Breads</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div key={message.id}>
                <div
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="border-t p-2">
            <div className="flex justify-around">
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiPackage className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Orders</span>
              </button>
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiTruck className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Fleet</span>
              </button>
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiBarChart2 className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Analytics</span>
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about orders, inventory..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}