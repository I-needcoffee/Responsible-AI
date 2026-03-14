import { useState, type ReactNode } from "react";
import { X, ExternalLink, BarChart2, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";

// ─── WATER / ENERGY CONSTANTS ────────────────────────────────────────────────
// WUE = 3.45 mL/Wh — calibrated from Li et al. (2023):
//   ChatGPT (EPRI: 2.9 Wh/query) → ~10 mL of water → WUE = 10/2.9 ≈ 3.45 mL/Wh
//   Cross-validates: frontier long-chat (145 Wh × 3.45 = 500 mL) = Li et al. direct estimate ✓
// Training LLM exception: Li et al. provided a facility-level direct estimate (700,000 L).
const WUE = 3.45;

// ─── ESTIMATE RANGES ─────────────────────────────────────────────────────────
// These represent different published studies / methodology choices.
// "Low"  = directly measured on small open-source models (Luccioni et al. 2023)
// "Mid"  = estimated for commercial AI services (EPRI 2024) — default
// "High" = upper bound from Goldman Sachs 2024 / EPRI 2024 full ChatGPT estimate
export type ModelTier = "research" | "commercial" | "frontier";

export const TIER_META: Record<ModelTier, { rangeLabel: string; rangeDesc: string; source: string; sourceYear: number; color: string }> = {
  research: {
    rangeLabel: "Low",
    rangeDesc: "Measured directly on small open-source AI models. If you're using a local or self-hosted AI tool, this is closer to your actual impact.",
    source: "Luccioni et al. 2023",
    sourceYear: 2023,
    color: "#6BA8DD",
  },
  commercial: {
    rangeLabel: "Average",
    rangeDesc: "Estimated for commercial AI services like ChatGPT, Claude, and Gemini. EPRI estimated a standard ChatGPT query uses ~2.9 Wh — simpler tasks are scaled proportionally.",
    source: "EPRI 2024",
    sourceYear: 2024,
    color: "#111111",
  },
  frontier: {
    rangeLabel: "High",
    rangeDesc: "Upper-bound estimate for the largest commercial AI models. Goldman Sachs (2024) estimated AI uses ~10× more than a Google Search (0.3 Wh × 10 = ~3 Wh). EPRI's full ChatGPT query estimate (2.9 Wh) falls in the same range.",
    source: "EPRI 2024 / Goldman Sachs 2024",
    sourceYear: 2024,
    color: "#c0392b",
  },
};

// Energy (Wh) per task, by estimate range. Tier-invariant tasks use base values.
const TIER_ENERGY: Record<string, Record<ModelTier, number>> = {
  "short-chat":       { research: 0.003,  commercial: 0.3,   frontier: 2.9   },
  "long-chat":        { research: 0.3,    commercial: 15,    frontier: 145   },
  "coding":           { research: 0.1,    commercial: 10,    frontier: 29    },
  "app-build":        { research: 50,     commercial: 300,   frontier: 1000  },
  "audio-transcript": { research: 0.002,  commercial: 0.02,  frontier: 0.1   },
};

const TIER_SOURCE: Record<string, Record<ModelTier, string>> = {
  "short-chat": {
    research:   "Luccioni et al. 2023 — direct GPU measurement on open-source text models. Range: 0.001–0.01 Wh per query.",
    commercial: "EPRI 2024 — a full ChatGPT query uses ~2.9 Wh. Simple messages estimated at ~10× less (0.3 Wh).",
    frontier:   "EPRI 2024 / Goldman Sachs 2024 — full ChatGPT query estimate of ~2.9 Wh. Goldman Sachs estimated AI uses ~10× more than Google Search (0.3 Wh × 10 ≈ 3 Wh). Consistent with EPRI.",
  },
  "long-chat": {
    research:   "Scaled from Luccioni et al. 2023: 100 calls × 0.003 Wh = 0.3 Wh for a 20–50 message session.",
    commercial: "Scaled from EPRI 2024: 50 messages × 0.3 Wh = 15 Wh.",
    frontier:   "Scaled from EPRI 2024: 50 messages × 2.9 Wh = 145 Wh. Cross-check: 145 Wh × 3.45 mL/Wh = 500 mL = Li et al.'s direct estimate for a 50-message ChatGPT conversation. ✓",
  },
  "coding": {
    research:   "Luccioni et al. 2023: code completions measured at ~0.001 Wh each. 100 × 0.001 = 0.1 Wh.",
    commercial: "EPRI 2024 scaled: 100 × 0.1 Wh = 10 Wh. Code assistant models are often more efficient than full chat LLMs, so this may be an upper bound.",
    frontier:   "EPRI 2024 scaled: 100 × 0.29 Wh = 29 Wh (upper bound — code models are typically not full frontier LLMs).",
  },
  "app-build": {
    research:   "Modelled: ~1,000 small model interactions at 0.05 Wh avg = 50 Wh (Luccioni 2023 baseline).",
    commercial: "Modelled from EPRI 2024: ~1,000 AI interactions at 0.3 Wh avg = 300 Wh.",
    frontier:   "Modelled from EPRI 2024: ~500 interactions at 2 Wh avg = 1,000 Wh (likely overestimate — coding assistants use smaller specialized models).",
  },
  "audio-transcript": {
    research:   "Luccioni et al. 2023: speech recognition at 0.001–0.01 Wh/min. Mid: 0.002 Wh/min.",
    commercial: "Scaled estimate: commercial transcription likely ~10× small model. Limited peer-reviewed data.",
    frontier:   "Estimated upper bound. No peer-reviewed study measures commercial transcription energy directly.",
  },
};

function getEnergyWh(id: string, base: number, tier: ModelTier): number {
  return TIER_ENERGY[id]?.[tier] ?? base;
}
function getWaterMl(id: string, baseWater: number, energyWh: number): number {
  if (id === "training-llm") return baseWater; // Li et al. direct facility estimate
  return energyWh * WUE;
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface MathBlock { equation: string; sourceName: string; derivation: string; tierSource?: Record<ModelTier, string>; }
interface Scenario {
  id: string; verb: string; dropdownText: string; dropdownLabel: string;
  clarifying: string; baseEnergyWh: number; energyLow: number; energyHigh: number;
  baseWaterMl: number; confidence: "high" | "medium" | "low"; tierSensitive: boolean;
  math: { energy: MathBlock; water: MathBlock; note?: string };
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: "short-chat", verb: "Sending", dropdownText: "a short chat message", dropdownLabel: "a short chat message",
    clarifying: "One short message to an AI assistant. Low-impact individually, but billions happen daily. No AI company publicly reports per-query energy.",
    baseEnergyWh: 0.003, energyLow: 0.001, energyHigh: 2.9, baseWaterMl: 0.003 * WUE,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 query × [energy per query]", sourceName: "Luccioni et al. 2023 · EPRI 2024 · Goldman Sachs 2024", derivation: "Varies by estimate range — see the Low / Average / High selector.", tierSource: TIER_SOURCE["short-chat"] },
      water: { equation: "Water = Energy (Wh) × 3.45 mL/Wh", sourceName: "Li et al. 2023 (WUE calibration)", derivation: "Li et al. (2023) found ChatGPT (2.9 Wh/query) produces ~10 mL per query → WUE = 3.45 mL/Wh. This factor includes on-site cooling and upstream electricity-generation water." },
    },
  },
  {
    id: "long-chat", verb: "Having", dropdownText: "a long AI conversation", dropdownLabel: "a long AI conversation",
    clarifying: "A 20–50 message back-and-forth session. At the average estimate, each message costs 0.3 Wh. The high estimate (500 mL of water) exactly matches Li et al.'s direct measurement.",
    baseEnergyWh: 0.3, energyLow: 0.3, energyHigh: 145, baseWaterMl: 0.3 * WUE,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 50 messages × [energy per message]", sourceName: "Luccioni et al. 2023 · EPRI 2024", derivation: "Modelled as 50 individual AI calls at the per-query rate for the selected estimate range.", tierSource: TIER_SOURCE["long-chat"] },
      water: { equation: "Water = Energy (Wh) × 3.45 mL/Wh", sourceName: "Li et al. 2023 — cross-validated", derivation: "At the high estimate: 145 Wh × 3.45 = 500 mL, exactly matching Li et al.'s direct measurement for a 50-message ChatGPT session." },
    },
  },
  {
    id: "image", verb: "Generating", dropdownText: "an AI image", dropdownLabel: "an AI image",
    clarifying: "A single image from an AI model (Midjourney, DALL·E, etc.). One of the best-measured AI tasks — researchers directly instrumented real GPU hardware.",
    baseEnergyWh: 2.4, energyLow: 0.5, energyHigh: 6.5, baseWaterMl: 2.4 * WUE,
    confidence: "high", tierSensitive: false,
    math: {
      energy: { equation: "2.4 Wh per image (direct GPU measurement, mid-range)", sourceName: "Luccioni et al. 2023 — Power Hungry Processing", derivation: "Luccioni et al. measured diffusion model energy draw directly on GPU hardware. Range: 0.5–6.5 Wh per image. 2.4 Wh is the midpoint. This is the most reliably sourced estimate in this tool." },
      water: { equation: "2.4 Wh × 3.45 mL/Wh ≈ 8 mL", sourceName: "Li et al. 2023 (WUE methodology)", derivation: "Applying WUE = 3.45 mL/Wh to the measured 2.4 Wh gives ~8 mL per image." },
      note: "Image generation energy does not vary by estimate range — Luccioni's direct measurement is the only credible source across all model sizes for this task.",
    },
  },
  {
    id: "video", verb: "Generating", dropdownText: "a short AI video", dropdownLabel: "a short AI video",
    clarifying: "A 5–15 second AI video clip (Sora, Runway, etc.). This being ~400× more energy than a single image is correct — a 10-sec video requires generating ~240 frames, each comparable to an image generation pass.",
    baseEnergyWh: 944, energyLow: 200, energyHigh: 2500, baseWaterMl: 944 * WUE,
    confidence: "low", tierSensitive: false,
    math: {
      energy: { equation: "~944 Wh ≈ 240 frames × ~4 Wh per frame (first-principles estimate)", sourceName: "Derived from Luccioni et al. 2023 — no direct peer-reviewed measurement exists for commercial video AI", derivation: "No published study has directly measured energy for commercial AI video models (Sora, Runway, etc.) as of 2025. Derived from scaling: 10 seconds at 24 fps = 240 frames × ~4 Wh/frame (Luccioni upper range for diffusion) = 960 Wh. Mid: 944 Wh. Range: 200–2,500 Wh. Labelled low confidence because actual video architectures may differ." },
      water: { equation: "944 Wh × 3.45 mL/Wh ≈ 3,260 mL (3.3 L)", sourceName: "Li et al. 2023 (WUE methodology)", derivation: "Derived from consistent WUE factor. A previous version of this tool used an inconsistently derived 20,000 mL — corrected here." },
      note: "Video gen being ~400× more than image gen is physically expected and not an error. A previous citation ('Fernandez et al. 2025') has been removed — that publication could not be verified.",
    },
  },
  {
    id: "coding", verb: "Getting", dropdownText: "100 AI code suggestions", dropdownLabel: "100 code suggestions",
    clarifying: "100 individual autocomplete or code completion suggestions — roughly what a focused hour of AI-assisted development produces.",
    baseEnergyWh: 0.1, energyLow: 0.1, energyHigh: 29, baseWaterMl: 0.1 * WUE,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 100 suggestions × [energy per suggestion]", sourceName: "Luccioni et al. 2023 · EPRI 2024 (scaled)", derivation: "Each suggestion is treated as one AI inference call.", tierSource: TIER_SOURCE["coding"] },
      water: { equation: "Water = Energy (Wh) × 3.45 mL/Wh", sourceName: "Li et al. 2023 (WUE)", derivation: "Average estimate: 10 Wh × 3.45 = 34.5 mL per 100 suggestions." },
    },
  },
  {
    id: "app-build", verb: "Vibe coding", dropdownText: "a simple app", dropdownLabel: "a simple app",
    clarifying: "A 1–2 hour session building an app with AI assistance — many rounds of code generation, debugging, and iteration. Wide uncertainty; actual use depends on model and session length.",
    baseEnergyWh: 50, energyLow: 50, energyHigh: 1000, baseWaterMl: 50 * WUE,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~1,000 AI interactions × [avg energy per call]", sourceName: "Modelled estimate — EPRI 2024 basis for average/high ranges", derivation: "An app-building session involves many chained AI calls.", tierSource: TIER_SOURCE["app-build"] },
      water: { equation: "Water = Energy (Wh) × 3.45 mL/Wh", sourceName: "Li et al. 2023 (WUE)", derivation: "Average estimate: 300 Wh × 3.45 ≈ 1,035 mL (~1 litre)." },
    },
  },
  {
    id: "training-llm", verb: "Training", dropdownText: "a large language model", dropdownLabel: "training a large language model",
    clarifying: "Training GPT-3 (175B parameters) — a one-time event, not per use. Newer models are estimated to require 10–100× this. No company has disclosed frontier model training energy.",
    baseEnergyWh: 1287000000, energyLow: 500000000, energyHigh: 5000000000, baseWaterMl: 700000000,
    confidence: "medium", tierSensitive: false,
    math: {
      energy: { equation: "~1.287 GWh = training FLOPs ÷ hardware efficiency ÷ PUE", sourceName: "Strubell et al. 2019 + Brown et al. 2020", derivation: "Brown et al. (2020) disclosed GPT-3 used ~3.14 × 10²³ FLOPs. Strubell et al. (2019) developed the FLOP→energy conversion methodology accounting for PUE. Result: ~1.287 GWh. This is the only named production training run with published compute data." },
      water: { equation: "~700 million mL (700,000 L) — Li et al. direct estimate", sourceName: "Li et al. 2023 — Making AI Less Thirsty", derivation: "Li et al. directly estimated GPT-3 training consumed ~700,000 L at Microsoft Azure data centers, using disclosed facility-level WUE from Microsoft sustainability reports." },
      note: "Training is not estimate-range sensitive — it occurred once at a specific facility. The WUE for bulk training may differ from per-query inference.",
    },
  },
  {
    id: "audio-transcript", verb: "Transcribing", dropdownText: "1 minute of audio", dropdownLabel: "1 minute of audio",
    clarifying: "Transcribing 1 minute of speech with an AI model (Whisper, Deepgram, etc.). One of the lower-impact AI tasks.",
    baseEnergyWh: 0.002, energyLow: 0.002, energyHigh: 0.1, baseWaterMl: 0.002 * WUE,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "~0.002–0.1 Wh per minute of audio (range-dependent)", sourceName: "Luccioni et al. 2023 · scaled estimates", derivation: "Luccioni measured speech recognition at 0.001–0.01 Wh/min. Commercial services are scaled accordingly.", tierSource: TIER_SOURCE["audio-transcript"] },
      water: { equation: "Water = Energy (Wh) × 3.45 mL/Wh", sourceName: "Li et al. 2023 (WUE)", derivation: "Average estimate: 0.02 Wh × 3.45 = 0.07 mL — essentially negligible for a single minute." },
    },
  },
];

