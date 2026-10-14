import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className={`relative ${isFocused ? 'has-focus' : ''}`}>
      <input
        type={inputType}
        data-slot="input"
        className={cn(
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/50 border-primary/30 flex h-10 w-full min-w-0 rounded-lg border-2 bg-background/50 px-4 py-2 pr-10 text-base shadow-md shadow-primary/10 transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-primary file:text-sm file:font-semibold file:text-white file:px-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:shadow-lg focus-visible:shadow-primary/20 focus-visible:animate-glow-input",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />

      {isPasswordField && (
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}

export { Input }
