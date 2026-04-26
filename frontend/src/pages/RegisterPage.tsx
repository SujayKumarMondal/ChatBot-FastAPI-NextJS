import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form.username, form.email, form.password);
      navigate("/signin");
    } catch (err: any) {
      setError(err.message);
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

        {error && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{error}</p>}

        <Input
          name="username"
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
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

        <Button type="submit" className="w-full">Register</Button>
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