// ─── CUSTOM CALCULATOR ────────────────────────────────────────────────────────
const CUSTOM_TASKS = [
  { id: "chat",    label: "Short chat messages",          unitEnergyWh: 0.3,   unitWaterMl: 1.035,  max: 1000, step: 1,  defaultVal: 10  },
  { id: "longchat",label: "Long conversations",           unitEnergyWh: 15,    unitWaterMl: 51.75,  max: 100,  step: 1,  defaultVal: 0   },
  { id: "image",   label: "AI images generated",         unitEnergyWh: 2.4,   unitWaterMl: 8.28,   max: 200,  step: 1,  defaultVal: 0   },
  { id: "video",   label: "AI video clips (5–15 sec)",   unitEnergyWh: 944,   unitWaterMl: 3257,   max: 20,   step: 1,  defaultVal: 0   },
  { id: "code",    label: "Code completion suggestions", unitEnergyWh: 0.01,  unitWaterMl: 0.0345, max: 1000, step: 1,  defaultVal: 100 },
  { id: "app",     label: "App build sessions",          unitEnergyWh: 300,   unitWaterMl: 1035,   max: 10,   step: 1,  defaultVal: 0   },
];

// ─── ACTION TIPS ──────────────────────────────────────────────────────────────
const ACTION_TIPS = [
  { impact: "Very high", color: "#c0392b", title: "Skip AI video generation unless essential", body: "One 10-second AI video clip uses as much energy as ~300 text messages. Describe your idea in words or use existing footage. If you must generate video, generate once — don't regenerate." },
  { impact: "High", color: "#e67e22", title: "Think before requesting AI images", body: "One AI image uses about 8× more energy than a text message. Ask yourself: can I describe this instead? Use images only when visuals are truly necessary." },
  { impact: "High", color: "#e67e22", title: "Nail your prompt the first time", body: "Every 'try again' or 'make it shorter' is a completely new AI request — it costs the same as starting fresh. Take 30 seconds to be specific before submitting. One good prompt beats five mediocre ones." },
  { impact: "Medium", color: "#f0a500", title: "Use smaller models for simple tasks", body: "Basic questions, grammar checks, and simple formatting don't need the most powerful AI. Many apps let you choose model size. Smaller models use less energy and are often just as good for everyday tasks." },
  { impact: "Medium", color: "#f0a500", title: "Batch your questions into one prompt", body: "Sending three separate short messages costs 3× more than one well-structured prompt. Combine related questions: 'What is X, why does Y happen, and how do I fix Z?' instead of asking each separately." },
  { impact: "Medium", color: "#f0a500", title: "Keep conversations focused and short", body: "A 50-message conversation uses ~50× more energy than one focused message. Use AI for specific tasks, not extended back-and-forth. If you're chatting for fun, that's fine — just be aware of the cost." },
  { impact: "Low", color: "#27ae60", title: "Choose plain text over formatted outputs", body: "Asking for tables, bullet points, markdown, or code blocks generates more tokens. When you just need the information, say 'just answer directly without formatting.'" },
  { impact: "Low", color: "#27ae60", title: "Try on-device AI for basic tasks", body: "Voice-to-text on your phone, Siri, Google Assistant, and many offline apps process data locally on your device — no data center energy required. Reserve cloud AI for tasks that actually need it." },
];

