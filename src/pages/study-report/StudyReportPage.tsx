import React, { useState } from 'react';
import { Download, Loader2, FileText, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const StudyReportPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Please log in to generate your study report',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const blob = await api.getComprehensiveStudyReport(user.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprehensive_study_report_${user.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Success',
        description: 'Your comprehensive study report has been downloaded!',
      });
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate study report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-studypurple-400 to-studypurple-600 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Comprehensive Study Report</h1>
            <p className="text-studyneutral-300">AI-powered analysis of your entire learning journey</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What's Included in Your Report?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-studypurple-500 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">AI-Generated Analysis</h3>
                <p className="text-sm text-studyneutral-600">
                  Our Nemotron AI model analyzes all your quiz results, midterm reviews, and learning patterns to provide comprehensive insights.
                </p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-studyneutral-600">
              <p>• <strong>Executive Summary:</strong> Overall assessment of your learning progress</p>
              <p>• <strong>Performance Metrics:</strong> Detailed statistics from all your activities</p>
              <p>• <strong>Strengths:</strong> Topics and areas where you excel</p>
              <p>• <strong>Areas for Improvement:</strong> Weak topics identified across all assessments</p>
              <p>• <strong>AI Recommendations:</strong> Personalized suggestions for improvement</p>
              <p>• <strong>Study Strategy:</strong> Customized learning approach based on your performance</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Your Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-studyneutral-600">
              Click the button below to generate and download your comprehensive study analysis report. 
              The report is generated using AI analysis of all your quiz results and midterm reviews.
            </p>
            
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-600 hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Generate & Download PDF Report
                </>
              )}
            </Button>

            <div className="bg-studyaccent-blue p-4 rounded-lg">
              <p className="text-sm text-studypurple-600">
                <strong>Note:</strong> The report includes analysis of all your learning activities. 
                Make sure you have completed at least a few quizzes or uploaded midterm reviews for the most comprehensive report.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudyReportPage;

