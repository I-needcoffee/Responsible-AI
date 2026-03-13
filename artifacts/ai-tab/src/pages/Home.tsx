import { useTasks } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/TaskCard";
import { motion } from "framer-motion";
import { Zap, Droplets, Tv, Sparkles } from "lucide-react";

export default function Home() {
  const { data: tasks, isLoading, error } = useTasks();

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
        <p className="text-destructive/80 mt-2">The backend database might not be seeded yet.</p>
      </div>
    );
  }

  const hasTasks = tasks && tasks.length > 0;

  return (
    <div className="flex flex-col gap-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-card rounded-[2rem] p-8 md:p-12 border-2 border-border shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-20 md:opacity-40 pointer-events-none">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-art.png`} 
            alt="Abstract art" 
            className="w-full h-full object-cover mix-blend-multiply" 
          />
        </div>
        
        <div className="flex-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Real-time Estimate
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 leading-[1.1]">
            The true cost of<br/>
            <span className="text-primary">The AI Tab</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-xl font-medium leading-relaxed">
            This dashboard was built using AI vibe coding. Generating the code and text for this exact page cost approximately:
          </p>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-background px-6 py-5 rounded-2xl shadow-sm border border-border flex flex-col gap-1 min-w-[200px]">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Zap className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Energy Used</span>
              </div>
              <span className="text-4xl font-display font-bold text-foreground">14.2 <span className="text-xl text-muted-foreground">Wh</span></span>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-sm font-medium text-foreground/70">
                <Tv className="w-4 h-4 text-muted-foreground" /> ≈ 12 mins of Netflix
              </div>
            </div>
            
            <div className="bg-background px-6 py-5 rounded-2xl shadow-sm border border-border flex flex-col gap-1 min-w-[200px]">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <Droplets className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Water Used</span>
              </div>
              <span className="text-4xl font-display font-bold text-foreground">45 <span className="text-xl text-muted-foreground">mL</span></span>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-sm font-medium text-foreground/70">
                <span>🚰</span> ≈ 2 sec of washing hands
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold">Explore AI Tasks</h2>
            <p className="text-muted-foreground font-medium mt-1">Discover the estimated environmental footprint per query.</p>
          </div>
        </div>

        {hasTasks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <TaskCard task={task} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-border">
            <Leaf className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold font-display">No Data Published</h3>
            <p className="text-muted-foreground">We couldn't find any task data in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
