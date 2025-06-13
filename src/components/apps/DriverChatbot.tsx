import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiX, FiTruck, FiMapPin, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
}

export default function DriverChatbot() {
  const { user, tenantId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your Delivery Assistant. I can help you with route optimization, delivery tracking, earnings reports, and navigation. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: ['My deliveries', 'Current location', 'Earnings today', 'Route optimization']
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

  // Helper function to convert tenant slug to numeric ID
  const getTenantNumericId = (tenantSlug: string): number => {
    const tenantMapping: Record<string, number> = {
      'rb-main': 1,
      'rb-belsize': 2,
      'hjb-supplier': 3,
      'logistics-main': 4
    };
    return tenantMapping[tenantSlug] || 4; // Default to logistics for drivers
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !tenantId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      // Call the agent API
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          role: user.role,
          tenantId: getTenantNumericId(tenantId),
          userId: parseInt(user.id, 10)
        }),
      });

      const data = await response.json();

      if (data.success) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
          suggestions: data.suggestions || getSuggestionsForRole(user.role)
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.error || 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getSuggestionsForRole = (role: string): string[] => {
    switch (role) {
      case 'driver':
        return ['My deliveries', 'Update location', 'Complete delivery', 'Earnings summary', 'Route optimization'];
      default:
        return ['My deliveries', 'Help', 'Navigation'];
    }
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
        className={`fixed bottom-6 right-6 p-4 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 transition-all ${
          isOpen ? 'hidden' : 'flex'
        } items-center justify-center z-[40]`}
      >
        <FiMessageSquare size={24} />
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-[50]">
          {/* Header */}
          <div className="p-4 bg-orange-600 text-white rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                🚛
              </div>
              <div>
                <h3 className="font-semibold">Driver Assistant</h3>
                <p className="text-xs opacity-90">AI-powered delivery helper</p>
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
                        ? 'bg-orange-600 text-white'
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
              <button 
                onClick={() => handleSuggestionClick('Show my current deliveries')}
                className="flex flex-col items-center p-2 hover:bg-gray-50 rounded"
              >
                <FiTruck className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Deliveries</span>
              </button>
              <button 
                onClick={() => handleSuggestionClick('Update my current location')}
                className="flex flex-col items-center p-2 hover:bg-gray-50 rounded"
              >
                <FiMapPin className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Location</span>
              </button>
              <button 
                onClick={() => handleSuggestionClick('Show my earnings today')}
                className="flex flex-col items-center p-2 hover:bg-gray-50 rounded"
              >
                <FiDollarSign className="text-gray-600" />
                <span className="text-xs text-gray-600 mt-1">Earnings</span>
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
                placeholder="Ask about deliveries, routes..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
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