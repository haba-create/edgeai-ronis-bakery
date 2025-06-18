import React, { useState, useEffect } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import useSWR from 'swr';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<{text: string, sender: 'user' | 'agent', timestamp: Date}[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  
  // Fetch dashboard data for agent context
  const { data: dashboardData } = useSWR('/api/dashboard', url => fetch(url).then(res => res.json()));
  
  useEffect(() => {
    // Initial greeting message
    setMessages([{
      text: "Hello! I'm your bakery inventory assistant for Roni's Bakery in Belsize Park. How can I help you today?",
      sender: 'agent',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    // Update input field with speech transcript
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input;
    setInput('');
    resetTranscript();
    
    // Add user message to chat
    setMessages(prev => [...prev, { 
      text: userMessage, 
      sender: 'user',
      timestamp: new Date() 
    }]);

    setIsProcessing(true);
    
    try {
      // Call the unified agent to process the request
      const response = await fetch('/api/unified-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          role: 'customer' // Default role for legacy interface
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        text: data.response, 
        sender: 'agent',
        timestamp: new Date() 
      }]);
    } catch (error) {
      console.error('Error processing request:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error processing your request. Please try again.', 
        sender: 'agent',
        timestamp: new Date() 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      SpeechRecognition.stopListening();
      // Submit what was heard if there's content
      if (transcript) {
        setInput(transcript);
        setTimeout(() => handleSubmit(), 300); // Short delay to ensure input is set
      }
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    }
    setIsListening(!isListening);
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="dashboard-card flex-1 overflow-y-auto mb-4 p-6">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.sender === 'user' 
                  ? 'bg-amber-800 text-white' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'}`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <div 
                  className={`text-xs mt-1 ${msg.sender === 'user' 
                    ? 'text-amber-200' 
                    : 'text-gray-500'}`}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2 max-w-[80%] border border-gray-200">
                <div className="flex space-x-2">
                  <div className="animate-bounce">●</div>
                  <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</div>
                  <div className="animate-bounce" style={{ animationDelay: '0.4s' }}>●</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Ask about inventory, orders, or what to order..."
          disabled={isProcessing}
        />
        {browserSupportsSpeechRecognition && (
          <button 
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-md ${isListening 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 text-gray-700'}`}
          >
            {isListening ? '🛑' : '🎤'}
          </button>
        )}
        <button 
          type="submit" 
          className="brand-button"
          disabled={!input.trim() || isProcessing}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
