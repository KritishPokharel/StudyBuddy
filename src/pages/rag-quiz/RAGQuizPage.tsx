import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Loader2, Download, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import QuestionPage from '@/pages/quick-quiz/QuestionPage';

const RAGQuizPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'generating' | 'quiz' | 'results'>('intro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [numQuestions, setNumQuestions] = useState(10);

  const handleGenerateQuiz = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Please log in to generate a RAG-based quiz',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      const data = await api.generateRAGQuiz(user.id, numQuestions);
      setQuizData(data);
      
      // Store quiz data and navigate to question page
      localStorage.setItem('currentQuiz', JSON.stringify(data));
      localStorage.setItem('quizStartTime', Date.now().toString());
      navigate(`/dashboard/quick-quiz/question/1?quizId=${data.quiz_id}`);
      
    } catch (error: any) {
      console.error('Failed to generate RAG quiz:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate RAG-based quiz. Please try again.',
        variant: 'destructive',
      });
      setStep('intro');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (quizResultId: string) => {
    if (!user?.id) return;

    try {
      const blob = await api.getRAGQuizReport(user.id, quizResultId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rag_quiz_report_${quizResultId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Success',
        description: 'PDF report downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  if (step === 'generating') {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-studypurple-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Generating Your Personalized Quiz</h2>
            <p className="text-studyneutral-300 mb-6">
              Analyzing your learning history and creating a comprehensive assessment...
            </p>
            <div className="space-y-2">
              <p className="text-sm text-studyneutral-400">• Analyzing all your quiz results</p>
              <p className="text-sm text-studyneutral-400">• Reviewing midterm review errors</p>
              <p className="text-sm text-studyneutral-400">• Identifying weak areas</p>
              <p className="text-sm text-studyneutral-400">• Generating personalized questions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-studypurple-400 to-studypurple-600 flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">RAG-Based Assessment</h1>
            <p className="text-studyneutral-300">AI-powered comprehensive evaluation</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What is a RAG-Based Quiz?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-studyneutral-600">
              Our RAG (Retrieval-Augmented Generation) quiz system analyzes your entire learning history to create a personalized assessment that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-studyneutral-600">
              <li>Evaluates your performance across all topics you've studied</li>
              <li>Focuses on areas where you've made mistakes in quizzes and midterm reviews</li>
              <li>Tests your understanding at different difficulty levels</li>
              <li>Provides comprehensive insights into your learning progress</li>
              <li>Generates a downloadable PDF report with detailed analysis</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Your Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Questions: {numQuestions}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-studyneutral-400 mt-1">
                <span>5</span>
                <span>20</span>
              </div>
            </div>

            <Button
              onClick={handleGenerateQuiz}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-600 hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  Generate RAG-Based Quiz
                </>
              )}
            </Button>

            <div className="bg-studyaccent-blue p-4 rounded-lg">
              <p className="text-sm text-studypurple-600">
                <strong>Note:</strong> This quiz will be generated based on all your previous quiz results and midterm reviews. 
                Make sure you have completed at least a few quizzes or uploaded midterm reviews for the best personalized experience.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RAGQuizPage;

