const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://trueclaimbackend.ngrok.app/api';

console.log('[API] Base URL:', API_BASE_URL);

// Get auth token from Supabase session
async function getAuthToken() {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// API request helper
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[API] Making request to: ${url}`);
  console.log(`[API] Method: ${options.method || 'GET'}`);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    console.log(`[API] Response status: ${response.status}`);
    console.log(`[API] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error response:`, errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { detail: errorText || response.statusText };
      }
      throw new Error(error.detail || `API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[API] Success response:`, data);
    return data;
  } catch (error) {
    console.error(`[API] Request failed:`, error);
    throw error;
  }
}

// Upload file helper
async function uploadFile(endpoint: string, file: File, additionalData: Record<string, string> = {}) {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const formData = new FormData();
  formData.append('file', file);
  
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API error: ${response.statusText}`);
  }
  
  return response.json();
}

// API functions
export const api = {
  // Midterm Analysis
  analyzeMidterm: async (file: File, userId: string, courseName?: string) => {
    return uploadFile('/midterm/analyze', file, {
      user_id: userId,
      ...(courseName && { course_name: courseName }),
    });
  },

  // Quiz Generation
  generateQuiz: async (data: {
    user_id: string;
    title?: string;
    topics?: string[];
    num_questions?: number;
    uploaded_files?: Array<{ filename: string; content: string }>;
    subject?: string;  // Subject/category name
  }) => {
    console.log('Generating quiz with data:', { ...data, uploaded_files: data.uploaded_files?.length });
    try {
      const response = await apiRequest('/quiz/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('Quiz generation response:', response);
      return response;
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw error;
    }
  },

  // Study Materials
  searchMaterials: async (data: {
    user_id?: string;
    topics: string[];
    context?: string;
    difficulty_level?: string;
    max_results?: number;
  }) => {
    return apiRequest('/resources/search', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // User Weaknesses
  getUserWeaknesses: async (userId: string) => {
    return apiRequest(`/user/${userId}/weaknesses`);
  },

  updateUserWeaknesses: async (userId: string, data: {
    topics: string[];
    performance_data?: Record<string, any>;
  }) => {
    return apiRequest(`/user/${userId}/weaknesses/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Quiz Management
  getQuiz: async (quizId: string) => {
    return apiRequest(`/quiz/${quizId}`);
  },

  getUserQuizzes: async (userId: string) => {
    return apiRequest(`/user/${userId}/quizzes`);
  },

  // User Progress
  getUserProgress: async (userId: string) => {
    return apiRequest(`/user/${userId}/progress`);
  },

  // Get specific quiz result by result ID
  getQuizResultById: async (resultId: string, userId: string) => {
    return apiRequest(`/quiz-result/${resultId}?user_id=${userId}`);
  },

  // Get specific midterm analysis by analysis ID
  getMidtermAnalysisById: async (analysisId: string, userId: string) => {
    return apiRequest(`/midterm-analysis/${analysisId}?user_id=${userId}`);
  },

  // Extract topics from material
  extractTopics: async (file: File, userId: string) => {
    return uploadFile('/materials/extract-topics', file, {
      user_id: userId,
    });
  },

  // Save quiz result
  saveQuizResult: async (data: {
    user_id: string;
    quiz_id: string;
    score: number;
    answers: Array<{ question_id: string; selected_answer: string; is_correct: boolean }>;
    weak_topics: string[];
    time_spent?: number;
    quiz_title?: string;
    quiz_topics?: string[];
    correct_count?: number;
    wrong_count?: number;
    total_questions?: number;
  }) => {
    return apiRequest('/quiz/results', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Save complete quiz summary (called from summary page after recommendations are fetched)
  saveQuizSummary: async (data: {
    user_id: string;
    quiz_id: string;
    score: number;
    correct_count: number;
    wrong_count: number;
    total_questions: number;
    weak_areas: Array<{ topic: string; accuracy: number }>;
    recommended_resources: Array<{ title: string; url: string; description: string }>;
  }) => {
    return apiRequest('/quiz/summary', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get quiz result with recommendations
  getQuizResult: async (quizId: string, userId: string) => {
    return apiRequest(`/quiz/${quizId}/result?user_id=${userId}`);
  },

  // Generate quiz from error topics (for midterm analysis)
  generateQuizFromErrors: async (userId: string, errorTopics: string[], numQuestions: number = 10, subject?: string) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('error_topics', errorTopics.join(','));
    formData.append('num_questions', numQuestions.toString());
    if (subject) {
      formData.append('subject', subject);
    }

    const token = await getAuthToken();
    const url = `${API_BASE_URL}/quiz/generate-from-errors`;
    
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API error: ${response.statusText}`);
    }

    return response.json();
  },

  // RAG-Based Progress Analysis
  getRAGProgress: async (userId: string) => {
    return apiRequest(`/user/${userId}/rag-progress`);
  },

  // RAG-Based Holistic Resources
  getRAGResources: async (userId: string) => {
    return apiRequest(`/user/${userId}/rag-resources`);
  },

  // Generate RAG-Based Quiz
  generateRAGQuiz: async (userId: string, numQuestions: number = 10) => {
    return apiRequest(`/user/${userId}/rag-quiz/generate?num_questions=${numQuestions}`, {
      method: 'POST',
    });
  },

  // Generate Comprehensive Study Report PDF
  getComprehensiveStudyReport: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/comprehensive-study-report`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to generate report');
    const blob = await response.blob();
    return blob;
  },
};

