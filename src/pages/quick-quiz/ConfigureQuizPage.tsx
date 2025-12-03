import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Brain, Sparkles, FileText, CheckCircle } from 'lucide-react';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import type { ProcessingStep } from '@/components/ui/processing-steps';

const ConfigureQuizPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const isErrorMode = searchParams.get('mode') === 'error';
  
  // Processing steps for quiz generation
  const quizGenerationSteps: ProcessingStep[] = [
    {
      id: 'analyzing',
      label: 'Analyzing Topics',
      description: 'Reviewing selected topics and preparing quiz structure...',
      icon: <Brain className="h-5 w-5" />,
    },
    {
      id: 'generating',
      label: 'Generating Questions',
      description: 'AI is creating personalized questions based on your topics...',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'optimizing',
      label: 'Optimizing Quiz',
      description: 'Refining questions and ensuring quality...',
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      id: 'complete',
      label: 'Quiz Ready',
      description: 'Your personalized quiz is ready to start!',
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ];
  // Decode topics from URL params (they were encoded individually)
  const topicsFromParams = searchParams.get('topics')?.split(',').map(topic => decodeURIComponent(topic)).filter(Boolean) || [];
  const selectedLibraryItem = searchParams.get('libraryItem') || '';
  const hasUploadedFiles = searchParams.get('uploadedFiles') === 'true';
  const specificTopic = searchParams.get('topic') || '';
  const extractedSubject = searchParams.get('subject') || '';
  
  const [duration, setDuration] = useState('10'); // Default to 10 minutes
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
    if (topicsFromParams.length > 0) {
      return topicsFromParams;
    }
    if (specificTopic) {
      return [specificTopic];
    }
    return [];
  });
  
  useEffect(() => {
    if (isErrorMode) {
      setSelectedTopics(topicsFromParams);
      setDuration('10'); // Default to 10 minutes for error-based quizzes
    } else if (specificTopic) {
      setSelectedTopics([specificTopic]);
    } else if (hasUploadedFiles && topicsFromParams.length > 0) {
      // For uploaded files, select all extracted topics by default
      setSelectedTopics(topicsFromParams);
    }
  }, [isErrorMode, topicsFromParams, specificTopic, hasUploadedFiles]);
  
  const getAvailableTopics = () => {
    if (hasUploadedFiles && topicsFromParams.length > 0) {
      // Use extracted topics from uploaded material
      return topicsFromParams.map(topic => ({
        id: topic,
        name: topic
      }));
    }
    
    if (hasUploadedFiles) {
      // Fallback topics if extraction failed
      return [
        { id: 'Trees', name: 'Trees & Binary Trees' },
        { id: 'LinkedList', name: 'Linked Lists' },
        { id: 'HashMap', name: 'Hash Maps & Hash Tables' },
        { id: 'SlidingWindow', name: 'Sliding Window Technique' },
        { id: 'Recursion', name: 'Recursion & Backtracking' },
        { id: 'DynamicProgramming', name: 'Dynamic Programming' },
      ];
    }
    
    switch (selectedLibraryItem) {
      case '1': 
        return [
          { id: 'General Loops', name: 'General Loops' },
          { id: 'For Loops', name: 'For Loops' },
          { id: 'While Loops', name: 'While Loops' },
          { id: 'Do-While Loops', name: 'Do-While Loops' },
          { id: 'Loop Control', name: 'Loop Control' },
          { id: 'Nested Loops', name: 'Nested Loops' },
          { id: 'Infinite Loops', name: 'Infinite Loops' },
        ];
      case '2': 
        return [
          { id: 'Chemical Equations', name: 'Chemical Equations' },
          { id: 'Stoichiometry', name: 'Stoichiometry' },
          { id: 'Acid-Base Reactions', name: 'Acid-Base Reactions' },
          { id: 'Redox Reactions', name: 'Redox Reactions' },
          { id: 'Thermochemistry', name: 'Thermochemistry' },
          { id: 'Equilibrium Constants', name: 'Equilibrium Constants' },
        ];
      case '3': 
        return [
          { id: 'Newton Laws', name: 'Newton\'s Laws of Motion' },
          { id: 'Work Energy', name: 'Work and Energy' },
          { id: 'Momentum', name: 'Momentum and Collisions' },
          { id: 'Circular Motion', name: 'Circular Motion' },
          { id: 'Gravitation', name: 'Gravitation' },
          { id: 'Simple Harmonic Motion', name: 'Simple Harmonic Motion' },
        ];
      default:
        return [
          { id: 'General Loops', name: 'General Loops' },
          { id: 'For Loops', name: 'For Loops' },
          { id: 'While Loops', name: 'While Loops' },
          { id: 'Do-While Loops', name: 'Do-While Loops' },
          { id: 'Loop Control', name: 'Loop Control' },
          { id: 'Nested Loops', name: 'Nested Loops' },
          { id: 'Infinite Loops', name: 'Infinite Loops' },
        ];
    }
  };

  const availableTopics = getAvailableTopics();
  
  const getPageTitle = () => {
    if (hasUploadedFiles) {
      const subject = extractedSubject || 'Quiz';
      return isErrorMode ? `Quiz on ${subject} Errors` : `Create a ${subject} Quiz`;
    }
    
    // For library items, use generic names
    const subject = extractedSubject || 'Quiz';
    switch (selectedLibraryItem) {
      case '1': 
        return isErrorMode ? `Quiz on ${subject} Errors` : `Create a ${subject} Quiz`;
      case '2': 
        return isErrorMode ? `Quiz on ${subject} Errors` : `Create a ${subject} Quiz`;
      case '3': 
        return isErrorMode ? `Quiz on ${subject} Errors` : `Create a ${subject} Quiz`;
      default:
        return isErrorMode ? `Quiz on ${subject} Errors` : `Create a ${subject} Quiz`;
    }
  };
  
  const getTopicsSectionTitle = () => {
    if (hasUploadedFiles) {
      return extractedSubject ? `${extractedSubject} Topics` : 'Topics';
    }
    
    switch (selectedLibraryItem) {
      case '1': return 'Programming Topics';
      case '2': return 'Chemistry Topics';
      case '3': return 'Physics Topics';
      default: return isErrorMode ? 'Error Topics' : 'Topics';
    }
  };
  
  const handleTopicChange = (topicId: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        return [...prev, topicId];
      }
    });
  };
  
  const handleBack = () => {
    navigate(isErrorMode ? '/dashboard/midterm-review/results' : '/dashboard/quick-quiz/select-materials');
  };
  
  const handleStartQuiz = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to continue",
        variant: "destructive"
      });
      return;
    }

    if (selectedTopics.length === 0) {
      toast({
        title: "No topics selected",
        description: "Please select at least one topic",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProcessingStep(0);
    setProcessingProgress(0);
    console.log('[Quiz] Starting quiz generation...');
    console.log('[Quiz] User ID:', user.id);
    console.log('[Quiz] Topics:', selectedTopics);
    console.log('[Quiz] Duration:', duration);
    
    // Simulate progress steps
    const progressSteps = [
      { step: 0, progress: 25, delay: 500 },
      { step: 1, progress: 50, delay: 2000 },
      { step: 2, progress: 75, delay: 4000 },
    ];

    const stepTimers: number[] = [];
    progressSteps.forEach(({ step, progress: prog, delay }) => {
      stepTimers.push(window.setTimeout(() => {
        setProcessingStep(step);
        setProcessingProgress(prog);
      }, delay));
    });
    
    try {
      // Match question count to duration: 10 min = 10 questions, 15 min = 15 questions, 20 min = 20 questions
      const numQuestions = parseInt(duration);
      
      console.log('[Quiz] Calling API with:', {
        user_id: user.id,
        topics: selectedTopics,
        num_questions: numQuestions,
      });
      
      // Don't pass title - let backend generate concise AI title from topics
      const response = await api.generateQuiz({
        user_id: user.id,
        title: undefined, // Let backend generate AI title
        topics: selectedTopics,
        num_questions: numQuestions,
        uploaded_files: hasUploadedFiles ? [] : undefined, // For now, library items don't need file upload
        subject: extractedSubject || undefined, // Pass subject if available
      });

      console.log('[Quiz] API response received:', response);

      // Update to final step
      setProcessingStep(3);
      setProcessingProgress(100);

      // Wait a moment to show completion, then navigate
      setTimeout(() => {
        // Store quiz data and navigate
        localStorage.setItem('currentQuiz', JSON.stringify(response));
        navigate(`/dashboard/quick-quiz/question/1?quizId=${response.quiz_id}`);
        setIsGenerating(false);
      }, 1000);
    } catch (error) {
      console.error('[Quiz] Error generating quiz:', error);
      // Clear timers on error
      stepTimers.forEach(timer => clearTimeout(timer));
      setIsGenerating(false);
      setProcessingStep(0);
      setProcessingProgress(0);
      toast({
        title: "Failed to generate quiz",
        description: (error as Error).message || "Please try again",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          {getPageTitle()}
        </h1>
        <p className="text-studyneutral-300 mb-8">
          {isErrorMode 
            ? 'We\'ve configured this quiz based on your midterm errors' 
            : 'Step 2: Configure your quiz'}
        </p>
        
        <div className="space-y-8">
          {!isErrorMode && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Quiz Duration</h2>
                <p className="text-studyneutral-300 mb-4">How much time do you want to spend on this quiz?</p>
                
                <RadioGroup 
                  value={duration} 
                  onValueChange={setDuration} 
                  className="flex flex-col sm:flex-row gap-4"
                >
                  {[
                    { value: '10', label: '10 minutes', description: '10 questions' },
                    { value: '15', label: '15 minutes', description: '15 questions' },
                    { value: '20', label: '20 minutes', description: '20 questions' },
                  ].map(option => (
                    <div 
                      key={option.value} 
                      className={`flex-1 rounded-lg border p-4 cursor-pointer transition-all ${
                        duration === option.value 
                          ? 'border-studypurple-400 bg-studypurple-100/50' 
                          : 'hover:border-studypurple-200'
                      }`}
                      onClick={() => setDuration(option.value)}
                    >
                      <div className="flex items-start">
                        <RadioGroupItem value={option.value} id={`duration-${option.value}`} className="mt-1" />
                        <div className="ml-2">
                          <Label 
                            htmlFor={`duration-${option.value}`} 
                            className="font-medium cursor-pointer"
                          >
                            {option.label}
                          </Label>
                          <p className="text-sm text-studyneutral-300">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {getTopicsSectionTitle()}
              </h2>
              <p className="text-studyneutral-300 mb-4">
                {isErrorMode 
                  ? 'Your quiz will focus exclusively on these topics from your midterm errors:'
                  : 'Select topics to include in your quiz'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTopics.map(topic => {
                  const isTopicFromError = topicsFromParams.includes(topic.id);
                  const isDisabled = isErrorMode && !isTopicFromError;
                  const isSelected = selectedTopics.includes(topic.id);
                  
                  return (
                    <div 
                      key={topic.id} 
                      className={`rounded-lg border p-3 transition-all ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'border-studypurple-400 bg-studypurple-100/50' 
                          : 'hover:border-studypurple-200'
                      } ${isErrorMode && isTopicFromError ? 'border-studypurple-300' : ''}`}
                      onClick={() => !isDisabled && !isErrorMode && handleTopicChange(topic.id)}
                    >
                      <div className="flex items-center">
                        <Checkbox 
                          id={topic.id} 
                          checked={isSelected}
                          disabled={isDisabled || isErrorMode}
                          onCheckedChange={() => !isDisabled && !isErrorMode && handleTopicChange(topic.id)}
                        />
                        <label 
                          htmlFor={topic.id} 
                          className={`ml-2 font-medium ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          {topic.name}
                        </label>
                        {isErrorMode && isTopicFromError && (
                          <span className="ml-auto text-xs bg-studyaccent-orange px-2 py-1 rounded-full">
                            From Errors
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {isErrorMode && (
                <div className="mt-4 bg-studyaccent-blue/50 p-4 rounded-lg">
                  <p className="text-sm">
                    This {duration}-minute quiz will focus specifically on the {extractedSubject || (hasUploadedFiles ? 'material' : 'programming')} topics where you made errors in your midterm.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
            >
              Back
            </Button>
            <Button 
              onClick={handleStartQuiz} 
              className="bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
              disabled={isGenerating || selectedTopics.length === 0}
            >
              {isGenerating ? 'Generating Quiz...' : 'Start Quiz'}
            </Button>
          </div>
        </div>
      </div>

      {/* Quiz Generation Processing Overlay */}
      <ProcessingOverlay
        isOpen={isGenerating}
        title="Generating Your Quiz"
        subtitle="Creating personalized questions based on your selected topics"
        steps={quizGenerationSteps}
        currentStep={processingStep}
        progress={processingProgress}
        canClose={false}
      />
    </div>
  );
};

export default ConfigureQuizPage;
