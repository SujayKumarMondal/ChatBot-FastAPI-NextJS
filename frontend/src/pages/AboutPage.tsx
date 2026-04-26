import { Zap, Sparkles, ShieldAlert, Copy, Check, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useState } from "react";

export const AboutPage = () => {
  const [copied, setCopied] = useState(false);
  const supportEmail = "chatpaat.support.10@gmail.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMail = () => {
    window.location.href = `mailto:${supportEmail}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4 justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <img
            src="/brand_logo.png"
            alt="ChatPaat Logo"
            className="h-14 w-14 hover:scale-110 transition-transform"
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              ChatPaat
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenMail}
                className="flex items-center gap-1 text-sm text-primary hover:underline hover:text-primary/80 transition font-medium"
                title="Click to send email"
              >
                <Mail size={16} />
                {supportEmail}
              </button>
              <motion.button
                onClick={handleCopyEmail}
                className="p-1.5 rounded-md hover:bg-muted transition"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Copy email to clipboard"
              >
                {copied ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-muted-foreground hover:text-foreground" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* About + Why Combined */}
        <motion.div
          className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold mb-3 text-primary">
            About & Why ChatPaat
          </h2>

          <p className="text-sm leading-relaxed text-foreground mb-4">
            <strong className="text-primary">ChatPaat</strong> is a{" "}
            <span className="text-accent font-semibold">full-stack AI chat platform</span> with{" "}
            <Badge className="bg-primary/20 text-primary">FastAPI</Badge> backend and{" "}
            <Badge className="bg-secondary/20 text-secondary">React frontend</Badge>,
            powered by{" "}
            <Badge className="bg-accent/20 text-accent">Groq LLaMA 3.1</Badge>.
            It provides intelligent, secure conversations with enterprise-grade authentication.
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <Zap className="inline w-4 h-4 text-accent mr-2" />
              Lightning-fast AI responses with LLaMA 3.1-8b model
            </p>
            <p>
              <Sparkles className="inline w-4 h-4 text-primary mr-2" />
              Persistent chat history with intelligent organization
            </p>
            <p>
              <ShieldAlert className="inline w-4 h-4 text-secondary mr-2" />
              Secure JWT auth + Google OAuth integration
            </p>
          </div>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          className="bg-gradient-to-br from-secondary/10 to-accent/10 border border-secondary/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold mb-4 text-secondary">
            Tech Stack
          </h2>

          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-semibold text-secondary mb-1">Frontend</p>
              <p className="text-muted-foreground">React 18 + TypeScript, Vite, Tailwind CSS</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-secondary mb-1">Backend</p>
              <p className="text-muted-foreground">FastAPI, Python 3.x, JWT + OAuth 2.0</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-secondary mb-1">AI Engine</p>
              <p className="text-muted-foreground">Groq LLaMA 3.1-8b-instant model</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-secondary mb-1">Database</p>
              <p className="text-muted-foreground">SQLite (dev) / PostgreSQL (production)</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Built for scalability, security, and seamless AI interactions.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          className="bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold mb-3 text-accent">
            Key Features
          </h2>

          <ul className="text-sm space-y-2">
            <li>✨ Real-time AI conversations with LLaMA 3.1 model</li>
            <li>💾 Persistent chat history with time-based organization</li>
            <li>🔐 Enterprise-grade security: JWT tokens & OAuth 2.0</li>
            <li>📱 Fully responsive design across all devices</li>
            <li>⚡ Lightning-fast performance via Groq API</li>
            <li>🎨 Beautiful UI with Framer Motion animations</li>
            <li>📧 Secure password reset with email integration</li>
            <li>👤 Complete profile management & account control</li>
          </ul>
        </motion.div>

        {/* Architecture Highlights */}
        <motion.div
          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-2xl p-6 shadow-md hover:shadow-xl transition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold mb-4 text-blue-400">
            Architecture Highlights
          </h2>

          <div className="space-y-2 text-sm">
            <p><span className="font-semibold text-blue-400">🎯 Scalable Design:</span> <span className="text-muted-foreground">Microservice-ready with clear API boundaries</span></p>
            <p><span className="font-semibold text-purple-400">🔒 Production-Ready:</span> <span className="text-muted-foreground">Error handling, validation, CORS, and security hardened</span></p>
            <p><span className="font-semibold text-blue-400">⚙️ Modern Stack:</span> <span className="text-muted-foreground">Latest frameworks ensuring long-term maintainability</span></p>
            <p><span className="font-semibold text-purple-400">📊 Flexible DB:</span> <span className="text-muted-foreground">PostgreSQL</span></p>
          </div>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          className="md:col-span-2 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/15 rounded-2xl p-6 shadow-md hover:shadow-xl transition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold mb-4 text-primary">
            Who Should Use ChatPaat?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-primary mb-2">💼 Professionals</p>
              <p className="text-muted-foreground">Boost productivity with quick research, brainstorming, and task assistance</p>
            </div>
            <div>
              <p className="font-semibold text-secondary mb-2">🎓 Students</p>
              <p className="text-muted-foreground">Learn concepts, get explanations, and explore topics in depth with context awareness</p>
            </div>
            <div>
              <p className="font-semibold text-accent mb-2">👨‍💻 Developers</p>
              <p className="text-muted-foreground">Code debugging, algorithm design, and technical documentation support</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};