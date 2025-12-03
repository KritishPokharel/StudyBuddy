
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, CheckCircle, Scan, Brain, AlertCircle, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import type { ProcessingStep } from '@/components/ui/processing-steps';

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Processing steps for midterm analysis
  const midtermProcessingSteps: ProcessingStep[] = [
    {
      id: 'ocr',
      label: 'Extracting Text',
      description: 'Using OCR to extract text and content from your midterm paper...',
      icon: <Scan className="h-5 w-5" />,
    },
    {
      id: 'analysis',
      label: 'Analyzing Answers',
      description: 'AI is analyzing your answers, marks, and identifying errors...',
      icon: <Brain className="h-5 w-5" />,
    },
    {
      id: 'errors',
      label: 'Identifying Mistakes',
      description: 'Identifying incorrect answers and areas for improvement...',
      icon: <AlertCircle className="h-5 w-5" />,
    },
    {
      id: 'resources',
      label: 'Finding Resources',
      description: 'Searching for personalized study materials based on your errors...',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      id: 'complete',
      label: 'Analysis Complete',
      description: 'Your midterm analysis is ready!',
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ];
  
  useEffect(() => {
    if (isAnalyzing) {
      setProcessingStep(0);
      setAnalysisProgress(0);
      
      // Simulate step progression
      const stepTimers: number[] = [];
      
      // Step 1: OCR (0-20%)
      stepTimers.push(window.setTimeout(() => {
        setProcessingStep(0);
        setAnalysisProgress(20);
      }, 500));
      
      // Step 2: Analysis (20-50%)
      stepTimers.push(window.setTimeout(() => {
        setProcessingStep(1);
        setAnalysisProgress(50);
      }, 3000));
      
      // Step 3: Errors (50-75%)
      stepTimers.push(window.setTimeout(() => {
        setProcessingStep(2);
        setAnalysisProgress(75);
      }, 6000));
      
      // Step 4: Resources (75-90%)
      stepTimers.push(window.setTimeout(() => {
        setProcessingStep(3);
        setAnalysisProgress(90);
      }, 9000));
      
      return () => {
        stepTimers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [isAnalyzing]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadComplete(false);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a file first",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to continue",
        variant: "destructive"
      });
      return;
    }
    
    if (!courseName.trim()) {
      toast({
        title: "Course name required",
        description: "Please enter the subject/course name",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    setUploadComplete(false);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const response = await api.analyzeMidterm(file, user.id, courseName.trim());
      
      // Update to final step
      setProcessingStep(4);
      setAnalysisProgress(100);
      
      // Wait a moment to show completion, then navigate
      setTimeout(() => {
        setIsUploading(false);
        setUploadComplete(true);
        setIsAnalyzing(false);
        
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed ${file.name}`,
        });
        
        navigate('/dashboard/midterm-review/results', { state: { analysisData: response } });
      }, 1000);
    } catch (error) {
      setIsUploading(false);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setProcessingStep(0);
      toast({
        title: "Analysis failed",
        description: (error as Error).message || "Please try again",
        variant: "destructive"
      });
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadComplete(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Mid-Term Review</h1>
        <p className="text-studyneutral-300 mb-8">Upload your graded mid-term for analysis</p>
        
        <Card 
          className="border-dashed border-2 mb-8"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CardContent className="p-8">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="h-20 w-20 rounded-full bg-studypurple-100 flex items-center justify-center mb-4">
                {isUploading ? (
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-studypurple-400 border-t-transparent"></div>
                ) : file && uploadComplete ? (
                  <CheckCircle className="h-10 w-10 text-green-500" />
                ) : (
                  <FileUp className="h-10 w-10 text-studypurple-400" />
                )}
              </div>
              <p className="font-medium mb-1">
                {isAnalyzing 
                  ? "Analyzing content..." 
                  : isUploading 
                  ? "Uploading..." 
                  : file 
                    ? `${file.name}`
                    : "Upload your graded mid-term"}
              </p>
              {!isUploading && !isAnalyzing && !file && (
                <>
                  <p className="text-sm text-studyneutral-300 mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-studyneutral-300">PDF or image file</p>
                </>
              )}
              {file && !isUploading && !isAnalyzing && (
                <p className="text-xs text-green-600 mt-1">
                  {uploadComplete ? `File "${file.name}" analyzed successfully` : "File selected"}
                </p>
              )}
              
              {isAnalyzing && (
                <div className="w-full max-w-xs mt-4">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-xs text-studyneutral-300 mt-1 text-center">{analysisProgress}% complete</p>
                </div>
              )}
              
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isUploading || isAnalyzing}
              />
            </label>
          </CardContent>
        </Card>
        
        {/* Course Name Input */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <Label htmlFor="course-name" className="text-base font-semibold mb-2 block">
              Subject/Course Name (Required Field)
            </Label>
            <Input
              id="course-name"
              type="text"
              placeholder="e.g., Computer Science III, Mathematics 101, etc."
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              disabled={isUploading || isAnalyzing}
              className="w-full"
            />
            <p className="text-xs text-studyneutral-300 mt-2">
              Enter the subject or course name for this midterm paper
            </p>
          </CardContent>
        </Card>
        
        {file && !isAnalyzing && (
          <div className="mb-8">
            <p className="font-medium mb-2">Selected File</p>
            <div className="flex items-center bg-studypurple-100/50 p-3 rounded">
              <FileUp className="h-5 w-5 mr-3 text-studypurple-400" />
              <span className="truncate max-w-xs">{file.name}</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={isAnalyzing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            className="bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            disabled={!file || !courseName.trim() || isUploading || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                Analyzing...
              </>
            ) : isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                Uploading...
              </>
            ) : 'Analyze'}
          </Button>
        </div>
      </div>

      {/* Midterm Analysis Processing Overlay */}
      <ProcessingOverlay
        isOpen={isAnalyzing}
        title="Analyzing Your Midterm"
        subtitle="Our AI is processing your paper to identify errors and provide personalized feedback"
        steps={midtermProcessingSteps}
        currentStep={processingStep}
        progress={analysisProgress}
        canClose={false}
      />
    </div>
  );
};

export default UploadPage;
