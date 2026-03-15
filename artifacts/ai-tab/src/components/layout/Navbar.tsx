import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Leaf, FileText, Scale, HelpCircle } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Explorer", icon: Leaf },
    { href: "/sources", label: "Sources", icon: FileText },
    { href: "/compare", label: "Compare", icon: Scale },
    { href: "/gaps", label: "Knowledge Gaps", icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl group-hover:rotate-12 transition-transform shadow-sm">
            *
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-foreground">AI Environmental Impact</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 bg-card p-1 rounded-full border border-border shadow-sm">
          {navLinks.map(link => {
            const isActive = location === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
