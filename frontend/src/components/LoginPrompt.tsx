import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LoginPrompt() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="text-center max-w-md mx-auto px-4">
        {/* ChatPaat Logo */}
        <img 
          src="/brand_logo.png" 
          alt="ChatPaat Logo" 
          className="h-32 w-32 mx-auto mb-8 hover:scale-110 transition-transform animate-float-up" 
        />

        {/* Message */}
        <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Welcome to ChatPaat
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          Sign in to start chatting with your AI assistant and experience smart,
          real-time conversations.
        </p>
        <p className="text-sm text-muted-foreground/70 mb-8">
          It can make mistakes, check wisely before you act!
        </p>
          

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/signin")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base"
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate("/register")}
            variant="outline"
            className="py-3 text-base"
          >
            Create Account
          </Button>
        </div>

        {/* Additional info */}
        <p className="text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/signin")}
            className="text-primary hover:underline font-semibold"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}
