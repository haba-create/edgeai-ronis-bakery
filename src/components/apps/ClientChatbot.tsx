import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiX, FiShoppingCart, FiMapPin, FiClock } from 'react-icons/fi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
}

export default function ClientChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Roni's Assistant. I can help you with orders, track deliveries, or find the perfect treat. What would you like today?",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: ['View menu', 'Track order', 'Store hours', 'Special offers']
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

    if (lowerQuery.includes('track') || lowerQuery.includes('order') || lowerQuery.includes('delivery')) {
      return {
        text: "I can see your order #12345 is being prepared! Your fresh sourdough bread and chocolate croissant will be ready in about 15 minutes. David M. will deliver it to you by 2:30 PM. You can track him live on the map!",
        suggestions: ['View on map', 'Call driver', 'Change delivery address']
      };
    }

    if (lowerQuery.includes('menu') || lowerQuery.includes('food') || lowerQuery.includes('what do you have')) {
      return {
        text: "Today's fresh items include:\n🍞 Sourdough Bread (£4.99)\n🥐 Chocolate Croissants (£3.50)\n🥯 Everything Bagels (£5.99)\n☕ Barista Coffee (from £3.99)\n\nOur most popular item today is the Avocado Toast with poached egg!",
        suggestions: ['Order sourdough', 'View full menu', 'Dietary options', 'Today\'s specials']
      };
    }

    if (lowerQuery.includes('hours') || lowerQuery.includes('open') || lowerQuery.includes('close')) {
      return {
        text: "We're open today from 7:00 AM to 8:00 PM. Perfect for breakfast, lunch, or an afternoon treat! Our busiest times are 8-9 AM and 12-1 PM, so ordering ahead through the app saves you time.",
        suggestions: ['Order now', 'Set reminder', 'Find nearest store']
      };
    }

    if (lowerQuery.includes('special') || lowerQuery.includes('offer') || lowerQuery.includes('deal')) {
      return {
        text: "Today's specials:\n🎉 Coffee & Croissant combo - £5.99 (save £1.50)\n🎉 Buy 2 bagels, get 20% off\n🎉 Free delivery on orders over £20\n\nYou're also just 3 orders away from a free coffee with our loyalty program!",
        suggestions: ['Apply offer', 'View loyalty points', 'Share with friends']
      };
    }

    if (lowerQuery.includes('allergen') || lowerQuery.includes('gluten') || lowerQuery.includes('vegan')) {
      return {
        text: "We take dietary requirements seriously! We have:\n🌱 Vegan options (marked with V)\n🌾 Gluten-free breads and pastries\n🥜 Nut-free items\n\nAll items show full allergen information. Would you like me to filter the menu for your dietary needs?",
        suggestions: ['Vegan menu', 'Gluten-free options', 'View all allergens']
      };
    }

    return {
      text: "I'd be happy to help! You can ask me about our menu, track your order, check store hours, or find special offers. What would you like to know?",
      suggestions: ['View menu', 'Track order', 'Store info', 'Help']
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
        className={`fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all ${
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
          <div className="p-4 bg-blue-600 text-white rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                🤖
              </div>
              <div>
                <h3 className="font-semibold">Roni's Assistant</h3>
                <p className="text-xs opacity-90">Always here to help</p>
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
                        ? 'bg-blue-600 text-white'
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
                <FiShoppingCart className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Menu</span>
              </button>
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiMapPin className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Track</span>
              </button>
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiClock className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Hours</span>
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
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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