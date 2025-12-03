
import React, { useRef, useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import { useChatbot } from '@/contexts/ChatbotContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';
import { ScrollArea } from "@/components/ui/scroll-area";

const ChatWindow = () => {
  const { isOpen, messages, toggleChat, sendMessage } = useChatbot();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[350px] rounded-xl bg-white border border-studypurple-200 animate-fade-in shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b border-studypurple-100">
        <h3 className="font-semibold text-studypurple-600">StudyBuddy Assistant</h3>
        <Button variant="ghost" size="icon" onClick={toggleChat}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="h-[400px] p-4">
        {messages.map((msg, index) => (
          <ChatMessage 
            key={msg.id} 
            type={msg.type} 
            message={msg.text} 
          />
        ))}
        {messages.length === 1 && <QuickActions />}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-studypurple-100">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;

