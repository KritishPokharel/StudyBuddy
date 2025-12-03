
import React, { createContext, useContext, useState, useCallback } from 'react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

interface ChatbotContextType {
  isOpen: boolean;
  messages: Message[];
  toggleChat: () => void;
  sendMessage: (text: string) => void;
  handleQuickAction: (action: 'resource' | 'tips' | 'plan') => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const WELCOME_MESSAGE = `Hi, I am your AI-Powered StudyBuddy bot!
📚 Apart from the resources you get based on your quizzes and mid-term analyses,
if you need any help regarding your study, please feel free to use me anytime!`;

const RESOURCES = [
  { subject: "Computer Science", title: "Understanding Loops", url: "https://example.com/cs-loops" },
  { subject: "Biology", title: "Cell Structure Basics", url: "https://example.com/bio-cells" },
  { subject: "Chemistry", title: "Balancing Chemical Equations", url: "https://example.com/chem-balance" },
  { subject: "Physics", title: "Newton's Laws Explained", url: "https://example.com/physics-newton" }
];

const STUDY_TIPS = [
  "Try the Pomodoro Technique: 25 minutes of focused study, followed by a 5-minute break.",
  "Review your notes within 24 hours of taking them to improve retention.",
  "Teach concepts to others to strengthen your understanding.",
  "Take regular breaks to maintain focus and productivity."
];

const STUDY_PLANS = [
  "10-minute Quick Quiz followed by reviewing 2 related resources",
  "15-minute focused reading session + 5-minute self-quiz",
  "20-minute concept mapping exercise + 10-minute review",
];

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const toggleChat = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen && messages.length === 0) {
      setMessages([{
        id: '0',
        type: 'bot',
        text: WELCOME_MESSAGE,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  const addMessage = useCallback((text: string, type: 'bot' | 'user') => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type,
        text,
        timestamp: new Date()
      }
    ]);
  }, []);

  const sendMessage = useCallback((text: string) => {
    addMessage(text, 'user');
    
    // Simple keyword matching
    setTimeout(() => {
      let response = "I'm still learning! Please check the Resources tab or select a quick option below.";
      
      if (text.toLowerCase().includes('resource')) {
        const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
        response = `Check out this resource: ${resource.title} (${resource.subject})`;
      } else if (text.toLowerCase().includes('tip')) {
        response = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
      } else if (text.toLowerCase().includes('plan')) {
        response = STUDY_PLANS[Math.floor(Math.random() * STUDY_PLANS.length)];
      }
      
      addMessage(response, 'bot');
    }, 1000);
  }, [addMessage]);

  const handleQuickAction = useCallback((action: 'resource' | 'tips' | 'plan') => {
    let response = '';
    switch (action) {
      case 'resource':
        const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
        response = `Here's a recommended resource: ${resource.title} (${resource.subject})`;
        break;
      case 'tips':
        response = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
        break;
      case 'plan':
        response = STUDY_PLANS[Math.floor(Math.random() * STUDY_PLANS.length)];
        break;
    }
    addMessage(response, 'bot');
  }, [addMessage]);

  return (
    <ChatbotContext.Provider value={{ isOpen, messages, toggleChat, sendMessage, handleQuickAction }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};
