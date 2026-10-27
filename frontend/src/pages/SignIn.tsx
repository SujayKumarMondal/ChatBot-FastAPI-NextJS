import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Chrome, Github } from "lucide-react";
import { startGithubOAuthRedirect, startGoogleOAuthRedirect } from "../lib/googleOAuth";

export default function SignInPage() {
  const location = useLocation();
  const [error, setError] = useState("");
  const [signingInWith, setSigningInWith] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) {
      setError(state.error);
    }
  }, [location.state]);

  const startOAuth = async (provider: "google" | "github") => {
    setError("");
    setSigningInWith(provider);
    try {
      if (provider === "google") {
        await startGoogleOAuthRedirect();
      } else {
        await startGithubOAuthRedirect();
      }
    } catch (err) {
      const providerName = provider === "github" ? "GitHub" : "Google";
      setError(err instanceof Error ? err.message : `Unable to start ${providerName} Sign-In.`);
      setSigningInWith(null);
    }
  };

  return (
    <div className="auth-screen flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/10">
      <div
        className="auth-card relative bg-gradient-to-br from-card to-card/80 border border-primary/20 p-8 rounded-2xl shadow-xl shadow-primary/20 w-full max-w-md space-y-6"
      >
        {/* Logo Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <img 
            src="/brand_logo.png" 
            alt="ChatPaat Logo" 
            className="h-16 w-16 hover:scale-110 transition-transform" 
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ChatPaat</h1>
            <p className="text-sm text-muted-foreground mt-1">Your AI conversational partner</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-foreground">Sign In</h2>

        {error && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{error}</p>}

        <Button
          type="button"
          variant="secondary"
          className="w-full mt-2"
          onClick={() => startOAuth("google")}
          disabled={signingInWith !== null}
        >
          {signingInWith === "google" ? (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          ) : (
            <Chrome className="mr-2 h-4 w-4" />
          )}
          {signingInWith === "google" ? "Connecting to Google..." : "Sign In with Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => startOAuth("github")}
          disabled={signingInWith !== null}
        >
          {signingInWith === "github" ? (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          ) : (
            <Github className="mr-2 h-4 w-4" />
          )}
          {signingInWith === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}
        </Button>
      </div>
    </div>
  );
}
