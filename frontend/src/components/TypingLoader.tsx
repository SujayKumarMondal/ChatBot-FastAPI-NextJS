
import { motion } from "framer-motion";

const TypingLoader = () => {
  return (
    <div
      className="typing-indicator flex w-fit items-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-3.5 py-2.5"
      role="status"
      aria-label="ChatPaat is thinking"
    >
      <img
        src="/brand_logo.png"
        alt=""
        className="h-5 w-5 opacity-80"
      />
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
            transition={{
              duration: 0.85,
              repeat: Infinity,
              ease: "easeInOut",
              delay: dot * 0.14,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default TypingLoader