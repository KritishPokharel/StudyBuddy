
import React from 'react';
import { Button } from "@/components/ui/button";
import { useChatbot } from '@/contexts/ChatbotContext';

const QuickActions = () => {
  const { handleQuickAction } = useChatbot();
  
  return (
    <div className="flex flex-col gap-2 mt-4">
      <Button 
        variant="secondary" 
        className="justify-start" 
        onClick={() => handleQuickAction('resource')}
      >
        Suggest a Resource
      </Button>
      <Button 
        variant="secondary" 
        className="justify-start" 
        onClick={() => handleQuickAction('tips')}
      >
        Give Study Tips
      </Button>
      <Button 
        variant="secondary" 
        className="justify-start" 
        onClick={() => handleQuickAction('plan')}
      >
        Plan a Study Session
      </Button>
    </div>
  );
};

export default QuickActions;
