import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" | "secondary" }) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
      {
        "bg-primary/15 text-primary": variant === "default",
        "border border-border text-foreground": variant === "outline",
        "bg-secondary/20 text-secondary-foreground": variant === "secondary",
      },
      className
    )} {...props} />
  );
}
