import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        setTimeout(() => {
          navigate('/login?error=' + encodeURIComponent(errorDescription || errorParam));
        }, 2000);
        return;
      }

      // With detectSessionInUrl: true, Supabase should auto-detect the session
      // But we'll also try to exchange the code if present
      if (code) {
        try {
          console.log('Exchanging code for session...');
          // Exchange the code for a session (PKCE flow)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => {
              navigate('/login?error=' + encodeURIComponent(exchangeError.message));
            }, 2000);
            return;
          }

          if (data.session) {
            console.log('Session created successfully:', data.session.user.email);
            // Wait a moment for auth state to update, then redirect
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 500);
          } else {
            console.warn('No session in exchange response, checking current session...');
            // Check if session was created via auto-detection
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              console.log('Session found via getSession:', sessionData.session.user.email);
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, 500);
            } else {
              setError('No session created');
              setTimeout(() => {
                navigate('/login?error=No session created');
              }, 2000);
            }
          }
        } catch (err) {
          console.error('Unexpected error during OAuth callback:', err);
          setError('Unexpected error');
          setTimeout(() => {
            navigate('/login?error=Unexpected error during authentication');
          }, 2000);
        }
      } else {
        // No code parameter - might be implicit flow or auto-detection
        // Wait a bit for Supabase to auto-detect the session
        console.log('No code parameter, waiting for auto-detection...');
        setTimeout(async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('Session auto-detected:', sessionData.session.user.email);
            navigate('/dashboard', { replace: true });
          } else {
            console.warn('No session found, redirecting to login');
            navigate('/login?error=No authentication code received');
          }
        }, 1000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

      return (
        <div className="min-h-screen flex items-center justify-center bg-studypurple-100/30 dark:bg-studypurple-900/10">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 mb-4">Error: {error}</div>
            <p className="text-studyneutral-300">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-studypurple-500" />
            <p className="text-studyneutral-300">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;