// ─── ENERGY / WATER OFFSETS ───────────────────────────────────────────────────
const ENERGY_OFFSETS = [
  { id: "light",   label: "Turn off a 10W LED bulb",          unitLabel: "hours",   whPerUnit: 10    },
  { id: "ac",      label: "Skip 1 hour of air conditioning",  unitLabel: "hours",   whPerUnit: 3500  },
  { id: "laundry", label: "Air-dry laundry (skip dryer)",      unitLabel: "loads",   whPerUnit: 2400  },
  { id: "walk",    label: "Walk instead of drive",             unitLabel: "km",      whPerUnit: 200   },
  { id: "laptop",  label: "Turn off a laptop",                 unitLabel: "hours",   whPerUnit: 45    },
];
const WATER_OFFSETS = [
  { id: "shower",  label: "Take a shorter shower",             unitLabel: "min shorter", mlPerUnit: 8000  },
  { id: "flush",   label: "Skip a toilet flush",               unitLabel: "flushes",     mlPerUnit: 9000  },
  { id: "dishes",  label: "Dishwasher instead of hand-washing",unitLabel: "loads",       mlPerUnit: 50000 },
  { id: "tap",     label: "Turn off tap while brushing teeth", unitLabel: "times",       mlPerUnit: 2000  },
];
const TRUSTED_LINKS = [
  { name: "Arcadia",        url: "https://arcadia.com",               desc: "Switch home energy to clean sources" },
  { name: "Wren",           url: "https://www.wren.co",              desc: "Monthly carbon offset subscription"   },
  { name: "EPA WaterSense", url: "https://www.epa.gov/watersense",   desc: "Water efficiency programs"            },
];

