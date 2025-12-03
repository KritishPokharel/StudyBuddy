import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route configuration for breadcrumbs
const routeConfig: Record<string, { title: string; parent?: string }> = {
  '/': { title: 'Home' },
  '/dashboard': { title: 'Dashboard' },
  '/quick-quiz': { title: 'Quick Quiz' },
  '/quick-quiz/select-materials': { title: 'Select Materials', parent: '/quick-quiz' },
  '/quick-quiz/configure': { title: 'Configure Quiz', parent: '/quick-quiz' },
  '/quick-quiz/question': { title: 'Question', parent: '/quick-quiz' },
  '/quick-quiz/summary': { title: 'Summary', parent: '/quick-quiz' },
  '/midterm-review': { title: 'Mid-Term Review' },
  '/midterm-review/upload': { title: 'Upload', parent: '/midterm-review' },
  '/midterm-review/results': { title: 'Results', parent: '/midterm-review' },
  '/quiz-details': { title: 'Quiz Details', parent: '/dashboard' },
  '/resources': { title: 'Resources' },
  '/progress': { title: 'Progress' },
  '/settings': { title: 'Settings' },
  '/profile': { title: 'Profile' },
};

// Generate breadcrumb items from current path
const generateBreadcrumbs = (pathname: string) => {
  const breadcrumbs: Array<{ path: string; title: string; isActive: boolean }> = [];
  
  // Handle dynamic routes like /quiz-details/:type/:id or /quick-quiz/question/:index
  let normalizedPath = pathname;
  if (pathname.startsWith('/quiz-details/')) {
    normalizedPath = '/quiz-details';
  } else if (pathname.match(/^\/quick-quiz\/question\/\d+$/)) {
    normalizedPath = '/quick-quiz/question';
  }
  
  const config = routeConfig[normalizedPath];
  if (!config) {
    // Fallback for unknown routes
    const segments = pathname.split('/').filter(Boolean);
    return [
      { path: '/', title: 'Home', isActive: false },
      { path: pathname, title: segments[segments.length - 1] || 'Page', isActive: true }
    ];
  }
  
  // Build breadcrumb chain
  let currentPath = normalizedPath;
  const chain: string[] = [];
  
  while (currentPath) {
    chain.unshift(currentPath);
    const currentConfig = routeConfig[currentPath];
    currentPath = currentConfig?.parent || '';
  }
  
  // Always start with home if not already included
  if (chain[0] !== '/') {
    chain.unshift('/');
  }
  
  return chain.map((path, index) => ({
    path: path === normalizedPath ? pathname : path, // Use original path for current page
    title: routeConfig[path]?.title || path,
    isActive: index === chain.length - 1
  }));
};

interface AppBreadcrumbProps {
  className?: string;
}

const AppBreadcrumb: React.FC<AppBreadcrumbProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumbs = generateBreadcrumbs(location.pathname);
  
  // Don't show breadcrumbs on home page, login, or signup
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }
  
  // Don't show if only one breadcrumb (just home)
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-studyneutral-300 hover:text-studypurple-500 p-2"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.path}>
              <BreadcrumbItem>
                {breadcrumb.isActive ? (
                  <BreadcrumbPage className="text-studypurple-600 font-medium">
                    {breadcrumb.title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      to={breadcrumb.path} 
                      className="text-studyneutral-300 hover:text-studypurple-500 transition-colors flex items-center gap-1"
                    >
                      {breadcrumb.path === '/' && <Home className="h-4 w-4" />}
                      {breadcrumb.title}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4 text-studyneutral-300" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default AppBreadcrumb;