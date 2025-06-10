import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiSend, FiTrendingUp, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';

interface OwnerChatbotProps {
  onClose: () => void;
}

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  insights?: {
    type: 'metric' | 'alert' | 'recommendation';
    title: string;
    value?: string;
    description: string;
    action?: string;
  }[];
}

const OwnerChatbot: React.FC<OwnerChatbotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your bakery supply chain assistant. I can help you manage ingredient inventory, analyze supplier performance, track purchase orders, optimize ordering schedules, and make data-driven decisions for your bakery operations. What would you like to know about your supply chain today?",
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
      const response = await fetch('/api/owner-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          context: {
            role: 'owner',
            sessionId: 'owner-session-' + Date.now()
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
        insights: data.insights || []
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Owner chat error:', error);
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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'metric':
        return <FiTrendingUp className="h-4 w-4 text-blue-600" />;
      case 'alert':
        return <FiAlertTriangle className="h-4 w-4 text-red-600" />;
      case 'recommendation':
        return <FiDollarSign className="h-4 w-4 text-green-600" />;
      default:
        return <FiTrendingUp className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'metric':
        return 'bg-blue-50 border-blue-200';
      case 'alert':
        return 'bg-red-50 border-red-200';
      case 'recommendation':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-amber-50">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-sm font-bold">🏢</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Supply Chain Assistant</h3>
            <p className="text-xs text-gray-500">AI-powered supply chain management</p>
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
            <div className={`max-w-[85%] rounded-lg p-3 ${
              message.isBot 
                ? 'bg-gray-100 text-gray-900' 
                : 'bg-amber-600 text-white'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Business Insights */}
              {message.insights && message.insights.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.insights.map((insight, index) => (
                    <div key={index} className={`bg-white rounded-lg p-2 border ${getInsightBgColor(insight.type)}`}>
                      <div className="flex items-start space-x-2">
                        <div className="mt-0.5">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-xs text-gray-900">{insight.title}</h5>
                          {insight.value && (
                            <p className="text-sm font-bold text-gray-800 mt-1">{insight.value}</p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                          {insight.action && (
                            <button className="mt-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors">
                              {insight.action}
                            </button>
                          )}
                        </div>
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
            <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">Analyzing your business data...</span>
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
            placeholder="Ask about ingredient inventory, supplier orders, reordering, costs..."
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
            "Show ingredient stock levels",
            "What needs reordering?",
            "Analyze supplier performance",
            "Review ordering schedule",
            "Cost optimization ideas"
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

export default OwnerChatbot;