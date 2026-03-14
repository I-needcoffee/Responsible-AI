import { useState } from "react";
import { AiTask } from "@workspace/api-client-react";
import { ReceiptCard } from "./ui/receipt-card";
import { Badge } from "./ui/badge";
import {
  MessageSquare, ImageIcon, Video, Terminal, Headphones, Search, Cpu,
  Zap, Droplets, Cloud, ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TASK_CATEGORIES: Record<string, { icon: any; color: string; label: string }> = {
  chat: { icon: MessageSquare, color: "bg-sky-100 text-sky-700", label: "Text & Chat" },
  image: { icon: ImageIcon, color: "bg-pink-100 text-pink-700", label: "Image Gen" },
  video: { icon: Video, color: "bg-purple-100 text-purple-700", label: "Video Gen" },
  code: { icon: Terminal, color: "bg-emerald-100 text-emerald-700", label: "Code & Apps" },
  audio: { icon: Headphones, color: "bg-amber-100 text-amber-700", label: "Audio" },
  search: { icon: Search, color: "bg-cyan-100 text-cyan-700", label: "AI Search" },
  training: { icon: Cpu, color: "bg-rose-100 text-rose-700", label: "Model Training" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-orange-50 text-orange-800 border-orange-200",
  unknown: "bg-gray-50 text-gray-600 border-gray-200",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  unknown: "Data unknown",
};

// Standard equivalent computations — same categories across ALL tasks
const EQUIVALENT_CATEGORIES = [
  { id: "streaming", label: "Streaming", icon: "📺" },
  { id: "phone", label: "Phone charge", icon: "📱" },
  { id: "bulb", label: "LED bulb", icon: "💡" },
  { id: "water", label: "Water use", icon: "💧" },
] as const;

type EquivCat = (typeof EQUIVALENT_CATEGORIES)[number]["id"];

function computeEquivalent(cat: EquivCat, energyWh: number | null, waterMl: number | null): string {
  if (cat === "streaming") {
    if (energyWh === null) return "No energy data";
    const mins = energyWh / 0.8;
    return mins < 1 ? `${(mins * 60).toFixed(1)} seconds of HD streaming` : `${mins.toFixed(1)} minutes of HD streaming`;
  }
  if (cat === "phone") {
    if (energyWh === null) return "No energy data";
    const pct = (energyWh / 10) * 100;
    return pct < 0.1 ? `${pct.toFixed(3)}% of a phone charge` : pct < 1 ? `${pct.toFixed(2)}% of a phone charge` : `${pct.toFixed(1)}% of a phone charge`;
  }
  if (cat === "bulb") {
    if (energyWh === null) return "No energy data";
    const secs = (energyWh / 0.008);
    return secs < 60 ? `${secs.toFixed(0)} seconds of an LED bulb on` : `${(secs / 60).toFixed(1)} minutes of an LED bulb on`;
  }
  if (cat === "water") {
    if (waterMl === null) return "No water data";
    if (waterMl < 1) return `${(waterMl * 1000).toFixed(1)} µL (fraction of a drop)`;
    if (waterMl < 110) return `${waterMl.toFixed(0)} mL — ${(waterMl / 3.5).toFixed(0)}% of a single handwash`;
    if (waterMl < 1000) return `${waterMl.toFixed(0)} mL — about ${(waterMl / 110).toFixed(1)} handwashes`;
    return `${(waterMl / 1000).toFixed(1)} L — about ${(waterMl / 110).toFixed(0)} handwashes`;
  }
  return "—";
}

function formatRange(estimate: { low: number | null; mid: number | null; high: number | null; unit: string; dataExists: boolean } | null) {
  if (!estimate || !estimate.dataExists) return null;
  const { low, mid, high, unit } = estimate;
  if (mid !== null) {
    const lo = low !== null ? formatNum(low) : null;
    const hi = high !== null ? formatNum(high) : null;
    return {
      mid: `${formatNum(mid)} ${unit}`,
      range: lo && hi ? `${lo}–${hi} ${unit}` : null,
    };
  }
  if (low !== null && high !== null) {
    return { mid: `${formatNum(low)}–${formatNum(high)} ${unit}`, range: null };
  }
  return null;
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (n < 0.00001) return n.toExponential(1);
  if (n < 0.1) return parseFloat(n.toPrecision(3)).toString();
  if (n < 1) return parseFloat(n.toPrecision(3)).toString();
  if (n < 10) return n.toFixed(2);
  if (n < 1000) return n.toFixed(1);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function MetricRow({
  label, estimate, icon: Icon, iconClass,
}: {
  label: string;
  estimate: any;
  icon: any;
  iconClass: string;
}) {
  const formatted = formatRange(estimate);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", iconClass)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-14 flex-shrink-0">{label}</span>
      {formatted ? (
        <div className="flex-1 min-w-0">
          <span className="font-display font-bold text-sm text-foreground">{formatted.mid}</span>
          {formatted.range && (
            <span className="text-xs text-muted-foreground ml-2 font-medium">range: {formatted.range}</span>
          )}
        </div>
      ) : (
        <span className="flex-1 text-xs italic text-muted-foreground/60">No published data</span>
      )}
    </div>
  );
}

export function TaskCard({ task }: { task: AiTask }) {
  const [expanded, setExpanded] = useState(false);
  const [equivCat, setEquivCat] = useState<EquivCat>("streaming");

  const cat = TASK_CATEGORIES[task.category] || { icon: MessageSquare, color: "bg-muted text-foreground", label: "Other" };
  const CatIcon = cat.icon;

  const energyMid = task.energyWh?.dataExists ? (task.energyWh?.mid ?? null) : null;
  const waterMid = task.waterMl?.dataExists ? (task.waterMl?.mid ?? null) : null;

  const equivText = computeEquivalent(equivCat, energyMid, waterMid);

  return (
    <ReceiptCard className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("p-2 rounded-xl flex-shrink-0", cat.color)}>
            <CatIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-base leading-tight text-foreground line-clamp-2">{task.name}</h3>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{cat.label}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("capitalize text-xs flex-shrink-0 whitespace-nowrap", CONFIDENCE_COLORS[task.dataConfidence])}
        >
          {CONFIDENCE_LABEL[task.dataConfidence] ?? task.dataConfidence}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground/75 leading-relaxed mb-4 line-clamp-3">{task.description}</p>

      {/* Metrics */}
      <div className="bg-muted/20 rounded-xl p-3 mb-4 border border-border/40">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Estimated per query</p>
        <MetricRow label="Energy" estimate={task.energyWh} icon={Zap} iconClass="bg-amber-100 text-amber-600" />
        <MetricRow label="Water" estimate={task.waterMl} icon={Droplets} iconClass="bg-blue-100 text-blue-600" />
        <MetricRow label="Carbon" estimate={task.co2Grams} icon={Cloud} iconClass="bg-slate-100 text-slate-600" />
      </div>

      {/* Equivalent switcher */}
      <div className="mb-4">
        <div className="flex gap-1.5 flex-wrap mb-2">
          {EQUIVALENT_CATEGORIES.map((ec) => (
            <button
              key={ec.id}
              onClick={() => setEquivCat(ec.id)}
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full border transition-all",
                equivCat === ec.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {ec.icon} {ec.label}
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-foreground/80 bg-background rounded-xl px-3 py-2.5 border border-border/50 leading-snug">
          {equivText}
        </p>
      </div>

      {/* Source attribution toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mt-auto"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Based on {task.sourceIds?.length ?? 0} source{(task.sourceIds?.length ?? 0) !== 1 ? "s" : ""}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-muted/20 rounded-xl border border-border/40">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Source IDs for this estimate:</p>
          <div className="flex flex-wrap gap-1.5">
            {task.sourceIds?.map((id) => (
              <span key={id} className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border text-foreground/70">
                {id}
              </span>
            ))}
          </div>
          {task.notes && (
            <p className="text-xs text-foreground/70 mt-3 leading-relaxed border-t border-border/40 pt-2">{task.notes}</p>
          )}
        </div>
      )}
    </ReceiptCard>
  );
}
