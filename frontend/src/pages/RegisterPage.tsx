import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";
import OtpVerificationModal from "@/components/OtpVerificationModal";
import { getApiBaseUrl } from "@/lib/config";

const usernamePattern = /^[A-Za-z0-9_]{3,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const passwordPattern = /^(?=.*\d)(?=.*[^A-Za-z0-9\s]).{9,}$/;
const API_BASE_URL = getApiBaseUrl();

type FormState = {
  username: string;
  email: string;
  password: string;
};

type FormErrors = Partial<Record<keyof FormState | "form", string>>;

type OtpFlowState = {
  isOpen: boolean;
  email: string;
  username?: string;
  password?: string;
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpFlow, setOtpFlow] = useState<OtpFlowState>({ isOpen: false, email: "" });
  const [otpError, setOtpError] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const validateForm = (values: FormState) => {
    const nextErrors: FormErrors = {};

    const username = values.username.trim();
    if (!username) {
      nextErrors.username = "Username is required";
    } else if (!usernamePattern.test(username)) {
      nextErrors.username = "Username must be at least 3 characters and contain only letters, numbers, or underscores";
    }

    const email = values.email.trim();
    if (!email) {
      nextErrors.email = "Email is required";
    } else if (!emailPattern.test(email)) {
      nextErrors.email = "Please enter a valid email address";
    }

    const password = values.password;
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (!passwordPattern.test(password)) {
      nextErrors.password = "Password must be at least 9 characters and include a number and a special character";
    }

    return nextErrors;
  };

  const requestOtp = async (payload: { email: string; username?: string; password?: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/request-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email, purpose: "register", username: payload.username }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || "Unable to send verification code");
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setOtpError("");
    try {
      await requestOtp({
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
      });
      setOtpFlow({
        isOpen: true,
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
      });
    } catch (err: any) {
      const message = err.message || "Registration failed";
      if (message.toLowerCase().includes("email already exists")) {
        setErrors((prev) => ({ ...prev, email: "Email already exists" }));
      } else {
        setErrors((prev) => ({ ...prev, form: message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpConfirm = async (otp: string) => {
    setOtpSubmitting(true);
    setOtpError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpFlow.email, otp, purpose: "register" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Verification failed");
      }

      await register(otpFlow.username?.trim() || form.username.trim(), otpFlow.email, otpFlow.password || form.password);
      setOtpFlow({ isOpen: false, email: "" });
      navigate("/signin", {
        state: {
          message: "Account created successfully. Please sign in with your email and password to continue.",
          email: otpFlow.email,
        },
      });
    } catch (err: any) {
      setOtpError(err.message || "OTP verification failed");
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleOtpResend = async () => {
    setOtpError("");
    try {
      await requestOtp({
        email: otpFlow.email,
        username: otpFlow.username,
      });
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

        <h2 className="text-2xl font-bold text-center text-foreground">Create Account</h2>

        {errors.form && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{errors.form}</p>}

        <div className="space-y-2">
          <Input
            name="username"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            aria-invalid={Boolean(errors.username)}
            required
          />
          {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              className="pr-12"
              required
            />
            {form.email.trim() ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                {emailPattern.test(form.email.trim()) ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            ) : null}
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            required
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registering..." : "Register"}
        </Button>
        <p className="text-center text-sm">
          Already have an account?{" "}
          <span
            className="text-primary cursor-pointer"
            onClick={() => navigate("/signin")}
          >
            Sign In
          </span>
        </p>
      </form>

      <OtpVerificationModal
        isOpen={otpFlow.isOpen}
        title="Verify your email"
        subtitle="Enter the 6-digit code we just sent to your inbox."
        email={otpFlow.email}
        onConfirm={handleOtpConfirm}
        onCancel={() => setOtpFlow({ isOpen: false, email: "" })}
        onResend={handleOtpResend}
        isSubmitting={otpSubmitting}
        error={otpError}
        submittingLabel="Verifying..."
      />
    </div>
  );
}
