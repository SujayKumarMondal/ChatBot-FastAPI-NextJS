import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const usernamePattern = /^[A-Za-z0-9_]{3,}$/;
const gmailPattern = /^[^\s@]+@gmail\.com$/i;
const passwordPattern = /^(?=.*\d)(?=.*[^A-Za-z0-9\s]).{9,}$/;

type FormState = {
  username: string;
  email: string;
  password: string;
};

type FormErrors = Partial<Record<keyof FormState | "form", string>>;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } else if (!gmailPattern.test(email)) {
      nextErrors.email = "Email must end with @gmail.com";
    }

    const password = values.password;
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (!passwordPattern.test(password)) {
      nextErrors.password = "Password must be at least 9 characters and include a number and a special character";
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(form.username.trim(), form.email.trim().toLowerCase(), form.password);
      navigate("/signin");
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
          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            required
          />
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
    </div>
  );
}
