import React from 'react';
import { X } from 'lucide-react';
import { ProcessingSteps, ProcessingStep } from './processing-steps';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

type ProcessingOverlayProps = {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  steps: ProcessingStep[];
  currentStep: number;
  progress: number;
  canClose?: boolean;
};

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  steps,
  currentStep,
  progress,
  canClose = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-2 border-studypurple-200">
        <CardHeader className="relative">
          {canClose && onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-studypurple-600 to-studypurple-400 bg-clip-text text-transparent">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-center text-studyneutral-500 mt-2">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <ProcessingSteps
            steps={steps}
            currentStep={currentStep}
            progress={progress}
          />
        </CardContent>
      </Card>
    </div>
  );
};

