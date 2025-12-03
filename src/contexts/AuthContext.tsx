import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { name?: string; email?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Supabase user to app user
const mapSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || 
          supabaseUser.user_metadata?.name || 
          supabaseUser.email?.split('@')[0] || 
          'User',
    email: supabaseUser.email || '',
    avatar: supabaseUser.user_metadata?.avatar_url || 
            supabaseUser.user_metadata?.picture || 
            undefined
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is already logged in and listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapSupabaseUser(session?.user ?? null));
      setIsLoading(false);
      
      // Load theme preference from user metadata (handled by ThemeProvider)
      // ThemeProvider will handle applying the theme class
      
      // If user is authenticated and on login/signup page, redirect to dashboard
      if (session?.user && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
        navigate('/dashboard', { replace: true });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(mapSupabaseUser(session?.user ?? null));
      setIsLoading(false);
      
      // Handle sign in
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user.email);
        // Redirect to dashboard after successful sign-in
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/auth/callback') {
          navigate('/dashboard', { replace: true });
        }
      }
      
      // Handle token refresh (might happen during OAuth callback)
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed for:', session.user.email);
        const currentPath = window.location.pathname;
        if (currentPath === '/auth/callback') {
          navigate('/dashboard', { replace: true });
        }
      }
      
      // Handle sign out
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if it's an email confirmation error
        const isEmailNotConfirmed = 
          error.message?.toLowerCase().includes('email not confirmed') ||
          error.message?.toLowerCase().includes('email_not_confirmed') ||
          error.message?.toLowerCase().includes('email address not confirmed');
        
        if (isEmailNotConfirmed) {
          // Create a custom error that can be detected by the UI
          const emailError = new Error('EMAIL_NOT_CONFIRMED');
          (emailError as any).email = email;
          (emailError as any).originalError = error;
          throw emailError;
        }
        throw error;
      }

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
        navigate('/dashboard');
      }
    } catch (error: any) {
      // Re-throw email not confirmed errors as-is
      if (error.message === 'EMAIL_NOT_CONFIRMED') {
        throw error;
      }
      throw new Error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, autoLogin: boolean = true) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // If autoLogin is true, automatically log the user in
      if (autoLogin && data.user) {
        console.log('Account created, logging in user:', data.user.email);
        
        // Check if we have a session (Supabase might create one automatically)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // Session already exists, use it
          console.log('Session found after signup');
          setUser(mapSupabaseUser(sessionData.session.user));
          navigate('/dashboard');
        } else {
          // No session yet, try to sign in with the credentials
          console.log('No session after signup, signing in...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // If sign in fails (e.g., email confirmation required), still set user if available
            console.warn('Sign in after signup failed:', signInError);
            if (data.user) {
              setUser(mapSupabaseUser(data.user));
              navigate('/dashboard');
            } else {
              throw signInError;
            }
          } else if (signInData.user) {
            console.log('Successfully signed in after signup');
            setUser(mapSupabaseUser(signInData.user));
            navigate('/dashboard');
          }
        }
      } else if (data.user) {
        // Account created successfully, but not auto-logging in
        console.log('Account created successfully:', data.user.email);
        // Don't navigate - let the UI handle showing the confirmation modal
      } else {
        throw new Error('Account created but no user data returned');
      }
    } catch (error: any) {
      setIsLoading(false);
      throw new Error(error.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Get the current origin (works for both localhost and ngrok)
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/auth/callback`;
      
      console.log('[Google OAuth] Redirect URL:', redirectUrl);
      console.log('[Google OAuth] Current origin:', currentOrigin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setIsLoading(false);
        // Check if provider is not enabled
        if (error.message?.includes('not enabled') || error.message?.includes('Unsupported provider')) {
          throw new Error('Google sign-in is not enabled. Please enable it in your Supabase dashboard under Authentication > Providers > Google.');
        }
        throw error;
      }
      // The redirect will happen automatically
      // The callback will handle the session
    } catch (error: any) {
      setIsLoading(false);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };


  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      navigate('/login');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  };

  const updateProfile = async (updates: { name?: string; email?: string }) => {
    try {
      // Get current user to preserve existing metadata
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const updateData: any = {};
      
      // Update email if provided
      if (updates.email !== undefined && updates.email !== '') {
        updateData.email = updates.email;
      }
      
      // Update name in user metadata if provided
      if (updates.name !== undefined && updates.name !== '') {
        // Preserve existing metadata and update name
        updateData.data = {
          ...(currentUser?.user_metadata || {}),
          full_name: updates.name,
          name: updates.name,
        };
      } else if (updateData.email && currentUser?.user_metadata) {
        // Only updating email, preserve existing metadata
        updateData.data = currentUser.user_metadata;
      }

      const { data, error } = await supabase.auth.updateUser(updateData);

      if (error) throw error;

      // Update local user state
      if (data.user) {
        setUser(mapSupabaseUser(data.user));
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update password');
    }
  };

      return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading, 
        login, 
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
