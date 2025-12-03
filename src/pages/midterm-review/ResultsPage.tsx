
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ErrorTable from './components/ErrorTable';
import ResourcePanel from './components/ResourcePanel';
import { useAnalysisData } from './hooks/useAnalysisData';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ResultsPage = () => {
  const navigate = useNavigate();
  const { analysisData, uniqueTopics } = useAnalysisData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Use resources from analysis data if available, otherwise fetch once
    if (analysisData.recommendedResources && analysisData.recommendedResources.length > 0) {
      setResources(analysisData.recommendedResources);
      hasFetchedRef.current = true;
    } else if (uniqueTopics.length > 0 && user && !hasFetchedRef.current && !loadingResources) {
      fetchResources();
      hasFetchedRef.current = true;
    }
  }, [uniqueTopics.length, user?.id]); // Use length to avoid array reference changes

  const fetchResources = async () => {
    if (!user || uniqueTopics.length === 0) return;
    
    setLoadingResources(true);
    try {
      // Build detailed context based on midterm errors
      const errorCount = analysisData.errors.length;
      const courseName = analysisData.courseName || 'Mid-Term';
      const errorDetails = analysisData.errors
        .slice(0, 3)
        .map((err: any) => `${err.topic || 'Unknown'}: ${err.question?.substring(0, 80) || err.yourAnswer?.substring(0, 80) || 'Error'}...`)
        .join('; ');
      
      const context = `User made ${errorCount} errors in a ${courseName} midterm exam. 
Error topics: ${uniqueTopics.join(', ')}.
Sample errors: ${errorDetails}
Find study resources specifically for ${courseName} topics: ${uniqueTopics.join(', ')}.
Do NOT include resources from other subjects.`;
      
      console.log('[ResultsPage] Fetching tailored resources for midterm errors:', uniqueTopics);
      const response = await api.searchMaterials({
        user_id: user.id,
        topics: uniqueTopics,
        context: context,
        difficulty_level: 'intermediate',
        max_results: 5
      });
      setResources(response.materials || []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      setResources([]); // Don't show fallback, just empty
    } finally {
      setLoadingResources(false);
    }
  };
  
  const handleStartQuiz = async () => {
    if (!user || uniqueTopics.length === 0) {
      toast({
        title: "Cannot start quiz",
        description: "No error topics found",
        variant: "destructive"
      });
      return;
    }

    setGeneratingQuiz(true);
    try {
      toast({
        title: "Generating quiz...",
        description: `Creating 10 questions on: ${uniqueTopics.slice(0, 3).join(', ')}`,
      });

      // Pass course name as subject for better quiz title generation
      const quizData = await api.generateQuizFromErrors(
        user.id, 
        uniqueTopics, 
        10,
        analysisData.courseName || undefined
      );
      
      // Store quiz data in localStorage and navigate to question page
      // Include both id and quiz_id for compatibility
      localStorage.setItem('currentQuiz', JSON.stringify({
        id: quizData.quiz_id,
        quiz_id: quizData.quiz_id, // Also store as quiz_id for SummaryPage compatibility
        title: quizData.title,
        questions: quizData.questions,
        topics: uniqueTopics,
        subject: analysisData.courseName || undefined, // Store subject for better resource matching
      }));
      
      // Store error topics in localStorage to help detect error quizzes
      localStorage.setItem('errorQuizTopics', JSON.stringify(uniqueTopics));
      
      console.log('[ResultsPage] Stored quiz in localStorage:', {
        quiz_id: quizData.quiz_id,
        title: quizData.title,
        questionsCount: quizData.questions.length
      });

      toast({
        title: "Quiz generated!",
        description: `Starting quiz with ${quizData.questions.length} questions`,
      });

      navigate(`/dashboard/quick-quiz/question/1?quizId=${quizData.quiz_id}`);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      toast({
        title: "Quiz generation failed",
        description: (error as Error).message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setGeneratingQuiz(false);
    }
  };
  
  const handleViewResources = () => {
    navigate(`/dashboard/resources?filter=${uniqueTopics.join(',')}`);
  };
  
  const handleRateResource = (resourceId: string, rating: number) => {
    console.log(`Resource ${resourceId} rated ${rating} stars`);
    // In a real app, this would be an API call to save the rating
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          {analysisData.courseName || 'Mid-Term'} Review Results
        </h1>
        <p className="text-studyneutral-300 mb-8">
          {analysisData.examDate && (
            <span className="block mb-2">Exam Date: {analysisData.examDate}</span>
          )}
          We analyzed your mid-term and found {analysisData.errors.length} {analysisData.errors.length === 1 ? 'error' : 'errors'} to work on
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8" style={{ gridAutoRows: '1fr', minHeight: '600px' }}>
          <div className="lg:col-span-2 flex h-full">
            <Card className="border-2 border-studypurple-200 flex flex-col flex-1 w-full h-full">
              <CardContent className="p-0 flex flex-col flex-1 w-full h-full" style={{ minHeight: 0 }}>
                <div className="p-4 border-b border-studypurple-100/30 flex-shrink-0">
                  <h2 className="text-xl font-semibold">Review Results</h2>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <ScrollArea style={{ height: '100%', position: 'absolute', inset: 0 }}>
                    <ErrorTable errors={analysisData.errors} />
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1 flex h-full">
            <Card className="border-2 border-studypurple-100 flex flex-col flex-1 w-full h-full">
              <CardContent className="p-6 flex flex-col flex-1 w-full h-full" style={{ minHeight: 0 }}>
                <h2 className="text-xl font-semibold mb-4 flex-shrink-0">Resources to Fix Your Errors</h2>
                <div className="flex-1 min-h-0 relative">
                  {loadingResources ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-studypurple-200 border-t-studypurple-500 mb-3"></div>
                      <p className="text-studyneutral-300 text-sm">Loading personalized resources...</p>
                      <p className="text-studyneutral-400 text-xs mt-1">Finding study materials based on your mistakes</p>
                    </div>
                  ) : resources.length > 0 ? (
                    <ScrollArea style={{ height: '100%', position: 'absolute', inset: 0 }} className="pr-4">
                      <div className="space-y-3">
                        {resources.map((resource: any, index: number) => (
                          <div key={resource.id || index} className="flex gap-3 pb-3 border-b border-studypurple-100/30 last:border-0 last:pb-0">
                            <div className="flex-shrink-0">
                              <div className="h-9 w-9 bg-studyaccent-purple rounded-lg flex items-center justify-center">
                                <span className="text-studypurple-600 text-base">📚</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm mb-1.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{resource.title}</h3>
                              <p className="text-xs text-studyneutral-300 mb-2.5 leading-relaxed overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{resource.description}</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-7 px-3 w-full sm:w-auto"
                                onClick={() => resource.url && window.open(resource.url, '_blank')}
                              >
                                View Resource
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-studyneutral-300 text-sm">No resources available yet</p>
                        <p className="text-studyneutral-400 text-xs mt-1">Resources will appear here once loaded</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-between">
          <Button 
            variant="outline"
            onClick={() => {
              // Navigate to dashboard - it will auto-refresh on mount
              navigate('/dashboard', { state: { refresh: true } });
            }}
          >
            Back to Dashboard
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-studypurple-300 text-studypurple-500"
              onClick={handleViewResources}
            >
              View More Resources
            </Button>
            
            <Button 
              onClick={handleStartQuiz}
              className="bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
              disabled={generatingQuiz || uniqueTopics.length === 0}
            >
              {generatingQuiz ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                  Generating Quiz...
                </>
              ) : (
                'Start Quiz on Errors'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
