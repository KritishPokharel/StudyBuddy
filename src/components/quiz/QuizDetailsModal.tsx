
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, XCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Question {
  questionNumber: number;
  topic: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface QuizDetail {
  id: number;
  quizTitle: string;
  type: 'quiz' | 'midterm';
  dateTaken: string;
  duration: string;
  scorePercent: number;
  questions: Question[];
  weakTopics: string[];
  recommendedResources: {
    title: string;
    description: string;
    url: string;
  }[];
}

interface QuizDetailsModalProps {
  quizId: number;
  quizType: 'quiz' | 'midterm';
  isOpen: boolean;
  onClose: () => void;
}

const QuizDetailsModal = ({ quizId, quizType, isOpen, onClose }: QuizDetailsModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [quizData, setQuizData] = useState<QuizDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);

      const timer = setTimeout(() => {
        try {
          const mockQuizData: QuizDetail = {
            id: quizId,
            quizTitle: quizId === 1 ? "Computer Science - General Loops Quiz" : quizId === 2 ? "Computer Science Mid-Term Review" : "Chemistry Formulas Quiz",
            type: quizType,
            dateTaken: "2025-04-28 10:30 AM",
            duration: "15 minutes",
            scorePercent: quizId === 1 ? 80 : quizId === 2 ? 68 : 65,
            questions: [
              {
                questionNumber: 1,
                topic: "Loop Basics",
                userAnswer: "The loop variable increments after each iteration.",
                correctAnswer: "The loop variable increments after each iteration.",
                isCorrect: true,
                explanation: "In most programming languages, the loop control variable is updated after each iteration according to the increment statement."
              },
              {
                questionNumber: 2,
                topic: "Loop Types",
                userAnswer: "A continue statement stops the loop completely.",
                correctAnswer: "A continue statement skips the current iteration and proceeds to the next one.",
                isCorrect: false,
                explanation: "The continue statement skips the remainder of the current iteration and moves to the next iteration, while break is used to exit the loop entirely."
              }
            ],
            weakTopics: quizId === 1 ? ["Loop Control Statements"] : quizId === 2 ? ["Recursion"] : ["Chemical Bonds"],
            recommendedResources: [
              {
                title: quizId === 1 ? "Understanding Programming Loops" : quizId === 2 ? "Recursion Fundamentals" : "Chemistry Basics",
                description: quizId === 1 ? "Learn the basics of loop structures with practical coding examples." : quizId === 2 ? "Comprehensive guide to recursive algorithms and implementations." : "Master the fundamentals of chemical bonds and reactions.",
                url: "https://example.com/resource-1"
              }
            ]
          };

          setQuizData(mockQuizData);
          setIsLoading(false);
        } catch (err) {
          setError("Failed to load quiz details. Please try again.");
          setIsLoading(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, quizId, quizType]);

  const handleViewFullDetails = () => {
    onClose();
    navigate(`/quiz-details/${quizType}/${quizId}`);
  };

  const handlePracticeWeakTopics = () => {
    if (quizData?.weakTopics.length) {
      onClose();
      navigate(`/quick-quiz/configure?mode=error&topics=${quizData.weakTopics.join(',')}`);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-studypurple-400"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    if (!quizData) return null;

    const correctAnswers = quizData.questions.filter(q => q.isCorrect).length;
    const totalQuestions = quizData.questions.length;

    return (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">{quizData.quizTitle}</h2>
            <p className="text-studyneutral-300 text-sm">{quizData.dateTaken} • {quizData.duration}</p>
          </div>
          
          <div className="bg-studypurple-100 py-1 px-4 rounded-full">
            <span className="font-semibold text-studypurple-600">Score: {quizData.scorePercent}%</span>
            <span className="text-studypurple-400 text-sm ml-2">({correctAnswers}/{totalQuestions})</span>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium mb-3">Question Summary</h3>
          <div className="space-y-2">
            {quizData.questions.map((question) => (
              <div 
                key={question.questionNumber} 
                className={`p-3 rounded-lg flex items-center justify-between ${
                  question.isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center">
                  {question.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  <span>Q{question.questionNumber}: {question.topic}</span>
                </div>
                {!question.isCorrect && (
                  <span className="text-xs text-red-500 font-medium">Incorrect</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {quizData.weakTopics.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Weak Areas</h3>
            <div className="flex flex-wrap gap-2">
              {quizData.weakTopics.map((topic) => (
                <span 
                  key={topic} 
                  className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            variant="outline"
            className="flex-1"
            onClick={handlePracticeWeakTopics}
            disabled={quizData.weakTopics.length === 0}
          >
            Practice Weak Topics
          </Button>
          
          <Button 
            className="flex-1 bg-studypurple-400 hover:bg-studypurple-500"
            onClick={handleViewFullDetails}
          >
            View Full Details <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </>
    );
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <div className="px-4 py-2 bg-studypurple-50 text-center rounded-t-lg">
            <DrawerTitle className="text-center text-studypurple-600">Quiz Results</DrawerTitle>
          </div>
          <div className="p-4">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quiz Results</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuizDetailsModal;
