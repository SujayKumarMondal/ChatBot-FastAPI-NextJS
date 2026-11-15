import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Chrome, FileText, Github, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { startGithubOAuthRedirect, startGoogleOAuthRedirect } from "../lib/googleOAuth";

export default function LoginPrompt() {
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
    <div className="auth-screen flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
      <div className="auth-landing">
        <section className="auth-intro" aria-labelledby="auth-heading">
          <div className="auth-intro-eyebrow">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            A clearer way to think, create, and get things done
          </div>
          <h1 id="auth-heading">
            Your ideas, with an
            <span> AI by your side.</span>
          </h1>
          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-topbar">
              <span className="auth-preview-dots"><i /><i /><i /></span>
              <span>ChatPaat assistant</span>
              <Sparkles size={12} />
            </div>
            <div className="auth-bot-scene">
              <div className="auth-bot-orbit auth-bot-orbit-one" />
              <div className="auth-bot-orbit auth-bot-orbit-two" />
              <div className="auth-bot-antenna"><i /></div>
              <div className="auth-bot-ear auth-bot-ear-left" />
              <div className="auth-bot-ear auth-bot-ear-right" />
              <div className="auth-bot-head">
                <div className="auth-bot-face">
                  <i className="auth-bot-eye" />
                  <i className="auth-bot-eye" />
                  <i className="auth-bot-mouth" />
                </div>
              </div>
              <div className="auth-bot-neck" />
              <div className="auth-bot-body">
                <span><Sparkles size={16} /></span>
              </div>
              <div className="auth-bot-shadow" />
            </div>
            <div className="auth-preview-chat">
              <div className="auth-preview-bot">
                <span className="auth-preview-avatar"><Sparkles size={17} /></span>
                <span className="auth-preview-bubble">Hi there! What would you like to work on today?</span>
              </div>
              <div className="auth-preview-user">Help me turn an idea into a plan.</div>
              <div className="auth-preview-answer">
                <span className="auth-preview-avatar"><MessageCircle size={16} /></span>
                <span className="auth-preview-lines"><i /><i /><i /></span>
              </div>
            </div>
            <div className="auth-preview-compose">
              <span>Ask anything...</span>
              <span className="auth-preview-send"><Sparkles size={14} /></span>
            </div>
            <div className="auth-preview-note">
              <FileText size={14} />
              Your ideas and files, all in one place
            </div>
          </div>

          <div className="auth-benefits">
            <span><MessageCircle size={15} /> Natural conversations</span>
            <span><FileText size={15} /> Ask about your files</span>
            <span><ShieldCheck size={15} /> Private workspace</span>
          </div>
        </section>

        <section className="auth-card text-center" aria-labelledby="auth-card-heading">
          <div className="auth-card-brand">
            <img
              src="/brand_logo.png"
              alt="ChatPaat"
              className="h-16 w-16 transition-transform duration-300 hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]"
            />
          </div>

          <p className="auth-card-eyebrow">WELCOME TO YOUR WORKSPACE</p>
          <h2 id="auth-card-heading">Let’s get started</h2>
          <p className="auth-card-copy">
            Sign in to start a conversation with your AI assistant.
          </p>
          <p className="auth-card-disclaimer">
            AI can make mistakes. Check important information before you act.
          </p>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={() => startOAuth("google")}
            disabled={signingInWith !== null}
            className="auth-signin-button w-full"
          >
            {signingInWith === "google" ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            {signingInWith === "google" ? "Connecting to Google..." : "Continue with Google"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => startOAuth("github")}
            disabled={signingInWith !== null}
            className="w-full"
          >
            {signingInWith === "github" ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            {signingInWith === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}
          </Button>
          <p className="auth-card-terms">
            By continuing, you agree to use ChatPaat responsibly.
          </p>
        </section>
      </div>
    </div>
  );
}
