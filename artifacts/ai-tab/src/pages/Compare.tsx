import { useState, useEffect } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { ReceiptCard } from "@/components/ui/receipt-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Scale, Zap, Droplets, Cloud, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-orange-100 text-orange-800",
  unknown: "bg-gray-100 text-gray-600",
};

function SingleMetricChart({
  title,
  unit,
  icon: Icon,
  barColor,
  dataKey,
  data,
  taskAName,
  taskBName,
  note,
}: {
  title: string;
  unit: string;
  icon: any;
  barColor: string;
  secondBarColor: string;
  dataKey: (task: any) => { low: number | null; mid: number | null; high: number | null } | null;
  data: { a: any; b: any };
  taskAName: string;
  taskBName: string;
  note?: string;
}) {
  const aEst = data.a ? dataKey(data.a) : null;
  const bEst = data.b ? dataKey(data.b) : null;

  const noData = !aEst?.dataExists && !bEst?.dataExists;
  if (noData) {
    return (
      <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 text-center opacity-60">
        <Icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">No published data for {title.toLowerCase()}</p>
      </div>
    );
  }

  const chartData = [
    {
      name: "Low estimate",
      [taskAName]: aEst?.dataExists ? (aEst?.low ?? 0) : null,
      [taskBName]: bEst?.dataExists ? (bEst?.low ?? 0) : null,
    },
    {
      name: "Mid estimate",
      [taskAName]: aEst?.dataExists ? (aEst?.mid ?? 0) : null,
      [taskBName]: bEst?.dataExists ? (bEst?.mid ?? 0) : null,
    },
    {
      name: "High estimate",
      [taskAName]: aEst?.dataExists ? (aEst?.high ?? 0) : null,
      [taskBName]: bEst?.dataExists ? (bEst?.high ?? 0) : null,
    },
  ];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4" style={{ color: barColor }} />
        <h4 className="font-bold text-base text-foreground">{title}</h4>
        <span className="text-xs font-medium text-muted-foreground ml-1">({unit})</span>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              domain={[0, "auto"]}
              tickCount={5}
              tickFormatter={(v: number) => {
                if (v === 0) return "0";
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
                if (v < 0.01) return v.toExponential(1);
                return parseFloat(v.toPrecision(3)).toString();
              }}
              width={52}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 4px 20px -5px rgba(0,0,0,0.12)",
                padding: "10px 14px",
                fontSize: "12px",
              }}
              formatter={(value: any) =>
                value !== null ? [`${value} ${unit}`, ""] : ["No data", ""]
              }
            />
            <Bar dataKey={taskAName} fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={50} />
            <Bar dataKey={taskBName} fill="hsl(var(--secondary))" radius={[5, 5, 0, 0]} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--primary))" }} />
          {taskAName}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--secondary))" }} />
          {taskBName}
        </div>
      </div>

      {note && (
        <p className="text-xs text-muted-foreground mt-4 border-t border-border/50 pt-3 leading-relaxed">{note}</p>
      )}
    </div>
  );
}

function StatRow({ label, aVal, bVal, unit, aHasData, bHasData }: any) {
  return (
    <div className="flex items-center justify-between text-sm py-3 border-b border-border/50 last:border-0 gap-4">
      <span className="font-medium text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn("flex-1 text-center font-bold", aHasData ? "text-primary" : "text-muted-foreground/50 italic text-xs")}>
        {aHasData ? `${aVal} ${unit}` : "No data"}
      </span>
      <span className="text-muted-foreground/30 shrink-0">vs</span>
      <span className={cn("flex-1 text-center font-bold", bHasData ? "text-secondary" : "text-muted-foreground/50 italic text-xs")}>
        {bHasData ? `${bVal} ${unit}` : "No data"}
      </span>
    </div>
  );
}

