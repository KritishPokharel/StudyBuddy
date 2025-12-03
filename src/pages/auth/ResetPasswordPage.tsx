import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Check URL hash for access token (Supabase redirects with hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        const refreshToken = hashParams.get('refresh_token');
        
        if (type === 'recovery' && accessToken) {
          // Exchange the token for a session (this will log the user in temporarily)
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error setting session:', error);
            setIsValidToken(false);
            setIsValidating(false);
            return;
          }
          
          if (data.session) {
            // Store the user temporarily - we'll update password and keep them logged in
            setCurrentUser(data.user);
            setIsValidToken(true);
            setIsValidating(false);
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        }
        
        // Check if we have a session from query params (alternative flow)
        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            setCurrentUser(data.user);
            setIsValidToken(true);
            setIsValidating(false);
            return;
          }
        }
        
        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if this is a recovery session (user came from password reset email)
          // We'll show the form anyway to let them set a new password
          setCurrentUser(session.user);
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the password
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Verify the password was updated by checking if we still have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Session was lost, need to re-authenticate
        toast({
          title: "Password updated",
          description: "Please log in with your new password",
        });
        navigate('/login');
        return;
      }

      setPasswordReset(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. Logging you in...",
      });

      // Keep them logged in and redirect to dashboard after 1 second
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Failed to reset password",
        description: error.message || "Please try again or request a new reset link",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-studypurple-500" />
          <p className="text-studyneutral-300">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
        <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-xl shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Invalid or Expired Link</h1>
            <p className="text-studyneutral-300 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            >
              Request New Reset Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
        <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-xl shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Reset Successful!</h1>
            <p className="text-studyneutral-300 mb-6">
              Your password has been updated. Logging you in...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-studypurple-500" />
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
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Reset Your Password</h1>
          <p className="mt-2 text-studyneutral-300">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-10"
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-studyneutral-400 hover:text-studyneutral-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-studyneutral-400">Must be at least 6 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input pr-10"
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-studyneutral-400 hover:text-studyneutral-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-studypurple-400 to-studypurple-300 hover:opacity-90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Reset Password
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/login')}
            className="text-sm text-studypurple-400 hover:text-studypurple-500"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

