import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatAPI } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [language, setLanguage] = useState('en');
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (chatRef.current && !chatRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    let storedSessionId = localStorage.getItem('grp_chat_session');
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem('grp_chat_session', storedSessionId);
    }
    setSessionId(storedSessionId);

    setMessages([{
      type: 'bot',
      text: language === 'te' 
        ? 'నమస్కారం! నేను GRP AI సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?' 
        : 'Hello! I am GRP AI Assistant. How can I help you today?'
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const welcomeMsg = language === 'te' 
        ? 'నమస్కారం! నేను GRP AI సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?' 
        : 'Hello! I am GRP AI Assistant. How can I help you today?';
      setMessages([{ type: 'bot', text: welcomeMsg }]);
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { type: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        message: userMsg,
        session_id: sessionId,
        language: language
      });

      setMessages(prev => [...prev, { type: 'bot', text: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: language === 'te' 
          ? 'క్షమించండి, ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.' 
          : 'Sorry, something went wrong. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'te' : 'en');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#2563EB] text-white rounded-full shadow-lg hover:bg-[#1D4ED8] transition-colors flex items-center justify-center z-[9999]"
        data-testid="chatbot-open-button"
        aria-label="Open chat"
      >
        <MessageCircle className="w-7 h-7" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for outside click on mobile */}
      <div className="fixed inset-0 z-[9998] sm:hidden" />
      <div
        ref={chatRef}
        className="fixed bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto w-full sm:w-96 h-[85vh] sm:h-[min(600px,calc(100vh-5rem))] bg-white sm:rounded-lg rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col z-[9999]"
        data-testid="chatbot-widget"
      >
      <div className="bg-[#0F172A] text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-bold text-sm">GRP AI Assistant</h3>
            <p className="text-xs text-gray-300">{language === 'te' ? 'తెలుగు' : 'English'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleLanguage}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            data-testid="language-toggle-button"
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            data-testid="chatbot-close-button"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.type === 'user'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white text-[#0F172A] border border-gray-200'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={language === 'te' ? 'మీ సందేశాన్ని టైప్ చేయండి...' : 'Type your message...'}
            className="flex-1"
            disabled={loading}
            data-testid="chatbot-input"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !inputMessage.trim()}
            className="bg-[#2563EB] hover:bg-[#1D4ED8]"
            data-testid="chatbot-send-button"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};
