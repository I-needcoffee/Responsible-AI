import { useState, useRef, type ReactNode } from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ErrorBar,
} from "recharts";
import { useSources } from "@/hooks/use-sources";
import { ChevronDown, X, ExternalLink, ChevronRight, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  label: string;
  mainSentence: string;
  equivSentence: string;
  clarifying: string;
  energyWh: number;
  energyLow: number;
  energyHigh: number;
  waterMl: number;
  waterLow: number;
  waterHigh: number;
  chartLabel: string;
  confidence: "high" | "medium" | "low";
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "short-chat",
    label: "short chat",
    mainSentence: "Sending **a short chat message** used **0.003 Wh** of energy and **10 mL** of water.",
    equivSentence: "That's about **1 second of an LED bulb** and **2 teaspoons of water**.",
    clarifying: "One short message to an AI assistant (1–10 words). A low-impact task individually — but billions happen daily. AI companies don't publicly report per-query energy use, so all estimates carry uncertainty.",
    energyWh: 0.003, energyLow: 0.001, energyHigh: 0.01,
    waterMl: 10, waterLow: 1, waterHigh: 50,
    chartLabel: "Short chat", confidence: "medium",
  },
  {
    id: "long-chat",
    label: "long chat",
    mainSentence: "Having **a long AI conversation** used **0.3 Wh** of energy and **500 mL** of water.",
    equivSentence: "That's about **22 minutes of an LED bulb** and **5 handwashes**.",
    clarifying: "A 20–50 message back-and-forth session — typical for writing help, research, or brainstorming. The water figure comes from a 2023 academic study that directly estimated how much water AI conversations consume.",
    energyWh: 0.3, energyLow: 0.05, energyHigh: 1.0,
    waterMl: 500, waterLow: 100, waterHigh: 2000,
    chartLabel: "Long chat", confidence: "medium",
  },
  {
    id: "image",
    label: "image",
    mainSentence: "Generating **an AI image** used **2.4 Wh** of energy and **200 mL** of water.",
    equivSentence: "That's about **3 minutes of Netflix** and **2 handwashes**.",
    clarifying: "A single image from an AI model (like Midjourney or DALL·E). This is one of the better-measured AI tasks — researchers directly instrumented the hardware to record real energy use.",
    energyWh: 2.4, energyLow: 0.5, energyHigh: 6.5,
    waterMl: 200, waterLow: 50, waterHigh: 600,
    chartLabel: "Image gen", confidence: "high",
  },
  {
    id: "video",
    label: "video",
    mainSentence: "Generating **a short AI video** used **944 Wh** of energy and **20 L** of water.",
    equivSentence: "That's about **20 hours of Netflix** and **182 handwashes**.",
    clarifying: "A 5–15 second video clip from an AI video model (like Sora or Runway). This is among the most resource-intensive things a person can ask AI to do — similar to running a laptop non-stop for 9 hours.",
    energyWh: 944, energyLow: 200, energyHigh: 2500,
    waterMl: 20000, waterLow: 5000, waterHigh: 70000,
    chartLabel: "Video gen", confidence: "medium",
  },
  {
    id: "coding",
    label: "coding",
    mainSentence: "Getting **100 lines of AI code suggestions** used **0.1 Wh** of energy and **300 mL** of water.",
    equivSentence: "That's about **36 seconds of an LED bulb** and **3 teaspoons of water**.",
    clarifying: "100 individual code completions or autocomplete suggestions during a development session — a realistic amount for a focused hour of coding. Each suggestion is a small, efficient AI call. Cumulative use across a full workday adds up significantly.",
    energyWh: 0.1, energyLow: 0.01, energyHigh: 0.5,
    waterMl: 300, waterLow: 50, waterHigh: 1500,
    chartLabel: "100 code suggestions", confidence: "low",
  },
  {
    id: "app-build",
    label: "app build",
    mainSentence: "Vibe coding **a simple app** used **50 Wh** of energy and **2.5 L** of water.",
    equivSentence: "That's about **60 minutes of Netflix** and **23 handwashes**.",
    clarifying: "A 1–2 hour session building an app with AI assistance — many rounds of code generation, debugging, and iteration. This is a rough estimate with wide uncertainty; sessions vary enormously by model complexity and session length.",
    energyWh: 50, energyLow: 10, energyHigh: 200,
    waterMl: 2500, waterLow: 500, waterHigh: 10000,
    chartLabel: "App build", confidence: "low",
  },
  {
    id: "training-llm",
    label: "training LLM",
    mainSentence: "Training **a large language model** used **1.287 GWh** of energy and **700,000 L** of water.",
    equivSentence: "That's about **122 homes powered for a year** and **1,750 bathtubs full of water**.",
    clarifying: "Training a model at the scale of GPT-3 (175 billion parameters). This is a one-time event, not ongoing — but the numbers are enormous. For newer frontier models, the true figure is likely far higher and is not publicly disclosed by any company.",
    energyWh: 1287000000, energyLow: 500000000, energyHigh: 5000000000,
    waterMl: 700000000, waterLow: 100000000, waterHigh: 2000000000,
    chartLabel: "Train LLM", confidence: "medium",
  },
  {
    id: "audio-transcript",
    label: "audio transcript",
    mainSentence: "Transcribing **1 minute of audio** used **0.002 Wh** of energy and **2 mL** of water.",
    equivSentence: "That's about **1 second of an LED bulb** and **40 drops of water**.",
    clarifying: "Transcribing 1 minute of audio using an AI speech-to-text model (like Whisper). One of the lower-impact AI tasks. Limited direct measurement data exists for this category, so confidence in the estimate is low.",
    energyWh: 0.002, energyLow: 0.001, energyHigh: 0.01,
    waterMl: 2, waterLow: 1, waterHigh: 10,
    chartLabel: "Audio transcript", confidence: "low",
  },
];

