import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, ChartBar, FileText, ArrowRight, Loader2, ExternalLink, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Sample study tips
const studyTips = [
  "Active recall is 2x more effective than rereading notes!",
  "Taking breaks every 25 minutes can improve retention by 15%.",
  "Teaching concepts to others improves your own understanding by 90%.",
  "Spaced repetition can increase memory retention by up to 200%.",
  "Getting 7-8 hours of sleep improves test scores by 10% on average."
];

interface Activity {
  id: string;
  type: 'quiz' | 'midterm';
  title: string;
  timestamp: string;
  score?: number;
  topics?: string[];
  weak_topics?: string[];
  quiz_id?: string;
  issues_found?: number;
  time_spent?: string;
  // Midterm specific fields
  wrong_count?: number;
  correct_count?: number;
  partially_correct_count?: number;
  recommended_resources?: Array<{ name: string; url: string; summary?: string }>;
  analysis_id?: string;
  filename?: string;
}

const RecentActivity = ({ activities, isLoading }: { activities: Activity[], isLoading: boolean }) => {
  const navigate = useNavigate();
  
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Recently';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const handleViewDetails = (activity: Activity) => {
    if (activity.type === 'midterm' && activity.analysis_id) {
      navigate(`/dashboard/midterm-analysis/${activity.analysis_id}`);
    } else if (activity.type === 'quiz' && activity.id) {
      // Navigate to quiz detail page using result ID
      navigate(`/dashboard/quiz-result/${activity.id}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <Card className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-studyneutral-300">Loading activities...</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Activity</h2>
      
      {activities.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-studyneutral-300 mb-4">No recent activity yet — let's get started!</p>
          <Button asChild>
            <Link to="/dashboard/quick-quiz">Start a Quiz</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card 
              key={activity.id} 
              className="overflow-hidden transition-all duration-200 hover:border-studypurple-300 hover:shadow-md cursor-pointer"
              onClick={() => handleViewDetails(activity)}
            >
              <div className="flex flex-col sm:flex-row items-start p-4 gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                  activity.type === 'quiz' 
                    ? 'bg-studyaccent-yellow' 
                    : 'bg-studyaccent-purple'
                }`}>
                  {activity.type === 'quiz' ? (
                    <FileText className="h-5 w-5 text-studypurple-600" />
                  ) : (
                    <BookOpen className="h-5 w-5 text-studypurple-600" />
                  )}
                </div>
                
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{activity.title || 'Untitled Activity'}</h3>
                      <p className="text-sm text-studyneutral-300">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                    
                    {activity.topics && activity.topics.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {activity.topics.map((topic: string) => (
                          <span 
                            key={topic} 
                            className="text-xs px-2 py-0.5 bg-studyaccent-purple text-studypurple-600 rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Quiz-specific: Show score and time spent */}
                  {activity.type === 'quiz' && activity.score !== undefined && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Score</span>
                        <span className="font-medium">
                          {Math.round(activity.score)}%
                          {activity.score >= 85 && ' • Excellent!'}
                          {activity.score >= 70 && activity.score < 85 && ' • Good'}
                          {activity.score < 70 && ' • Needs improvement'}
                        </span>
                      </div>
                      <Progress 
                        value={activity.score} 
                        className="h-2" 
                        indicatorClassName={
                          activity.score >= 85 ? 'bg-green-500' : 
                          activity.score >= 70 ? 'bg-studypurple-400' : 
                          'bg-orange-500'
                        } 
                      />
                      {activity.time_spent && (
                        <div className="mt-2 text-xs text-studyneutral-300">
                          Time spent: {activity.time_spent}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Midterm-specific: Show error counts */}
                  {activity.type === 'midterm' && (
                    <div className="mt-3 space-y-2">
                      {activity.issues_found !== undefined && activity.issues_found > 0 && (
                        <p className="text-sm">
                          <span className="text-red-500 font-medium">{activity.issues_found} error{activity.issues_found !== 1 ? 's' : ''}</span> found
                        </p>
                      )}
                      {(activity.wrong_count !== undefined || activity.correct_count !== undefined || activity.partially_correct_count !== undefined) && (
                        <div className="flex gap-4 text-xs text-studyneutral-300">
                          {activity.correct_count !== undefined && activity.correct_count > 0 && (
                            <span className="text-green-600">✓ {activity.correct_count} correct</span>
                          )}
                          {activity.wrong_count !== undefined && activity.wrong_count > 0 && (
                            <span className="text-red-600">✗ {activity.wrong_count} wrong</span>
                          )}
                          {activity.partially_correct_count !== undefined && activity.partially_correct_count > 0 && (
                            <span className="text-yellow-600">~ {activity.partially_correct_count} partial</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Quiz-specific: Show issues found */}
                  {activity.type === 'quiz' && activity.issues_found !== undefined && activity.issues_found > 0 && (
                    <p className="mt-2 text-sm">
                      <span className="text-red-500 font-medium">{activity.issues_found} mistake{activity.issues_found !== 1 ? 's' : ''}</span> identified
                    </p>
                  )}
                  
                  {/* Show recommended resources if available */}
                  {activity.recommended_resources && activity.recommended_resources.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-studyneutral-300 mb-1">Recommended resources:</p>
                      <div className="flex flex-wrap gap-1">
                        {activity.recommended_resources.slice(0, 2).map((resource, idx) => (
                          <a
                            key={idx}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-studypurple-500 hover:text-studypurple-600 underline"
                          >
                            {resource.name}
                          </a>
                        ))}
                        {activity.recommended_resources.length > 2 && (
                          <span className="text-xs text-studyneutral-300">
                            +{activity.recommended_resources.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-3">
                    <Button 
                      variant="link" 
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(activity);
                      }}
                    >
                      View Details <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
    </div>
  );
};

const QuickActions = () => {
  const actions = [
    {
      title: 'Quick Quiz',
      description: 'Test your knowledge with a quick quiz',
      icon: <FileText className="h-6 w-6 text-studypurple-500" />,
      path: '/dashboard/quick-quiz',
      color: 'bg-studyaccent-yellow'
    },
    {
      title: 'Review Mid-Term',
      description: 'Upload and analyze your graded exam',
      icon: <BookOpen className="h-6 w-6 text-studypurple-500" />,
      path: '/dashboard/midterm-review',
      color: 'bg-studyaccent-purple'
    },
    {
      title: 'RAG Quiz',
      description: 'AI-powered personalized quiz based on your performance',
      icon: <Brain className="h-6 w-6 text-studypurple-500" />,
      path: '/dashboard/rag-quiz',
      color: 'bg-studyaccent-blue'
    }
  ];
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Link key={action.title} to={action.path} className="study-card animate-scale-in hover:scale-105 transition-transform">
            <div className={`h-12 w-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
              {action.icon}
            </div>
            <h3 className="font-medium text-lg mb-1">{action.title}</h3>
            <p className="text-sm text-studyneutral-300">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

const WeeklyGoals = ({ goalsData, isLoading }: { goalsData: any, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Weekly Goals</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }
  
  const goals = [
    { 
      name: 'Quizzes', 
      current: goalsData?.quizzes_completed || 0, 
      target: goalsData?.total_quizzes || 5,
      tooltip: `Complete ${(goalsData?.total_quizzes || 5) - (goalsData?.quizzes_completed || 0)} more quizzes to meet your weekly goal!`
    },
    { 
      name: 'Study Hours', 
      current: Math.round((goalsData?.study_hours || 0) * 10) / 10, 
      target: goalsData?.total_hours || 10,
      tooltip: `Log ${(goalsData?.total_hours || 10) - (goalsData?.study_hours || 0)} more hours to hit your study target!`
    },
    { 
      name: 'Flashcards', 
      current: goalsData?.flashcards_reviewed || 0, 
      target: goalsData?.flashcards_target || 100,
      tooltip: `Review ${(goalsData?.flashcards_target || 100) - (goalsData?.flashcards_reviewed || 0)} more flashcards this week!`
    },
    { 
      name: 'Mid-Terms', 
      current: goalsData?.midterms_reviewed || 0, 
      target: goalsData?.total_midterms || 2,
      tooltip: `Analyze ${(goalsData?.total_midterms || 2) - (goalsData?.midterms_reviewed || 0)} more mid-terms to complete your goal!`
    },
    { 
      name: 'Weak Areas', 
      current: goalsData?.weak_areas_fixed || 0, 
      target: goalsData?.total_weak_areas || 5,
      tooltip: `Focus on ${(goalsData?.total_weak_areas || 5) - (goalsData?.weak_areas_fixed || 0)} more weak areas to improve!`
    }
  ];
  
  const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="text-xl font-semibold">Weekly Goals</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const percentage = Math.round((goal.current / goal.target) * 100);
          const isOnTrack = percentage >= 60;
          
          return (
            <div key={goal.name} className="group">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{goal.name}</span>
                      <span className="font-medium">{goal.current}/{goal.target}</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2" 
                      indicatorClassName={isOnTrack ? "bg-studypurple-400" : "bg-orange-400"} 
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{goal.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
        
        <Separator className="my-4" />
        
        <div className="rounded-lg bg-studyaccent-blue p-3">
          <p className="text-sm font-medium text-studypurple-600">💡 Study Tip of the Day</p>
          <p className="text-xs mt-1">{randomTip}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Recap Component - Shows latest quiz summary
const QuickRecap = ({ summary }: { summary: any }) => {
  const navigate = useNavigate();
  console.log('Quick Recap data:', summary);
  
  if (!summary) return null;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">📚 Quick Recap</h2>
          <span className="text-sm text-studyneutral-300">{summary.title || 'Latest Quiz'}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary.correct_count ?? 0}</div>
            <div className="text-xs text-studyneutral-300 mt-1">Correct</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{summary.wrong_count ?? 0}</div>
            <div className="text-xs text-studyneutral-300 mt-1">Wrong</div>
          </div>
          <div className="text-center p-3 bg-studypurple-50 rounded-lg">
            <div className="text-2xl font-bold text-studypurple-600">{Math.round(summary.score || 0)}%</div>
            <div className="text-xs text-studyneutral-300 mt-1">Score</div>
          </div>
        </div>
        
        {summary.time_spent && summary.time_spent !== 'N/A' && (
          <div className="text-center text-sm text-studyneutral-300">
            ⏱️ Time spent: {summary.time_spent}
          </div>
        )}
        
        {summary.weak_areas && summary.weak_areas.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">🎯 Areas to Focus On:</h3>
            <div className="flex flex-wrap gap-2">
              {summary.weak_areas.map((area: any, idx: number) => (
                <span 
                  key={idx}
                  className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full"
                >
                  {area.topic || area} {area.accuracy !== undefined && `(${area.accuracy}%)`}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {summary.recommended_resources && summary.recommended_resources.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">📖 Recommended Study Materials:</h3>
            <div className="space-y-2">
              {summary.recommended_resources.slice(0, 3).map((resource: any, idx: number) => (
                <a
                  key={idx}
                  href={resource.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg border hover:border-studypurple-300 hover:bg-studypurple-50 transition-colors group"
                >
                  <BookOpen className="h-4 w-4 text-studypurple-500 group-hover:text-studypurple-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{resource.title || 'Study Material'}</div>
                    {resource.description && (
                      <div className="text-xs text-studyneutral-300 truncate">{resource.description}</div>
                    )}
                  </div>
                  <ExternalLink className="h-3 w-3 text-studyneutral-300 group-hover:text-studypurple-500" />
                </a>
              ))}
            </div>
          </div>
        )}
        
        {summary.result_id && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/dashboard/quiz-result/${summary.result_id}`)}
            >
              View Full Details <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MidtermRecap = ({ summary }: { summary: any }) => {
  const navigate = useNavigate();
  console.log('Midterm Recap data:', summary);
  
  if (!summary) return null;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">📝 Mid-Term Review Analysis</h2>
          <span className="text-sm text-studyneutral-300">{summary.course_name || 'Latest Mid-Term'}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary.correct_count ?? 0}</div>
            <div className="text-xs text-studyneutral-300 mt-1">Correct</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{summary.wrong_count ?? 0}</div>
            <div className="text-xs text-studyneutral-300 mt-1">Wrong</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{summary.partially_correct_count ?? 0}</div>
            <div className="text-xs text-studyneutral-300 mt-1">Partial</div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-sm text-studyneutral-300 mb-1">Total Errors Found</div>
          <div className="text-2xl font-bold text-studypurple-600">{summary.total_errors ?? 0}</div>
        </div>
        
        {summary.error_topics && summary.error_topics.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">🎯 Error Topics:</h3>
            <div className="flex flex-wrap gap-2">
              {summary.error_topics.map((topic: string, idx: number) => (
                <span 
                  key={idx}
                  className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {summary.recommended_resources && summary.recommended_resources.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">📖 Recommended Study Materials:</h3>
            <div className="space-y-2">
              {summary.recommended_resources.slice(0, 3).map((resource: any, idx: number) => (
                <a
                  key={idx}
                  href={resource.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg border hover:border-studypurple-300 hover:bg-studypurple-50 transition-colors group"
                >
                  <BookOpen className="h-4 w-4 text-studypurple-500 group-hover:text-studypurple-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{resource.title || 'Study Material'}</div>
                    {resource.description && (
                      <div className="text-xs text-studyneutral-300 truncate">{resource.description}</div>
                    )}
                  </div>
                  <ExternalLink className="h-3 w-3 text-studyneutral-300 group-hover:text-studypurple-500" />
                </a>
              ))}
            </div>
          </div>
        )}
        
        {summary.analysis_id && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/dashboard/midterm-analysis/${summary.analysis_id}`)}
            >
              View Full Analysis <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [progressData, setProgressData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  
  const fetchProgress = async (force = false) => {
    if (!user?.id) return;
    
    // Throttle: don't fetch more than once per 2 seconds unless forced
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 2000) {
      return;
    }
    lastFetchRef.current = now;
    
    try {
      setIsLoading(true);
      const data = await api.getUserProgress(user.id);
      setProgressData(data);
      console.log('Dashboard progress updated:', data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      toast({
        title: "Failed to load progress",
        description: "Please refresh the page",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Fetch when component mounts (user logs in or navigates to dashboard)
    // Also refresh if navigation state indicates a refresh is needed (after quiz/midterm completion)
    if (user?.id) {
      const shouldRefresh = location.state?.refresh === true;
      fetchProgress(shouldRefresh);
      
      // Clear the refresh flag from location state
      if (shouldRefresh) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [user?.id, location.state?.refresh]); // Refresh when user changes or when explicitly requested
  
  const remainingQuizzes = (progressData?.weekly_goals?.total_quizzes || 5) - (progressData?.weekly_goals?.quizzes_completed || 0);
  const welcomeSubtext = remainingQuizzes > 0 
    ? `🏆 You're just ${remainingQuizzes} quiz${remainingQuizzes === 1 ? '' : 'zes'} away from hitting your weekly goals! Keep up the great work!`
    : "🎉 Amazing job! You've completed all your weekly quiz goals!";
  
  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-gradient-to-r from-studypurple-300 to-studypurple-400 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || user?.email}</h1>
        <p className="opacity-90">{welcomeSubtext}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <QuickActions />
          
          {/* Quick Recap Section - Show latest quiz summary */}
          {progressData?.latest_quiz_summary ? (
            <QuickRecap summary={progressData.latest_quiz_summary} />
          ) : (
            progressData?.recent_activities && progressData.recent_activities.length > 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-studyneutral-300">Complete a quiz to see your Quick Recap</p>
                </CardContent>
              </Card>
            )
          )}
          
          {/* Mid-Term Review Analysis Section - Show latest midterm summary */}
          {progressData?.latest_midterm_summary ? (
            <MidtermRecap summary={progressData.latest_midterm_summary} />
          ) : null}
          
          <RecentActivity activities={progressData?.recent_activities || []} isLoading={isLoading} />
        </div>
        
        <div>
          <WeeklyGoals goalsData={progressData?.weekly_goals} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