export default function Compare() {
  const { data: tasks, isLoading } = useTasks();
  const [taskAId, setTaskAId] = useState<string>("");
  const [taskBId, setTaskBId] = useState<string>("");

  const safeTasks = tasks || [];

  useEffect(() => {
    if (safeTasks.length >= 2 && !taskAId && !taskBId) {
      setTaskAId(safeTasks[0].id);
      setTaskBId(safeTasks[2].id);
    }
  }, [safeTasks]);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const taskA = safeTasks.find((t) => t.id === taskAId);
  const taskB = safeTasks.find((t) => t.id === taskBId);
  const nameA = taskA?.name ?? "Task A";
  const nameB = taskB?.name ?? "Task B";

  const truncate = (s: string, n = 20) => s.length > n ? s.slice(0, n) + "…" : s;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 text-secondary mb-4">
          <Scale className="w-7 h-7" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-3">Comparison Tool</h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Compare the estimated environmental footprint of two AI tasks side by side. Each metric is shown on its own scale — they cannot be compared on a single axis.
        </p>
      </div>

      <ReceiptCard className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full flex-1">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Task A</label>
          <select
            className="w-full p-3 rounded-xl border-2 border-primary/20 bg-primary/5 focus:outline-none focus:border-primary font-semibold text-foreground cursor-pointer text-sm"
            value={taskAId}
            onChange={(e) => setTaskAId(e.target.value)}
          >
            {safeTasks.map((t) => (
              <option key={`A-${t.id}`} value={t.id}>{t.name}</option>
            ))}
          </select>
          {taskA && (
            <div className={cn("mt-2 inline-flex text-xs font-bold px-2 py-0.5 rounded-full", CONFIDENCE_BADGE[taskA.dataConfidence])}>
              {taskA.dataConfidence} confidence data
            </div>
          )}
        </div>

        <div className="text-lg font-display font-bold text-muted-foreground px-4 shrink-0">VS</div>

        <div className="w-full flex-1">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Task B</label>
          <select
            className="w-full p-3 rounded-xl border-2 border-secondary/20 bg-secondary/5 focus:outline-none focus:border-secondary font-semibold text-foreground cursor-pointer text-sm"
            value={taskBId}
            onChange={(e) => setTaskBId(e.target.value)}
          >
            {safeTasks.map((t) => (
              <option key={`B-${t.id}`} value={t.id}>{t.name}</option>
            ))}
          </select>
          {taskB && (
            <div className={cn("mt-2 inline-flex text-xs font-bold px-2 py-0.5 rounded-full", CONFIDENCE_BADGE[taskB.dataConfidence])}>
              {taskB.dataConfidence} confidence data
            </div>
          )}
        </div>
      </ReceiptCard>

      {taskA && taskB && (
        <>
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Why three separate charts?</strong> Energy (Wh), water (mL), and carbon (g CO₂) use completely different units and scales — plotting them together would make the smaller values invisible. Each chart below shows low, mid, and high estimates for both tasks.
            </span>
          </div>

          <div className="flex flex-col gap-5">
            <SingleMetricChart
              title="Energy"
              unit="Wh"
              icon={Zap}
              barColor="#f59e0b"
              secondBarColor="hsl(var(--secondary))"
              dataKey={(t) => t.energyWh}
              data={{ a: taskA, b: taskB }}
              taskAName={truncate(nameA)}
              taskBName={truncate(nameB)}
              note="Watt-hours consumed per query. Based primarily on Luccioni et al. 2023 (direct GPU measurement) and EPRI 2024 for chat models."
            />

            <SingleMetricChart
              title="Water"
              unit="mL"
              icon={Droplets}
              barColor="#3b82f6"
              secondBarColor="hsl(var(--secondary))"
              dataKey={(t) => t.waterMl}
              data={{ a: taskA, b: taskB }}
              taskAName={truncate(nameA)}
              taskBName={truncate(nameB)}
              note="Millilitres of water used for data center cooling. Based on Li et al. 2023 methodology. Water use varies significantly by data center location and cooling system."
            />

            <SingleMetricChart
              title="Carbon"
              unit="g CO₂eq"
              icon={Cloud}
              barColor="#64748b"
              secondBarColor="hsl(var(--secondary))"
              dataKey={(t) => t.co2Grams}
              data={{ a: taskA, b: taskB }}
              taskAName={truncate(nameA)}
              taskBName={truncate(nameB)}
              note="Grams of CO₂ equivalent. Varies 40× depending on whether the data center runs on renewables or fossil fuels (Dodge et al. 2022)."
            />
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Mid-Estimate Summary</h3>
            <StatRow
              label="Energy"
              aVal={taskA.energyWh?.mid ?? "—"}
              bVal={taskB.energyWh?.mid ?? "—"}
              unit="Wh"
              aHasData={taskA.energyWh?.dataExists}
              bHasData={taskB.energyWh?.dataExists}
            />
            <StatRow
              label="Water"
              aVal={taskA.waterMl?.mid ?? "—"}
              bVal={taskB.waterMl?.mid ?? "—"}
              unit="mL"
              aHasData={taskA.waterMl?.dataExists}
              bHasData={taskB.waterMl?.dataExists}
            />
            <StatRow
              label="Carbon"
              aVal={taskA.co2Grams?.mid ?? "—"}
              bVal={taskB.co2Grams?.mid ?? "—"}
              unit="g CO₂eq"
              aHasData={taskA.co2Grams?.dataExists}
              bHasData={taskB.co2Grams?.dataExists}
            />
          </div>
        </>
      )}
    </div>
  );
}
