import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:7004/api/auth/password-reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to request password reset");
      setMessage("If an account with that email exists, you will receive instructions shortly. Also check the spam box");
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/10">
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-card to-card/80 border border-primary/20 p-8 rounded-2xl shadow-xl shadow-primary/20 w-full max-w-md space-y-6">
        {/* Logo Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <img 
            src="/brand_logo.png" 
            alt="ChatPaat Logo" 
            className="h-14 w-14 hover:scale-110 transition-transform" 
          />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ChatPaat</h1>
        </div>
        <h2 className="text-2xl font-bold text-center text-foreground">Forgot Password</h2>
        {message && <p className="text-green-600 bg-green-500/10 p-3 rounded-lg">{message}</p>}
        {error && <p className="text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
        <Input
          name="email"
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">Send reset email</Button>
        <p className="text-center text-sm">
          Remembered your password? <span className="text-primary cursor-pointer" onClick={() => navigate('/signin')}>Sign in</span>
        </p>
      </form>
    </div>
  );
}
