
import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

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

interface AnalysisData {
  courseName?: string;
  examDate?: string;
  errors: ErrorItem[];
  recommendedResources?: Array<{
    title: string;
    description: string;
    url: string;
    source?: string;
  }>;
  errorTopics?: string[];
}

// Sample analysis data that matches the screenshot
export const sampleAnalysisData: AnalysisData = {
  errors: [
    {
      question: 2,
      yourAnswer: "The time complexity of merge sort is O(n²).",
      correctAnswer: "The time complexity of merge sort is O(n log n).",
      topic: "Sorting Algorithms",
      feedback: "Merge sort consistently performs at O(n log n) for all input scenarios due to its divide and conquer approach."
    },
    {
      question: 5,
      yourAnswer: "Depth-first search uses a queue data structure.",
      correctAnswer: "Depth-first search uses a stack data structure.",
      topic: "Graph Traversal",
      feedback: "DFS uses a stack (either explicitly or via recursion) while BFS uses a queue."
    },
    {
      question: 7,
      yourAnswer: "A binary search tree insertion is always O(log n).",
      correctAnswer: "A binary search tree insertion is O(log n) average case, but O(n) worst case.",
      topic: "Binary Trees",
      feedback: "In an unbalanced tree (e.g., inserting already sorted data), insertion degrades to O(n)."
    },
    {
      question: 9,
      yourAnswer: "for(int i=0; i<n; i*=2) has O(n) time complexity.",
      correctAnswer: "for(int i=0; i<n; i*=2) has O(log n) time complexity.",
      topic: "Algorithm Analysis",
      feedback: "When the iterator multiplies by a constant in each iteration, the time complexity is logarithmic."
    }
  ]
};

export const useAnalysisData = () => {
  const location = useLocation();
  const [analysisData] = useState<AnalysisData>(location.state?.analysisData || sampleAnalysisData);

  // Memoize uniqueTopics to prevent unnecessary recalculations
  const uniqueTopics = useMemo(() => {
    return Array.from(
      new Set(analysisData.errors.map((error: ErrorItem) => error.topic))
    );
  }, [analysisData.errors]);

  return {
    analysisData,
    uniqueTopics
  };
};
