import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, BarChart, TrendingUp, AlertCircle, Loader2, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ProgressPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<any>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await api.getRAGProgress(user.id);
        setProgressData(data);
      } catch (error: any) {
        console.error('Failed to fetch progress:', error);
        toast({
          title: 'Error',
          description: 'Failed to load progress data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [user?.id, toast]);

  const getProgressColor = (value: number): string => {
    if (value >= 85) return "bg-green-500";
    if (value >= 70) return "bg-blue-500";
    if (value >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-studypurple-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-studyneutral-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Progress Data Yet</h2>
              <p className="text-studyneutral-300">
                Start taking quizzes or uploading midterm reviews to see your progress!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold">Your Learning Progress</h1>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle>Overall Performance</CardTitle>
            </div>
            <CardDescription>AI-analyzed insights from all your learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm font-medium">Average Accuracy</span>
              <span className="text-sm font-medium">{progressData.overall_accuracy}%</span>
            </div>
            <Progress 
              value={progressData.overall_accuracy} 
              className="h-4"
              indicatorClassName={getProgressColor(progressData.overall_accuracy)}
            />
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-studypurple-600">{progressData.total_quizzes}</div>
                <div className="text-xs text-studyneutral-300">Quizzes Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-studypurple-600">{progressData.total_midterms}</div>
                <div className="text-xs text-studyneutral-300">Midterm Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-studypurple-600">{progressData.total_questions}</div>
                <div className="text-xs text-studyneutral-300">Questions Attempted</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        {progressData.insights && progressData.insights.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <CardTitle>AI-Generated Insights</CardTitle>
              </div>
              <CardDescription>Key observations about your learning journey</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {progressData.insights.map((insight: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-studypurple-500 mt-1">•</span>
                    <span className="text-studyneutral-600">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        {progressData.strengths && progressData.strengths.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <CardTitle>Your Strengths</CardTitle>
              </div>
              <CardDescription>Topics where you excel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {progressData.strengths.map((strength: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {progressData.weaknesses && progressData.weaknesses.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <CardTitle>Areas for Improvement</CardTitle>
              </div>
              <CardDescription>Topics that need more practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {progressData.weaknesses.map((weakness: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                  >
                    {weakness}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Performance */}
        {progressData.topic_performance && Object.keys(progressData.topic_performance).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-studypurple-400" />
                <CardTitle>Topic Performance</CardTitle>
              </div>
              <CardDescription>Detailed breakdown by topic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(progressData.topic_performance).map(([topic, data]: [string, any]) => (
                <div key={topic}>
                  <div className="mb-2 flex justify-between items-center">
                    <span className="text-sm font-medium">{topic}</span>
                    <span className="text-sm font-medium">{data.accuracy}%</span>
                  </div>
                  <Progress 
                    value={data.accuracy} 
                    className="h-3"
                    indicatorClassName={getProgressColor(data.accuracy)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Improvement Recommendations */}
        {progressData.improvement_areas && progressData.improvement_areas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>AI-suggested actions to improve your learning</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {progressData.improvement_areas.map((recommendation: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-studypurple-500 mt-1">→</span>
                    <span className="text-studyneutral-600">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
