import React, { useEffect } from "react";

// A11y - Accessibility helpers

// Keyboard navigation hook
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? "ctrl+" : ""}${
        e.shiftKey ? "shift+" : ""
      }${e.key.toLowerCase()}`;

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};

// Skip to main content link
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:p-4 focus:rounded-br-lg"
    >
      Skip to main content
    </a>
  );
}

// Accessible button with loading state
interface A11yButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}

export function A11yButton({
  onClick,
  children,
  loading,
  disabled,
  ariaLabel,
  className = "",
}: A11yButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={`transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <span aria-label="Loading">⏳</span>}
      {children}
    </button>
  );
}

// Accessible form field
interface A11yFieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
}

export function A11yField({
  label,
  id,
  type = "text",
  value,
  onChange,
  required,
  error,
  description,
  className = "",
}: A11yFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {description && (
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : description ? `${id}-description` : undefined
        }
        className={`w-full px-3 py-2 rounded-lg border ${
          error
            ? "border-destructive focus:ring-destructive"
            : "border-input focus:ring-primary"
        } bg-background text-foreground focus:outline-none focus:ring-2`}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible dialog
interface A11yDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function A11yDialog({
  open,
  onClose,
  title,
  children,
  showCloseButton = true,
}: A11yDialogProps) {
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-card rounded-lg max-w-md w-full p-6 border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// Focus management
export const useFocusTrap = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = element.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [ref]);
};

// Announce to screen readers
export const announceToScreenReader = (message: string, politeness: "polite" | "assertive" = "polite") => {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", politeness);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Color blind safe palette check
export function isColorBlindSafe(_color1: string, _color2: string): boolean {
  // Simplified check - in production use proper contrast checking library
  // This is a placeholder for demonstration
  return true;
}

// Keyboard shortcut helper
export function KeyboardShortcutHelper() {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
      <h3 className="font-semibold text-sm text-foreground">Keyboard Shortcuts</h3>
      <ul className="text-sm text-muted-foreground space-y-1">
        <li>
          <kbd className="px-2 py-1 bg-background rounded border border-border">Ctrl+Enter</kbd> Send message
        </li>
        <li>
          <kbd className="px-2 py-1 bg-background rounded border border-border">Ctrl+K</kbd> Search
        </li>
        <li>
          <kbd className="px-2 py-1 bg-background rounded border border-border">Esc</kbd> Close dialogs
        </li>
        <li>
          <kbd className="px-2 py-1 bg-background rounded border border-border">Tab</kbd> Navigate
        </li>
      </ul>
    </div>
  );
}
