
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ErrorItem {
  question: number;
  yourAnswer: string;
  correctAnswer: string;
  topic: string;
  feedback: string;
  marksReceived?: number;
  totalMarks?: number;
  correctness?: string; // "correct", "incorrect", "partially_correct"
}

interface ErrorTableProps {
  errors: ErrorItem[];
}

const ErrorTable = ({ errors }: ErrorTableProps) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRowExpand = (questionNumber: number) => {
    setExpandedRows(prev => 
      prev.includes(questionNumber)
        ? prev.filter(q => q !== questionNumber)
        : [...prev, questionNumber]
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-studypurple-100/50">
          <TableHead className="w-16">Question</TableHead>
          <TableHead>Your Answer</TableHead>
          <TableHead>Correct Answer</TableHead>
          <TableHead>Topic</TableHead>
          {(errors.some(e => e.marksReceived !== undefined || e.totalMarks !== undefined)) && (
            <TableHead className="w-24">Marks</TableHead>
          )}
          <TableHead className="w-16 text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {errors.map((error) => (
          <React.Fragment key={error.question}>
            <TableRow className="border-b border-studypurple-100/30">
              <TableCell className="font-medium">{error.question}</TableCell>
              <TableCell className="text-red-500">
                <code className="bg-red-50 p-1 rounded">{error.yourAnswer}</code>
              </TableCell>
              <TableCell className="text-green-600">
                <code className="bg-green-50 p-1 rounded">{error.correctAnswer}</code>
              </TableCell>
              <TableCell>
                <span className="inline-block bg-studyaccent-blue px-2 py-1 rounded text-sm">
                  {error.topic}
                </span>
              </TableCell>
              {(errors.some(e => e.marksReceived !== undefined || e.totalMarks !== undefined)) && (
                <TableCell>
                  {error.totalMarks !== undefined ? (
                    <span className={`text-sm font-medium ${
                      (error.marksReceived ?? 0) === error.totalMarks ? 'text-green-600' : 
                      (error.marksReceived ?? 0) === 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {error.marksReceived ?? 0}/{error.totalMarks}
                    </span>
                  ) : (
                    <span className="text-sm text-studyneutral-300">-</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleRowExpand(error.question)}
                  className="p-1 h-auto"
                >
                  {expandedRows.includes(error.question) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
            {expandedRows.includes(error.question) && (
              <TableRow className="bg-studypurple-100/10">
                <TableCell colSpan={errors.some(e => e.marksReceived !== undefined || e.totalMarks !== undefined) ? 6 : 5} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-studyaccent-purple rounded-full flex items-center justify-center mt-1">
                      <BookOpen className="h-4 w-4 text-studypurple-500" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Feedback</h4>
                      <p className="text-studyneutral-300">{error.feedback}</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
};

export default ErrorTable;
