import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const SummaryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quizId');
  const isRAGQuizFromUrl = searchParams.get('ragQuiz') === 'true';
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  
  // Helper to detect if quiz is RAG-based from quiz data
  const detectRAGQuiz = (quiz: any): boolean => {
    if (!quiz) return false;
    const title = quiz.title || '';
    return title.includes('RAG-Based') || 
           title.includes('Comprehensive Assessment') ||
           title.includes('RAG') ||
           isRAGQuizFromUrl;
  };
  
  // Helper to detect if quiz is error-based (from midterm errors)
  const detectErrorQuiz = (quiz: any): boolean => {
    if (!quiz) return false;
    const title = quiz.title || '';
    return title.includes('Error') || 
           title.includes('error') ||
           title.toLowerCase().includes('on error') ||
           (quiz.topics && Array.isArray(quiz.topics) && quiz.topics.length > 0 && 
            localStorage.getItem('errorQuizTopics')); // Check if error topics were stored
  };
  
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      
      // Always try localStorage first as fallback
      const stored = localStorage.getItem('currentQuiz');
      const storedAnswers = localStorage.getItem('quizAnswers');
      const storedTimeSpent = localStorage.getItem('quizTimeSpent');
      
      console.log('[SummaryPage] Checking localStorage:', {
        hasQuiz: !!stored,
        hasAnswers: !!storedAnswers,
        hasTimeSpent: !!storedTimeSpent,
        quizId: quizId
      });
      
      if (stored && storedAnswers) {
        try {
          const quiz = JSON.parse(stored);
          const answers = JSON.parse(storedAnswers);
          
          // ALWAYS use localStorage data if it exists - this is the quiz the user just took
          // The quizId check is only for when we want to fetch a different quiz's saved results
          // But if user just completed a quiz, we should use localStorage data regardless
          const storedQuizId = quiz.quiz_id || quiz.id;
          
          // Only skip localStorage if:
          // 1. quizId is provided in URL
          // 2. storedQuizId exists and doesn't match
          // 3. AND we have answers (meaning user completed it) - if no answers, might be old data
          const hasAnswers = answers && answers.length > 0;
          const shouldSkipLocalStorage = quizId && storedQuizId && storedQuizId !== quizId && !hasAnswers;
          
          if (shouldSkipLocalStorage) {
            console.warn('[SummaryPage] QuizId mismatch and no answers, will try backend fetch:', {
              storedQuizId,
              urlQuizId: quizId
            });
            // Don't use localStorage data - will fall through to backend fetch
          } else {
            console.log('[SummaryPage] Loading quiz from localStorage:', {
              quizTitle: quiz.title,
              quizId: storedQuizId,
              questionsCount: quiz.questions?.length,
              answersCount: answers.length
            });
            
            // Calculate score from answers
            const correctCount = answers.filter((a: any) => a.is_correct).length;
            const totalQuestions = quiz.questions?.length || answers.length || 1;
            const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
            
            console.log('[SummaryPage] Calculated results:', {
              score,
              correctCount,
              totalQuestions,
              quizTitle: quiz.title
            });
            
            // Get time spent from localStorage or calculate from quiz start time
            let timeSpent = storedTimeSpent || 'N/A';
            if (timeSpent === 'N/A' || !timeSpent) {
              const quizStartTime = localStorage.getItem('quizStartTime');
              if (quizStartTime) {
                const endTime = Date.now();
                const timeSpentMs = endTime - parseInt(quizStartTime);
                const timeSpentSeconds = Math.floor(timeSpentMs / 1000);
                const minutes = Math.floor(timeSpentSeconds / 60);
                const seconds = timeSpentSeconds % 60;
                timeSpent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                console.log('[SummaryPage] Calculated time spent from quizStartTime:', {
                  quizStartTime,
                  endTime,
                  timeSpentMs,
                  timeSpentSeconds,
                  timeSpent
                });
              } else {
                console.warn('[SummaryPage] No quizStartTime found in localStorage, using storedTimeSpent or N/A');
              }
            } else {
              console.log('[SummaryPage] Using stored timeSpent from localStorage:', timeSpent);
            }
            
            // Calculate weak areas - show all topics with their accuracy
            const weakTopicsMap: Record<string, { wrong: number; total: number }> = {};
            const wrongQuestions: Array<{ questionText: string; topic: string; selectedAnswer: string; correctAnswer: string }> = [];
            
            answers.forEach((answer: any) => {
              const question = quiz.questions?.find((q: any) => q.id === answer.question_id);
              if (question?.topic) {
                if (!weakTopicsMap[question.topic]) {
                  weakTopicsMap[question.topic] = { wrong: 0, total: 0 };
                }
                weakTopicsMap[question.topic].total += 1;
                if (!answer.is_correct) {
                  weakTopicsMap[question.topic].wrong += 1;
                  // Store wrong question details for better context
                  wrongQuestions.push({
                    questionText: question.text || question.question || '',
                    topic: question.topic,
                    selectedAnswer: answer.selected_answer || '',
                    correctAnswer: question.correctAnswer || ''
                  });
                }
              }
            });
            
            // Calculate accuracy for each topic and show all (not just below 70%)
            const weakAreas = Object.entries(weakTopicsMap)
              .map(([topic, data]) => ({
                topic,
                accuracy: Math.max(0, Math.round(((data.total - data.wrong) / data.total) * 100))
              }))
              .sort((a, b) => a.accuracy - b.accuracy); // Sort by accuracy (lowest first)
            
            // Detect if this is a RAG quiz or error quiz
            const isRAGQuiz = detectRAGQuiz(quiz);
            const isErrorQuiz = detectErrorQuiz(quiz);
            
            // Extract quiz subject from title or topics
            const quizTitle = quiz.title || 'Quiz';
            // Better subject extraction: handle "Computer Science III", "Chemistry Error Quiz", etc.
            let quizSubject = quiz.subject;
            if (!quizSubject && quizTitle) {
              // Remove common suffixes like "Quiz", "Error Quiz", "Assessment"
              const titleWithoutSuffix = quizTitle
                .replace(/\s*(Quiz|Error Quiz|Assessment|Test|Exam).*$/i, '')
                .trim();
              
              // Extract subject (first 1-3 words typically)
              const words = titleWithoutSuffix.split(' ');
              if (words.length >= 2 && (words[0] + ' ' + words[1]).match(/^(Computer Science|Data Structures|Organic Chemistry|Inorganic Chemistry)/i)) {
                quizSubject = words[0] + ' ' + words[1];
              } else {
                quizSubject = words[0] || 'General';
              }
            }
            quizSubject = quizSubject || 'General';
            const quizTopics = quiz.topics || quiz.questions?.map((q: any) => q.topic).filter(Boolean) || [];
            
            // Set results from localStorage first
            const initialResults = {
              title: quizTitle,
              score: Math.round(score),
              correctAnswers: correctCount,
              totalQuestions: totalQuestions,
              wrongAnswers: totalQuestions - correctCount,
              timeSpent: timeSpent,
              weakAreas: weakAreas,
              recommendations: [],
              isRAGQuiz: isRAGQuiz
            };
            
            console.log('[SummaryPage] Setting initial results:', initialResults);
            setResults(initialResults);
            
            // Fetch Perplexity recommendations based on weak topics from THIS specific quiz
            // Use topics from the current quiz only, including RAG quizzes
            let recommendations: any[] = [];
            if (user?.id && weakAreas.length > 0) {
              // Get topics that need improvement (accuracy < 80% or top 3 weakest)
              // Only use topics from the current quiz
              const weakTopics = weakAreas
                .filter((area: any) => area.accuracy < 80)
                .slice(0, 5)
                .map((area: any) => area.topic)
                .filter((topic: string) => quizTopics.includes(topic) || quizTopics.length === 0); // Ensure topic is from this quiz
              
              // If no topics below 80%, use top 3 weakest from this quiz
              const topicsToSearch = weakTopics.length > 0 
                ? weakTopics 
                : weakAreas
                    .filter((area: any) => quizTopics.includes(area.topic) || quizTopics.length === 0)
                    .slice(0, 3)
                    .map((area: any) => area.topic);
              
              if (topicsToSearch.length > 0) {
                try {
                  setIsLoadingResources(true);
                  // Build specific context based on wrong questions and quiz subject
                  const wrongQuestionsSummary = wrongQuestions
                    .slice(0, 3)
                    .map((wq: any) => `Question about ${wq.topic}: ${wq.questionText.substring(0, 100)}...`)
                    .join('; ');
                  
                  // Enhanced context for different quiz types
                  let context = '';
                  if (isRAGQuiz) {
                    context = `User scored ${Math.round(score)}% on a RAG-based comprehensive assessment quiz. 
This quiz was generated based on the user's overall learning history and weak areas.
User made mistakes in THIS specific RAG quiz in these topics: ${topicsToSearch.join(', ')}.
${wrongQuestionsSummary ? `Sample wrong questions from this RAG quiz: ${wrongQuestionsSummary}` : ''}
Find study resources specifically for these topics: ${topicsToSearch.join(', ')}.
These resources should help the user understand the concepts they struggled with in THIS specific RAG quiz.
Do NOT include resources from other subjects or topics not mentioned above.`;
                  } else if (isErrorQuiz) {
                    context = `User scored ${Math.round(score)}% on an error-based quiz from ${quizSubject} midterm mistakes. 
This quiz was generated from topics where the user made errors in their midterm exam: ${quizTopics.slice(0, 5).join(', ')}.
User made additional mistakes in this error quiz in these topics: ${topicsToSearch.join(', ')}.
${wrongQuestionsSummary ? `Sample wrong questions from this error quiz: ${wrongQuestionsSummary}` : ''}
Find study resources specifically for ${quizSubject} topics: ${topicsToSearch.join(', ')}.
These resources should help the user understand the concepts they struggled with in both the midterm and this error quiz.
Do NOT include resources from other subjects.`;
                  } else {
                    context = `User scored ${Math.round(score)}% on a ${quizSubject} quiz. 
The quiz covered topics: ${quizTopics.slice(0, 5).join(', ')}.
User made mistakes in these specific topics: ${topicsToSearch.join(', ')}.
${wrongQuestionsSummary ? `Sample wrong questions: ${wrongQuestionsSummary}` : ''}
Find study resources specifically for ${quizSubject} topics: ${topicsToSearch.join(', ')}.
Do NOT include resources from other subjects.`;
                  }
                  
                  console.log(`[SummaryPage] Fetching recommendations for ${isRAGQuiz ? 'RAG' : isErrorQuiz ? 'error' : ''} ${quizSubject} quiz weak topics: ${topicsToSearch.join(', ')}`);
                  const recommendationsData = await api.searchMaterials({
                    user_id: user.id,
                    topics: topicsToSearch,
                    context: context,
                    difficulty_level: 'intermediate',
                    max_results: 5
                  });
                  
                  if (recommendationsData?.materials && recommendationsData.materials.length > 0) {
                    console.log(`Found ${recommendationsData.materials.length} recommendations from Perplexity`);
                    recommendations = recommendationsData.materials;
                    setResults((prev: any) => ({
                      ...prev,
                      recommendations: recommendations
                    }));
                  }
                } catch (error) {
                  console.error('Failed to fetch Perplexity recommendations:', error);
                  // Don't show error - recommendations are optional
                } finally {
                  setIsLoadingResources(false);
                }
              }
            }
            
            // Save complete summary to backend
            // Try to get quiz_id from multiple possible locations
            const currentQuizId = quizId || quiz.quiz_id || quiz.id;
            console.log('[SummaryPage] Saving summary with quizId:', currentQuizId, {
              fromUrl: quizId,
              fromQuiz: quiz.quiz_id,
              fromQuizId: quiz.id
            });
            
            if (user?.id && currentQuizId) {
              try {
                // Convert time spent string to seconds for backend
                let timeSpentSeconds: number | undefined = undefined;
                if (timeSpent !== 'N/A') {
                  const [minutes, seconds] = timeSpent.split(':').map(Number);
                  timeSpentSeconds = minutes * 60 + seconds;
                }
                
                const saveResponse = await api.saveQuizSummary({
                  user_id: user.id,
                  quiz_id: currentQuizId,
                  score: Math.round(score),
                  correct_count: correctCount,
                  wrong_count: totalQuestions - correctCount,
                  total_questions: totalQuestions,
                  weak_areas: weakAreas,
                  recommended_resources: recommendations.map((r: any) => ({
                    title: r.title,
                    url: r.url || '#',
                    description: r.description || r.type || ''
                  }))
                });
                
                console.log('Quiz summary saved successfully');
              } catch (error) {
                console.error('Failed to save quiz summary:', error);
              }
            }
            
            // Clean up quizStartTime after summary is displayed and saved
            // This ensures accurate time calculation before cleanup
            setTimeout(() => {
              localStorage.removeItem('quizStartTime');
            }, 1000); // Small delay to ensure summary is fully rendered
            
            setIsLoading(false);
          }
        } catch (e) {
          console.error('Failed to parse stored quiz:', e);
        }
      }
      
      // Also try to get from backend if quizId exists and no localStorage data OR if we need to fetch a different quiz
      // (for previously saved quizzes, but prioritize localStorage for current quiz)
      if (user?.id && quizId && (!stored || (stored && quizId && (JSON.parse(stored).quiz_id || JSON.parse(stored).id) !== quizId))) {
        try {
          const data = await api.getQuizResult(quizId, user.id);
          
          // If backend has result data, use it (includes Perplexity recommendations from backend)
          if (data.result) {
            const answers = data.result?.answers || [];
            const weakTopicsMap: Record<string, { wrong: number; total: number }> = {};
            
            // Calculate weak areas properly
            answers.forEach((answer: any) => {
              const question = data.quiz?.questions?.find((q: any) => q.id === answer.question_id);
              if (question?.topic) {
                if (!weakTopicsMap[question.topic]) {
                  weakTopicsMap[question.topic] = { wrong: 0, total: 0 };
                }
                weakTopicsMap[question.topic].total += 1;
                if (!answer.is_correct) {
                  weakTopicsMap[question.topic].wrong += 1;
                }
              }
            });
            
            const totalQuestions = data.quiz?.questions?.length || 1;
            const correctCount = answers.filter((a: any) => a.is_correct).length;
            const weakAreas = Object.entries(weakTopicsMap)
              .map(([topic, data]) => ({
                topic,
                accuracy: Math.max(0, Math.round(((data.total - data.wrong) / data.total) * 100))
              }))
              .sort((a, b) => a.accuracy - b.accuracy);
            
            // Detect if this is a RAG quiz from quiz data
            const isRAGQuiz = detectRAGQuiz(data.quiz);
            
            // Format time spent if available
            let timeSpentFormatted = 'N/A';
            if (data.result?.time_spent) {
              const minutes = Math.floor(data.result.time_spent / 60);
              const seconds = data.result.time_spent % 60;
              timeSpentFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Update with backend data (includes Perplexity recommendations)
            setResults({
              title: data.quiz?.title || 'Quiz Results',
              score: data.result?.score || 0,
              correctAnswers: correctCount,
              totalQuestions: totalQuestions,
              wrongAnswers: totalQuestions - correctCount,
              timeSpent: timeSpentFormatted,
              weakAreas: weakAreas,
              recommendations: data.recommendations || [],
              isRAGQuiz: isRAGQuiz
            });
            
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Failed to fetch results from backend:', error);
          // Continue with fallback
        }
      }
      
      // If no data found, only use fallback if we truly have no quiz data
      // Don't use fallback if we have localStorage data - that means user just took a quiz
      if (!results) {
        // Check if we have localStorage data that we might have skipped
        const stored = localStorage.getItem('currentQuiz');
        const storedAnswers = localStorage.getItem('quizAnswers');
        
        if (stored && storedAnswers) {
          console.log('[SummaryPage] Found localStorage data that was skipped, using it now');
          try {
            const quiz = JSON.parse(stored);
            const answers = JSON.parse(storedAnswers);
            
            // Calculate results from localStorage
            const correctCount = answers.filter((a: any) => a.is_correct).length;
            const totalQuestions = quiz.questions?.length || answers.length || 1;
            const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
            
            const storedTimeSpent = localStorage.getItem('quizTimeSpent') || 'N/A';
            let timeSpent = storedTimeSpent;
            if (timeSpent === 'N/A') {
              const quizStartTime = localStorage.getItem('quizStartTime');
              if (quizStartTime) {
                const endTime = Date.now();
                const timeSpentMs = endTime - parseInt(quizStartTime);
                const timeSpentSeconds = Math.floor(timeSpentMs / 1000);
                const minutes = Math.floor(timeSpentSeconds / 60);
                const seconds = timeSpentSeconds % 60;
                timeSpent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              }
            }
            
            // Calculate weak areas
            const weakTopicsMap: Record<string, { wrong: number; total: number }> = {};
            answers.forEach((answer: any) => {
              const question = quiz.questions?.find((q: any) => q.id === answer.question_id);
              if (question?.topic) {
                if (!weakTopicsMap[question.topic]) {
                  weakTopicsMap[question.topic] = { wrong: 0, total: 0 };
                }
                weakTopicsMap[question.topic].total += 1;
                if (!answer.is_correct) {
                  weakTopicsMap[question.topic].wrong += 1;
                }
              }
            });
            
            const weakAreas = Object.entries(weakTopicsMap)
              .map(([topic, data]) => ({
                topic,
                accuracy: Math.max(0, Math.round(((data.total - data.wrong) / data.total) * 100))
              }))
              .sort((a, b) => a.accuracy - b.accuracy);
            
            const isRAGQuiz = detectRAGQuiz(quiz);
            
            setResults({
              title: quiz.title || 'Quiz Results',
              score: Math.round(score),
              correctAnswers: correctCount,
              totalQuestions: totalQuestions,
              wrongAnswers: totalQuestions - correctCount,
              timeSpent: timeSpent,
              weakAreas: weakAreas,
              recommendations: [],
              isRAGQuiz: isRAGQuiz
            });
            
            // Fetch recommendations based on THIS specific quiz's weak areas
            // Use topics from the current quiz only, including RAG quizzes
            if (user?.id && weakAreas.length > 0) {
              // Get quiz subject and topics from the quiz data
              const quizTitle = quiz.title || 'Quiz';
              // Better subject extraction: handle "Computer Science III", "Chemistry Error Quiz", etc.
              let quizSubject = quiz.subject;
              if (!quizSubject && quizTitle) {
                // Remove common suffixes like "Quiz", "Error Quiz", "Assessment"
                const titleWithoutSuffix = quizTitle
                  .replace(/\s*(Quiz|Error Quiz|Assessment|Test|Exam).*$/i, '')
                  .trim();
                
                // Extract subject (first 1-3 words typically)
                const words = titleWithoutSuffix.split(' ');
                if (words.length >= 2 && (words[0] + ' ' + words[1]).match(/^(Computer Science|Data Structures|Organic Chemistry|Inorganic Chemistry)/i)) {
                  quizSubject = words[0] + ' ' + words[1];
                } else {
                  quizSubject = words[0] || 'General';
                }
              }
              quizSubject = quizSubject || 'General';
              const quizTopics = quiz.topics || quiz.questions?.map((q: any) => q.topic).filter(Boolean) || [];
              
              // Get wrong questions for context
              const wrongQuestions = answers
                .filter((a: any) => !a.is_correct)
                .slice(0, 3)
                .map((answer: any) => {
                  const question = quiz.questions?.find((q: any) => q.id === answer.question_id);
                  return question ? {
                    questionText: question.text || question.question || '',
                    topic: question.topic || ''
                  } : null;
                })
                .filter(Boolean);
              
              const weakTopics = weakAreas
                .filter((area: any) => area.accuracy < 80)
                .slice(0, 5)
                .map((area: any) => area.topic)
                .filter((topic: string) => quizTopics.includes(topic) || quizTopics.length === 0); // Ensure topic is from this quiz
              
              const topicsToSearch = weakTopics.length > 0 
                ? weakTopics 
                : weakAreas
                    .filter((area: any) => quizTopics.includes(area.topic) || quizTopics.length === 0)
                    .slice(0, 3)
                    .map((area: any) => area.topic);
              
              if (topicsToSearch.length > 0) {
                try {
                  setIsLoadingResources(true);
                  // Build specific context based on wrong questions and quiz subject
                  const wrongQuestionsSummary = wrongQuestions
                    .slice(0, 3)
                    .map((wq: any) => `Question about ${wq.topic}: ${wq.questionText.substring(0, 100)}...`)
                    .join('; ');
                  
                  // Enhanced context for different quiz types
                  const isErrorQuizLocal = detectErrorQuiz(quiz);
                  let context = '';
                  if (isRAGQuiz) {
                    context = `User scored ${Math.round(score)}% on a RAG-based comprehensive assessment quiz. 
This quiz was generated based on the user's overall learning history and weak areas.
User made mistakes in THIS specific RAG quiz in these topics: ${topicsToSearch.join(', ')}.
${wrongQuestionsSummary ? `Sample wrong questions from this RAG quiz: ${wrongQuestionsSummary}` : ''}
Find study resources specifically for these topics: ${topicsToSearch.join(', ')}.
These resources should help the user understand the concepts they struggled with in THIS specific RAG quiz.
Do NOT include resources from other subjects or topics not mentioned above.`;
                  } else if (isErrorQuizLocal) {
                    context = `User scored ${Math.round(score)}% on an error-based quiz from ${quizSubject} midterm mistakes. 
This quiz was generated from topics where the user made errors in their midterm exam: ${quizTopics.slice(0, 5).join(', ')}.
User made additional mistakes in this error quiz in these topics: ${topicsToSearch.join(', ')}.
${wrongQuestionsSummary ? `Sample wrong questions from this error quiz: ${wrongQuestionsSummary}` : ''}
Find study resources specifically for ${quizSubject} topics: ${topicsToSearch.join(', ')}.
These resources should help the user understand the concepts they struggled with in both the midterm and this error quiz.
Do NOT include resources from other subjects.`;
                  } else {
                    context = `User scored ${Math.round(score)}% on a ${quizSubject} quiz. 
The quiz covered topics: ${quizTopics.slice(0, 5).join(', ')}.
User made mistakes in these specific topics: ${topicsToSearch.join(', ')}.
${wrongQuestionsSummary ? `Sample wrong questions: ${wrongQuestionsSummary}` : ''}
Find study resources specifically for ${quizSubject} topics: ${topicsToSearch.join(', ')}.
Do NOT include resources from other subjects.`;
                  }
                  
                  console.log(`[SummaryPage] Fetching recommendations for ${isRAGQuiz ? 'RAG' : isErrorQuizLocal ? 'error' : ''} ${quizSubject} quiz weak topics: ${topicsToSearch.join(', ')}`);
                  const recommendationsData = await api.searchMaterials({
                    user_id: user.id,
                    topics: topicsToSearch,
                    context: context,
                    difficulty_level: 'intermediate',
                    max_results: 5
                  });
                  
                  if (recommendationsData?.materials && recommendationsData.materials.length > 0) {
                    setResults((prev: any) => ({
                      ...prev,
                      recommendations: recommendationsData.materials
                    }));
                  }
                } catch (error) {
                  console.error('Failed to fetch recommendations:', error);
                } finally {
                  setIsLoadingResources(false);
                }
              }
            }
            
            console.log('[SummaryPage] Results loaded from localStorage:', quiz.title);
          } catch (e) {
            console.error('Failed to parse localStorage data:', e);
            console.warn('[SummaryPage] Using fallback data');
            setResults(getFallbackResults());
          }
        } else {
          console.warn('[SummaryPage] No results found and no localStorage data, using fallback data');
          setResults(getFallbackResults());
        }
      } else {
        console.log('[SummaryPage] Results loaded successfully:', results.title);
      }
      
      setIsLoading(false);
    };
    
    fetchResults();
  }, [user?.id, quizId, toast]);
  
  // Fallback results if no data
  const getFallbackResults = () => {
    const uploadedFiles = searchParams.get('uploadedFiles') === 'true';
    const specificTopic = searchParams.get('topic');
    // Try to get subject from URL params
    const subject = searchParams.get('subject') || 'Quiz';
    if (uploadedFiles && specificTopic === 'Trees') {
      return {
        title: `${subject} - Trees`,
        score: 67,
        correctAnswers: 2,
        totalQuestions: 3,
        timeSpent: '7:15',
        averageResponseTime: '2:25',
        weakAreas: [
          { topic: 'Tree Traversal', accuracy: 40 },
          { topic: 'Binary Search Trees', accuracy: 45 },
          { topic: 'Lowest Common Ancestor', accuracy: 60 }
        ],
        recommendations: [
          { 
            id: '1', 
            title: 'Python Tree Implementations', 
            type: 'video',
            description: 'Comprehensive guide to implementing tree data structures in Python with practical examples'
          },
          { 
            id: '2', 
            title: 'Tree Traversal Algorithms', 
            type: 'worksheet',
            description: 'Practice problems focusing on pre-order, in-order, and post-order traversals in Python'
          },
          {
            id: '3',
            title: 'Binary Tree Interview Questions',
            type: 'practice',
            description: 'Common tree problems from technical interviews with Python solutions and explanations'
          }
        ]
      };
    }
    
    // Default fallback - use subject from URL or generic (already defined above)
    return {
      title: subject,
      score: 67,
      correctAnswers: 2,
      totalQuestions: 3,
      timeSpent: '6:32',
      averageResponseTime: '2:11',
      weakAreas: [
        { topic: 'Do-While Loops', accuracy: 33 },
        { topic: 'Loop Conditions', accuracy: 40 },
      ],
      recommendations: [
        { 
          id: '1', 
          title: 'Python Loop Fundamentals', 
          type: 'video',
          description: 'Clear explanation of all loop types with practical coding examples'
        },
        { 
          id: '2', 
          title: 'Loop Problem Solving Patterns', 
          type: 'worksheet',
          description: 'Practice problems to strengthen your understanding of different loop constructs and their use cases'
        },
      ]
    };
    
    return {
      title: "Quiz Results",
      score: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      timeSpent: 'N/A',
      weakAreas: [],
      recommendations: []
    };
  };
  
  // Only use fallback if we're not loading and have no results
  // This prevents showing fallback data while actual data is being loaded
  const displayResults = (!isLoading && results) ? results : (results || getFallbackResults());
  
  const handleRetry = () => {
    navigate('/dashboard/quick-quiz/select-materials');
  };
  
  const handleBackToDashboard = () => {
    // Clear quiz data from localStorage after viewing results
    localStorage.removeItem('currentQuiz');
    localStorage.removeItem('quizAnswers');
    localStorage.removeItem('quizWeakTopics');
    
    // Navigate to dashboard - it will auto-refresh on mount
    navigate('/dashboard', { state: { refresh: true } });
  };

  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-studyneutral-300">Loading quiz results...</p>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          {displayResults.title?.endsWith('Results') || displayResults.title?.endsWith('Result') 
            ? displayResults.title 
            : `${displayResults.title} Results`}
        </h1>
        <p className="text-studyneutral-300 mb-8">Here's how you performed</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Score card */}
          <Card className="md:col-span-2">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="relative h-40 w-40">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{displayResults.score}%</div>
                    <div className="text-studyneutral-300">Score</div>
                  </div>
                </div>
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={displayResults.score >= 70 ? '#22c55e' : displayResults.score >= 40 ? '#eab308' : '#ef4444'}
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * displayResults.score) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-8 mt-6 text-center">
                <div>
                  <div className="text-xl font-medium">
                    {displayResults.correctAnswers}/{displayResults.totalQuestions}
                  </div>
                  <div className="text-studyneutral-300">Questions</div>
                </div>
                <div>
                  <div className="text-xl font-medium">{displayResults.timeSpent}</div>
                  <div className="text-studyneutral-300">Time Spent</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Weak areas */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Weak Areas</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayResults.weakAreas.length > 0 ? (
                displayResults.weakAreas.map((area: any) => (
                  <div key={area.topic}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{area.topic}</span>
                      <span className="font-medium">{area.accuracy}%</span>
                    </div>
                    <Progress 
                      value={area.accuracy} 
                      className="h-2 bg-red-100" 
                    />
                  </div>
                ))
              ) : (
                <p className="text-studyneutral-300 text-sm">No weak areas identified</p>
              )}
            </CardContent>
          </Card>
          
          {/* Recommendations */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Recommended Resources</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingResources ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-studypurple-500 mb-3" />
                  <p className="text-studyneutral-300 text-sm">Loading personalized resources...</p>
                  <p className="text-studyneutral-400 text-xs mt-1">Finding study materials based on your weak areas</p>
                </div>
              ) : displayResults.recommendations.length > 0 ? (
                displayResults.recommendations.map((resource: any, idx: number) => (
                  <div 
                    key={resource.id || idx}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-studypurple-300 transition-colors cursor-pointer"
                    onClick={() => resource.url && window.open(resource.url, '_blank')}
                  >
                    <div className="h-10 w-10 bg-studyaccent-blue rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-studypurple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{resource.title}</h3>
                      <p className="text-sm text-studyneutral-300">{resource.description || resource.type || 'Study material'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-studyneutral-300" />
                  </div>
                ))
              ) : (
                <p className="text-studyneutral-300 text-sm">No recommendations available</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-between gap-4">
          <Button 
            variant="outline"
            onClick={handleBackToDashboard}
          >
            Back to Dashboard
          </Button>
          <Button 
            onClick={handleRetry} 
            className="bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
          >
            Retry Quiz
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
