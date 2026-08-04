import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OtpVerificationModal from "@/components/OtpVerificationModal";
import { getApiBaseUrl } from "@/lib/config";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_BASE_URL = getApiBaseUrl();

export default function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [otpFlow, setOtpFlow] = useState({ isOpen: false, email: "" });
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    const state = location.state as { error?: string; message?: string; email?: string } | null;
    if (state?.error) {
      setError(state.error);
    }
    if (state?.message) {
      setError("");
    }
    if (state?.email) {
      setForm((prev) => ({ ...prev, email: state.email || prev.email }));
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const requestOtp = async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/request-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "login" }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || "Unable to send verification code");
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await requestOtp(form.email.trim().toLowerCase());
      setOtpFlow({ isOpen: true, email: form.email.trim().toLowerCase() });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOtpConfirm = async (otp: string) => {
    setOtpSubmitting(true);
    setOtpError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpFlow.email, otp, purpose: "login" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Verification failed");
      }

      await signIn(otpFlow.email, form.password);
      setOtpFlow({ isOpen: false, email: "" });
      navigate("/");
    } catch (err: any) {
      setOtpError(err.message || "OTP verification failed");
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleOtpResend = async () => {
    setOtpError("");
    try {
      await requestOtp(otpFlow.email);
    } catch (err: any) {
      setOtpError(err.message || "Unable to resend verification code");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/10">
      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-br from-card to-card/80 border border-primary/20 p-8 rounded-2xl shadow-xl shadow-primary/20 w-full max-w-md space-y-6"
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
        {location.state && (location.state as { message?: string }).message && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {(location.state as { message?: string }).message}
          </p>
        )}

        <Input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

          <p className="text-right text-xs mt-1">
            <span
              className="text-primary cursor-pointer hover:underline"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot Password?
            </span>
          </p>

        <Button type="submit" className="w-full">Sign In</Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full mt-2"
          onClick={() => {
            if (!GOOGLE_CLIENT_ID) {
              const message =
                "Google Sign-In is not configured. VITE_GOOGLE_CLIENT_ID is missing.";
              console.error(message);
              setError(message);
              return;
            }

            const redirectUri = `${window.location.origin}/oauth-callback`;
            console.log("🔐 Google OAuth Starting:");
            console.log("  Client ID:", GOOGLE_CLIENT_ID);
            console.log("  Redirect URI:", redirectUri);
            const params = new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              redirect_uri: redirectUri,
              response_type: "code",
              scope: "openid email profile",
              access_type: "offline",
              prompt: "select_account",
            });
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
          }}
        >
          Sign In with Google
        </Button>
        <p className="text-center text-sm">
          Don’t have an account?{" "}
          <span
            className="text-primary cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </form>

      <OtpVerificationModal
        isOpen={otpFlow.isOpen}
        title="Verify your sign-in"
        subtitle="Enter the 6-digit code we just sent to your inbox."
        email={otpFlow.email}
        onConfirm={handleOtpConfirm}
        onCancel={() => setOtpFlow({ isOpen: false, email: "" })}
        onResend={handleOtpResend}
        isSubmitting={otpSubmitting}
        error={otpError}
        submittingLabel="Signing in..."
      />
    </div>
  );
}
