import { CloudOff } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-24 h-24 mb-8 bg-muted rounded-full flex items-center justify-center border-4 border-background shadow-sm">
         <CloudOff className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">404 - Page Evaporated</h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8 font-medium">
        Looks like this page was consumed by our server's evaporative cooling systems. Or it just doesn't exist.
      </p>
      <Link href="/">
         <Button size="lg" className="font-bold">Return to Dashboard</Button>
      </Link>
    </div>
  );
}
