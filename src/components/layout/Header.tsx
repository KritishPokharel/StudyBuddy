import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FileText, Menu as MenuIcon, X as XIcon, Brain, FileDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

const Logo = () => (
  <Link to="/dashboard" className="flex items-center gap-2">
    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-studypurple-300 to-studypurple-500 flex items-center justify-center">
      <span className="text-white font-bold text-sm">SB</span>
    </div>
    <span className="font-bold text-lg">StudyBuddy</span>
  </Link>
);

const navItems = [
  { name: 'Quick Quiz', path: '/dashboard/quick-quiz', icon: <FileText className="h-4 w-4" /> },
  { name: 'Mid-Term Review', path: '/dashboard/midterm-review', icon: <BookOpen className="h-4 w-4" /> },
  { name: 'RAG Quiz', path: '/dashboard/rag-quiz', icon: <Brain className="h-4 w-4" /> },
  { name: 'Resources', path: '/dashboard/resources', icon: <BookOpen className="h-4 w-4" /> },
  { name: 'Study Report', path: '/dashboard/study-report', icon: <FileDown className="h-4 w-4" /> },
];

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/dashboard/quick-quiz') {
      return location.pathname.startsWith('/dashboard/quick-quiz') || 
             location.pathname.startsWith('/dashboard/quiz-result');
    }
    if (path === '/dashboard/midterm-review') {
      return location.pathname.startsWith('/dashboard/midterm-review') || 
             location.pathname.startsWith('/dashboard/midterm-analysis');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header className="border-b bg-background border-border">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Logo />
          
          {!isMobile && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      active
                        ? 'bg-studypurple-100 dark:bg-studypurple-900/30 text-studypurple-600 dark:text-studypurple-300 font-medium'
                        : 'text-foreground/80 hover:bg-muted'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-studypurple-200 text-studypurple-600">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="cursor-pointer">
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-white z-40 animate-in fade-in-0 slide-in-from-top">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 text-lg rounded-md transition-colors ${
                    active
                      ? 'bg-studypurple-100 dark:bg-studypurple-900/30 text-studypurple-600 dark:text-studypurple-300 font-medium'
                      : 'text-foreground/80 hover:bg-muted'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
