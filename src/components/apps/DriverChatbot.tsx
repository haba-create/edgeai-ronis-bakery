import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiX, FiNavigation, FiPhone, FiMapPin } from 'react-icons/fi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
}

export default function DriverChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi David! I'm your driving assistant. I can help with navigation, customer contact, reporting issues, or any questions. Safe driving! 🚗",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: ['Get directions', 'Call customer', 'Report issue', 'Break time']
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

    if (lowerQuery.includes('direction') || lowerQuery.includes('navigate') || lowerQuery.includes('route')) {
      return {
        text: "🧭 Next directions to Heritage Jewish Breads:\n\n1. Continue straight for 0.2 miles\n2. Turn right onto Finchley Road\n3. In 0.5 miles, turn left onto Industrial Way\n4. Destination will be on your right\n\n📍 ETA: 8 minutes\n🚗 Current traffic: Light\n\nWould you like me to reroute due to traffic or call the customer?",
        suggestions: ['Avoid traffic', 'Call customer', 'Alternative route', 'Voice navigation']
      };
    }

    if (lowerQuery.includes('customer') || lowerQuery.includes('call') || lowerQuery.includes('contact')) {
      return {
        text: "📞 Customer Contact for current delivery:\n\n👤 Heritage Jewish Breads\n📱 +44 20 7123 4567\n📧 orders@heritagebread.co.uk\n\n💬 Pre-written messages:\n• \"I'm 5 minutes away\"\n• \"I've arrived and am outside\"\n• \"Having trouble finding the address\"\n\nWould you like me to call them or send a message?",
        suggestions: ['Call now', 'Send arrival message', 'Report issue', 'Get help']
      };
    }

    if (lowerQuery.includes('issue') || lowerQuery.includes('problem') || lowerQuery.includes('help')) {
      return {
        text: "🆘 I can help with various issues:\n\n🚗 Vehicle problems\n📍 Navigation/GPS issues\n📦 Delivery complications\n👤 Customer concerns\n🛣️ Traffic/road issues\n\nWhat type of issue are you experiencing? I can connect you with the right support team or provide immediate assistance.",
        suggestions: ['Vehicle problem', 'Customer issue', 'Navigation help', 'Emergency support']
      };
    }

    if (lowerQuery.includes('break') || lowerQuery.includes('rest') || lowerQuery.includes('lunch')) {
      return {
        text: "⏰ Break Management:\n\nYou've been driving for 2.5 hours. UK law requires a 45-minute break after 4.5 hours of driving.\n\n📍 Nearby break spots:\n• Services: 0.3 miles ahead\n• Café: Belsize Park (2 min)\n• Parking: Primrose Hill (5 min)\n\n⚠️ Current delivery ETA: 15 minutes\nRecommendation: Complete current delivery, then take break.",
        suggestions: ['Find parking', 'After delivery break', 'Emergency stop', 'Log break time']
      };
    }

    if (lowerQuery.includes('traffic') || lowerQuery.includes('delay') || lowerQuery.includes('late')) {
      return {
        text: "🚦 Traffic Update:\n\nCurrent route: Light traffic ✅\nAlternative route available that saves 3 minutes\n\n🕐 If running late:\n• Auto-notify customer (ETA update)\n• Suggest reschedule if >30 min delay\n• Contact dispatch for support\n\nCurrent ETA is within acceptable range. No action needed unless you prefer the faster route.",
        suggestions: ['Take faster route', 'Notify customer', 'Check alternatives', 'Contact dispatch']
      };
    }

    if (lowerQuery.includes('complete') || lowerQuery.includes('delivered') || lowerQuery.includes('finished')) {
      return {
        text: "✅ Delivery Completion:\n\nNext steps after delivery:\n1. Mark delivery as complete in app\n2. Take photo proof (if required)\n3. Get customer signature/confirmation\n4. Rate customer interaction\n\n📱 Next delivery: Roni's Belsize Park (8 min drive)\n🎯 Today's progress: 12/14 deliveries complete\n\nGreat job! You're ahead of schedule today.",
        suggestions: ['Next delivery', 'Take break', 'View earnings', 'Report feedback']
      };
    }

    if (lowerQuery.includes('earn') || lowerQuery.includes('money') || lowerQuery.includes('pay')) {
      return {
        text: "💰 Today's Earnings:\n\n📊 Base pay: £95.50\n🎁 Tips: £28.00\n⚡ Peak bonuses: £22.00\n💵 Total: £145.50\n\n📈 This week: £734.50\n🎯 Weekly goal: £800 (82% complete)\n\nYou're having a great week! Just 2 more days to hit your goal.",
        suggestions: ['Weekly summary', 'Set new goal', 'Track tips', 'Payment history']
      };
    }

    return {
      text: "I'm here to help with:\n\n🧭 Navigation and directions\n📞 Customer communication\n🚗 Vehicle or delivery issues\n⏰ Break time management\n💰 Earnings tracking\n\nWhat can I assist you with?",
      suggestions: ['Get directions', 'Call customer', 'Take a break', 'Check earnings']
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSend();
  };

  return (
    <>
      {/* Chat Button - Mobile Optimized */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-4 p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all ${
          isOpen ? 'hidden' : 'flex'
        } items-center justify-center z-40`}
      >
        <FiMessageSquare size={20} />
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window - Mobile Optimized */}
      {isOpen && (
        <div className="fixed inset-x-4 bottom-4 top-4 bg-white rounded-lg shadow-2xl flex flex-col z-50 max-w-sm mx-auto">
          {/* Header */}
          <div className="p-3 bg-green-600 text-white rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-2">
                🚗
              </div>
              <div>
                <h3 className="font-semibold text-sm">Drive Assistant</h3>
                <p className="text-xs opacity-90">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                        className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
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
                <FiNavigation className="text-gray-600" size={16} />
                <span className="text-xs text-gray-600 mt-1">Nav</span>
              </button>
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiPhone className="text-gray-600" size={16} />
                <span className="text-xs text-gray-600 mt-1">Call</span>
              </button>
              <button className="flex flex-col items-center p-2 hover:bg-gray-50 rounded">
                <FiMapPin className="text-gray-600" size={16} />
                <span className="text-xs text-gray-600 mt-1">Help</span>
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t">
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
                placeholder="Ask for help..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}