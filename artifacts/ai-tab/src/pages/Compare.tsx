import { useState, useEffect } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { ReceiptCard } from "@/components/ui/receipt-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Scale } from "lucide-react";

export default function Compare() {
  const { data: tasks, isLoading } = useTasks();
  const [taskAId, setTaskAId] = useState<string>("");
  const [taskBId, setTaskBId] = useState<string>("");

  const safeTasks = tasks || [];

  useEffect(() => {
    if (safeTasks.length >= 2 && !taskAId && !taskBId) {
      setTaskAId(safeTasks[0].id);
      setTaskBId(safeTasks[1].id);
    }
  }, [safeTasks, taskAId, taskBId]);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const taskA = safeTasks.find(t => t.id === taskAId);
  const taskB = safeTasks.find(t => t.id === taskBId);

  const chartData = [
    {
      metric: 'Energy (Wh)',
      [taskA?.name || 'Task A']: taskA?.energyWh?.mid || 0,
      [taskB?.name || 'Task B']: taskB?.energyWh?.mid || 0,
    },
    {
      metric: 'Water (mL)',
      [taskA?.name || 'Task A']: taskA?.waterMl?.mid || 0,
      [taskB?.name || 'Task B']: taskB?.waterMl?.mid || 0,
    },
    {
      metric: 'Carbon (g)',
      [taskA?.name || 'Task A']: taskA?.co2Grams?.mid || 0,
      [taskB?.name || 'Task B']: taskB?.co2Grams?.mid || 0,
    }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 text-secondary mb-4">
          <Scale className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">Comparison Tool</h1>
        <p className="text-lg text-muted-foreground">
          See how different AI queries stack up against each other in terms of resource consumption.
        </p>
      </div>

      <ReceiptCard className="flex flex-col md:flex-row gap-6 items-center z-20">
        <div className="w-full flex-1">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Task A</label>
          <select 
            className="w-full p-3 rounded-xl border-2 border-primary/20 bg-primary/5 focus:outline-none focus:border-primary font-bold text-foreground cursor-pointer"
            value={taskAId}
            onChange={e => setTaskAId(e.target.value)}
          >
            {safeTasks.map(t => <option key={`A-${t.id}`} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        
        <div className="text-xl font-display font-bold text-muted-foreground px-4">VS</div>
        
        <div className="w-full flex-1">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Task B</label>
          <select 
            className="w-full p-3 rounded-xl border-2 border-secondary/20 bg-secondary/5 focus:outline-none focus:border-secondary font-bold text-foreground cursor-pointer"
            value={taskBId}
            onChange={e => setTaskBId(e.target.value)}
          >
            {safeTasks.map(t => <option key={`B-${t.id}`} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </ReceiptCard>

      {taskA && taskB && (
        <div className="bg-card rounded-3xl p-6 md:p-10 border border-border shadow-sm mt-4">
          <h3 className="font-display font-bold text-xl mb-8 text-center text-foreground">
            Estimated Resource Cost per Query
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey={taskA.name} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={60} />
                <Bar dataKey={taskB.name} fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 p-6 bg-muted/30 rounded-2xl border border-border/50">
            <h4 className="font-bold text-sm mb-2 text-foreground">Why do these differ?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Different tasks require vastly different compute architectures. Generating an image requires running a diffusion model for multiple steps, which is extremely GPU intensive. Audio and video generation compound this complexity. Simple text chats, especially on smaller quantized models, are highly optimized and require significantly less energy per token.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
