import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Chrome, Github } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";

export default function LoginPrompt() {
  const location = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) {
      setError(state.error);
    }
  }, [location.state]);

  const startOAuth = (provider: "google" | "github") => {
    const clientId = provider === "google" ? GOOGLE_CLIENT_ID : GITHUB_CLIENT_ID;
    if (!clientId) {
      setError(`${provider === "google" ? "Google" : "GitHub"} Sign-In is not configured.`);
      return;
    }

    const redirectUri = `${window.location.origin}/oauth-callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: provider,
    });

    if (provider === "google") {
      params.set("scope", "openid email profile");
      params.set("access_type", "offline");
      params.set("prompt", "select_account");
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return;
    }

    params.set("scope", "read:user user:email");
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-secondary/5 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <img
          src="/brand_logo.png"
          alt="ChatPaat Logo"
          className="mx-auto mb-5 h-20 w-20 transition-transform duration-300 hover:scale-110 sm:mb-7 sm:h-24 sm:w-24 md:h-32 md:w-32 animate-float-up"
        />

        <h2 className="mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
          Welcome to ChatPaat
        </h2>

        <p className="mb-2 text-sm text-muted-foreground sm:text-base md:text-lg">
          Sign in to start chatting with your AI assistant and experience smart,
          real-time conversations.
        </p>

        <p className="mb-6 text-xs text-muted-foreground/70 sm:mb-8 sm:text-sm">
          It can make mistakes, check wisely before you act!
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={() => startOAuth("google")}
            className="w-full bg-primary py-3 text-sm text-primary-foreground hover:bg-primary/90 sm:text-base"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Sign In With Google
          </Button>

          <Button
            type="button"
            onClick={() => startOAuth("github")}
            variant="outline"
            className="w-full py-3 text-sm sm:text-base"
          >
            <Github className="mr-2 h-4 w-4" />
            Sign In With Github
          </Button>
        </div>
      </div>
    </div>
  );
}
