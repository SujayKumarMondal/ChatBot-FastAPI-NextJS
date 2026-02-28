import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-primary/30 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/50 flex field-sizing-content min-h-20 w-full rounded-lg border-2 bg-background/50 px-4 py-3 text-base shadow-md shadow-primary/10 transition-all outline-none focus-visible:ring-2 focus-visible:shadow-lg focus-visible:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
