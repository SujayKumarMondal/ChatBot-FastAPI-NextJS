import {
  ArrowRight,
  FileSearch,
  History,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  {
    icon: MessageCircle,
    title: "AI conversations",
    description: "Brainstorm ideas, understand topics, draft content, and solve problems through natural chat.",
    detail: "Ask follow-up questions",
  },
  {
    icon: FileSearch,
    title: "Document assistance",
    description: "Attach documents and get summaries, explanations, and answers grounded in their content.",
    detail: "Get more from your files",
  },
  {
    icon: History,
    title: "Conversation history",
    description: "Find past conversations, search your history, and export chat records when needed.",
    detail: "Pick up where you left off",
  },
  {
    icon: Settings2,
    title: "A workspace that fits you",
    description: "Choose your theme, accent color, text size, and message density.",
    detail: "Make your workspace yours",
  },
  {
    icon: ShieldCheck,
    title: "Account and profile tools",
    description: "Update your profile and manage account preferences in one place.",
    detail: "Account tools in one place",
  },
  {
    icon: Sparkles,
    title: "Help getting started",
    description: "Start with ready-made prompts for writing, coding, brainstorming, and document questions.",
    detail: "Ideas to get you moving",
  },
];

export default function ServicesPage() {
  return (
    <main className="services-page">
      <header className="services-hero">
        <span className="services-eyebrow">
          <Sparkles size={15} />
          CHATPAAT SERVICES
        </span>
        <h1>
          A helpful AI workspace,
          <span> built around your work.</span>
        </h1>
        <p>Explore practical tools for conversations, documents, and your everyday workflow.</p>
        <Link to="/" className="services-cta">
          Start a conversation <ArrowRight size={17} />
        </Link>
      </header>

      <section className="services-grid" aria-label="ChatPaat services">
        {services.map(({ icon: Icon, title, description, detail }) => (
          <article className="services-card" key={title}>
            <span className="services-card-icon">
              <Icon size={20} />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="services-card-detail">{detail}</span>
          </article>
        ))}
      </section>

      <footer className="services-footer">
        <div>
          <h2>Ready to get started?</h2>
          <p>Choose a prompt or ask your first question.</p>
        </div>
        <Link to="/" className="services-cta services-cta-secondary">
          Start a conversation <ArrowRight size={17} />
        </Link>
      </footer>
    </main>
  );
}
