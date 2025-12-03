
import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare } from 'lucide-react';
import { useChatbot } from '@/contexts/ChatbotContext';

const ChatbotButton = () => {
  const { toggleChat, isOpen } = useChatbot();

  return (
    <Button
      onClick={toggleChat}
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-studypurple-400 hover:bg-studypurple-500 transition-all z-50"
      size="icon"
    >
      <MessageSquare className="h-6 w-6 text-white" />
    </Button>
  );
};

export default ChatbotButton;

