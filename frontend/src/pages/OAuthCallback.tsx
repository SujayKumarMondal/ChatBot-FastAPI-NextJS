import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../lib/config';
import { consumeOAuthProviderState } from '../lib/googleOAuth';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithTokens } = useAuth();
  const exchangeAttemptedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate API calls
    if (exchangeAttemptedRef.current) return;
    exchangeAttemptedRef.current = true;

    const code = searchParams.get('code');
    const provider = consumeOAuthProviderState(searchParams.get('state'));
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (!provider) {
      navigate('/', { replace: true, state: { error: 'Sign-In could not be verified. Please try again.' } });
      return;
    }

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      navigate('/', {
        replace: true,
        state: { error: errorDescription || `${provider === 'github' ? 'GitHub' : 'Google'} sign-in was cancelled.` },
      });
      return;
    }

    if (!code) {
      console.error('No authorization code received');
      navigate('/', {
        replace: true,
        state: { error: `No authorization code received from ${provider === 'github' ? 'GitHub' : 'Google'}.` },
      });
      return;
    }

    // Exchange the authorization code for tokens
    const exchangeTokens = async () => {
      try {
        const redirectUri = `${window.location.origin}/oauth-callback`;
        const apiBaseUrl = getApiBaseUrl();

        if (!apiBaseUrl || apiBaseUrl === "http://127.0.0.1:7004") {
          console.error(
            "API base URL is not configured properly. Check VITE_API_URL in your frontend environment."
          );
        }

        const response = await fetch(`${apiBaseUrl}/api/auth/${provider}/exchange/`, {
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
        const userWithProvider = {
          ...data.user,
          oauth_provider: provider,
          image: data.user?.image || "",
        };

        signInWithTokens(data.access, data.refresh, userWithProvider);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Token exchange failed:', err);
        navigate('/', {
          replace: true,
          state: { error: err instanceof Error ? err.message : 'Token exchange failed.' },
        });
      }
    };

    exchangeTokens();
  }, []); // Empty dependency array - run only once on mount

  return (
    <div className="auth-screen auth-progress flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="auth-progress-indicator animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-gray-500">Please wait...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;