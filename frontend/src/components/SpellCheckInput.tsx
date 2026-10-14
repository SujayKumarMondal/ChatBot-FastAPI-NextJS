import { useState, useRef, useEffect } from "react";
import Typo from "typo-js";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface SpellCheckInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}

interface SpellError {
  word: string;
  startIndex: number;
  endIndex: number;
  suggestions: string[];
}

const dictionary = new Typo("en_US");

export default function SpellCheckInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "Ask me anything...",
  className = "",
}: SpellCheckInputProps) {
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([]);
  const [activeErrorIndex, setActiveErrorIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check spelling errors
  useEffect(() => {
    if (!value.trim()) {
      setSpellErrors([]);
      return;
    }

    const words = value.split(/(\s+|\n)/);
    const errors: SpellError[] = [];
    let charIndex = 0;

    words.forEach((word) => {
      if (word.match(/\s+|\n/)) {
        charIndex += word.length;
        return;
      }

      // Remove punctuation for spell checking, but keep track of original
      const cleanWord = word.replace(/[.,!?;:—-]$/g, "");

      if (cleanWord && !dictionary.check(cleanWord)) {
        const suggestions = dictionary.suggest(cleanWord).slice(0, 5);
        errors.push({
          word: cleanWord,
          startIndex: charIndex,
          endIndex: charIndex + cleanWord.length,
          suggestions,
        });
      }

      charIndex += word.length;
    });

    setSpellErrors(errors);
  }, [value]);

  const handleReplaceSuggestion = (errorIndex: number, suggestion: string) => {
    const error = spellErrors[errorIndex];
    if (!error) return;

    const newValue =
      value.slice(0, error.startIndex) +
      suggestion +
      value.slice(error.endIndex);

    onChange(newValue);
    setActiveErrorIndex(null);

    // Focus back to textarea
    textareaRef.current?.focus();
  };

  const handleIgnoreWord = (errorIndex: number) => {
    // Add word to dictionary (in-memory only)
    const error = spellErrors[errorIndex];
    dictionary.add(error.word);
    
    // Remove from errors list
    setSpellErrors((prev) => prev.filter((_, i) => i !== errorIndex));
    setActiveErrorIndex(null);

    // Focus back to textarea
    textareaRef.current?.focus();
  };

  const renderOverlay = () => {
    if (!value) return null;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    spellErrors.forEach((error, errorIndex) => {
      // Add text before error
      if (lastIndex < error.startIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {value.slice(lastIndex, error.startIndex)}
          </span>
        );
      }

      // Add error with underline and clickable highlight
      const isActive = activeErrorIndex === errorIndex;

      elements.push(
        <span
          key={`error-${errorIndex}`}
          className="relative inline-block"
        >
          <span
            className="underline decoration-red-500 decoration-2 underline-offset-2 cursor-pointer hover:bg-red-500/20 px-0.5 rounded transition-colors"
            onClick={() => setActiveErrorIndex(activeErrorIndex === errorIndex ? null : errorIndex)}
          >
            {error.word}
          </span>

          {/* Suggestions Popup */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 rounded-lg border border-border bg-background shadow-xl p-2 whitespace-nowrap"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                top: "100%",
              }}
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                Did you mean?
              </div>
              <div className="space-y-1">
                {error.suggestions.map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => handleReplaceSuggestion(errorIndex, suggestion)}
                    className="block w-full text-left px-2 py-1 rounded text-sm bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                    whileHover={{ x: 4 }}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => handleIgnoreWord(errorIndex)}
                className="w-full mt-2 pt-2 border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-1"
              >
                <X size={12} />
                Ignore
              </button>
            </motion.div>
          )}
        </span>
      );

      lastIndex = error.endIndex;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {value.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="relative w-full">
      {/* Overlay Container - Shows styled text with spell check highlights */}
      <div
        ref={containerRef}
        className={`absolute inset-0 flex-1 resize-none min-h-[50px] max-h-[150px] rounded-md border border-input bg-transparent px-3 py-2 text-sm pointer-events-none overflow-y-auto ${className}`}
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          lineHeight: "1.5",
          color: "transparent",
          zIndex: 1,
        }}
      >
        <span style={{ visibility: "hidden" }}>
          {renderOverlay()}
        </span>
      </div>

      {/* Visible Overlay - Shows underlines on top of textarea */}
      <div
        className={`absolute inset-0 flex-1 resize-none min-h-[50px] max-h-[150px] rounded-md px-3 py-2 text-sm pointer-events-none overflow-y-hidden ${className}`}
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          lineHeight: "1.5",
          color: "transparent",
          zIndex: 2,
        }}
      >
        {renderOverlay()}
      </div>

      {/* Input textarea - for the actual input handling */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`relative w-full resize-none min-h-[50px] max-h-[150px] rounded-md border border-input bg-muted/40 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground shadow-sm transition ${className}`}
        style={{
          font: "inherit",
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          backgroundColor: "rgba(0,0,0,0.02)",
          zIndex: 3,
        }}
      />
    </div>
  );
}