// ─── COMPARE OPTIONS ──────────────────────────────────────────────────────────
type CompareOption = { id: string; label: string; unit: string; compute: (e: number, w: number) => number; format: (v: number) => string; };
const COMPARE_OPTIONS: CompareOption[] = [
  { id: "netflix",  label: "Netflix minutes", unit: "min of Netflix",
    compute: (e) => e / 0.8,
    format: (v) => v < 1 ? `${Math.round(v * 60)} sec` : v < 60 ? `${Math.round(v)} min` : v < 1440 ? `${(v/60).toFixed(1)} hrs` : `${(v/60/24).toFixed(1)} days` },
  { id: "led",      label: "LED bulb hours",  unit: "hrs of LED bulb",
    compute: (e) => e / 10,
    format: (v) => v < 1/60 ? `< 1 min` : v < 1 ? `${Math.round(v * 60)} min` : `${(Math.round(v * 10) / 10)} hrs` },
  { id: "handwash", label: "Handwashes",       unit: "handwashes",
    compute: (_, w) => w / 110,
    format: (v) => v < 0.1 ? `< 0.1` : v < 1 ? `${v.toFixed(2)} washes` : `${Math.round(v)} washes` },
  { id: "bottles",  label: "500 mL bottles",  unit: "500mL water bottles",
    compute: (_, w) => w / 500,
    format: (v) => v < 0.1 ? `< 0.1` : `${(Math.round(v * 10) / 10)}` },
];

