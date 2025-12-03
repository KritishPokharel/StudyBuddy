import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, RefreshCcw, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import ResourceCard from '@/pages/resources/ResourceCard';

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

const QuizDetailsPage = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [quizData, setQuizData] = useState<QuizDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRateResource = (resourceId: string, rating: number) => {
    toast({
      title: "Resource Rated",
      description: `You rated "${resourceId}" ${rating} stars`,
    });
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      try {
        const mockQuizData: QuizDetail = {
          id: Number(id),
          quizTitle: Number(id) === 1 ? "Computer Science - General Loops Quiz" : Number(id) === 2 ? "Computer Science Mid-Term Review" : "Chemistry Formulas Quiz",
          type: type as 'quiz' | 'midterm' || 'quiz',
          dateTaken: "2025-04-28 10:30 AM",
          duration: "15 minutes",
          scorePercent: Number(id) === 1 ? 80 : Number(id) === 2 ? 68 : 65,
          questions: [
            {
              questionNumber: 1,
              topic: "For Loop Syntax",
              userAnswer: "A for loop consists of initialization, condition, and update statements",
              correctAnswer: "A for loop consists of initialization, condition, and update statements",
              isCorrect: true,
              explanation: "A for loop typically includes these three components that control the iteration process."
            },
            {
              questionNumber: 2,
              topic: "While Loop",
              userAnswer: "A while loop always executes at least once",
              correctAnswer: "A while loop may execute zero times if the condition is initially false",
              isCorrect: false,
              explanation: "A while loop checks its condition before the first iteration, so it will not execute at all if the condition is false at the start."
            },
            {
              questionNumber: 3,
              topic: Number(id) === 1 ? "Do-While Loop" : Number(id) === 2 ? "Recursion" : "Chemical Bonds",
              userAnswer: Number(id) === 1 ? "A do-while loop may not execute at all" : Number(id) === 2 ? "Recursion always uses more memory than iteration" : "Ionic bonds share electrons equally",
              correctAnswer: Number(id) === 1 ? "A do-while loop always executes at least once" : Number(id) === 2 ? "Recursion can be more elegant for certain problems but may consume more stack space" : "Ionic bonds transfer electrons between atoms",
              isCorrect: false,
              explanation: Number(id) === 1 ? "Unlike a while loop, a do-while loop always executes its body at least once before checking the condition." : Number(id) === 2 ? "Recursion often provides elegant solutions for problems with recursive structure, but can consume more stack memory than iterative approaches." : "Ionic bonds involve electron transfer, not sharing."
            },
          ],
          weakTopics: Number(id) === 1 ? ["While Loops", "Do-While Loops"] : Number(id) === 2 ? ["Recursion", "Loop Optimization"] : ["Chemical Bonds", "Organic Compounds"],
          recommendedResources: [
            {
              title: Number(id) === 1 ? "Understanding Programming Loops" : Number(id) === 2 ? "CS Fundamentals: Loops and Recursion" : "Chemistry Basics",
              description: Number(id) === 1 ? "Learn the basics of loops with practical coding examples." : Number(id) === 2 ? "Comprehensive guide to loops and recursive functions." : "Master the fundamentals of chemical bonds and reactions.",
              url: "https://example.com/resource-1"
            },
            {
              title: Number(id) === 1 ? "Loop Practice Problems" : Number(id) === 2 ? "Interactive Programming Exercises" : "Chemistry Formula Reference",
              description: Number(id) === 1 ? "Practice problems focused on for, while, and do-while loops." : Number(id) === 2 ? "Visual guide to loop structures with interactive coding challenges." : "Complete guide to chemistry formulas with examples.",
              url: "https://example.com/resource-2"
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
  }, [id, type]);

  const handleRetakeQuiz = () => {
    toast({
      title: "Starting Quiz",
      description: `Retaking ${quizData?.quizTitle}`,
    });
    
    if (quizData?.type === 'midterm') {
      navigate('/dashboard/midterm-review/upload');
    } else {
      navigate('/dashboard/quick-quiz/configure');
    }
  };

  const handlePracticeWeakTopics = () => {
    if (quizData?.weakTopics.length) {
      navigate(`/quick-quiz/configure?mode=error&topics=${quizData.weakTopics.join(',')}`);
    }
  };

  const handleViewResources = () => {
    navigate(`/resources?filter=${quizData?.weakTopics.join(',')}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-studypurple-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-red-50 p-8 rounded-xl border border-red-100">
            <h2 className="text-xl font-semibold text-red-700 mb-4">{error}</h2>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return null;
  }

  const correctAnswers = quizData.questions.filter(q => q.isCorrect).length;
  const totalQuestions = quizData.questions.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{quizData.quizTitle}</h1>
              <p className="text-studyneutral-300">{quizData.dateTaken} • {quizData.duration}</p>
            </div>
            
            <div className="bg-studypurple-100 py-2 px-6 rounded-full">
              <span className="font-semibold text-studypurple-600">Score: {quizData.scorePercent}%</span>
              <span className="text-studypurple-400 text-sm ml-2">({correctAnswers}/{totalQuestions} correct)</span>
            </div>
          </div>
        </div>
        
        <Card className="mb-8 border-2 border-studypurple-100">
          <CardHeader className="pb-0">
            <h2 className="text-xl font-semibold">Question Breakdown</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Q#</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="hidden md:table-cell">Your Answer</TableHead>
                    <TableHead className="hidden md:table-cell">Correct Answer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizData.questions.map((question) => (
                    <TableRow key={question.questionNumber} className={!question.isCorrect ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">Q{question.questionNumber}</TableCell>
                      <TableCell>{question.topic}</TableCell>
                      <TableCell>
                        {question.isCorrect ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" /> Incorrect
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-wrap max-w-[200px]">{question.userAnswer}</TableCell>
                      <TableCell className="hidden md:table-cell text-wrap max-w-[200px]">
                        <p>{question.correctAnswer}</p>
                        {!question.isCorrect && (
                          <p className="text-sm mt-1 text-studyneutral-400">{question.explanation}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="md:hidden space-y-4 mt-6">
              {quizData.questions.filter(q => !q.isCorrect).map((question) => (
                <div key={`mobile-${question.questionNumber}`} className="border-l-4 border-red-400 pl-4 py-2">
                  <h3 className="font-medium">Q{question.questionNumber}: {question.topic}</h3>
                  <div className="mt-2">
                    <p className="text-sm text-studyneutral-300">Your answer:</p>
                    <p className="mb-2">{question.userAnswer}</p>
                    <p className="text-sm text-studyneutral-300">Correct answer:</p>
                    <p>{question.correctAnswer}</p>
                    <p className="text-sm mt-2 text-studyneutral-400">{question.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {quizData.weakTopics.length > 0 && (
          <Card className="mb-8 border-2 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-0">
              <h2 className="text-xl font-semibold text-yellow-800">Weak Areas Identified</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {quizData.weakTopics.map((topic) => (
                  <span 
                    key={topic} 
                    className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <Button 
                onClick={handlePracticeWeakTopics}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                Practice Weak Topics
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Card className="mb-8">
          <CardHeader className="pb-0">
            <h2 className="text-xl font-semibold">Recommended Resources</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {quizData.recommendedResources.map((resource) => (
                <ResourceCard
                  key={resource.title}
                  resource={resource}
                  onRate={handleRateResource}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex flex-wrap justify-between gap-4">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              className="border-studypurple-300 text-studypurple-500"
              onClick={handleViewResources}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              View Related Resources
            </Button>
            
            <Button 
              variant="secondary"
              onClick={handleRetakeQuiz}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
            
            <Button 
              onClick={handlePracticeWeakTopics}
              className="bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            >
              Practice Weak Topics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizDetailsPage;
