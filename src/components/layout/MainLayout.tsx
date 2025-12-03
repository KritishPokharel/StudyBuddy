
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import Header from './Header';
import Footer from './Footer';
import AppBreadcrumb from '@/components/common/Breadcrumb';

const MainLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-studypurple-100 dark:from-studypurple-900/20 to-background">
        <div className="animate-pulse">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-studypurple-300 to-studypurple-500"></div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-studypurple-100/30 dark:from-studypurple-900/10 to-background">
      <Header />
      <AppBreadcrumb className="container mx-auto px-4 py-2" />
      <main className="flex-1 py-6">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
};

export default MainLayout;
