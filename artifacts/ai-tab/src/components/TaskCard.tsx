import { AiTask } from "@workspace/api-client-react";
import { ReceiptCard } from "./ui/receipt-card";
import { Badge } from "./ui/badge";
import { MessageSquare, ImageIcon, Video, Terminal, Headphones, Search, Cpu, Zap, Droplets, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

const TASK_CATEGORIES: Record<string, { icon: any, color: string, label: string }> = {
  chat: { icon: MessageSquare, color: "bg-[#e0f2fe] text-[#0369a1]", label: "Text & Chat" },
  image: { icon: ImageIcon, color: "bg-[#fce7f3] text-[#be185d]", label: "Image Gen" },
  video: { icon: Video, color: "bg-[#f3e8ff] text-[#7e22ce]", label: "Video Gen" },
  code: { icon: Terminal, color: "bg-[#d1fae5] text-[#047857]", label: "Code & Apps" },
  audio: { icon: Headphones, color: "bg-[#fef3c7] text-[#b45309]", label: "Audio Gen" },
  search: { icon: Search, color: "bg-[#cffafe] text-[#0f766e]", label: "AI Search" },
  training: { icon: Cpu, color: "bg-[#fee2e2] text-[#be123c]", label: "Model Training" }
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-[#d1fae5] text-[#047857] border-[#a7f3d0]",
  medium: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
  low: "bg-[#ffedd5] text-[#c2410c] border-[#fed7aa]",
  unknown: "bg-muted text-muted-foreground border-border",
};

function MetricBox({ label, estimate, icon: Icon, colorClass }: any) {
  if (!estimate || !estimate.dataExists) {
    return (
      <div className="bg-muted/30 rounded-xl p-3 flex flex-col gap-1 border border-border/50 opacity-60 grayscale">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Unavailable</span>
      </div>
    );
  }

  const val = estimate.mid ? estimate.mid : `${estimate.low || 0}-${estimate.high || 0}`;

  return (
    <div className="bg-background rounded-xl p-3 flex flex-col gap-1 border border-border shadow-sm hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className={cn("w-4 h-4", colorClass)} />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display font-bold text-xl text-foreground">{val}</span>
        <span className="text-xs font-medium text-muted-foreground">{estimate.unit}</span>
      </div>
    </div>
  );
}

export function TaskCard({ task }: { task: AiTask }) {
  const cat = TASK_CATEGORIES[task.category] || { icon: HelpCircle, color: "bg-muted text-foreground", label: "Other" };

  return (
    <ReceiptCard className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl shadow-sm border border-border/50", cat.color)}>
            <cat.icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">{task.name}</h3>
            <p className="text-sm font-medium text-muted-foreground">{cat.label}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("capitalize", CONFIDENCE_COLORS[task.dataConfidence])}>
          {task.dataConfidence}
        </Badge>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed mb-6 flex-1">
        {task.description}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <MetricBox label="Energy" estimate={task.energyWh} icon={Zap} colorClass="text-amber-500" />
        <MetricBox label="Water" estimate={task.waterMl} icon={Droplets} colorClass="text-blue-500" />
        <MetricBox label="Carbon" estimate={task.co2Grams} icon={Cloud} colorClass="text-slate-500" />
      </div>

      {(task.equivalents && task.equivalents.length > 0) && (
        <div className="mt-auto pt-4 border-t border-dashed border-border/80">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Real World Equivalents</h4>
          <div className="flex flex-col gap-2.5">
            {task.equivalents.map((eq, i) => (
              <div key={i} className="flex items-center gap-3 text-sm bg-muted/30 p-2 rounded-lg">
                <span className="text-xl bg-card rounded-md w-8 h-8 flex items-center justify-center shadow-sm border border-border/50">
                  {eq.icon}
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">{eq.duration}</span>
                  <span className="text-muted-foreground text-xs">{eq.activity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ReceiptCard>
  );
}