// ─── CUSTOM CALCULATOR TASKS ─────────────────────────────────────────────────

const CUSTOM_TASKS = [
  { id: "chat", label: "Short chat messages", unitEnergyWh: 0.003, unitWaterMl: 10, min: 0, max: 1000, step: 1, defaultVal: 10 },
  { id: "longchat", label: "Long conversations", unitEnergyWh: 0.3, unitWaterMl: 500, min: 0, max: 100, step: 1, defaultVal: 0 },
  { id: "image", label: "AI images generated", unitEnergyWh: 2.4, unitWaterMl: 200, min: 0, max: 200, step: 1, defaultVal: 0 },
  { id: "video", label: "AI video clips (5–15 sec)", unitEnergyWh: 944, unitWaterMl: 20000, min: 0, max: 20, step: 1, defaultVal: 0 },
  { id: "code", label: "Code suggestions (100-line batches)", unitEnergyWh: 0.1, unitWaterMl: 300, min: 0, max: 500, step: 10, defaultVal: 0 },
  { id: "app", label: "App build sessions", unitEnergyWh: 50, unitWaterMl: 2500, min: 0, max: 10, step: 1, defaultVal: 0 },
];

// ─── OFFSET ACTIONS ──────────────────────────────────────────────────────────

const ENERGY_OFFSETS = [
  { id: "light", label: "Turn off a 10W LED bulb", unitLabel: "hours", whPerUnit: 10 },
  { id: "ac", label: "Skip 1 hour of air conditioning", unitLabel: "hours", whPerUnit: 3500 },
  { id: "laundry", label: "Air-dry laundry instead of tumble dryer", unitLabel: "loads", whPerUnit: 2400 },
  { id: "walk", label: "Walk instead of drive", unitLabel: "km", whPerUnit: 200 },
  { id: "laptop", label: "Turn off a laptop", unitLabel: "hours", whPerUnit: 45 },
];

const WATER_OFFSETS = [
  { id: "shower", label: "Take a shorter shower", unitLabel: "minutes shorter", mlPerUnit: 8000 },
  { id: "flush", label: "Skip a toilet flush", unitLabel: "flushes", mlPerUnit: 9000 },
  { id: "dishwasher", label: "Run dishwasher vs. hand-washing", unitLabel: "loads", mlPerUnit: 50000 },
  { id: "tap", label: "Turn off tap while brushing teeth", unitLabel: "times", mlPerUnit: 2000 },
];

const TRUSTED_LINKS = [
  { name: "Arcadia", url: "https://arcadia.com", desc: "Switch your home to clean energy" },
  { name: "Wren", url: "https://www.wren.co", desc: "Monthly carbon offset subscription" },
  { name: "TerraPass", url: "https://www.terrapass.com", desc: "Carbon offsets and renewable energy credits" },
  { name: "EPA WaterSense", url: "https://www.epa.gov/watersense", desc: "Water efficiency programs" },
  { name: "Water Calculator", url: "https://www.watercalculator.org", desc: "Calculate your personal water footprint" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtEnergy(wh: number): string {
  if (wh < 0.001) return `${(wh * 1000000).toFixed(1)} µWh`;
  if (wh < 1) return `${(wh * 1000).toFixed(1)} mWh`;
  if (wh >= 1e9) return `${(wh / 1e9).toFixed(3)} GWh`;
  if (wh >= 1e6) return `${(wh / 1e6).toFixed(1)} MWh`;
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`;
  return `${wh} Wh`;
}

function fmtWater(ml: number): string {
  if (ml < 1) return `< 1 mL`;
  if (ml >= 1e6) return `${(ml / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} L`;
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${Math.round(ml)} mL`;
}

function fmtOffset(amount: number, unitLabel: string): string {
  if (amount < 0.01) return `less than 1 ${unitLabel.split(" ")[0]}`;
  if (amount < 1) return `${amount.toFixed(2)} ${unitLabel}`;
  if (amount < 100) return `${(Math.round(amount * 10) / 10).toLocaleString()} ${unitLabel}`;
  return `${Math.round(amount).toLocaleString()} ${unitLabel}`;
}

function fmtChartVal(v: number): string {
  if (v === 0) return "0";
  if (v < 0.001) return v.toExponential(1);
  if (v < 1) return v.toFixed(3);
  if (v < 1000) return (Math.round(v * 10) / 10).toString();
  if (v < 1e6) return `${(v / 1000).toFixed(1)}k`;
  if (v < 1e9) return `${(v / 1e6).toFixed(1)}M`;
  return `${(v / 1e9).toFixed(2)}B`;
}

type ChartMetric = "energy" | "water";
type ChartUnit = "raw" | "equiv1" | "equiv2";

function getChartValue(s: Scenario, metric: ChartMetric, unit: ChartUnit): number {
  if (metric === "energy") {
    const wh = s.energyWh;
    if (unit === "raw") return wh;
    if (unit === "equiv1") return wh / 0.8;
    if (unit === "equiv2") return wh / 10;
  } else {
    const ml = s.waterMl;
    if (unit === "raw") return ml;
    if (unit === "equiv1") return ml / 110;
    if (unit === "equiv2") return ml / 500;
  }
  return 0;
}

function getChartValueRaw(energyWh: number, waterMl: number, metric: ChartMetric, unit: ChartUnit): number {
  return getChartValue({ energyWh, waterMl } as Scenario, metric, unit);
}

function getUnitLabel(metric: ChartMetric, unit: ChartUnit): string {
  if (metric === "energy") {
    if (unit === "raw") return "Wh";
    if (unit === "equiv1") return "mins of Netflix streaming";
    if (unit === "equiv2") return "hrs of LED bulb (10W)";
  } else {
    if (unit === "raw") return "mL";
    if (unit === "equiv1") return "handwashes (110 mL each)";
    if (unit === "equiv2") return "500 mL water bottles";
  }
  return "";
}

// ─── SENTENCE RENDERER ───────────────────────────────────────────────────────

function parseBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p) =>
    p.startsWith("**") && p.endsWith("**")
      ? { text: p.slice(2, -2), fill: true }
      : { text: p, fill: false }
  );
}

