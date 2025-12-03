
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle2 } from 'lucide-react';
import { GoogleLogo } from '@/components/ui/google-logo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SignupPage = () => {
  const { isAuthenticated, signup, loginWithGoogle, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await signup(name, email, password, false); // Pass false to skip auto-login
      // Show confirmation modal instead of auto-login
      setSignupEmail(email);
      setShowConfirmationModal(true);
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      toast({
        title: "Google sign up failed",
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
          <h1 className="mt-4 text-2xl font-bold">Create your StudyBuddy account</h1>
          <p className="mt-2 text-studyneutral-300">Sign up to start learning smarter</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              minLength={6}
            />
            <p className="text-xs text-studyneutral-300">Must be at least 6 characters</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-studyneutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-studyneutral-300">Or continue with</span>
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
          Sign up with Google
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-studyneutral-300">
            Already have an account?{' '}
            <Link to="/login" className="text-studypurple-400 hover:text-studypurple-500">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Confirmation Email Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Check Your Email
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              We've sent a confirmation email to
              <span className="font-semibold text-studypurple-600"> {signupEmail}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-studypurple-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-studypurple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-studyneutral-700">
                <p className="font-medium mb-1">Please confirm your email address</p>
                <p className="text-studyneutral-500">
                  Click the confirmation link in the email we just sent you. This helps us verify your account and keep it secure.
                </p>
              </div>
            </div>
            
            <div className="text-sm text-studyneutral-600 space-y-1">
              <p className="font-medium">What's next?</p>
              <ul className="list-disc list-inside space-y-1 text-studyneutral-500 ml-2">
                <li>Check your inbox (and spam folder)</li>
                <li>Click the confirmation link in the email</li>
                <li>Return here and log in to get started</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmationModal(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowConfirmationModal(false);
                window.location.href = '/login';
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            >
              Go to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignupPage;
