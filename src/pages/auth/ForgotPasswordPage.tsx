import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ForgotPasswordPage = () => {
  const { isAuthenticated, resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email.trim());
      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "Check your inbox for password reset instructions",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
        <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-xl shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-studyneutral-300 mb-4">
              We've sent password reset instructions to
            </p>
            <p className="text-studypurple-600 dark:text-studypurple-400 font-semibold mb-6">
              {email}
            </p>
            <div className="space-y-4 text-sm text-studyneutral-600 dark:text-studyneutral-400">
              <p>Please check your inbox and follow the instructions to reset your password.</p>
              <p className="text-xs text-studyneutral-400 dark:text-studyneutral-500">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Another Email
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full"
            >
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-xl shadow-lg animate-scale-in">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-studypurple-300 to-studypurple-500 flex items-center justify-center">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Forgot Password?</h1>
          <p className="mt-2 text-studyneutral-300">
            Enter your email address and we'll send you instructions to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Reset Instructions
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link 
            to="/login" 
            className="text-sm text-studypurple-400 hover:text-studypurple-500 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

