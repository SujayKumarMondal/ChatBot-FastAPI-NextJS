const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const OAUTH_STATE_KEY = "google_oauth_state";

export async function startGoogleOAuthRedirect(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured.");
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const redirectUri = `${window.location.origin}/oauth-callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export function consumeGoogleOAuthState(returnedState: string | null): boolean {
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  return Boolean(expectedState && returnedState && expectedState === returnedState);
}
