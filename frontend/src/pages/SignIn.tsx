import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function SignInPage() {
  const location = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) {
      setError(state.error);
    }
  }, [location.state]);

  const startOAuth = () => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Sign-In is not configured.");
      return;
    }
    const redirectUri = `${window.location.origin}/oauth-callback`;
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", state: "google" });
    params.set("scope", "openid email profile");
    params.set("access_type", "offline");
    params.set("prompt", "select_account");
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/10">
      <div
        className="relative bg-gradient-to-br from-card to-card/80 border border-primary/20 p-8 rounded-2xl shadow-xl shadow-primary/20 w-full max-w-md space-y-6"
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
          onClick={startOAuth}
        >
          Sign In with Google
        </Button>
      </div>
    </div>
  );
}
