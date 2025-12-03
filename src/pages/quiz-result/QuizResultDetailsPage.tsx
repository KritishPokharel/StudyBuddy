import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const QuizResultDetailsPage = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!resultId || !user?.id) {
        setError('Missing result ID or user information');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await api.getQuizResultById(resultId, user.id);
        setData(response);
      } catch (err: any) {
        console.error('Failed to fetch quiz result:', err);
        setError(err.message || 'Failed to load quiz result');
        toast({
          title: 'Error',
          description: 'Failed to load quiz result. It may not exist or you may not have access.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [resultId, user?.id, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-studypurple-500" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error || 'Quiz result not found'}</p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = data.result;
  const quiz = data.quiz;
  const recommendations = data.recommendations || result?.recommended_resources || [];

  const title = quiz?.title || result?.quiz_title || 'Quiz Results';
  const score = result?.score || 0;
  const answers = result?.answers || [];
  const correctCount = result?.correct_count || answers.filter((a: any) => a.is_correct).length;
  const wrongCount = result?.wrong_count || answers.filter((a: any) => !a.is_correct).length;
  const totalQuestions = result?.total_questions || answers.length || 1;
  const timeSpent = result?.time_spent;
  const weakTopics = result?.weak_topics || [];
  const weakAreas = result?.weak_areas || [];

  // Format time spent
  let timeSpentFormatted = 'N/A';
  if (timeSpent) {
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    timeSpentFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Format date
  const completedAt = result?.completed_at || result?.created_at;
  const dateFormatted = completedAt ? new Date(completedAt).toLocaleString() : 'Unknown';

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-studyneutral-300 text-sm mt-1">{dateFormatted}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-studypurple-600">{Math.round(score)}%</div>
              <div className="text-sm text-studyneutral-300">
                {correctCount}/{totalQuestions} correct
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Score</span>
                <span className="font-medium">
                  {Math.round(score)}%
                  {score >= 85 && ' • Excellent!'}
                  {score >= 70 && score < 85 && ' • Good'}
                  {score < 70 && ' • Needs improvement'}
                </span>
              </div>
              <Progress 
                value={score} 
                className="h-3" 
                indicatorClassName={
                  score >= 85 ? 'bg-green-500' : 
                  score >= 70 ? 'bg-studypurple-400' : 
                  'bg-orange-500'
                } 
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-studyneutral-300">Time Spent:</span>
                <span className="ml-2 font-medium">{timeSpentFormatted}</span>
              </div>
              <div>
                <span className="text-studyneutral-300">Total Questions:</span>
                <span className="ml-2 font-medium">{totalQuestions}</span>
              </div>
              <div>
                <span className="text-green-600">Correct:</span>
                <span className="ml-2 font-medium">{correctCount}</span>
              </div>
              <div>
                <span className="text-red-600">Incorrect:</span>
                <span className="ml-2 font-medium">{wrongCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {weakTopics.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Weak Areas</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((topic: string) => (
                <span 
                  key={topic} 
                  className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
            {weakAreas.length > 0 && (
              <div className="mt-4 space-y-2">
                {weakAreas.map((area: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span>{area.topic}</span>
                    <span className="text-studyneutral-300">{area.accuracy || 0}% accuracy</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {answers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Question Details</h2>
              {answers.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedQuestions(!expandedQuestions)}
                  className="text-studypurple-600"
                >
                  {expandedQuestions ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      View All ({answers.length} questions)
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(expandedQuestions ? answers : answers.slice(0, 5)).map((answer: any, idx: number) => {
                const question = quiz?.questions?.find((q: any) => q.id === answer.question_id);
                const actualIndex = expandedQuestions ? idx : idx;
                
                // Get the option text for user's selected answer
                const selectedOption = question?.options?.find((opt: any) => {
                  const optId = typeof opt === 'object' ? opt.id : String.fromCharCode(97 + (question.options?.indexOf(opt) || 0));
                  return optId === answer.selected_answer || opt === answer.selected_answer;
                });
                const selectedAnswerText = typeof selectedOption === 'object' ? selectedOption?.text : selectedOption || answer.selected_answer;
                
                // Get the option text for correct answer
                const correctOption = question?.options?.find((opt: any) => {
                  const optId = typeof opt === 'object' ? opt.id : String.fromCharCode(97 + (question.options?.indexOf(opt) || 0));
                  const correctAnswerId = question.correctAnswer || question.correct_answer;
                  return optId === correctAnswerId || opt === correctAnswerId;
                });
                const correctAnswerText = typeof correctOption === 'object' ? correctOption?.text : correctOption || question?.correctAnswer || question?.correct_answer;
                
                return (
                  <div 
                    key={answer.question_id || idx}
                    className={`p-5 rounded-lg border-2 ${
                      answer.is_correct 
                        ? 'bg-green-50/50 border-green-300 dark:bg-green-900/10 dark:border-green-700' 
                        : 'bg-red-50/50 border-red-300 dark:bg-red-900/10 dark:border-red-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {answer.is_correct ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-lg">
                          Question {actualIndex + 1}
                          {question?.topic && (
                            <span className="text-sm font-normal text-studyneutral-500 ml-2">
                              - {question.topic}
                            </span>
                          )}
                        </span>
                      </div>
                      {!answer.is_correct && (
                        <span className="text-sm text-red-600 dark:text-red-400 font-semibold px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded">
                          Incorrect
                        </span>
                      )}
                    </div>
                    
                    {question?.text && (
                      <div className="mb-4">
                        <p className="text-base font-medium text-foreground leading-relaxed">
                          {question.text}
                        </p>
                      </div>
                    )}
                    
                    {question?.options && question.options.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-sm font-semibold text-studyneutral-600 mb-2">Options:</p>
                        {question.options.map((option: any, optIdx: number) => {
                          const optionId = typeof option === 'object' ? option.id : String.fromCharCode(97 + optIdx);
                          const optionText = typeof option === 'object' ? option.text : option;
                          const isSelected = optionId === answer.selected_answer || option === answer.selected_answer;
                          const isCorrect = optionId === (question.correctAnswer || question.correct_answer) || option === (question.correctAnswer || question.correct_answer);
                          
                          return (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrect
                                  ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                                  : isSelected && !isCorrect
                                  ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${
                                  isCorrect 
                                    ? 'text-green-700 dark:text-green-300' 
                                    : isSelected 
                                    ? 'text-red-700 dark:text-red-300' 
                                    : 'text-studyneutral-600'
                                }`}>
                                  {String.fromCharCode(97 + optIdx).toUpperCase()}.
                                </span>
                                <span className={`${
                                  isCorrect 
                                    ? 'text-green-800 dark:text-green-200 font-medium' 
                                    : isSelected 
                                    ? 'text-red-800 dark:text-red-200 font-medium' 
                                    : 'text-foreground'
                                }`}>
                                  {optionText}
                                </span>
                                {isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto" />
                                )}
                                {isSelected && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-sm text-studyneutral-600">Your Answer:</span>
                        <span className={`text-sm font-medium ${
                          answer.is_correct 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {selectedAnswerText}
                        </span>
                      </div>
                      {!answer.is_correct && correctAnswerText && (
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-sm text-green-600 dark:text-green-400">Correct Answer:</span>
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            {correctAnswerText}
                          </span>
                        </div>
                      )}
                      {question?.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Explanation:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-200">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {answers.length > 5 && !expandedQuestions && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setExpandedQuestions(true)}
                  className="w-full"
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  View All {answers.length} Questions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Recommended Study Materials</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((resource: any, idx: number) => (
                <a
                  key={idx}
                  href={resource.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-studypurple-300 hover:bg-studypurple-50 transition-colors group"
                >
                  <ExternalLink className="h-5 w-5 text-studypurple-500 group-hover:text-studypurple-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{resource.title || resource.name || 'Study Material'}</div>
                    {resource.description && (
                      <div className="text-sm text-studyneutral-300 truncate">{resource.description}</div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuizResultDetailsPage;

