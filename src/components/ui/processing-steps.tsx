import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProcessingStep = {
  id: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
};

type ProcessingStepsProps = {
  steps: ProcessingStep[];
  currentStep: number;
  progress: number;
  className?: string;
};

export const ProcessingSteps: React.FC<ProcessingStepsProps> = ({
  steps,
  currentStep,
  progress,
  className,
}) => {
  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-studyneutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-studypurple-400 via-studypurple-500 to-studypurple-600 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="mt-2 text-right">
          <span className="text-sm font-semibold text-studypurple-600">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg transition-all duration-300",
                isCurrent && "bg-gradient-to-r from-studypurple-50 to-studypurple-100/50 border-2 border-studypurple-300 shadow-lg",
                isCompleted && "bg-green-50/50",
                isPending && "bg-studyneutral-50 opacity-60"
              )}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="relative">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                  </div>
                ) : isCurrent ? (
                  <div className="relative">
                    <Loader2 className="h-6 w-6 text-studypurple-600 animate-spin" />
                    <div className="absolute inset-0 bg-studypurple-500/20 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <Circle className="h-6 w-6 text-studyneutral-300" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={cn(
                      "font-semibold text-sm transition-colors",
                      isCurrent && "text-studypurple-700",
                      isCompleted && "text-green-700",
                      isPending && "text-studyneutral-400"
                    )}
                  >
                    {step.label}
                  </h3>
                  {isCurrent && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-studypurple-200 text-studypurple-700 rounded-full animate-pulse">
                      Processing...
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs transition-colors",
                    isCurrent && "text-studyneutral-700",
                    isCompleted && "text-green-600",
                    isPending && "text-studyneutral-400"
                  )}
                >
                  {step.description}
                </p>
              </div>

              {/* Step Number */}
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-studypurple-600 text-white ring-2 ring-studypurple-300 ring-offset-2",
                  isPending && "bg-studyneutral-200 text-studyneutral-400"
                )}
              >
                {index + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

