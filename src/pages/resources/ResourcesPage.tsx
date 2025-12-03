import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Loader2, ExternalLink, Brain } from 'lucide-react';
import ResourceCard from './ResourceCard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ResourcesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [resourcesData, setResourcesData] = useState<any>(null);

  useEffect(() => {
    const fetchResources = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await api.getRAGResources(user.id);
        setResourcesData(data);
      } catch (error: any) {
        console.error('Failed to fetch resources:', error);
        toast({
          title: 'Error',
          description: 'Failed to load resources. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [user?.id, toast]);

  const getFilteredResources = (resources: any[]) => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(resource => 
      resource.title?.toLowerCase().includes(query) ||
      resource.description?.toLowerCase().includes(query) ||
      resource.primary_topic?.toLowerCase().includes(query)
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-studypurple-400 to-studypurple-600 flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Study Resources</h1>
              <p className="text-studyneutral-300">AI-curated based on your learning needs</p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-studypurple-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Loading Resources</h2>
                <p className="text-studyneutral-300 text-center max-w-md">
                  Utilizing RAG service to load tailored resources...
                </p>
                <div className="mt-4 w-full max-w-md">
                  <div className="h-2 bg-studypurple-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-studypurple-400 to-studypurple-600 animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!resourcesData || !resourcesData.resources || resourcesData.resources.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-studypurple-400 to-studypurple-600 flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Study Resources</h1>
              <p className="text-studyneutral-300">AI-curated based on your learning needs</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-studyneutral-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Resources Available Yet</h2>
              <p className="text-studyneutral-300 mb-4">
                Complete some quizzes or upload midterm reviews to get personalized study resources!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const filteredResources = getFilteredResources(resourcesData.resources || []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-studypurple-400 to-studypurple-600 flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Study Resources</h1>
            <p className="text-studyneutral-300">AI-curated based on your learning needs</p>
          </div>
        </div>

        {/* Learning Path Info */}
        {resourcesData.learning_path && (
          <Card className="mb-6 bg-studyaccent-blue">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-studypurple-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-studypurple-600 mb-1">Recommended Learning Path</h3>
                  <p className="text-sm text-studypurple-700">{resourcesData.learning_path}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended Topics */}
        {resourcesData.recommended_topics && resourcesData.recommended_topics.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Priority Topics to Focus On</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {resourcesData.recommended_topics.map((topic: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-studypurple-100 text-studypurple-700 rounded-full text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mb-6 bg-studyaccent-purple">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-studypurple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-studypurple-600 mb-1">How These Resources Are Selected</h3>
                <p className="text-sm text-studypurple-700">
                  Our AI analyzes all your quiz results and midterm reviews to identify your weak areas. 
                  Then, we use Perplexity AI to find the best study materials tailored to your specific learning needs. 
                  Resources are updated when you complete new quizzes or upload midterm reviews.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-studyneutral-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Resources by Topic */}
        {filteredResources.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Recommended Resources ({filteredResources.length})
              </h2>
              <div className="grid gap-4">
                {filteredResources.map((resource: any, idx: number) => (
                  <ResourceCard
                    key={idx}
                    resource={{
                      id: resource.id || `resource-${idx}`,
                      title: resource.title || resource.name || 'Study Resource',
                      description: resource.description || resource.snippet || '',
                      url: resource.url || '#',
                      type: resource.type || 'article',
                      rating: resource.rating || 0,
                      subject: resource.primary_topic || 'General',
                      chapter: resource.primary_topic || ''
                    }}
                    onRate={(id, rating) => {
                      // Handle rating if needed
                      console.log('Rate resource:', id, rating);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-studyneutral-300">
                No resources match your search query "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResourcesPage;
