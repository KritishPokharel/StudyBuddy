
import React from 'react';
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  type: 'bot' | 'user';
  message: string;
}

const ChatMessage = ({ type, message }: ChatMessageProps) => {
  return (
    <div className={cn(
      "mb-4 flex",
      type === 'user' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2",
        type === 'user' 
          ? "bg-studypurple-400 text-white" 
          : "bg-studypurple-100 text-studypurple-700"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
