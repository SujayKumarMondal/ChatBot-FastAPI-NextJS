import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithTokens, token } = useAuth();
  const exchangeAttemptedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate API calls
    if (exchangeAttemptedRef.current) return;
    exchangeAttemptedRef.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      navigate('/signin', { state: { error: errorDescription || error } });
      return;
    }

    if (!code) {
      console.error('No authorization code received');
      navigate('/signin', { state: { error: 'No authorization code received' } });
      return;
    }

    // Exchange the authorization code for tokens
    const exchangeTokens = async () => {
      try {
        const redirectUri = `${window.location.origin}/oauth-callback`;
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:7004';
        
        const response = await fetch(`${apiBaseUrl}/api/auth/google/exchange/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            redirect_uri: redirectUri,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Server error:', {
            status: response.status,
            statusText: response.statusText,
            detail: errorData.detail,
          });
          throw new Error(`Token exchange failed: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        
        // Store token in sessionStorage FIRST (synchronous, reliable)
        sessionStorage.setItem("access_token", data.access);
        sessionStorage.setItem("refresh_token", data.refresh);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        
        // Then call signInWithTokens to update React state
        signInWithTokens(data.access, data.refresh, data.user);
        
        // Navigate after a small delay to ensure sessionStorage is read by AppSidebar
        // AppSidebar will also check sessionStorage as fallback
        setTimeout(() => {
          navigate('/');
        }, 50);
      } catch (err: any) {
        console.error('Token exchange failed:', err);
        navigate('/signin', { state: { error: err.message } });
      }
    };

    exchangeTokens();
  }, []); // Empty dependency array - run only once on mount

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-gray-500">Please wait...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;