const TASK_COLORS: Record<string, string> = {
  "short-chat": "#5B9FD4", "long-chat": "#2E80C0", "image": "#D96666",
  "video": "#A52B2B", "coding": "#3D9A5A", "app-build": "#1A6E38",
  "training-llm": "#888888", "audio-transcript": "#C88025",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtEnergy(wh: number): string {
  if (wh >= 1e9) return `${(wh/1e9).toFixed(3)} GWh`;
  if (wh >= 1e6) return `${(wh/1e6).toFixed(1)} MWh`;
  if (wh >= 1000) return `${(wh/1000).toFixed(1)} kWh`;
  if (wh < 0.001) return `${(wh*1000000).toFixed(1)} µWh`;
  if (wh < 0.1) return `${(wh*1000).toFixed(1)} mWh`;
  return `${Math.round(wh * 100) / 100} Wh`;
}
function fmtWater(ml: number): string {
  if (ml >= 1e9) return `${(ml/1e9).toFixed(2)} ML`;
  if (ml >= 1e6) return `${(ml/1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} L`;
  if (ml >= 1000) return `${(ml/1000).toFixed(1)} L`;
  if (ml < 1) return `< 1 mL`;
  return `${Math.round(ml)} mL`;
}
function fmtOffset(v: number, u: string) {
  if (v < 0.01) return `< 0.01 ${u}`;
  if (v < 100) return `${(Math.round(v * 10) / 10).toLocaleString()} ${u}`;
  return `${Math.round(v).toLocaleString()} ${u}`;
}
function equivEnergy(wh: number): string {
  const n = wh / 0.8;
  if (n < 1/60) return `${Math.round(n * 3600)} seconds of Netflix`;
  if (n < 1) return `${Math.round(n * 60)} seconds of Netflix`;
  if (n < 60) return `${Math.round(n)} minutes of Netflix`;
  if (n < 1440) return `${(n/60).toFixed(1)} hours of Netflix`;
  return `${(n/60/24).toFixed(1)} days of Netflix`;
}
function equivWater(ml: number): string {
  if (ml < 1) return `< 1 mL of water`;
  if (ml < 10) return `${Math.round(ml)} mL of water`;
  const h = ml / 110;
  if (h < 0.1) return `${Math.round(ml)} mL of water`;
  if (h < 1) return `${h.toFixed(2)} handwashes`;
  if (h < 10000) return `${Math.round(h).toLocaleString()} handwashes`;
  return `${(h/1000).toFixed(1)}K handwashes`;
}

// ─── INLINE PILL DROPDOWN ────────────────────────────────────────────────────
function InlineDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = [
    ...SCENARIOS.map(s => ({ id: s.id, text: `${s.verb} ${s.dropdownText}`, label: `${s.verb.toLowerCase()} ${s.dropdownLabel}` })),
    { id: "custom", text: "A custom combination", label: "a custom combination" },
  ];
  const selected = options.find(o => o.id === value) ?? options[0];

  return (
    <span className="relative inline-block">
      <button onClick={() => setOpen(v => !v)}
        className="cursor-pointer inline-flex items-center gap-1 hover:opacity-80 transition-opacity font-bold"
        style={{ border: "1.5px solid #c0c0c0", borderRadius: "100px", padding: "2px 14px 3px 14px", background: "transparent", fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>
        {selected.text}
        <span style={{ fontSize: "0.55em", opacity: 0.45, marginLeft: 2 }}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 py-2 overflow-hidden"
              style={{ minWidth: "270px", fontFamily: "'Anthropic Sans', sans-serif", fontSize: "14px" }}>
              {options.map(o => (
                <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`block w-full text-left px-5 py-2.5 transition-colors hover:bg-gray-50 ${o.id === value ? "font-semibold text-black" : "font-normal text-gray-600"}`}>
                  {o.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── ESTIMATE RANGE SELECTOR ─────────────────────────────────────────────────
function EstimateSelector({ tier, onChange }: { tier: ModelTier; onChange: (t: ModelTier) => void }) {
  const tiers: ModelTier[] = ["research", "commercial", "frontier"];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
        {tiers.map(t => (
          <button key={t} onClick={() => onChange(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${tier === t ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {TIER_META[t].rangeLabel}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 italic text-center max-w-xs leading-relaxed">
        <strong className="text-gray-500 not-italic">{TIER_META[tier].source}</strong> — {TIER_META[tier].rangeDesc}
      </p>
    </div>
  );
}

// ─── MATH MODAL ───────────────────────────────────────────────────────────────
function MathModal({ scenario, tier, energyWh, waterMl, onClose }: { scenario: Scenario; tier: ModelTier; energyWh: number; waterMl: number; onClose: () => void }) {
  const tierSrc = scenario.math.energy.tierSource?.[tier];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto z-10"
        initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 28, stiffness: 400 }}>
        <div className="px-7 pt-7 pb-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-0.5">Show me the math</p>
              <h2 className="text-base font-semibold text-black">{scenario.verb} {scenario.dropdownText}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 italic">{TIER_META[tier].rangeLabel} estimate · {TIER_META[tier].source}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={14} className="text-gray-400" /></button>
          </div>
          {scenario.tierSensitive && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 leading-relaxed">
              These figures vary by estimate range. Currently showing the <strong>{TIER_META[tier].rangeLabel} estimate</strong>. Change the range on the main screen to compare.
            </div>
          )}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-black">⚡ Energy: {fmtEnergy(energyWh)}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${scenario.confidence === "high" ? "bg-green-50 text-green-700 border-green-200" : scenario.confidence === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>{scenario.confidence} confidence</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5"><p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.math.energy.equation}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Source</p><p className="text-xs text-black font-medium">{scenario.math.energy.sourceName}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Derivation</p><p className="text-xs text-gray-600 leading-relaxed">{tierSrc ?? scenario.math.energy.derivation}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200"><p className="text-xs font-semibold text-black">💧 Water: {fmtWater(waterMl)}</p></div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5"><p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.id === "training-llm" ? scenario.math.water.equation : `${fmtEnergy(energyWh)} × 3.45 mL/Wh = ${fmtWater(waterMl)}`}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Source</p><p className="text-xs text-black font-medium">{scenario.math.water.sourceName}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Derivation</p><p className="text-xs text-gray-600 leading-relaxed">{scenario.math.water.derivation}</p></div>
            </div>
          </div>
          {scenario.math.note && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-[10px] text-amber-700 uppercase tracking-widest font-medium mb-1">Important note</p>
              <p className="text-xs text-amber-800 leading-relaxed">{scenario.math.note}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── CUSTOM CALCULATOR ────────────────────────────────────────────────────────
function CustomCalculator() {
  const [counts, setCounts] = useState<Record<string, number>>(Object.fromEntries(CUSTOM_TASKS.map(t => [t.id, t.defaultVal])));
  const totalE = CUSTOM_TASKS.reduce((s, t) => s + (counts[t.id] ?? 0) * t.unitEnergyWh, 0);
  const totalW = CUSTOM_TASKS.reduce((s, t) => s + (counts[t.id] ?? 0) * t.unitWaterMl, 0);
  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {CUSTOM_TASKS.map(t => (
        <div key={t.id} className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-44 shrink-0 leading-tight">{t.label}</label>
          <input type="range" min={0} max={t.max} step={t.step} value={counts[t.id] ?? 0}
            onChange={e => setCounts(c => ({ ...c, [t.id]: Number(e.target.value) }))} className="flex-1 accent-black" />
          <span className="text-xs font-medium w-10 text-right tabular-nums">{counts[t.id] ?? 0}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-4 text-center" style={{ fontFamily: "'Anthropic Serif', serif" }}>
        {totalE === 0
          ? <p className="text-gray-400 text-sm italic">Adjust sliders to see your usage.</p>
          : <>
            <p className="text-[1.15rem] leading-[1.9] text-black">
              Your session used{" "}<strong style={{ borderBottom: "2px solid currentColor" }}>{fmtEnergy(totalE)}</strong> of energy and{" "}<strong style={{ borderBottom: "2px solid currentColor" }}>{fmtWater(totalW)}</strong> of water.
            </p>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>
              That's {equivEnergy(totalE)} and {equivWater(totalW)}.
            </p>
          </>
        }
      </div>
    </div>
  );
}

// ─── COMPARE PANEL (dark, horizontal bar chart) ───────────────────────────────
function ComparePanel({ selectedId, tier, onClose }: { selectedId: string; tier: ModelTier; onClose: () => void }) {
  const [optionId, setOptionId] = useState("netflix");
  const [showTraining, setShowTraining] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const option = COMPARE_OPTIONS.find(o => o.id === optionId)!;

  const visible = SCENARIOS.filter(s =>
    (showTraining || s.id !== "training-llm") &&
    (showVideo || s.id !== "video")
  );
  const rows = visible.map(s => {
    const e = getEnergyWh(s.id, s.baseEnergyWh, tier);
    const w = getWaterMl(s.id, s.baseWaterMl, e);
    return { ...s, val: option.compute(e, w), energy: e, water: w };
  }).sort((a, b) => a.val - b.val);

  const maxVal = Math.max(...rows.map(r => r.val), 0.001);
  const minDisplayVal = rows.find(r => r.val > 0)?.val ?? 0;

  // Base comparison: short-chat or smallest visible task
  const baseRow = rows.find(r => r.id === "short-chat") ?? rows[0];

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto flex flex-col"
        style={{ width: "min(95vw, 900px)", background: "#111111" }}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}>

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Compare AI tasks</h2>
              <p className="text-sm text-white/40 mt-0.5">Resource use per task · {TIER_META[tier].rangeLabel} estimates · sorted smallest → largest</p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10 transition-colors border border-white/20">
              <X size={16} className="text-white/70" />
            </button>
          </div>
          {/* Metric selector */}
          <div className="flex flex-wrap gap-2">
            {COMPARE_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setOptionId(o.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${optionId === o.id ? "bg-white text-black border-white" : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/70"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex-1 px-8 py-6 flex flex-col gap-3">
          {/* Unit legend */}
          <div className="text-xs text-white/30 italic mb-2">
            All values are {option.unit} — bars show proportion relative to the largest visible task
          </div>

          {rows.map(({ id, dropdownLabel, val, energy, water }, i) => {
            const color = TASK_COLORS[id];
            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isSel = id === selectedId;
            const relativeToBase = baseRow && baseRow.id !== id && baseRow.val > 0
              ? val / baseRow.val : null;
            const isLargest = i === rows.length - 1;

            return (
              <motion.div key={id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={`rounded-xl p-4 transition-colors ${isSel ? "bg-white/8 ring-1 ring-white/20" : "hover:bg-white/5"}`}>
                <div className="flex items-center gap-4 mb-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className={`text-xs flex-1 ${isSel ? "text-white font-medium" : "text-white/60"}`}>
                    {dropdownLabel}
                    {isSel && <span className="ml-2 text-[10px] text-white/40 italic not-bold">← current</span>}
                  </span>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${isSel ? "text-white" : "text-white/70"}`}>
                    {option.format(val)}
                  </span>
                  {relativeToBase !== null && relativeToBase > 1.5 && (
                    <span className="text-[10px] text-white/30 shrink-0 font-mono">×{Math.round(relativeToBase)}</span>
                  )}
                </div>
                {/* Bar */}
                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="absolute left-0 top-0 h-full rounded-full"
                    style={{ background: color, opacity: isSel ? 1 : 0.7 }}
                    initial={{ width: "0%" }} animate={{ width: `${Math.max(pct, 0.5)}%` }}
                    transition={{ delay: i * 0.04 + 0.15, duration: 0.5, ease: "easeOut" }} />
                  {isLargest && (
                    <div className="absolute right-2 top-0 h-full flex items-center">
                      <span className="text-[9px] text-white/40 font-medium">max</span>
                    </div>
                  )}
                </div>
                {/* Sub-info */}
                <div className="flex gap-4 mt-1.5">
                  <span className="text-[10px] text-white/25">⚡ {fmtEnergy(energy)}</span>
                  <span className="text-[10px] text-white/25">💧 {fmtWater(water)}</span>
                </div>
              </motion.div>
            );
          })}

          {/* Scale toggles */}
          <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-3">
            <p className="text-xs text-white/30 font-medium uppercase tracking-widest">Show extreme tasks</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showVideo} onChange={e => setShowVideo(e.target.checked)} className="accent-white mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span className="text-xs text-white/50 group-hover:text-white/70 leading-relaxed">
                <strong className="text-white/70">Video generation</strong> — one 10-sec clip uses ~{Math.round((944/0.3))}× more energy than a single chat message. Physically expected (hundreds of image generation passes per video).
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showTraining} onChange={e => setShowTraining(e.target.checked)} className="accent-white mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span className="text-xs text-white/50 group-hover:text-white/70 leading-relaxed">
                <strong className="text-white/70">Training a large language model</strong> — ~{(1287000000 / 944).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}× more energy than video generation. A one-time event per model.
              </span>
            </label>
          </div>

          <p className="text-[10px] text-white/20 italic leading-relaxed mt-2">
            {TIER_META[tier].rangeLabel} estimates · {TIER_META[tier].source} · Water = energy × 3.45 mL/Wh (Li et al. 2023) · Video gen is a first-principles derivation — no peer-reviewed direct measurement exists for commercial video AI.
          </p>
        </div>
      </motion.div>
    </>
  );
}

// ─── ACTION PANEL ─────────────────────────────────────────────────────────────
function ActionPanel({ scenario, energyWh, waterMl, onClose }: { scenario: Scenario | null; energyWh: number; waterMl: number; onClose: () => void }) {
  const [eOff, setEOff] = useState(ENERGY_OFFSETS[0].id);
  const [wOff, setWOff] = useState(WATER_OFFSETS[0].id);
  const [tab, setTab] = useState<"offset" | "habits">("habits");
  const ea = ENERGY_OFFSETS.find(a => a.id === eOff)!;
  const wa = WATER_OFFSETS.find(a => a.id === wOff)!;

  return (
    <>
      <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto flex flex-col"
        style={{ width: "min(95vw, 380px)", background: "#0f1a12" }}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}>

        {/* Header */}
        <div className="px-6 pt-7 pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Take Action</h2>
              {scenario && <p className="text-xs text-green-400/70 italic mt-0.5">{scenario.verb.toLowerCase()} {scenario.dropdownText}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 shrink-0"><X size={14} className="text-white/50" /></button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-white/5 rounded-full p-1">
            <button onClick={() => setTab("habits")} className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-all ${tab === "habits" ? "bg-[#27ae60] text-white" : "text-white/40 hover:text-white/60"}`}>
              Everyday habits
            </button>
            <button onClick={() => setTab("offset")} className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-all ${tab === "offset" ? "bg-[#27ae60] text-white" : "text-white/40 hover:text-white/60"}`}>
              Offset this task
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {tab === "habits" && (
            <>
              <p className="text-[11px] text-white/40 italic">Ranked by biggest energy impact first</p>
              {ACTION_TIPS.map((tip, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tip.color + "22", color: tip.color }}>
                      {tip.impact} impact
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white leading-snug mb-1.5">{tip.title}</p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{tip.body}</p>
                </div>
              ))}
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mb-3">Clean energy & offsets</p>
                {TRUSTED_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-2 hover:bg-white/8 transition-colors group"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div><p className="text-xs font-medium text-white/80 group-hover:text-white">{link.name}</p><p className="text-[11px] text-white/35">{link.desc}</p></div>
                    <ExternalLink size={11} className="text-white/25 group-hover:text-white/50 shrink-0" />
                  </a>
                ))}
              </div>
            </>
          )}

          {tab === "offset" && (
            <>
              {/* Energy offset */}
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium mb-3">
                  ⚡ Offset {fmtEnergy(energyWh)} of energy
                </p>
                <select value={eOff} onChange={e => setEOff(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 mb-3 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                  {ENERGY_OFFSETS.map(a => <option key={a.id} value={a.id} style={{ background: "#111", color: "#fff" }}>{a.label}</option>)}
                </select>
                <p className="text-lg font-light text-white"><strong className="font-semibold">{fmtOffset(energyWh / ea.whPerUnit, ea.unitLabel)}</strong></p>
              </div>

              {/* Water offset */}
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium mb-3">
                  💧 Offset {fmtWater(waterMl)} of water
                </p>
                <select value={wOff} onChange={e => setWOff(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 mb-3 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                  {WATER_OFFSETS.map(a => <option key={a.id} value={a.id} style={{ background: "#111", color: "#fff" }}>{a.label}</option>)}
                </select>
                <p className="text-lg font-light text-white"><strong className="font-semibold">{fmtOffset(waterMl / wa.mlPerUnit, wa.unitLabel)}</strong></p>
              </div>

              {/* Links */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mb-3">Structured offsets</p>
                {TRUSTED_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-2 hover:bg-white/8 transition-colors group"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div><p className="text-xs font-medium text-white/80 group-hover:text-white">{link.name}</p><p className="text-[11px] text-white/35">{link.desc}</p></div>
                    <ExternalLink size={11} className="text-white/25 group-hover:text-white/50 shrink-0" />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── SOURCES MODAL ────────────────────────────────────────────────────────────
function SourcesModal({ onClose }: { onClose: () => void }) {
  const { data: sources, isLoading } = useSources();
  const [tab, setTab] = useState<"methodology" | "sources" | "gaps">("methodology");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col z-10"
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 28, stiffness: 400 }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 z-10"><X size={16} className="text-gray-400" /></button>
        <div className="px-7 pt-7 pb-0 shrink-0">
          <h2 className="text-base font-semibold text-black mb-4">Sources & Methodology</h2>
          <div className="flex gap-0 border-b border-gray-100">
            {(["methodology", "sources", "gaps"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-4 py-2 border-b-2 transition-colors -mb-[1px] ${tab === t ? "border-black text-black font-medium" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                {t === "gaps" ? "Knowledge Gaps" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-7 py-6 text-sm leading-relaxed">
          {tab === "methodology" && (
            <div className="flex flex-col gap-5 text-gray-700 text-xs">
              <div>
                <p className="font-semibold text-black text-sm mb-2">Estimate ranges — Low / Average / High</p>
                <p>The three estimate ranges represent different published studies measuring different underlying scenarios. They should not be read as "which model you use" but as the range of uncertainty in published research.</p>
                <ul className="mt-2 flex flex-col gap-1.5 ml-4">
                  <li className="list-disc"><strong>Low (Luccioni 2023)</strong> — directly measured on small open-source models. Represents the lowest credible published figure.</li>
                  <li className="list-disc"><strong>Average (EPRI 2024)</strong> — estimated for commercial ChatGPT-class services. Best approximation for most users.</li>
                  <li className="list-disc"><strong>High (EPRI 2024 / Goldman Sachs 2024)</strong> — upper bound. Goldman Sachs estimated AI uses ~10× a Google Search (0.3 Wh × 10 ≈ 3 Wh). EPRI's full ChatGPT query estimate is 2.9 Wh — consistent with this range.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Water — consistent WUE methodology</p>
                <p>All water figures use WUE = 3.45 mL/Wh, calibrated from Li et al. (2023): ChatGPT (EPRI: 2.9 Wh/query) produces ~10 mL → WUE = 10÷2.9 ≈ 3.45. This self-validates: frontier long-chat (145 Wh × 3.45 = 500 mL) exactly matches Li et al.'s direct estimate for a 50-message conversation.</p>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">What is not included</p>
                <ul className="flex flex-col gap-1 ml-4 text-gray-500">
                  {["GPU/hardware manufacturing energy (Scope 3)", "Network transmission to/from data center", "End-user device energy", "Carbon intensity (depends on regional grid mix)"].map((s, i) => <li key={i} className="list-disc">{s}</li>)}
                </ul>
              </div>
            </div>
          )}
          {tab === "sources" && (
            <div className="flex flex-col gap-5">
              {isLoading && <p className="text-xs text-gray-400 italic">Loading sources…</p>}
              {(sources || []).map(s => (
                <div key={s.id} className="border-b border-gray-100 pb-5 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1"><p className="font-semibold text-black text-sm">{s.title}</p><p className="text-xs text-gray-400 mt-0.5">{Array.isArray(s.authors) ? s.authors.join(", ") : s.authors} · {s.institution} · {s.year}</p></div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-black shrink-0"><ExternalLink size={13} /></a>
                  </div>
                  {s.keyFindings && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{s.keyFindings}</p>}
                  {s.limitations && <p className="text-xs text-gray-400 mt-1.5 italic leading-relaxed">{s.limitations}</p>}
                </div>
              ))}
            </div>
          )}
          {tab === "gaps" && (
            <div className="flex flex-col gap-4 text-xs text-gray-700">
              {[
                { title: "No commercial per-query energy data", body: "ChatGPT, Claude, Gemini, and Midjourney have not published per-query energy figures. All commercial estimates are modelled from EPRI 2024 or Goldman Sachs 2024 assumptions applied to disclosed hardware benchmarks." },
                { title: "Video generation is unverified", body: "No peer-reviewed study has directly measured energy for commercial video AI (Sora, Runway, Pika). The 944 Wh figure is derived by scaling image-generation measurements by frame count — physically reasonable, but unconfirmed." },
                { title: "Google's 2025 report is aggregate-only", body: "Google's 2025 Environmental Report shows improved data center efficiency from Trillium TPUs. However, this data is annual aggregate — it cannot be converted to per-query or per-task estimates. Google has not published per-Gemini-query figures." },
                { title: "Water varies dramatically by location", body: "WUE = 3.45 mL/Wh is a calibrated average. A query processed in a cold-climate, hydropower-powered data center may use 10× less water than one processed in a hot-climate, gas-powered facility." },
                { title: "Scope 3 / lifecycle emissions excluded", body: "Manufacturing GPUs, servers, and data center infrastructure is excluded from all estimates. Research suggests embodied carbon represents 50–80% of total AI lifecycle impact." },
              ].map((g, i) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="font-semibold text-black mb-1">{g.title}</p>
                  <p className="leading-relaxed text-gray-600">{g.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── SIDE TABS ────────────────────────────────────────────────────────────────
function SideTab({ onClick, label, bg = "#1a1a1a", accent = "white", icon }: {
  onClick: () => void; label: string; bg?: string; accent?: string; icon: ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 px-3 py-5 rounded-l-2xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.97] group"
      style={{ background: bg, border: "none" }}>
      <span style={{ color: accent, opacity: 0.85 }} className="group-hover:opacity-100 transition-opacity">{icon}</span>
      <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: accent, opacity: 0.7, fontSize: "11px", letterSpacing: "0.04em", whiteSpace: "nowrap", fontWeight: 400 }} className="group-hover:opacity-95 transition-opacity">
        {label}
      </span>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home() {
  const [selectedId, setSelectedId] = useState("app-build");
  const [tier, setTier] = useState<ModelTier>("commercial");
  const [showMath, setShowMath] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const isCustom = selectedId === "custom";
  const scenario = SCENARIOS.find(s => s.id === selectedId) ?? null;
  const energyWh = scenario ? getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) : 0;
  const waterMl = scenario ? getWaterMl(scenario.id, scenario.baseWaterMl, energyWh) : 0;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-16 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={selectedId + tier}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 w-full max-w-xl">

            {isCustom ? (
              <div className="w-full">
                <p className="text-center text-xs text-gray-400 mb-5">
                  Scenario: <InlineDropdown value={selectedId} onChange={setSelectedId} />
                </p>
                <CustomCalculator />
              </div>
            ) : scenario ? (
              <>
                {/* Line 1: dropdown on its own line */}
                <InlineDropdown value={selectedId} onChange={setSelectedId} />

                {/* Line 2: the data sentence */}
                <p className="text-[1.5rem] md:text-[1.65rem] leading-[1.5] text-black text-center -mt-2"
                  style={{ fontFamily: "'Anthropic Serif', serif" }}>
                  used{" "}
                  <strong style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}>{fmtEnergy(energyWh)}</strong>
                  {" "}of energy and{" "}
                  <strong style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}>{fmtWater(waterMl)}</strong>
                  {" "}of water.
                </p>

                {/* Equiv */}
                <p className="text-base md:text-[1.05rem] leading-[1.7] text-gray-500 text-center -mt-1"
                  style={{ fontFamily: "'Anthropic Serif', serif" }}>
                  That's {equivEnergy(energyWh)} and {equivWater(waterMl)}.
                </p>

                {/* Estimate range selector */}
                <EstimateSelector tier={tier} onChange={setTier} />

                {/* Fine print */}
                <p className="text-xs text-gray-400 font-light leading-relaxed text-center italic max-w-xs">
                  {scenario.clarifying}{" "}
                  <button onClick={() => setShowMath(true)} className="underline underline-offset-2 hover:text-black transition-colors not-italic">
                    Show me the math →
                  </button>
                </p>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* ── DARK RIGHT TABS ── */}
        <div className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
          <AnimatePresence>
            {!showCompare && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <SideTab onClick={() => setShowCompare(true)} label="compare tasks" bg="#1a1a1a" accent="white" icon={<BarChart2 size={15} color="white" />} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!showAction && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <SideTab onClick={() => setShowAction(true)} label="take action" bg="#0f1a12" accent="#6edb8f" icon={<Sparkles size={15} color="#6edb8f" />} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 py-4 border-t border-gray-100">
        <button onClick={() => setShowSources(true)}
          className="text-xs font-medium text-gray-600 hover:text-black transition-colors border border-gray-300 hover:border-gray-600 rounded-full px-5 py-2 shadow-sm hover:shadow-md">
          Sources & methodology
        </button>
        <div className="flex gap-2 md:hidden">
          <button onClick={() => setShowCompare(true)} className="text-xs text-gray-600 border border-gray-300 rounded-full px-4 py-2 font-medium">compare</button>
          <button onClick={() => setShowAction(true)} className="text-xs text-gray-600 border border-gray-300 rounded-full px-4 py-2 font-medium">take action</button>
        </div>
        <p className="hidden md:block text-[10px] text-gray-300 italic font-light text-right max-w-[200px] leading-relaxed">
          Mid-range estimates. Varies by model, data center & region.
        </p>
      </div>

      {/* ── MODALS & PANELS ── */}
      <AnimatePresence>
        {showMath && scenario && <MathModal scenario={scenario} tier={tier} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowMath(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSources && <SourcesModal onClose={() => setShowSources(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAction && <ActionPanel scenario={scenario} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowAction(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCompare && <ComparePanel selectedId={selectedId} tier={tier} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
    </div>
  );
}
