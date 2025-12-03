
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Loader, CheckCircle, FileText, Scan, Brain, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import type { ProcessingStep } from '@/components/ui/processing-steps';

const SelectMaterialsPage = () => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [extractedSubject, setExtractedSubject] = useState<string>('');
  const [existingQuizzes, setExistingQuizzes] = useState<any[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [processingStep, setProcessingStep] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Processing steps for material analysis
  const materialProcessingSteps: ProcessingStep[] = [
    {
      id: 'ocr',
      label: 'Extracting Text',
      description: 'Using OCR to extract text from your document...',
      icon: <Scan className="h-5 w-5" />,
    },
    {
      id: 'analysis',
      label: 'Analyzing Content',
      description: 'AI is analyzing the material to identify topics and subject...',
      icon: <Brain className="h-5 w-5" />,
    },
    {
      id: 'topics',
      label: 'Extracting Topics',
      description: 'Identifying key topics and subject areas...',
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      id: 'complete',
      label: 'Complete',
      description: 'Material analysis finished successfully!',
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ];
  
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoadingQuizzes(true);
        const quizzes = await api.getUserQuizzes(user.id);
        setExistingQuizzes(quizzes || []);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };
    
    fetchQuizzes();
  }, [user?.id]);

  // Removed useEffect - progress is now managed directly in handleFileChange
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to continue",
        variant: "destructive"
      });
      return;
    }
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFiles([file]);
      
      // Start analyzing
      setAnalyzing(true);
      setProgress(0);
      setUploadComplete(false);
      setExtractedTopics([]);
      
      try {
        // Simulate progress steps while API call is in progress
        const progressSteps = [
          { step: 0, progress: 30, delay: 500 },
          { step: 1, progress: 60, delay: 1500 },
          { step: 2, progress: 90, delay: 2500 },
        ];

        const stepTimers: number[] = [];
        let isCancelled = false;
        
        progressSteps.forEach(({ step, progress: prog, delay }) => {
          stepTimers.push(window.setTimeout(() => {
            if (!isCancelled) {
              setProcessingStep(step);
              setProgress(prog);
            }
          }, delay));
        });

        // Extract topics and subject from uploaded file
        const result = await api.extractTopics(file, user.id);
        
        // Mark as cancelled and clear any pending timers
        isCancelled = true;
        stepTimers.forEach(timer => clearTimeout(timer));
        
        // Update to final step
        setProcessingStep(3);
        setProgress(100);
        
        // Wait a moment to show completion, then update state
        setTimeout(() => {
          setExtractedTopics(result.topics || []);
          setExtractedSubject(result.subject || '');
          setUploadComplete(true);
          setAnalyzing(false);
          
          toast({
            title: "Analysis complete",
            description: `Found ${result.topics?.length || 0} topics in ${result.subject || 'your material'}`,
          });
        }, 1000);
      } catch (error) {
        console.error('Failed to extract topics:', error);
        setAnalyzing(false);
        setProgress(0);
        setProcessingStep(0);
        toast({
          title: "Analysis failed",
          description: (error as Error).message || "Please try again",
          variant: "destructive"
        });
        setSelectedFiles([]);
      }
    }
  };
  
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length === 1) {
      setUploadComplete(false);
      setExtractedTopics([]);
      setExtractedSubject('');
    }
  };
  
  const handleNext = async () => {
    if (selectedFiles.length === 0 && !selectedQuizId) {
      toast({
        title: "No materials selected",
        description: "Please upload files or choose an existing quiz",
        variant: "destructive"
      });
      return;
    }
    
    // If existing quiz selected, fetch it and store in localStorage
    if (selectedQuizId) {
      try {
        const quiz = await api.getQuiz(selectedQuizId);
        // Store quiz in localStorage so QuestionPage can use it
        localStorage.setItem('currentQuiz', JSON.stringify(quiz));
        localStorage.setItem('quizStartTime', Date.now().toString());
        
        // Check if it's a RAG quiz based on title
        const isRAGQuiz = quiz.title?.includes('RAG-Based') || quiz.title?.includes('Comprehensive Assessment');
        const ragParam = isRAGQuiz ? '&ragQuiz=true' : '';
        
        navigate(`/dashboard/quick-quiz/question/1?quizId=${selectedQuizId}${ragParam}`);
      } catch (error) {
        console.error('Failed to load quiz:', error);
        toast({
          title: "Failed to load quiz",
          description: (error as Error).message || "Please try again",
          variant: "destructive"
        });
      }
      return;
    }
    
    // If files are uploaded with extracted topics
    if (selectedFiles.length > 0 && extractedTopics.length > 0) {
      // URL encode each topic individually to handle special characters
      const topicsParam = extractedTopics.map(topic => encodeURIComponent(topic)).join(',');
      const subjectParam = extractedSubject ? `&subject=${encodeURIComponent(extractedSubject)}` : '';
      navigate(`/dashboard/quick-quiz/configure?uploadedFiles=true&topics=${topicsParam}${subjectParam}`);
    } else if (selectedFiles.length > 0) {
      // Files uploaded but no topics extracted yet
      toast({
        title: "Please wait",
        description: "Still analyzing your materials...",
        variant: "destructive"
      });
      return;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create a Quick Quiz</h1>
        <p className="text-studyneutral-300 mb-8">Step 1: Select your study materials</p>
        
        <div className="space-y-8">
          {/* Upload section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Materials</h2>
            <Card className="border-dashed border-2">
              <CardContent className="p-6">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <div className="h-16 w-16 rounded-full bg-studypurple-100 flex items-center justify-center mb-4">
                    {analyzing ? (
                      <Loader className="h-8 w-8 text-studypurple-400 animate-spin" />
                    ) : uploadComplete && selectedFiles.length > 0 ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <FileUp className="h-8 w-8 text-studypurple-400" />
                    )}
                  </div>
                  <p className="font-medium mb-1">
                    {analyzing 
                      ? "Analyzing content..." 
                      : uploadComplete && selectedFiles.length > 0
                        ? `Uploaded: ${selectedFiles[0].name}${selectedFiles.length > 1 ? ` (+${selectedFiles.length - 1} more)` : ''}` 
                        : "Click to upload"}
                  </p>
                  {analyzing ? (
                    <div className="w-full max-w-xs mt-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-studyneutral-300 mt-1 text-center">
                        Analyzing content structure and extracting key concepts...
                      </p>
                    </div>
                  ) : uploadComplete && selectedFiles.length > 0 ? (
                    <p className="text-xs text-green-600 mt-1">
                      Files are ready for quiz generation
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-studyneutral-300 mb-2">or drag and drop</p>
                      <p className="text-xs text-studyneutral-300">PDF, DOCX, PPTX, or images</p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={analyzing}
                  />
                </label>
              </CardContent>
            </Card>
            
            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-medium">Selected Files ({selectedFiles.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-2 p-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-studypurple-100/50 p-2 rounded">
                      <div className="flex items-center">
                        <FileUp className="h-4 w-4 mr-2 text-studypurple-400" />
                        <span className="text-sm truncate max-w-xs">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={analyzing}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Existing Quizzes section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Use Existing Quiz</h2>
            <Card>
              <CardContent className="p-6">
                {isLoadingQuizzes ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="h-5 w-5 animate-spin text-studypurple-400" />
                  </div>
                ) : existingQuizzes.length === 0 ? (
                  <p className="text-studyneutral-300 text-sm">No existing quizzes found</p>
                ) : (
                  <Select onValueChange={setSelectedQuizId} disabled={analyzing}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an existing quiz..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingQuizzes.map(quiz => (
                        <SelectItem key={quiz.id} value={quiz.id}>
                          {quiz.title} - {quiz.topics?.join(', ') || 'No topics'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Show extracted topics */}
          {extractedTopics.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Topics found in your material:</p>
              <div className="flex flex-wrap gap-2">
                {extractedTopics.map((topic, idx) => (
                  <span key={idx} className="px-3 py-1 bg-studyaccent-purple text-studypurple-600 rounded-full text-sm">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Navigation buttons */}
          <div className="flex justify-end">
            <Button 
              onClick={handleNext} 
              className="bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
              disabled={analyzing}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      <ProcessingOverlay
        isOpen={analyzing}
        title="Analyzing Your Material"
        subtitle="Our AI is processing your document to extract topics and identify key concepts"
        steps={materialProcessingSteps}
        currentStep={processingStep}
        progress={progress}
        canClose={false}
      />
    </div>
  );
};

export default SelectMaterialsPage;
