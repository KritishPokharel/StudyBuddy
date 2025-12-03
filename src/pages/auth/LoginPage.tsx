
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, AlertCircle } from 'lucide-react';
import { GoogleLogo } from '@/components/ui/google-logo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const LoginPage = () => {
  const { isAuthenticated, login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailNotConfirmedModal, setShowEmailNotConfirmedModal] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error: any) {
      // Check if it's an email not confirmed error
      if (error.message === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmedEmail(error.email || email);
        setShowEmailNotConfirmedModal(true);
      } else {
        toast({
          title: "Login failed",
          description: (error as Error).message,
          variant: "destructive"
        });
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      toast({
        title: "Google login failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-xl shadow-lg animate-scale-in">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-studypurple-300 to-studypurple-500 flex items-center justify-center">
            <span className="text-white font-bold">SB</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold">Welcome back to StudyBuddy</h1>
          <p className="mt-2 text-studyneutral-300">Log in to your account to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-sm text-studypurple-400 hover:text-studypurple-500">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-studyneutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-studyneutral-300">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <GoogleLogo size={18} className="mr-2" />
          Sign in with Google
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-studyneutral-300">
            Don't have an account?{' '}
            <Link to="/signup" className="text-studypurple-400 hover:text-studypurple-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Email Not Confirmed Modal */}
      <Dialog open={showEmailNotConfirmedModal} onOpenChange={setShowEmailNotConfirmedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Email Not Confirmed
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Please confirm your email address before logging in
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <Mail className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-studyneutral-700">
                <p className="font-medium mb-1">Confirmation email sent to</p>
                <p className="text-studypurple-600 font-semibold">{unconfirmedEmail}</p>
              </div>
            </div>
            
            <div className="text-sm text-studyneutral-600 space-y-2">
              <p className="font-medium">To complete your login:</p>
              <ol className="list-decimal list-inside space-y-1 text-studyneutral-500 ml-2">
                <li>Check your inbox (and spam folder) for the confirmation email</li>
                <li>Click the confirmation link in the email</li>
                <li>Return here and try logging in again</li>
              </ol>
            </div>

            <div className="p-3 bg-studypurple-50 rounded-lg">
              <p className="text-sm text-studyneutral-600">
                <span className="font-medium">Don't see the email?</span> You can also sign in with Google, which doesn't require email confirmation.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmailNotConfirmedModal(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowEmailNotConfirmedModal(false);
                handleGoogleLogin();
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <GoogleLogo size={18} className="mr-2" />
              Sign in with Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
