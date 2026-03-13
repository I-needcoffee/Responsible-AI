import { cn } from "@/lib/utils";
import React from "react";

export function ReceiptCard({ children, className, highlight = false }: { children: React.ReactNode, className?: string, highlight?: boolean }) {
  return (
    <div className={cn(
      "relative bg-card rounded-2xl p-6 sm:p-8 transition-all duration-300",
      highlight ? "border-2 border-primary shadow-lg shadow-primary/10" : "border-2 border-dashed border-border shadow-sm hover:shadow-md hover:border-muted-foreground/30",
      className
    )}>
      <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-r-2 border-dashed border-border z-10" />
      <div className="absolute -right-[13px] top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-l-2 border-dashed border-border z-10" />
      {children}
    </div>
  );
}
