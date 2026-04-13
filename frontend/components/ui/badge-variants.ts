import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center border-2 border-border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-[2px_2px_0px_0px_var(--border)] font-mono",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
