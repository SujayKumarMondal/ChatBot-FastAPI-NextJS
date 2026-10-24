import { getApiBaseUrl } from "./config";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_STATE_KEY = "google_oauth_state";
const GITHUB_STATE_KEY = "github_oauth_state";

const createOAuthState = () => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export async function startGoogleOAuthRedirect(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured.");
  }

  const state = createOAuthState();
  sessionStorage.setItem(GOOGLE_STATE_KEY, state);

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

export async function startGithubOAuthRedirect(): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/github/config/`);
  if (!response.ok) {
    throw new Error("GitHub Sign-In is not configured.");
  }

  const config = await response.json() as { client_id?: string };
  if (!config.client_id) {
    throw new Error("GitHub Sign-In is not configured.");
  }

  const state = createOAuthState();
  sessionStorage.setItem(GITHUB_STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: `${window.location.origin}/oauth-callback`,
    scope: "read:user user:email",
    state,
  });
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

export function consumeOAuthProviderState(
  returnedState: string | null
): "google" | "github" | null {
  const googleState = sessionStorage.getItem(GOOGLE_STATE_KEY);
  const githubState = sessionStorage.getItem(GITHUB_STATE_KEY);
  sessionStorage.removeItem(GOOGLE_STATE_KEY);
  sessionStorage.removeItem(GITHUB_STATE_KEY);

  if (returnedState && googleState && returnedState === googleState) return "google";
  if (returnedState && githubState && returnedState === githubState) return "github";
  return null;
}