function SentenceText({ text, sizeClass }: { text: string; sizeClass?: string }) {
  const parts = parseBold(text);
  return (
    <span className={sizeClass ?? ""}>
      {parts.map((p, i) =>
        p.fill ? (
          <strong
            key={i}
            className="font-bold"
            style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}
          >
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  );
}

// ─── CUSTOM CALCULATOR ───────────────────────────────────────────────────────

function CustomCalculator() {
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(CUSTOM_TASKS.map((t) => [t.id, t.defaultVal]))
  );

  const totalEnergyWh = CUSTOM_TASKS.reduce((sum, t) => sum + (counts[t.id] ?? 0) * t.unitEnergyWh, 0);
  const totalWaterMl = CUSTOM_TASKS.reduce((sum, t) => sum + (counts[t.id] ?? 0) * t.unitWaterMl, 0);

  const netflixMins = totalEnergyWh / 0.8;
  const handwashes = totalWaterMl / 110;

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-3">
        {CUSTOM_TASKS.map((task) => (
          <div key={task.id} className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-48 shrink-0 leading-tight">{task.label}</label>
            <input
              type="range"
              min={task.min}
              max={task.max}
              step={task.step}
              value={counts[task.id] ?? 0}
              onChange={(e) => setCounts((c) => ({ ...c, [task.id]: Number(e.target.value) }))}
              className="flex-1 accent-black"
            />
            <span className="text-sm text-black font-medium w-10 text-right tabular-nums">
              {counts[task.id] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div
        className="border-t border-gray-200 pt-5 flex flex-col gap-2"
        style={{ fontFamily: "'Anthropic Serif', serif" }}
      >
        {totalEnergyWh === 0 ? (
          <p className="text-gray-400 text-base italic">Adjust the sliders above to see your usage.</p>
        ) : (
          <>
            <p className="text-[1.3rem] leading-[1.85] text-black">
              Your custom session used{" "}
              <strong style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}>
                {fmtEnergy(totalEnergyWh)}
              </strong>{" "}
              of energy and{" "}
              <strong style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}>
                {fmtWater(totalWaterMl)}
              </strong>{" "}
              of water.
            </p>
            <p className="text-base text-gray-500" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>
              That's about{" "}
              <strong style={{ borderBottom: "1.5px solid currentColor" }}>
                {netflixMins < 1
                  ? `${Math.round(netflixMins * 60)} seconds of Netflix`
                  : netflixMins < 60
                  ? `${Math.round(netflixMins)} minutes of Netflix`
                  : `${(netflixMins / 60).toFixed(1)} hours of Netflix`}
              </strong>{" "}
              and{" "}
              <strong style={{ borderBottom: "1.5px solid currentColor" }}>
                {handwashes < 1
                  ? `${Math.round(handwashes * 110)} mL of water (${(handwashes * 110).toFixed(0)} drops)`
                  : `${Math.round(handwashes)} handwashes`}
              </strong>
              .
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {CUSTOM_TASKS.filter((t) => (counts[t.id] ?? 0) > 0).map((t) => (
                <div key={t.id} className="flex justify-between text-xs text-gray-400">
                  <span>{counts[t.id]} × {t.label}</span>
                  <span>
                    {fmtEnergy((counts[t.id] ?? 0) * t.unitEnergyWh)} · {fmtWater((counts[t.id] ?? 0) * t.unitWaterMl)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL WRAPPER ───────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col z-10"
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X size={16} className="text-gray-400" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

// ─── COMBINED SOURCES + GAPS MODAL ───────────────────────────────────────────

function SourcesGapsModal() {
  const { data: sources, isLoading } = useSources();
  const [tab, setTab] = useState<"methodology" | "sources" | "gaps">("methodology");

  return (
    <>
      <div className="px-7 pt-7 pb-0 border-b border-gray-100 shrink-0">
        <h2 className="text-base font-semibold text-black mb-4">Sources & Methodology</h2>
        <div className="flex gap-0 border-b border-gray-100">
          {(["methodology", "sources", "gaps"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "text-xs px-4 py-2 border-b-2 transition-colors capitalize -mb-[1px]",
                tab === t
                  ? "border-black text-black font-medium"
                  : "border-transparent text-gray-400 hover:text-gray-600",
              ].join(" ")}
            >
              {t === "gaps" ? "Knowledge Gaps" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-7 py-6 text-sm leading-relaxed">

        {/* ── METHODOLOGY TAB ── */}
        {tab === "methodology" && (
          <div className="flex flex-col gap-6 text-gray-700">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">Overview</p>
              <p>
                The estimates presented here are derived from peer-reviewed academic research, government energy reports, and
                industry analyses published between 2019 and 2025. Where direct measurement data exists, it is used. Where it
                does not, estimates are extrapolated from related published figures and clearly labelled as such.
              </p>
              <p className="mt-3 italic text-gray-500 text-xs">
                No figures in this tool are invented or hallucinated. Every number traces to a citable source. Where data
                simply does not exist, that absence is stated explicitly.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">How Energy Is Estimated</p>
              <p>
                AI energy consumption is typically estimated through one of three methods, each with different reliability:
              </p>
              <ul className="mt-3 flex flex-col gap-3 ml-4">
                <li className="list-disc">
                  <strong className="text-black">Direct hardware measurement</strong> — Researchers instrument the GPUs or
                  servers during task execution and record actual power draw. This is the most reliable method. It is also
                  rare, because it requires physical access to AI infrastructure, which is not granted to independent
                  researchers by major AI companies. The primary source using this method is{" "}
                  <span className="italic">Luccioni et al. 2023</span>, which measured energy draw for open-source models
                  running on research hardware.
                </li>
                <li className="list-disc">
                  <strong className="text-black">Proxy estimation from hardware benchmarks</strong> — Published GPU
                  specifications and estimated compute-per-task are combined with known data center Power Usage Effectiveness
                  (PUE) ratios to derive an energy figure. The EPRI 2024 estimate of ~2.9 Wh per ChatGPT query uses this
                  approach. Reliability depends on accuracy of the underlying compute assumptions.
                </li>
                <li className="list-disc">
                  <strong className="text-black">Top-down scaling from aggregate data</strong> — Total data center
                  electricity consumption (available from utility filings and corporate ESG reports) is divided by
                  estimated query volumes to derive per-task figures. Goldman Sachs 2024 uses this approach. Reliability
                  is lowest because query volume assumptions are unverified.
                </li>
              </ul>
              <p className="mt-3 text-xs italic text-gray-500">
                All values presented are mid-range ("best estimate") figures unless otherwise noted. Low and high bounds
                shown in charts represent the plausible range from published source data, not statistical confidence intervals.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">How Water Is Estimated</p>
              <p>
                Water consumption estimates are primarily derived from{" "}
                <span className="italic">Li et al. 2023 (Making AI Less Thirsty)</span>, which developed a methodology
                for computing AI water footprint based on data center Water Use Effectiveness (WUE) metrics.
              </p>
              <p className="mt-3">
                WUE is measured in litres of water consumed per kilowatt-hour of IT equipment energy. It varies
                dramatically:
              </p>
              <ul className="mt-2 flex flex-col gap-2 ml-4">
                <li className="list-disc">
                  Cold-climate data centers using free air cooling: near <strong>0 L/kWh</strong>
                </li>
                <li className="list-disc">
                  Typical US data center with evaporative cooling: roughly <strong>0.5–1.8 L/kWh</strong>
                </li>
                <li className="list-disc">
                  Hot-climate facilities with heavy cooling loads: up to <strong>2.5+ L/kWh</strong>
                </li>
              </ul>
              <p className="mt-3">
                A mid-range WUE of ~0.5 L/kWh is applied throughout unless source-specific data is available (as it is
                for the long conversation task, where Li et al. directly estimated 500 mL per 20–50 exchange session).
              </p>
              <p className="mt-3 text-xs italic text-gray-500">
                Water figures are inherently less reliable than energy figures because no AI company publicly discloses
                per-query water consumption, and WUE depends on server location and time of year — neither of which is
                disclosed at the query level.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">What Is Not Included</p>
              <ul className="flex flex-col gap-2 ml-4">
                <li className="list-disc">
                  <strong className="text-black">Embodied carbon (Scope 3)</strong> — Manufacturing GPUs, servers, and
                  data center buildings. This can represent 50–80% of total lifecycle impact but is excluded from all
                  published inference estimates.
                </li>
                <li className="list-disc">
                  <strong className="text-black">Network transmission energy</strong> — Sending data from your device to
                  the data center and back. Generally small relative to inference energy, but not zero.
                </li>
                <li className="list-disc">
                  <strong className="text-black">End-user device energy</strong> — The energy your phone, laptop, or
                  computer uses to display and send the query. Not included in AI-specific estimates.
                </li>
                <li className="list-disc">
                  <strong className="text-black">Carbon intensity of electricity</strong> — Energy figures are given in
                  Wh, not CO₂-equivalent. Carbon impact depends on the energy mix of each data center's local grid,
                  which can vary by 40× between regions.
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">Confidence Levels</p>
              <p>Each task is assigned a confidence level reflecting the quality of underlying data:</p>
              <ul className="mt-3 flex flex-col gap-2 ml-4">
                <li className="list-disc">
                  <strong className="text-black">High</strong> — Direct measurement data from peer-reviewed research.
                  (Currently: AI image generation, via Luccioni et al. 2023)
                </li>
                <li className="list-disc">
                  <strong className="text-black">Medium</strong> — Modelled estimates with reasonable proxy data or
                  partial empirical backing. (Short/long chat, video generation, LLM training)
                </li>
                <li className="list-disc">
                  <strong className="text-black">Low</strong> — Extrapolated from indirect figures or very limited
                  source data. Should be treated as order-of-magnitude estimates only. (Code suggestions, app builds,
                  audio transcription)
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ── SOURCES TAB ── */}
        {tab === "sources" && (
          <div className="flex flex-col gap-6">
            {isLoading && <p className="text-xs text-gray-400 italic">Loading sources…</p>}
            {(sources || []).map((s) => (
              <div key={s.id} className="border-b border-gray-100 pb-6 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-black text-sm leading-snug">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Array.isArray(s.authors) ? s.authors.join(", ") : s.authors} ·{" "}
                      {s.institution} · {s.year}
                    </p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-gray-300 hover:text-black transition-colors mt-0.5"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                {s.methodology && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-1">Methodology</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.methodology}</p>
                  </div>
                )}
                {s.keyFindings && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-1">Key Findings</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.keyFindings}</p>
                  </div>
                )}
                {s.limitations && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-1">Limitations</p>
                    <p className="text-xs text-gray-600 leading-relaxed italic">{s.limitations}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <span className={[
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    s.dataAvailability === "partial"
                      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : s.dataAvailability === "full"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-gray-100 text-gray-500",
                  ].join(" ")}>
                    {s.dataAvailability === "partial" ? "Partial data disclosure"
                      : s.dataAvailability === "full" ? "Full data available"
                      : "Data not available"}
                  </span>
                  <span className="text-[10px] text-gray-300 capitalize">
                    {s.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── KNOWLEDGE GAPS TAB ── */}
        {tab === "gaps" && (
          <div className="flex flex-col gap-6 text-gray-700">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">Overview</p>
              <p>
                The following are documented gaps in publicly available data on AI energy and water consumption.
                These are not speculative — they represent specific, known absences where data has been sought but
                not found, or where data exists behind corporate non-disclosure agreements.
              </p>
            </div>

            {[
              {
                title: "Proprietary Training Data",
                body: `The energy required to train major frontier AI models (GPT-4, Claude 3, Gemini Ultra, LLaMA 3+) has not been publicly disclosed by any of the companies involved. OpenAI, Anthropic, Google DeepMind, and Meta have all declined to publish training energy or compute figures for their production models.

The only well-documented training estimate is for GPT-3 (175B parameters), derived from Strubell et al. (2019) and Brown et al. (2020)'s published compute descriptions. GPT-3 training is estimated at ~1.287 GWh. Frontier models are believed to require 10–100× this amount, based on scaling laws, but this is extrapolation, not measurement.

The AI governance nonprofit Epoch AI has attempted to track training compute using hardware counts and public announcements, but these remain estimates. No company has voluntarily published a kilowatt-hour figure for training a production frontier model.`,
              },
              {
                title: "Per-Query Energy for Closed Models",
                body: `ChatGPT, Claude, Gemini, and similar closed models do not disclose per-query energy consumption. The widely-cited EPRI 2024 figure of ~2.9 Wh per ChatGPT query is a modelled estimate derived from hardware assumptions and assumed data center PUE — it is not a measurement made by or confirmed by OpenAI.

Goldman Sachs (2024) estimated that AI queries use ~10× more electricity than traditional web searches. IEA (2025) has incorporated AI-specific projections into national energy models. None of these figures are based on direct access to AI company infrastructure data.

OpenAI, Anthropic, and Google have not published per-query or per-model energy consumption in any of their public sustainability reports as of mid-2025. Microsoft's ESG reports acknowledge increased energy use due to AI but do not break it down by task type.`,
              },
              {
                title: "Water Use Variability and Routing Opacity",
                body: `When you send a query to an AI model, you do not know which data center processes it, which cooling system that facility uses, or what the outdoor temperature is — all of which determine water consumption.

Li et al. (2023) modelled this variability and found that WUE (Water Use Effectiveness, in litres per kWh) can range from near 0 (cold-climate facilities using free air cooling) to over 2.5 L/kWh (hot-climate facilities with evaporative cooling towers). A query processed in Iowa in January and the same query processed in Arizona in August could have water footprints that differ by an order of magnitude.

Microsoft's 2025 Environmental Sustainability Report acknowledged that its new zero-water cooling AI data centers save ~125,000 m³ of water per facility annually — confirming that water consumption is a real and significant concern at scale — but did not provide per-query breakdown.`,
              },
              {
                title: "Hardware Lifecycle Impact (Scope 3 Emissions)",
                body: `All published inference energy estimates measure operational electricity consumption (Scope 2 emissions). They do not account for:

– The energy required to manufacture the GPUs, networking equipment, and cooling infrastructure
– The water used in semiconductor fabrication (chip manufacturing is water-intensive)
– The carbon embedded in the data center construction itself
– The energy cost of disposing of or recycling end-of-life hardware

Research on embodied carbon in computing hardware (e.g., Gupta et al. 2021, "Chasing Carbon") suggests that manufacturing can represent 50–80% of total lifetime carbon impact for compute devices. For AI training hardware with short replacement cycles (GPUs are typically upgraded every 2–3 years), this proportion may be significant.

No published study has produced a comprehensive lifecycle assessment (LCA) for AI inference that includes both operational and embodied impacts.`,
              },
              {
                title: "Model Version and Efficiency Opacity",
                body: `AI models are continuously updated, optimised, and replaced without public disclosure of the energy implications. A "ChatGPT query" in early 2023 (GPT-3.5) likely had different energy characteristics than one in late 2024 (GPT-4o), but no comparative energy data has been published.

Hardware efficiency improvements (e.g., NVIDIA H100 vs. A100, Google TPU v5 vs. v4) can reduce energy per inference by 30–50% for equivalent tasks. These gains partially offset growth in query volume, but the net effect is unknown without transparent reporting.

The LBNL 2024 report noted that historical efficiency gains in data centers have been "overwhelmed by scale" — meaning that even as hardware gets more efficient, total energy consumption continues to rise due to increased demand.`,
              },
              {
                title: "Audio, Code, and Multimodal Task Data",
                body: `Luccioni et al. (2023) is the most comprehensive published study on per-task AI energy consumption, but its coverage is not complete. It primarily measured text generation, image generation, and some speech recognition tasks using open-source models on research hardware.

Energy data is sparse or absent for:
– Code completion and code generation at scale (Copilot-level usage)
– Multimodal tasks combining text + vision
– Document summarisation and retrieval-augmented generation (RAG)
– Real-time AI audio processing and voice assistants
– Agent tasks involving multiple chained model calls

Estimates for these tasks presented in this tool are extrapolations from the available data. They are labelled with low confidence and should be treated accordingly.`,
              },
            ].map((gap, i) => (
              <div key={i} className="border-b border-gray-100 pb-6 last:border-0">
                <p className="text-sm font-semibold text-black mb-2">{gap.title}</p>
                {gap.body.split("\n\n").map((para, j) => (
                  <p key={j} className="text-xs text-gray-600 leading-relaxed mb-2 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            ))}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-black mb-1">Submit a resource</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                If you have access to credible primary data, measurement studies, or infrastructure disclosures not
                listed here, contributions are welcome.
              </p>
              <a
                href="mailto:hello@theaitab.com?subject=Resource submission"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
              >
                Submit via email <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── GUILT PANEL ─────────────────────────────────────────────────────────────

function GuiltPanel({ scenario, onClose }: { scenario: Scenario | null; onClose: () => void }) {
  const [energyOffset, setEnergyOffset] = useState(ENERGY_OFFSETS[0].id);
  const [waterOffset, setWaterOffset] = useState(WATER_OFFSETS[0].id);

  const energyWh = scenario?.energyWh ?? 0;
  const waterMl = scenario?.waterMl ?? 0;

  const ea = ENERGY_OFFSETS.find((a) => a.id === energyOffset)!;
  const wa = WATER_OFFSETS.find((a) => a.id === waterOffset)!;
  const eAmount = ea.whPerUnit ? energyWh / ea.whPerUnit : 0;
  const wAmount = wa.mlPerUnit ? waterMl / wa.mlPerUnit : 0;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 w-[340px] max-w-full bg-white border-l-2 border-[#9ecfaf] shadow-2xl overflow-y-auto"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
      >
        <div className="p-7 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-black leading-snug">How to remove the guilt</h2>
              <p className="text-xs text-gray-400 italic mt-1 leading-relaxed">
                Offset the resources used by making changes elsewhere in your day.
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0">
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          <div className="rounded-2xl border-2 border-[#9ecfaf] bg-[#f3faf6] p-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Energy offset</p>
            <select
              value={energyOffset}
              onChange={(e) => setEnergyOffset(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:border-[#9ecfaf] mb-3"
            >
              {ENERGY_OFFSETS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-sm text-black font-light leading-snug">
              <strong>{fmtOffset(eAmount, ea.unitLabel)}</strong> to offset{" "}
              <strong>{fmtEnergy(energyWh)}</strong>
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#9ecfaf] bg-[#f3faf6] p-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Water offset</p>
            <select
              value={waterOffset}
              onChange={(e) => setWaterOffset(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:border-[#9ecfaf] mb-3"
            >
              {WATER_OFFSETS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-sm text-black font-light leading-snug">
              <strong>{fmtOffset(wAmount, wa.unitLabel)}</strong> to offset{" "}
              <strong>{fmtWater(waterMl)}</strong>
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Trusted platforms</p>
            <div className="flex flex-col gap-2">
              {TRUSTED_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-400 transition-colors group"
                >
                  <div>
                    <p className="text-xs font-medium text-black">{link.name}</p>
                    <p className="text-[11px] text-gray-400 font-light">{link.desc}</p>
                  </div>
                  <ExternalLink size={11} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── CHART TOOLTIP ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unitLabel }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-lg text-xs">
      <p className="font-semibold text-black mb-1">{label}</p>
      <p className="text-gray-600">Mid: {fmtChartVal(d?.value ?? 0)} {unitLabel}</p>
      {d?.low != null && d?.high != null && (
        <p className="text-gray-400 mt-0.5">
          Range: {fmtChartVal(d.low)} – {fmtChartVal(d.high)} {unitLabel}
        </p>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Home() {
  const [selectedId, setSelectedId] = useState("app-build");
  const [showSourcesGaps, setShowSourcesGaps] = useState(false);
  const [showGuilt, setShowGuilt] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("energy");
  const [chartUnit, setChartUnit] = useState<ChartUnit>("raw");
  const [excludeTraining, setExcludeTraining] = useState(true);
  const [logScale, setLogScale] = useState(false);

  const chartsRef = useRef<HTMLDivElement>(null);

  const isCustom = selectedId === "custom";
  const scenario = SCENARIOS.find((s) => s.id === selectedId) ?? null;

  const visibleScenarios = SCENARIOS.filter((s) => !excludeTraining || s.id !== "training-llm");

  const chartData = visibleScenarios.map((s) => {
    const mid = getChartValue(s, chartMetric, chartUnit);
    const low = getChartValueRaw(s.energyLow, s.waterLow, chartMetric, chartUnit);
    const high = getChartValueRaw(s.energyHigh, s.waterHigh, chartMetric, chartUnit);
    const safeFloor = logScale ? Math.max(mid * 0.001, 1e-9) : 0;
    return {
      name: s.chartLabel,
      id: s.id,
      value: mid,
      low: low,
      high: high,
      errorRange: [Math.max(0, mid - Math.max(low, safeFloor)), Math.max(0, high - mid)] as [number, number],
    };
  });

  const unitLabel = getUnitLabel(chartMetric, chartUnit);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Anthropic Sans', system-ui, sans-serif" }}>

      {/* ── HERO SCREEN ─────────────────────────────────── */}
      <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">

        {/* LEFT — Scenario pills (desktop: vertical column; mobile: horizontal scroll row at top) */}
        <div className="
          md:flex-col md:justify-center md:pl-10 md:pr-5 md:py-12 md:gap-2.5 md:shrink-0
          flex flex-row gap-2 overflow-x-auto px-5 pt-5 pb-3 md:overflow-x-visible
          scrollbar-none
        ">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={[
                "px-4 py-1.5 rounded-full text-sm transition-all duration-150 whitespace-nowrap shrink-0",
                selectedId === s.id
                  ? "bg-black text-white font-medium"
                  : "border border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 font-light",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setSelectedId("custom")}
            className={[
              "px-4 py-1.5 rounded-full text-sm transition-all duration-150 whitespace-nowrap shrink-0 flex items-center gap-1.5",
              selectedId === "custom"
                ? "bg-black text-white font-medium"
                : "border border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 font-light",
            ].join(" ")}
          >
            <SlidersHorizontal size={12} />
            custom
          </button>
        </div>

        {/* CENTER — Sentence or custom calculator */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 py-8 md:py-16 min-h-[60vh] md:min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {isCustom ? (
                <CustomCalculator />
              ) : scenario ? (
                <>
                  <p
                    className="text-[1.4rem] md:text-[1.65rem] leading-[2] text-black max-w-xl text-center"
                    style={{ fontFamily: "'Anthropic Serif', serif" }}
                  >
                    <SentenceText text={scenario.mainSentence} />
                  </p>
                  <p
                    className="text-base md:text-[1.05rem] leading-[1.9] text-gray-500 max-w-xl text-center"
                    style={{ fontFamily: "'Anthropic Serif', serif" }}
                  >
                    <SentenceText text={scenario.equivSentence} />
                  </p>
                  <p className="text-xs text-gray-400 font-light leading-relaxed max-w-md text-center italic">
                    {scenario.clarifying}{" "}
                    <button
                      onClick={() => setShowSourcesGaps(true)}
                      className="underline underline-offset-2 hover:text-black transition-colors not-italic"
                    >
                      Read the full methodology →
                    </button>
                  </p>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT — folder tab (desktop only) */}
        <div className="hidden md:flex flex-col justify-center pr-0 py-12 shrink-0">
          <AnimatePresence>
            {!showGuilt && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => setShowGuilt(true)}
                className="flex items-center cursor-pointer group"
                style={{ marginRight: 0 }}
              >
                <div className="bg-white border border-r-0 border-gray-300 rounded-l-lg shadow-sm px-2 py-5 flex flex-col items-center gap-2 group-hover:border-gray-500 transition-colors">
                  <span
                    className="text-[11px] text-gray-400 font-light tracking-wide group-hover:text-black transition-colors whitespace-nowrap"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    how to remove the guilt
                  </span>
                  <ChevronRight size={11} className="text-gray-300 group-hover:text-gray-600 transition-colors rotate-180" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM BAR */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-5 md:px-10 pb-5 md:pb-8 gap-4">
          {/* Sources + Gaps — more prominent */}
          <button
            onClick={() => setShowSourcesGaps(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors font-medium border border-gray-300 hover:border-gray-500 rounded-full px-4 py-2"
          >
            Sources & methodology
          </button>

          {/* Compare tasks */}
          <button
            onClick={() => chartsRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-black transition-colors group"
          >
            <span className="text-[11px] font-light tracking-wide">compare tasks</span>
            <ChevronDown size={13} className="group-hover:translate-y-0.5 transition-transform" />
            <ChevronDown size={13} className="-mt-2.5 opacity-30 group-hover:translate-y-0.5 transition-transform" />
          </button>

          {/* Mobile: guilt button */}
          <button
            onClick={() => setShowGuilt(true)}
            className="md:hidden text-xs text-gray-400 hover:text-black transition-colors font-light border border-gray-200 rounded-full px-3 py-1.5"
          >
            remove guilt →
          </button>

          {/* Disclaimer (desktop only) */}
          <p className="hidden md:block text-[10px] text-gray-300 italic font-light max-w-[200px] text-right leading-relaxed">
            Mid-range estimates from published research. Actual values vary by model, data center & region.
          </p>
        </div>
      </div>

      {/* ── COMPARE SECTION ─────────────────────────────── */}
      <div
        ref={chartsRef}
        className="min-h-screen bg-white border-t border-gray-100 flex flex-col px-5 md:px-16 py-16 md:py-20"
      >
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">
          <div>
            <h2 className="text-xl font-semibold text-black">Compare tasks</h2>
            <p className="text-xs text-gray-400 font-light mt-1 italic">
              Bars show mid-range estimates. Error bars show the published low–high range from source data.
              Wide bars indicate higher uncertainty. Data is sparse for some tasks — confidence levels reflect this.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs">
              {(["energy", "water"] as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setChartMetric(m); setChartUnit("raw"); }}
                  className={["px-5 py-2 transition-colors capitalize", chartMetric === m ? "bg-black text-white" : "text-gray-400 hover:text-black"].join(" ")}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs">
              {(["raw", "equiv1", "equiv2"] as ChartUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setChartUnit(u)}
                  className={["px-4 py-2 transition-colors", chartUnit === u ? "bg-black text-white" : "text-gray-400 hover:text-black"].join(" ")}
                >
                  {u === "raw"
                    ? chartMetric === "energy" ? "Wh" : "mL"
                    : u === "equiv1"
                    ? chartMetric === "energy" ? "Netflix mins" : "Handwashes"
                    : chartMetric === "energy" ? "LED hours" : "500mL bottles"}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-gray-400 font-light cursor-pointer select-none">
              <input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} className="w-3 h-3 accent-black" />
              log scale
            </label>

            <label className="flex items-center gap-2 text-[11px] text-gray-400 font-light cursor-pointer select-none">
              <input type="checkbox" checked={excludeTraining} onChange={(e) => setExcludeTraining(e.target.checked)} className="w-3 h-3 accent-black" />
              exclude "train LLM" (scale is 100,000× larger)
            </label>
          </div>

          {/* Chart */}
          <div className="w-full h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "'Anthropic Sans', sans-serif" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  scale={logScale ? "log" : "linear"}
                  domain={logScale ? ["auto", "auto"] : [0, "auto"]}
                  tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "'Anthropic Sans', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtChartVal}
                  label={{
                    value: unitLabel,
                    angle: -90,
                    position: "insideLeft",
                    offset: 14,
                    style: { fontSize: 9, fill: "#9ca3af", fontFamily: "'Anthropic Sans', sans-serif" },
                  }}
                  width={60}
                />
                <Tooltip content={<ChartTooltip unitLabel={unitLabel} />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  <ErrorBar dataKey="errorRange" width={4} strokeWidth={1} stroke="#999" direction="y" />
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.id === selectedId ? "#111" : "#d1d5db"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart notes */}
          <div className="flex flex-col gap-2 text-[10px] text-gray-300 italic font-light leading-relaxed">
            <p>
              Error bars show the published low–high estimate range (not statistical confidence intervals). For tasks with
              low data confidence, this range can span 2–3 orders of magnitude.
            </p>
            <p>
              No estimates here are averaged across multiple sources — most tasks have only one primary source. Showing
              multi-source averages would require fabricating data that doesn't exist.
              All values: Luccioni et al. 2023, Li et al. 2023, Fernandez et al. 2025, EPRI 2024,
              Goldman Sachs 2024, Strubell et al. 2019, IEA 2025.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showSourcesGaps && (
          <Modal onClose={() => setShowSourcesGaps(false)}>
            <SourcesGapsModal />
          </Modal>
        )}
      </AnimatePresence>

      {/* ── GUILT PANEL ── */}
      <AnimatePresence>
        {showGuilt && (
          <GuiltPanel scenario={scenario} onClose={() => setShowGuilt(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
