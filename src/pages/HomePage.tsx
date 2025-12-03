import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, ChartBar, Brain, Target, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-studypurple-100/30 via-background to-studyaccent-blue/10 dark:from-studypurple-900/10 dark:via-background dark:to-studypurple-900/5">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-studypurple-100/50 dark:bg-studypurple-900/30 border border-studypurple-200/50 dark:border-studypurple-700/50">
            <Sparkles className="h-4 w-4 text-studypurple-600 dark:text-studypurple-400" />
            <span className="text-sm font-medium text-studypurple-700 dark:text-studypurple-300">AI-Powered Learning Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-studypurple-600 via-studypurple-500 to-studypurple-400 bg-clip-text text-transparent">
              StudyBuddy
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mb-3 leading-relaxed">
            Your AI-Powered Personal Study Companion
          </p>
          
          <p className="text-base md:text-lg text-studyneutral-300 dark:text-studyneutral-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your learning with adaptive quizzes, detailed midterm analysis, and personalized study recommendations. 
            StudyBuddy helps you identify weak areas, track progress, and excel in your exams.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="default" className="px-6 py-3 text-base bg-gradient-to-r from-studypurple-500 to-studypurple-600 hover:from-studypurple-600 hover:to-studypurple-700 text-white shadow-lg hover:shadow-xl transition-all">
              <Link to="/signup" className="flex items-center">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="px-6 py-3 text-base border-2 hover:bg-studypurple-50 dark:hover:bg-studypurple-900/20">
              <Link to="/login" className="flex items-center">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What is StudyBuddy Section */}
      <section className="py-8 md:py-12 bg-background/50 dark:bg-background/80">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">What is StudyBuddy?</h2>
            <p className="text-lg md:text-xl text-studyneutral-300 dark:text-studyneutral-400 leading-relaxed mb-6">
              StudyBuddy is an intelligent learning platform that uses AI to create personalized study experiences. 
              Upload your study materials, take adaptive quizzes, analyze your midterm papers, and receive 
              targeted recommendations to improve your understanding and performance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center p-6 rounded-xl bg-studypurple-50/50 dark:bg-studypurple-900/20">
                <div className="text-3xl font-bold text-studypurple-600 dark:text-studypurple-400 mb-2">AI-Powered</div>
                <p className="text-sm text-studyneutral-400">Intelligent analysis and recommendations</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-studypurple-50/50 dark:bg-studypurple-900/20">
                <div className="text-3xl font-bold text-studypurple-600 dark:text-studypurple-400 mb-2">Personalized</div>
                <p className="text-sm text-studyneutral-400">Tailored to your learning style</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-studypurple-50/50 dark:bg-studypurple-900/20">
                <div className="text-3xl font-bold text-studypurple-600 dark:text-studypurple-400 mb-2">Comprehensive</div>
                <p className="text-sm text-studyneutral-400">Complete learning solution</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 md:py-12 bg-gradient-to-br from-studypurple-100/30 via-studyaccent-blue/10 to-background dark:from-studypurple-900/10 dark:via-studypurple-900/5 dark:to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Key Features</h2>
            <p className="text-lg md:text-xl text-studyneutral-300 dark:text-studyneutral-400 max-w-2xl mx-auto">
              Everything you need to excel in your studies
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-studypurple-300 dark:hover:border-studypurple-600 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Adaptive Quick-Study Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-studyneutral-300 dark:text-studyneutral-400 text-sm leading-relaxed">
                  Select session lengths (10, 15, or 20 minutes) and take real-time quizzes that adjust difficulty 
                  based on your accuracy. Get immediate feedback with correct answers and explanations.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-studypurple-300 dark:hover:border-studypurple-600 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Targeted Revision from Mid-Term Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-studyneutral-300 dark:text-studyneutral-400 text-sm leading-relaxed">
                  Upload graded midterms to automatically identify incorrect answers, categorize mistakes by topic, 
                  and receive structured feedback. Generate targeted quizzes and personalized resources to correct misunderstandings.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-studypurple-300 dark:hover:border-studypurple-600 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <ChartBar className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Performance Summaries and Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-studyneutral-300 dark:text-studyneutral-400 text-sm leading-relaxed">
                  Receive detailed performance reports after each session highlighting strengths, weaknesses, and 
                  suggested review topics. Track improvement over time through your personal dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-studypurple-300 dark:hover:border-studypurple-600 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Comprehensive RAG-Based Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-studyneutral-300 dark:text-studyneutral-400 text-sm leading-relaxed">
                  Get personalized comprehensive assessments that analyze your complete learning history. Identify 
                  persistent weak areas across multiple study sessions and receive targeted quizzes with downloadable detailed reports.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-studypurple-300 dark:hover:border-studypurple-600 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">AI-Powered Resource Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-studyneutral-300 dark:text-studyneutral-400 text-sm leading-relaxed">
                  Receive curated study materials, videos, articles, and practice problems tailored to your weak areas. 
                  Resources are automatically updated based on your learning progress.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-studypurple-300 dark:hover:border-studypurple-600 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Personalized Learning Paths</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-studyneutral-300 dark:text-studyneutral-400 text-sm leading-relaxed">
                  Get customized study plans and recommendations based on your learning patterns, performance history, 
                  and identified knowledge gaps. The system continuously adapts to your needs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-8 md:py-12 bg-background/50 dark:bg-background/80">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-foreground">Why Choose StudyBuddy?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "AI-powered personalized learning",
                "Real-time performance tracking",
                "Comprehensive progress analytics",
                "Automated resource recommendations",
                "Midterm paper analysis",
                "Adaptive quiz generation"
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-studypurple-50/50 dark:bg-studypurple-900/20 hover:bg-studypurple-100/70 dark:hover:bg-studypurple-900/30 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-studypurple-600 dark:text-studypurple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-studyneutral-700 dark:text-studyneutral-300 font-medium">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-studypurple-500 via-studypurple-400 to-studypurple-500 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-lg md:text-xl opacity-95 mb-8 max-w-3xl mx-auto leading-relaxed">
            Start your journey to academic excellence with StudyBuddy today. Join thousands of students who are already improving their grades.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="default" variant="secondary" className="px-6 py-3 text-base bg-white text-studypurple-600 hover:bg-studypurple-50 shadow-xl hover:shadow-2xl transition-all font-semibold">
              <Link to="/signup" className="flex items-center">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="px-6 py-3 text-base border-2 border-white/80 bg-white/10 text-white hover:bg-white/20 hover:border-white backdrop-blur-sm font-semibold">
              <Link to="/login" className="flex items-center">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
