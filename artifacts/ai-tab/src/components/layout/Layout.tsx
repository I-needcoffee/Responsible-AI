import React from "react";
import { Navbar } from "./Navbar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>
      <footer className="py-8 text-center text-muted-foreground text-sm font-medium border-t border-border mt-12 bg-card/50 backdrop-blur-sm">
        <p>Data compiled from published research. Estimates vary by model and infrastructure.</p>
      </footer>
    </div>
  );
}
