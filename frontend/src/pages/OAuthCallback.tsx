import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../lib/config';
import { consumeOAuthProviderState } from '../lib/googleOAuth';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithTokens } = useAuth();
  const exchangeAttemptedRef = useRef(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "github" | null>(null);
  const [isTakingLonger, setIsTakingLonger] = useState(false);

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

    setOauthProvider(provider);
    const slowSignInTimeout = window.setTimeout(() => setIsTakingLonger(true), 5000);

    // Exchange the authorization code for tokens
    const exchangeTokens = async () => {
      try {
        const redirectUri = `${window.location.origin}/oauth-callback`;
        const apiBaseUrl = getApiBaseUrl();
        const exchangePayload: { code: string; redirect_uri?: string } = { code };
        if (provider === "google") {
          exchangePayload.redirect_uri = redirectUri;
        }

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
          body: JSON.stringify(exchangePayload),
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
      } finally {
        window.clearTimeout(slowSignInTimeout);
      }
    };

    exchangeTokens();
  }, [navigate, searchParams, signInWithTokens]);

  const providerName = oauthProvider === "github" ? "GitHub" : oauthProvider === "google" ? "Google" : "your account";

  return (
    <div className="auth-screen auth-progress flex min-h-screen items-center justify-center px-4 py-8">
      <section className="auth-progress-card text-center" role="status" aria-live="polite">
        <div className="auth-progress-visual" aria-hidden="true">
          <div className="auth-progress-orbit auth-progress-orbit-outer" />
          <div className="auth-progress-orbit auth-progress-orbit-inner" />
          <div className="auth-progress-core">
            <span />
            <span />
            <span />
          </div>
        </div>
        <h1 className="auth-progress-title">Securing your sign-in</h1>
        <p className="auth-progress-provider">Connecting to {providerName}</p>
        <div className="auth-progress-track" aria-hidden="true">
          <span />
        </div>
        <p className="auth-progress-hint">
          {isTakingLonger
            ? "Your sign-in is still in progress. First-time account setup can take a little longer."
            : "Your account is being prepared. This usually takes just a moment."}
        </p>
      </section>
    </div>
  );
};

export default OAuthCallback;