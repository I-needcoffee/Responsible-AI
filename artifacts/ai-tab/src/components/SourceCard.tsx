import { Source } from "@workspace/api-client-react";
import { ReceiptCard } from "./ui/receipt-card";
import { Badge } from "./ui/badge";
import { ExternalLink, FlaskConical, Building2, Landmark, Newspaper, CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<string, { icon: any; label: string; color: string; trustNote: string }> = {
  academic: {
    icon: FlaskConical,
    label: "Academic / Peer-Reviewed",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    trustNote: "Published in academic journals or conferences. Subject to peer review. Generally most methodologically rigorous.",
  },
  industry: {
    icon: Building2,
    label: "Industry / Corporate",
    color: "bg-amber-50 text-amber-800 border-amber-200",
    trustNote: "Published by companies about their own operations. May have conflicts of interest. Read methodology carefully.",
  },
  government: {
    icon: Landmark,
    label: "Government / Intergovernmental",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    trustNote: "Published by government agencies or international bodies. Broad scope; AI-specific data often estimated.",
  },
  journalism: {
    icon: Newspaper,
    label: "Journalism",
    color: "bg-purple-50 text-purple-800 border-purple-200",
    trustNote: "Secondary reporting on primary research. No original measurements. Useful for context and translation.",
  },
};

const DATA_AVAILABILITY_CONFIG: Record<string, { icon: any; label: string; color: string; description: string }> = {
  full: {
    icon: CheckCircle2,
    label: "Full data disclosed",
    color: "text-emerald-600",
    description: "Specific per-task measurements or clearly documented methodology with reproducible figures.",
  },
  partial: {
    icon: AlertCircle,
    label: "Partial data",
    color: "text-amber-500",
    description: "Some figures available but AI workloads not fully isolated, or methodology relies on estimates.",
  },
  limited: {
    icon: AlertCircle,
    label: "Limited data",
    color: "text-orange-500",
    description: "Aggregate trends without specific per-task or per-query figures.",
  },
  none: {
    icon: XCircle,
    label: "No AI data disclosed",
    color: "text-rose-500",
    description: "Source is included to document non-disclosure — what companies have NOT shared.",
  },
};

const MEASUREMENT_TYPE: Record<string, { score: number; label: string; description: string }> = {
  academic: { score: 4, label: "Direct or modelled", description: "Academic studies measure directly or use transparent modelling." },
  government: { score: 3, label: "Aggregate modelling", description: "Government reports aggregate industry data with transparent methodology." },
  industry: { score: 2, label: "Self-reported", description: "Companies report their own data, which may omit unflattering details." },
  journalism: { score: 1, label: "Secondary reporting", description: "Reports on other studies; no original measurements." },
};

function MeasurementBar({ category }: { category: string }) {
  const config = MEASUREMENT_TYPE[category] || { score: 1, label: "Unknown", description: "" };
  const pct = (config.score / 4) * 100;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Measurement Directness</span>
        <span className="text-xs font-semibold text-foreground">{config.label}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{config.description}</p>
    </div>
  );
}

export function SourceCard({
  source,
  allSources,
}: {
  source: Source;
  allSources?: Source[];
}) {
  const catConfig = CATEGORY_CONFIG[source.category] || {
    icon: HelpCircle,
    label: source.category,
    color: "bg-gray-50 text-gray-700 border-gray-200",
    trustNote: "",
  };
  const CatIcon = catConfig.icon;

  const dataConfig = DATA_AVAILABILITY_CONFIG[source.dataAvailability] || DATA_AVAILABILITY_CONFIG.limited;
  const DataIcon = dataConfig.icon;

  return (
    <ReceiptCard>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border", catConfig.color)}>
            <CatIcon className="w-3 h-3" />
            {catConfig.label}
          </span>
          <span className="text-sm font-bold text-primary px-2.5 py-0.5 bg-primary/10 rounded-full">
            {source.year}
          </span>
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", dataConfig.color)}>
            <DataIcon className="w-3.5 h-3.5" />
            {dataConfig.label}
          </span>
        </div>

        <div>
          <h3 className="font-display text-xl font-bold mb-1.5 text-foreground leading-snug">
            {source.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">
            {source.authors.join(", ")}
          </p>
          <p className="text-sm text-foreground/70 font-semibold">{source.institution}</p>
        </div>

        {/* Findings + Limitations */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="text-sm bg-secondary/5 p-4 rounded-xl border border-secondary/20">
            <span className="font-bold text-secondary block mb-1.5 uppercase text-xs tracking-wider">Key Finding</span>
            <p className="text-foreground/80 leading-relaxed">{source.keyFindings}</p>
          </div>
          <div className="text-sm bg-destructive/5 p-4 rounded-xl border border-destructive/20">
            <span className="font-bold text-destructive block mb-1.5 uppercase text-xs tracking-wider">Limitations</span>
            <p className="text-foreground/80 leading-relaxed">{source.limitations}</p>
          </div>
        </div>

        {/* Data quality + source trust note */}
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50 flex flex-col gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Why this matters for data quality</span>
            <p className="text-xs text-foreground/70 leading-relaxed">{catConfig.trustNote}</p>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            <span className={cn("font-bold", dataConfig.color)}>{dataConfig.label}:</span> {dataConfig.description}
          </div>

          <MeasurementBar category={source.category} />
        </div>

        {/* Methodology + link */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 select-none list-none">
            <span className="group-open:hidden">+ Show methodology</span>
            <span className="hidden group-open:inline">− Hide methodology</span>
          </summary>
          <div className="mt-3 text-sm text-foreground/80 bg-background rounded-xl p-4 border border-border leading-relaxed">
            {source.methodology}
          </div>
        </details>

        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View original source →
        </a>
      </div>
    </ReceiptCard>
  );
}
