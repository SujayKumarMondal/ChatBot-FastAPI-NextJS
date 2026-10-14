import React from "react";

// Responsive utilities
export const useResponsive = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
};

// Mobile-optimized message input
export function MobileInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const { isMobile } = useResponsive();

  return (
    <div className={`w-full ${isMobile ? "p-3" : "p-6"}`}>
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Type a message... (Shift+Enter for new line)"
          className={`flex-1 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
            isMobile ? "text-sm min-h-12" : "text-base min-h-16"
          }`}
          disabled={disabled}
          maxLength={2000}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={`rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center ${
            isMobile ? "p-2" : "px-6 py-3"
          }`}
          aria-label="Send message"
          title="Send message (Ctrl+Enter)"
        >
          {isMobile ? "📤" : "Send"}
        </button>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{value.length}/2000</div>
    </div>
  );
}

// Responsive message container
export function ResponsiveMessageContainer({
  children,
  isUser,
}: {
  children: React.ReactNode;
  isUser: boolean;
}) {
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 px-2 md:px-4`}
    >
      <div
        className={`max-w-xs md:max-w-md lg:max-w-xl ${
          isUser
            ? "bg-primary/10 border border-primary/20"
            : "bg-card border border-border"
        } rounded-lg p-3 md:p-4`}
      >
        {children}
      </div>
    </div>
  );
}

// Responsive skeleton loader
export function ResponsiveSkeleton() {
  return (
    <div className="space-y-3 p-4 md:p-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-muted rounded-lg h-12 md:h-16 animate-shimmer"
        />
      ))}
    </div>
  );
}

// Responsive grid
export function ResponsiveGrid({
  children,
  columns = 1,
}: {
  children: React.ReactNode;
  columns?: number;
}) {
  return (
    <div
      className={`grid gap-4 md:gap-6 grid-cols-${columns} md:grid-cols-${Math.min(columns * 2, 4)}`}
    >
      {children}
    </div>
  );
}

// Mobile-friendly button group
export function MobileButtonGroup({
  buttons,
}: {
  buttons: { label: string; onClick: () => void; variant?: string }[];
}) {
  const { isMobile } = useResponsive();

  return (
    <div
      className={`flex gap-2 flex-wrap ${
        isMobile ? "flex-col" : "flex-row"
      }`}
    >
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={btn.onClick}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            btn.variant === "primary"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-foreground hover:bg-muted/80"
          } ${isMobile ? "text-sm" : "text-base"}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
