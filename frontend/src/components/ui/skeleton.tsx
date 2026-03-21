import { cn } from "@/lib/utils"

function Skeleton({ className, variant = "default", ...props }: React.ComponentProps<"div"> & { variant?: "default" | "text" | "circle" | "card" }) {
  const variants = {
    default: "bg-muted animate-shimmer-enhanced rounded-md",
    text: "h-4 bg-muted animate-shimmer-enhanced rounded-full w-full",
    circle: "h-12 w-12 bg-muted animate-shimmer-enhanced rounded-full",
    card: "bg-muted animate-skeleton-pulse rounded-lg p-4 space-y-3",
  };

  return (
    <div
      data-slot="skeleton"
      className={cn(variants[variant], className)}
      {...props}
    />
  )
}

export { Skeleton }

