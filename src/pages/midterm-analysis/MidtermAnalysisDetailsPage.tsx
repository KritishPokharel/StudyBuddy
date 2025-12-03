import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ErrorTable from '@/pages/midterm-review/components/ErrorTable';
import ResourcePanel from '@/pages/midterm-review/components/ResourcePanel';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const MidtermAnalysisDetailsPage = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!analysisId || !user?.id) {
        setError('Missing analysis ID or user information');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await api.getMidtermAnalysisById(analysisId, user.id);
        
        // Transform data to match the format expected by ErrorTable and ResourcePanel
        const courseName = data.course_name || 'Unknown';
        const title = courseName && courseName !== 'Unknown' 
          ? `${courseName} Graded Paper Result`
          : 'Mid-Term Review Result';
        
        const transformedData = {
          courseName: title,
          examDate: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Unknown',
          errors: data.errors || [],
          recommendedResources: data.recommended_resources || [],
          errorTopics: data.error_topics || [],
        };
        
        setAnalysisData(transformedData);
        
        // If no resources from backend, fetch them based on errors
        if ((!data.recommended_resources || data.recommended_resources.length === 0) && 
            data.error_topics && data.error_topics.length > 0) {
          fetchResources(data.error_topics, courseName, data.errors || []);
        } else {
          setResources(data.recommended_resources || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch midterm analysis:', err);
        setError(err.message || 'Failed to load midterm analysis');
        toast({
          title: 'Error',
          description: 'Failed to load midterm analysis. It may not exist or you may not have access.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [analysisId, user?.id, toast]);

  const fetchResources = async (errorTopics: string[], courseName: string, errors: any[]) => {
    if (!user?.id || errorTopics.length === 0) return;
    
    setIsLoadingResources(true);
    try {
      // Build detailed context based on midterm errors
      const errorCount = errors.length;
      const errorDetails = errors
        .slice(0, 3)
        .map((err: any) => `${err.topic || 'Unknown'}: ${err.question?.substring(0, 80) || err.yourAnswer?.substring(0, 80) || 'Error'}...`)
        .join('; ');
      
      const context = `User made ${errorCount} errors in a ${courseName} midterm exam. 
Error topics: ${errorTopics.join(', ')}.
Sample errors: ${errorDetails}
Find study resources specifically for ${courseName} topics: ${errorTopics.join(', ')}.
Do NOT include resources from other subjects.`;
      
      console.log('[MidtermAnalysisDetailsPage] Fetching tailored resources for midterm errors:', errorTopics);
      const response = await api.searchMaterials({
        user_id: user.id,
        topics: errorTopics,
        context: context,
        difficulty_level: 'intermediate',
        max_results: 5
      });
      setResources(response.materials || []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      setResources([]);
    } finally {
      setIsLoadingResources(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-studypurple-500" />
        </div>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error || 'Midterm analysis not found'}</p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errors = analysisData.errors || [];
  const recommendedResources = resources.length > 0 ? resources : (analysisData.recommendedResources || []);
  const errorTopics = analysisData.errorTopics || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <h1 className="text-2xl font-bold">{analysisData.courseName}</h1>
          <p className="text-studyneutral-300 text-sm mt-1">Exam Date: {analysisData.examDate}</p>
        </CardHeader>
      </Card>

      {errorTopics.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Error Topics</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {errorTopics.map((topic: string) => (
                <span 
                  key={topic} 
                  className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Errors Found</h2>
          </CardHeader>
          <CardContent>
            <ErrorTable errors={errors} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recommended Study Materials</h2>
        </CardHeader>
        <CardContent>
          {isLoadingResources ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-studypurple-500 mb-4" />
              <p className="text-studyneutral-300 text-sm">Loading personalized resources...</p>
              <p className="text-studyneutral-400 text-xs mt-1">Finding study materials based on your mistakes</p>
            </div>
          ) : recommendedResources.length > 0 ? (
            <ResourcePanel resources={recommendedResources} />
          ) : (
            <div className="text-center py-8">
              <p className="text-studyneutral-300 text-sm">No resources available</p>
              <p className="text-studyneutral-400 text-xs mt-1">Resources tailored to your errors will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MidtermAnalysisDetailsPage;

