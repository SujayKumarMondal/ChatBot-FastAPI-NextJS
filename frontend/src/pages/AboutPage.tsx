import { Zap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export const AboutPage = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Page Header with Logo */}
      <motion.div
        className="flex items-center mb-6 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img 
          src="/brand_logo.png" 
          alt="ChatPaat Logo" 
          className="h-16 w-16 hover:scale-110 transition-transform" 
        />
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          About ChatPaat
        </h1>
      </motion.div>

      {/* Introduction Card */}
      <motion.div
        className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 rounded-2xl shadow-lg shadow-primary/20 p-8 hover:shadow-2xl transition-all duration-300"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <p className="text-foreground mb-6 text-lg leading-relaxed">
          <strong className="text-primary">ChatPaat</strong> is a
          next-generation{" "}
          <span className="font-semibold text-accent">
            AI-powered chatbot
          </span>{" "}
          designed to make your interactions smarter, faster, and more engaging.
          Built with{" "}
          <Badge className="bg-green-100 text-green-700">Django</Badge> backend
          and a{" "}
          <Badge className="bg-blue-100 text-blue-700">React</Badge> frontend,
          ChatPaat leverages{" "}
          <Badge className="bg-purple-100 text-purple-700">GROQ</Badge> to
          deliver highly accurate, context-aware responses.
        </p>
        <ul className="list-disc list-inside text-foreground space-y-3 text-base">
          <li>
            <Zap className="inline w-4 h-4 text-accent mr-2" />
            <strong>Ask anything:</strong> From casual chats to technical
            queries, ChatPaat responds intelligently.
          </li>
          <li>
            <Sparkles className="inline w-4 h-4 text-primary mr-2" />
            <strong>Speed & Reliability:</strong> Django ensures efficiency,
            React keeps it smooth.
          </li>
          <li>
            <strong className="text-primary">GROQ-powered intelligence:</strong>{" "}
            Understands complex queries with context.
          </li>
          <li>
            <strong className="text-secondary">Organized Conversations:</strong>{" "}
            Access chats & summaries with ease.
          </li>
        </ul>
      </motion.div>

      {/* Why ChatPaat Section */}
      <motion.div
        className="bg-white border border-pink-200 rounded-2xl shadow-md p-8 hover:shadow-xl transition-all duration-300"
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold text-pink-600 mb-4">
          Why ChatPaat?
        </h2>
        <p className="text-gray-700 mb-3 leading-relaxed">
          ChatPaat isn’t just a chatbot—it’s your{" "}
          <span className="font-semibold text-purple-600">
            digital companion
          </span>
          , learning from interactions and adapting to give you more relevant
          responses over time.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Whether you’re exploring AI, boosting productivity, or just having
          fun, ChatPaat is your{" "}
          <span className="font-semibold text-blue-600">go-to chat buddy</span>.
        </p>
      </motion.div>

      {/* Tech Stack */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-200 rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold text-blue-600 mb-5">Tech Stack</h2>
        <ul className="flex flex-wrap gap-4">
          <li>
            <Badge className="bg-green-200 text-green-900 px-4 py-2 rounded-full shadow">
              Django
            </Badge>
          </li>
          <li>
            <Badge className="bg-blue-200 text-blue-900 px-4 py-2 rounded-full shadow">
              React
            </Badge>
          </li>
          <li>
            <Badge className="bg-purple-200 text-purple-900 px-4 py-2 rounded-full shadow">
              GROQ (Graph-Relational Object Queries)
            </Badge>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};
