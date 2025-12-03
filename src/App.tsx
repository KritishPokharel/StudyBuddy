import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatbotProvider } from "@/contexts/ChatbotContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/components/theme-provider";

// Authentication Pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// Main Layout
import MainLayout from "@/components/layout/MainLayout";

// Dashboard
import DashboardPage from "@/pages/dashboard/DashboardPage";

// Quick Quiz
import SelectMaterialsPage from "@/pages/quick-quiz/SelectMaterialsPage";
import ConfigureQuizPage from "@/pages/quick-quiz/ConfigureQuizPage";
import QuestionPage from "@/pages/quick-quiz/QuestionPage";
import SummaryPage from "@/pages/quick-quiz/SummaryPage";

// Mid-Term Review
import UploadPage from "@/pages/midterm-review/UploadPage";
import ResultsPage from "@/pages/midterm-review/ResultsPage";

// RAG Quiz
import RAGQuizPage from "@/pages/rag-quiz/RAGQuizPage";

// Study Report
import StudyReportPage from "@/pages/study-report/StudyReportPage";

// Quiz Details
import QuizDetailsPage from "@/pages/quiz-details/QuizDetailsPage";
import QuizResultDetailsPage from "@/pages/quiz-result/QuizResultDetailsPage";
import MidtermAnalysisDetailsPage from "@/pages/midterm-analysis/MidtermAnalysisDetailsPage";

// New Pages
import ResourcesPage from "@/pages/resources/ResourcesPage";
import ProgressPage from "@/pages/progress/ProgressPage";
import SettingsPage from "@/pages/settings/SettingsPage";

// New Pages
import HomePage from "@/pages/HomePage";

// Placeholder for other pages
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="studybuddy-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <ChatbotProvider>
              {/* <ChatbotButton /> */}
              {/* <ChatWindow /> */}
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                
                {/* Authenticated Routes */}
                <Route path="/dashboard" element={<MainLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  
                  {/* Quick Quiz Routes */}
                  <Route path="quick-quiz">
                    <Route index element={<SelectMaterialsPage />} />
                    <Route path="select-materials" element={<SelectMaterialsPage />} />
                    <Route path="configure" element={<ConfigureQuizPage />} />
                    <Route path="question/:index" element={<QuestionPage />} />
                    <Route path="summary" element={<SummaryPage />} />
                  </Route>
                  
                  {/* Mid-Term Review Routes */}
                  <Route path="midterm-review">
                    <Route index element={<UploadPage />} />
                    <Route path="upload" element={<UploadPage />} />
                    <Route path="results" element={<ResultsPage />} />
                  </Route>
                  
                  {/* RAG Quiz Routes */}
                  <Route path="rag-quiz" element={<RAGQuizPage />} />
                  
                  {/* Study Report Routes */}
                  <Route path="study-report" element={<StudyReportPage />} />
                  
                  {/* Quiz Details Routes */}
                  <Route path="quiz-details/:type/:id" element={<QuizDetailsPage />} />
                  <Route path="quiz-result/:resultId" element={<QuizResultDetailsPage />} />
                  <Route path="midterm-analysis/:analysisId" element={<MidtermAnalysisDetailsPage />} />
                  
                  {/* New Implementation Routes */}
                  <Route path="resources" element={<ResourcesPage />} />
                  <Route path="progress" element={<ProgressPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ComingSoonPage title="Profile" />} />
                </Route>
                
                {/* Catch-all Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ChatbotProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Simple component for placeholder pages
const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="container mx-auto px-4 py-16">
    <div className="max-w-3xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-studyneutral-300 mb-6">This feature is coming soon!</p>
      <div className="h-64 rounded-xl bg-studypurple-100/50 flex items-center justify-center">
        <p className="text-studypurple-500 font-medium">Under Development</p>
      </div>
    </div>
  </div>
);

export default App;
