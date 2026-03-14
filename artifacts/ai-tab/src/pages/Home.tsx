import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/TaskCard";
import { motion } from "framer-motion";
import { Zap, Droplets, Tv, Sparkles, Info, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS = [
  { id: "all", label: "All tasks" },
  { id: "chat", label: "Chat" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "code", label: "Code" },
  { id: "audio", label: "Audio" },
  { id: "search", label: "Search" },
  { id: "training", label: "Training" },
];

export default function Home() {
  const { data: tasks, isLoading, error } = useTasks();
  const [activeFilter, setActiveFilter] = useState("all");

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-primary">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="font-display font-bold text-lg animate-pulse">Running the numbers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-destructive/5 rounded-3xl border border-destructive/20">
        <p className="text-destructive font-bold text-xl">Failed to load AI tasks.</p>
        <p className="text-destructive/80 mt-2">Could not reach the backend API.</p>
      </div>
    );
  }

  const safeTasks = tasks ?? [];
  const filtered = activeFilter === "all" ? safeTasks : safeTasks.filter((t) => t.category === activeFilter);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero hook */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-card rounded-[2rem] p-8 md:p-10 border-2 border-border shadow-sm"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-5">
          <Sparkles className="w-3.5 h-3.5" /> Built with AI · Real estimates
        </div>

        <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3 leading-[1.1]">
          The true cost of<br />
          <span className="text-primary">The AI Tab</span>
        </h1>

        <p className="text-base md:text-lg text-foreground/75 mb-2 max-w-xl font-medium leading-relaxed">
          This dashboard was built using AI vibe coding with Replit Agent. Generating the code, text, and structure for this page cost approximately:
        </p>

        <p className="text-xs text-muted-foreground mb-6 max-w-xl leading-relaxed">
          Estimate based on app-building session data from Luccioni et al. 2023 + EPRI 2024 · Low/high range: 10–200 Wh energy, 500–10,000 mL water
        </p>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-background px-5 py-4 rounded-2xl shadow-sm border border-border flex flex-col gap-1 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Energy Used</span>
            </div>
            <span className="text-3xl font-display font-bold text-foreground">
              ~50 <span className="text-lg text-muted-foreground">Wh</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1.5 pt-2 border-t border-border/50 text-xs font-medium text-foreground/65">
              <Tv className="w-3.5 h-3.5 text-muted-foreground" /> ≈ 60 mins of HD streaming
            </div>
          </div>

          <div className="bg-background px-5 py-4 rounded-2xl shadow-sm border border-border flex flex-col gap-1 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Water Used</span>
            </div>
            <span className="text-3xl font-display font-bold text-foreground">
              ~2.5 <span className="text-lg text-muted-foreground">L</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1.5 pt-2 border-t border-border/50 text-xs font-medium text-foreground/65">
              <span>🤲</span> ≈ 23 handwashes worth
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl max-w-xl">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>These are estimates with high uncertainty.</strong> No study has directly measured an agentic coding session like this one. Figures derived by aggregating per-query estimates from published studies.
          </p>
        </div>
      </motion.div>

      {/* Explorer section */}
      <div>
        <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-display font-bold">Explore AI Tasks</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Estimated environmental footprint per query. All figures show a low–mid–high range. Confidence level reflects how directly the underlying studies measured each task type.
            </p>
          </div>
        </div>

        {/* Data attribution note */}
        <div className="flex items-start gap-2 p-3 bg-muted/30 border border-border/50 rounded-xl mb-5 mt-3">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Data sourced from: <strong>Luccioni et al. 2023</strong> (direct GPU measurement, 88 models), <strong>EPRI 2024</strong> (per-query estimates for ChatGPT), <strong>Li et al. 2023</strong> (water modelling), <strong>Fernandez et al. 2025</strong> (video generation). Expand any card to see which specific sources were used.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                activeFilter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
              >
                <TaskCard task={task} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-3xl border-2 border-dashed border-border">
            <p className="font-display font-bold text-foreground">No tasks in this category</p>
            <p className="text-sm text-muted-foreground mt-1">Try selecting a different filter above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
