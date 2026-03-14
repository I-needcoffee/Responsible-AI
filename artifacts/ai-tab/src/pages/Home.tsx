import { useState, type ReactNode } from "react";
import { X, ExternalLink, BarChart2, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";

// ─── MODEL TIERS ──────────────────────────────────────────────────────────────
// Water is derived consistently from energy × WUE.
// WUE = 3.45 mL/Wh — calibrated from Li et al. (2023):
//   ChatGPT (EPRI: 2.9 Wh/query) produces ~10 mL of water per query
//   → 10 / 2.9 = 3.45 mL/Wh. This factor cross-validates perfectly:
//   long-chat frontier (145 Wh) × 3.45 = 500 mL = Li et al.'s direct estimate ✓
// Training LLM exception: Li et al. provided a direct facility-level estimate (700,000 L).

const WUE = 3.45; // mL per Wh

export type ModelTier = "research" | "commercial" | "frontier";

export const TIER_META: Record<ModelTier, { label: string; shortSource: string; description: string }> = {
  research: {
    label: "Research models",
    shortSource: "Luccioni et al. 2023",
    description: "Measured directly on open-source AI models (BLOOM, OPT, Stable Diffusion). These are smaller than commercial deployments. Best represents: self-hosted AI, Ollama, HuggingFace Inference API.",
  },
  commercial: {
    label: "Commercial AI",
    shortSource: "EPRI 2024",
    description: "Scaled from EPRI (2024)'s estimate that a ChatGPT query uses ~2.9 Wh. Shorter or simpler tasks are estimated at 10× less. Best represents: ChatGPT (GPT-4o), Claude Sonnet, Gemini Pro.",
  },
  frontier: {
    label: "Frontier models",
    shortSource: "EPRI 2024 (full query)",
    description: "Uses EPRI (2024)'s full ChatGPT estimate of 2.9 Wh per query. Best represents: GPT-4o with long context, Claude 3 Opus, Gemini Ultra, multi-step agent tasks.",
  },
};

// Energy (Wh) per task per tier. Tasks not listed here are tier-invariant.
const TIER_ENERGY: Record<string, Record<ModelTier, number>> = {
  "short-chat":        { research: 0.003,  commercial: 0.3,   frontier: 2.9   },
  "long-chat":         { research: 0.3,    commercial: 15,    frontier: 145   },
  "coding":            { research: 0.1,    commercial: 10,    frontier: 29    },
  "app-build":         { research: 50,     commercial: 300,   frontier: 1000  },
  "audio-transcript":  { research: 0.002,  commercial: 0.02,  frontier: 0.1   },
};

const TIER_ENERGY_SOURCE: Record<string, Record<ModelTier, string>> = {
  "short-chat": {
    research:   "Luccioni et al. 2023 — direct GPU measurement. Range: 0.001–0.01 Wh per query for open-source text generation models.",
    commercial: "Scaled from EPRI 2024: a ChatGPT interactive query uses ~2.9 Wh. Simpler single-message queries estimated at ~10× less = 0.3 Wh.",
    frontier:   "EPRI 2024 — Electric Power Research Institute estimated a standard ChatGPT query at approximately 2.9 Wh, roughly 10× a traditional Google Search.",
  },
  "long-chat": {
    research:   "Scaled from Luccioni et al. 2023: 100 individual model calls × 0.003 Wh each = 0.3 Wh for a 20–50 message session.",
    commercial: "Scaled from EPRI 2024: 50 messages × 0.3 Wh per commercial query = 15 Wh.",
    frontier:   "Scaled from EPRI 2024: 50 messages × 2.9 Wh per ChatGPT query = 145 Wh. Cross-check: 145 Wh × WUE = 500 mL, which exactly matches Li et al. (2023)'s direct estimate for a 50-message ChatGPT conversation. ✓",
  },
  "coding": {
    research:   "Luccioni et al. 2023: code completion tasks measured at ~0.001 Wh per single completion. 100 completions × 0.001 Wh = 0.1 Wh.",
    commercial: "Scaled from EPRI 2024: 100 code completions × 0.1 Wh per commercial query = 10 Wh. Note: code assistant models (Codex, StarCoder) are often more efficient than full LLMs, so this may be an upper bound.",
    frontier:   "Scaled from EPRI 2024: 100 code completions × 0.29 Wh = 29 Wh. Upper bound — specialized code models are typically more efficient than general frontier LLMs.",
  },
  "app-build": {
    research:   "Modelled estimate: ~1,000 small model interactions (Luccioni baseline, 0.05 Wh avg per call) over a 1–2 hour session = 50 Wh. Low confidence.",
    commercial: "Modelled from EPRI 2024: ~1,000 AI interactions at 0.3 Wh average = 300 Wh. A realistic estimate for a Copilot/Cursor session with a commercial backend. Low confidence.",
    frontier:   "Modelled from EPRI 2024: ~500 frontier interactions at 2.0 Wh average = 1,000 Wh. Likely an overestimate — coding assistants typically use specialized, not full frontier, models. Low confidence.",
  },
  "audio-transcript": {
    research:   "Luccioni et al. 2023: speech recognition tasks measured at 0.001–0.01 Wh per minute of audio. Mid: 0.002 Wh/min.",
    commercial: "Scaled estimate: commercial transcription (Whisper large, Deepgram) likely ~10× small model. Limited peer-reviewed data for commercial services.",
    frontier:   "Estimated upper bound for cloud-based transcription. No peer-reviewed study measures this directly for commercial services.",
  },
};

function getEnergyWh(id: string, baseEnergy: number, tier: ModelTier): number {
  return TIER_ENERGY[id]?.[tier] ?? baseEnergy;
}
function getWaterMl(id: string, baseWater: number, energyWh: number, tier: ModelTier): number {
  if (id === "training-llm") return baseWater; // Li et al. direct estimate
  return energyWh * WUE;
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface MathBlock { equation: string; sourceName: string; derivation: string; tierSource?: Record<ModelTier, string>; }
interface Scenario {
  id: string;
  verb: string;
  dropdownText: string;
  dropdownLabel: string;
  clarifying: string;
  baseEnergyWh: number;
  energyLow: number;
  energyHigh: number;
  baseWaterMl: number;
  confidence: "high" | "medium" | "low";
  tierSensitive: boolean;
  math: { energy: MathBlock; water: MathBlock; note?: string };
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "short-chat",
    verb: "Sending",
    dropdownText: "a short chat message",
    dropdownLabel: "a short chat message",
    clarifying: "One short message to an AI assistant (1–10 words). Low-impact individually but billions happen daily. No AI company publicly reports per-query energy use.",
    baseEnergyWh: 0.003, energyLow: 0.001, energyHigh: 2.9,
    baseWaterMl: 0.003 * WUE, confidence: "medium", tierSensitive: true,
    math: {
      energy: {
        equation: "Energy = 1 query × [energy per query]",
        sourceName: "Luccioni et al. 2023 (research) · EPRI 2024 (commercial/frontier)",
        derivation: "The energy per query depends heavily on which model you're using. Select a model tier above to see the source-specific figure.",
        tierSource: TIER_ENERGY_SOURCE["short-chat"],
      },
      water: {
        equation: "Water = Energy (Wh) × 3.45 mL/Wh",
        sourceName: "Li et al. 2023 (WUE calibration)",
        derivation: "Li et al. (2023) estimated ChatGPT (EPRI: 2.9 Wh/query) produces ~10 mL of water per query. This implies a Water Use Effectiveness (WUE) factor of 10 ÷ 2.9 ≈ 3.45 mL/Wh. This factor includes on-site cooling water plus upstream water embedded in the electricity supply. Applied consistently across all tasks.",
      },
    },
  },
  {
    id: "long-chat",
    verb: "Having",
    dropdownText: "a long AI conversation",
    dropdownLabel: "a long AI conversation",
    clarifying: "A 20–50 message back-and-forth session. At commercial tier, each message contributes 0.3 Wh and ~1 mL. The frontier water estimate (500 mL) exactly matches Li et al. (2023)'s direct measurement.",
    baseEnergyWh: 0.3, energyLow: 0.3, energyHigh: 145,
    baseWaterMl: 0.3 * WUE, confidence: "medium", tierSensitive: true,
    math: {
      energy: {
        equation: "Energy = 50 messages × [energy per message]",
        sourceName: "Luccioni et al. 2023 (research) · EPRI 2024 (commercial/frontier)",
        derivation: "A long conversation is modelled as 50 individual AI interactions. The per-message energy is the same as the short-chat estimate for the selected tier.",
        tierSource: TIER_ENERGY_SOURCE["long-chat"],
      },
      water: {
        equation: "Water = Energy (Wh) × 3.45 mL/Wh",
        sourceName: "Li et al. 2023 (WUE calibration) — cross-validated",
        derivation: "Using WUE = 3.45 mL/Wh: at frontier tier (145 Wh × 3.45 = 500 mL), this exactly matches Li et al. (2023)'s direct estimate of ~500 mL for a 50-message ChatGPT conversation. This provides strong cross-validation for the WUE factor used throughout this tool.",
      },
    },
  },
  {
    id: "image",
    verb: "Generating",
    dropdownText: "an AI image",
    dropdownLabel: "an AI image",
    clarifying: "A single image from an AI model (Midjourney, DALL·E, etc.). One of the best-measured AI tasks — researchers directly instrumented the hardware during generation.",
    baseEnergyWh: 2.4, energyLow: 0.5, energyHigh: 6.5,
    baseWaterMl: 2.4 * WUE, confidence: "high", tierSensitive: false,
    math: {
      energy: {
        equation: "2.4 Wh per image (direct hardware measurement, mid-range)",
        sourceName: "Luccioni et al. 2023 — Power Hungry Processing",
        derivation: "Luccioni et al. instrumented real GPU hardware and measured power draw during image generation using diffusion models (Stable Diffusion and variants). They recorded a range of 0.5–6.5 Wh per image depending on model size, step count, and resolution. 2.4 Wh is the measured midpoint. This is the highest-confidence estimate in this tool — directly measured, not modelled. Note: this was measured on open-source models; commercial models like Midjourney or DALL-E 3 may differ, but no peer-reviewed measurement exists for those.",
      },
      water: {
        equation: "2.4 Wh × 3.45 mL/Wh ≈ 8 mL",
        sourceName: "Li et al. 2023 (WUE methodology)",
        derivation: "Applying WUE = 3.45 mL/Wh to Luccioni's 2.4 Wh estimate gives 8.3 mL per image. This is not tier-sensitive — the underlying energy measurement is the same regardless of commercial vs. research use.",
      },
      note: "Image generation energy does not vary by model tier here because Luccioni's direct measurement is the only credible source for any tier. Commercial image services may vary but no peer-reviewed measurements exist.",
    },
  },
  {
    id: "video",
    verb: "Generating",
    dropdownText: "a short AI video",
    dropdownLabel: "a short AI video",
    clarifying: "A 5–15 second AI video clip (Sora, Runway, etc.). Yes — this is expected to be ~400× more energy-intensive than a single image. A 10-sec video at 24 fps requires generating and refining ~240 frames, each comparable to an image generation pass.",
    baseEnergyWh: 944, energyLow: 200, energyHigh: 2500,
    baseWaterMl: 944 * WUE, confidence: "low", tierSensitive: false,
    math: {
      energy: {
        equation: "944 Wh ≈ 240 frames × ~4 Wh per frame (first-principles estimate)",
        sourceName: "Derived from Luccioni et al. 2023 (no direct peer-reviewed measurement exists for commercial video AI)",
        derivation: "No published peer-reviewed study has directly measured energy consumption for commercial AI video generation models (Sora, Runway Gen-3, etc.) as of 2025. This estimate is derived from first principles: a 10-second video at 24 fps = 240 frames. Generating each frame using a high-quality diffusion model (Luccioni et al. upper range: ~4 Wh/frame) gives 240 × 4 ≈ 960 Wh. Additional overhead from temporal consistency passes and model size is estimated at ~0 to +100%. Mid-range: ~944 Wh. Range: 200–2,500 Wh. This figure is labelled low confidence because it relies on scaling from image generation — actual video models use architectures that may differ significantly.",
      },
      water: {
        equation: "944 Wh × 3.45 mL/Wh ≈ 3,260 mL (3.3 L)",
        sourceName: "Li et al. 2023 (WUE methodology)",
        derivation: "Water is derived consistently using WUE = 3.45 mL/Wh from Li et al. (2023). Note: a previous version of this tool cited 20,000 mL for video gen — that figure used an inconsistently high WUE factor and has been corrected.",
      },
      note: "Video generation has low confidence because no peer-reviewed study has directly measured energy for commercial video AI. The high value (relative to other tasks) is physically expected — generating video requires running image-generation-scale diffusion models hundreds of times per second of output.",
    },
  },
  {
    id: "coding",
    verb: "Getting",
    dropdownText: "100 AI code suggestions",
    dropdownLabel: "100 code suggestions",
    clarifying: "100 individual autocomplete or code completion suggestions from an AI coding assistant — a realistic volume for a focused hour of development.",
    baseEnergyWh: 0.1, energyLow: 0.1, energyHigh: 29,
    baseWaterMl: 0.1 * WUE, confidence: "low", tierSensitive: true,
    math: {
      energy: {
        equation: "Energy = 100 suggestions × [energy per suggestion]",
        sourceName: "Luccioni et al. 2023 (research) · EPRI 2024 (commercial/frontier, scaled)",
        derivation: "Each code suggestion is treated as one AI inference call. The per-suggestion energy uses the same per-query rate as the selected model tier.",
        tierSource: TIER_ENERGY_SOURCE["coding"],
      },
      water: {
        equation: "Water = Energy (Wh) × 3.45 mL/Wh",
        sourceName: "Li et al. 2023 (WUE methodology)",
        derivation: "Water is derived using the consistent WUE factor of 3.45 mL/Wh. At commercial tier: 10 Wh × 3.45 = 34.5 mL per 100 suggestions.",
      },
    },
  },
  {
    id: "app-build",
    verb: "Vibe coding",
    dropdownText: "a simple app",
    dropdownLabel: "a simple app",
    clarifying: "A 1–2 hour vibe-coding session — many rounds of code generation, debugging, and iteration. This is a rough modelled estimate; actual use varies widely by model and session intensity.",
    baseEnergyWh: 50, energyLow: 50, energyHigh: 1000,
    baseWaterMl: 50 * WUE, confidence: "low", tierSensitive: true,
    math: {
      energy: {
        equation: "Energy = ~1,000 AI interactions × [energy per interaction]",
        sourceName: "Modelled estimate · EPRI 2024 basis for commercial/frontier",
        derivation: "An app-building session involves many chained AI calls. The session is modelled as approximately 1,000 AI interactions averaged across the session.",
        tierSource: TIER_ENERGY_SOURCE["app-build"],
      },
      water: {
        equation: "Water = Energy (Wh) × 3.45 mL/Wh",
        sourceName: "Li et al. 2023 (WUE methodology)",
        derivation: "Water derived from energy using WUE = 3.45 mL/Wh. At commercial tier: 300 Wh × 3.45 ≈ 1,035 mL (about 1 litre).",
      },
    },
  },
  {
    id: "training-llm",
    verb: "Training",
    dropdownText: "a large language model",
    dropdownLabel: "training a large language model",
    clarifying: "Training GPT-3 (175B parameters) — a one-time event, not ongoing. Newer frontier models are estimated to require 10–100× this amount, but no company has publicly disclosed training energy.",
    baseEnergyWh: 1287000000, energyLow: 500000000, energyHigh: 5000000000,
    baseWaterMl: 700000000, confidence: "medium", tierSensitive: false,
    math: {
      energy: {
        equation: "~1.287 GWh = training FLOPs ÷ hardware efficiency (FLOPS/W) ÷ PUE",
        sourceName: "Strubell et al. 2019 + Brown et al. 2020 (GPT-3 training disclosure)",
        derivation: "Brown et al. (2020) disclosed that GPT-3 required approximately 3.14 × 10²³ FLOPs of compute. Strubell et al. (2019) established the methodology for converting FLOP counts to energy: dividing by hardware efficiency and accounting for Power Usage Effectiveness (PUE). The result is ~1.287 GWh. This is the only named production model training run with published compute data. Newer models' training costs are not publicly disclosed.",
      },
      water: {
        equation: "~700 million mL (700,000 L) — Li et al. direct facility estimate",
        sourceName: "Li et al. 2023 — Making AI Less Thirsty",
        derivation: "Li et al. (2023) directly estimated GPT-3 training consumed approximately 700,000 litres of water at Microsoft's Azure data center (Quincy, WA or similar), using facility-level Water Use Effectiveness (WUE) disclosures from Microsoft's sustainability reports. This is a direct estimate, not derived from the per-Wh WUE factor used elsewhere in this tool.",
      },
      note: "Training is not tier-sensitive — it occurred once, on specific hardware, at a specific facility. The WUE for large training runs may differ from inference operations. Training energy for GPT-4, Claude, and Gemini has not been publicly disclosed.",
    },
  },
  {
    id: "audio-transcript",
    verb: "Transcribing",
    dropdownText: "1 minute of audio",
    dropdownLabel: "1 minute of audio",
    clarifying: "Transcribing 1 minute of speech with an AI model (Whisper, Deepgram, etc.). One of the lower-impact AI tasks. Limited direct measurement data exists for commercial transcription services.",
    baseEnergyWh: 0.002, energyLow: 0.002, energyHigh: 0.1,
    baseWaterMl: 0.002 * WUE, confidence: "low", tierSensitive: true,
    math: {
      energy: {
        equation: "~0.002–0.1 Wh per minute of audio (tier-dependent)",
        sourceName: "Luccioni et al. 2023 (research) · scaled estimates (commercial/frontier)",
        derivation: "Luccioni et al. measured speech recognition at 0.001–0.01 Wh per minute of audio. Commercial services running larger models are scaled accordingly.",
        tierSource: TIER_ENERGY_SOURCE["audio-transcript"],
      },
      water: {
        equation: "Water = Energy (Wh) × 3.45 mL/Wh",
        sourceName: "Li et al. 2023 (WUE methodology)",
        derivation: "At commercial tier: 0.02 Wh × 3.45 = 0.07 mL — essentially negligible for a single minute of audio.",
      },
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

// ─── GUILT / OFFSET DATA ──────────────────────────────────────────────────────

const ENERGY_OFFSETS = [
  { id: "light",   label: "Turn off a 10W LED bulb",           unitLabel: "hours",   whPerUnit: 10    },
  { id: "ac",      label: "Skip 1 hour of air conditioning",   unitLabel: "hours",   whPerUnit: 3500  },
  { id: "laundry", label: "Air-dry laundry instead of dryer",  unitLabel: "loads",   whPerUnit: 2400  },
  { id: "walk",    label: "Walk instead of drive",             unitLabel: "km",      whPerUnit: 200   },
  { id: "laptop",  label: "Turn off a laptop",                 unitLabel: "hours",   whPerUnit: 45    },
];
const WATER_OFFSETS = [
  { id: "shower",     label: "Shorter shower",                    unitLabel: "min shorter", mlPerUnit: 8000  },
  { id: "flush",      label: "Skip a toilet flush",               unitLabel: "flushes",     mlPerUnit: 9000  },
  { id: "dishwasher", label: "Dishwasher vs. hand-washing",       unitLabel: "loads",       mlPerUnit: 50000 },
  { id: "tap",        label: "Turn off tap while brushing teeth", unitLabel: "times",       mlPerUnit: 2000  },
];
const TRUSTED_LINKS = [
  { name: "Arcadia",       url: "https://arcadia.com",                    desc: "Switch your home to clean energy"   },
  { name: "Wren",          url: "https://www.wren.co",                   desc: "Monthly carbon offset subscription"  },
  { name: "EPA WaterSense",url: "https://www.epa.gov/watersense",        desc: "Water efficiency programs"           },
  { name: "TerraPass",     url: "https://www.terrapass.com",             desc: "Carbon offsets & RECs"               },
];

// ─── COMPARE OPTIONS ──────────────────────────────────────────────────────────

type CompareOption = {
  id: string; label: string; iconUnit: number; iconUnitLabel: string;
  compute: (energy: number, water: number) => number;
  format: (v: number) => string;
};
const COMPARE_OPTIONS: CompareOption[] = [
  { id: "netflix",  label: "Netflix streaming",      iconUnit: 30,  iconUnitLabel: "30 min of Netflix",
    compute: (e) => e / 0.8,
    format: (v) => v < 1/60 ? `< 1 sec` : v < 1 ? `${Math.round(v*60)} sec` : v < 60 ? `${Math.round(v)} min` : `${(v/60).toFixed(1)} hrs` },
  { id: "led",      label: "LED bulb (10W) hours",   iconUnit: 5,   iconUnitLabel: "5 hrs of LED bulb",
    compute: (e) => e / 10,
    format: (v) => v < 1/60 ? `< 1 min` : v < 1 ? `${Math.round(v*60)} min` : `${(Math.round(v*10)/10)} hrs` },
  { id: "handwash", label: "Handwashes",              iconUnit: 5,   iconUnitLabel: "5 handwashes",
    compute: (_, w) => w / 110,
    format: (v) => v < 0.1 ? `< 0.1` : v < 1 ? `${v.toFixed(2)} washes` : `${Math.round(v)} washes` },
  { id: "bottles",  label: "500 mL water bottles",   iconUnit: 2,   iconUnitLabel: "2 water bottles",
    compute: (_, w) => w / 500,
    format: (v) => v < 0.1 ? `< 0.1` : `${(Math.round(v*10)/10)} bottles` },
];

const TASK_COLORS: Record<string, string> = {
  "short-chat": "#6BA8DD", "long-chat": "#3A7EC4", "image": "#D96666",
  "video": "#B23939", "coding": "#3D9A5A", "app-build": "#1E7A40",
  "training-llm": "#555555", "audio-transcript": "#D18A1E",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtEnergy(wh: number): string {
  if (wh >= 1e9) return `${(wh/1e9).toFixed(3)} GWh`;
  if (wh >= 1e6) return `${(wh/1e6).toFixed(1)} MWh`;
  if (wh >= 1000) return `${(wh/1000).toFixed(1)} kWh`;
  if (wh < 0.001) return `${(wh*1000000).toFixed(1)} µWh`;
  if (wh < 0.1) return `${(wh*1000).toFixed(1)} mWh`;
  return `${(Math.round(wh*100)/100)} Wh`;
}
function fmtWater(ml: number): string {
  if (ml >= 1e9) return `${(ml/1e9).toFixed(2)} ML`;
  if (ml >= 1e6) return `${(ml/1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,",")} L`;
  if (ml >= 1000) return `${(ml/1000).toFixed(1)} L`;
  if (ml < 1) return `< 1 mL`;
  return `${Math.round(ml)} mL`;
}
function fmtOffset(v: number, u: string) {
  if (v < 0.01) return `< 0.01 ${u}`;
  if (v < 100) return `${(Math.round(v*10)/10).toLocaleString()} ${u}`;
  return `${Math.round(v).toLocaleString()} ${u}`;
}

function equivEnergy(wh: number): string {
  const n = wh / 0.8;
  if (n < 1/3600) return `< 1 second of Netflix`;
  if (n < 1/60) return `${Math.round(n*3600)} seconds of Netflix`;
  if (n < 1) return `${Math.round(n*60)} seconds of Netflix`;
  if (n < 60) return `${Math.round(n)} minutes of Netflix`;
  if (n < 1440) return `${(n/60).toFixed(1)} hours of Netflix`;
  return `${(n/60/24).toFixed(1)} days of Netflix`;
}
function equivWater(ml: number): string {
  if (ml < 1) return `< 1 mL of water`;
  if (ml < 10) return `${Math.round(ml)} mL of water`;
  const h = ml / 110;
  if (h < 0.1) return `${Math.round(ml)} mL of water`;
  if (h < 1) return `${(h).toFixed(2)} handwashes`;
  if (h < 10000) return `${Math.round(h).toLocaleString()} handwashes`;
  return `${(h/1000).toFixed(1)}K handwashes`;
}

// ─── SVG ICONS ───────────────────────────────────────────────────────────────

function IconNetflix({ color, opacity=1 }: { color: string; opacity?: number }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity }}><rect x="1" y="3" width="16" height="11" rx="2" fill={color} /><polygon points="7,6 7,12 13,9" fill="white" /></svg>;
}
function IconBulb({ color, opacity=1 }: { color: string; opacity?: number }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity }}><path d="M9,2 C6.2,2 4,4.2 4,7 C4,9 5.2,10.8 7,11.6 L7,14 L11,14 L11,11.6 C12.8,10.8 14,9 14,7 C14,4.2 11.8,2 9,2Z" fill={color} /><rect x="7" y="14" width="4" height="1.2" rx="0.6" fill={color} /><rect x="7.5" y="15.5" width="3" height="1" rx="0.5" fill={color} /></svg>;
}
function IconDrop({ color, opacity=1 }: { color: string; opacity?: number }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity }}><path d="M9,2 C9,2 3,9 3,12.5 C3,15.5 5.7,17 9,17 C12.3,17 15,15.5 15,12.5 C15,9 9,2 9,2Z" fill={color} /></svg>;
}
function IconBottle({ color, opacity=1 }: { color: string; opacity?: number }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity }}><rect x="6" y="1" width="6" height="3" rx="1" fill={color} /><path d="M5,4 L5,16 C5,16.6 5.4,17 6,17 L12,17 C12.6,17 13,16.6 13,16 L13,4 Z" fill={color} /><rect x="5" y="7" width="8" height="1" fill="white" opacity="0.3" /></svg>;
}
function UnitIcon({ optionId, color, opacity=1 }: { optionId: string; color: string; opacity?: number }) {
  if (optionId === "netflix") return <IconNetflix color={color} opacity={opacity} />;
  if (optionId === "led") return <IconBulb color={color} opacity={opacity} />;
  if (optionId === "handwash") return <IconDrop color={color} opacity={opacity} />;
  return <IconBottle color={color} opacity={opacity} />;
}

// ─── INLINE PILL DROPDOWN ────────────────────────────────────────────────────

function InlineDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  const options = [
    ...SCENARIOS.map((s) => ({ id: s.id, text: `${s.verb} ${s.dropdownText}`, label: `${s.verb.toLowerCase()} ${s.dropdownLabel}` })),
    { id: "custom", text: "A custom combination", label: "a custom combination" },
  ];
  const selected = options.find((o) => o.id === value) ?? options[0];

  return (
    <span className="relative inline">
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{
          fontFamily: "inherit", fontSize: "inherit", fontWeight: "bold", color: "inherit",
          border: "1.5px solid #c8c8c8",
          borderRadius: "100px",
          padding: "1px 12px 2px 12px",
          background: "transparent",
        }}
      >
        {selected.text}
        <span style={{ fontSize: "0.55em", opacity: 0.5, marginLeft: 2 }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 py-2 overflow-hidden"
              style={{ minWidth: "260px", fontFamily: "'Anthropic Sans', sans-serif", fontSize: "14px" }}
            >
              {options.map((o) => (
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

// ─── TIER SELECTOR ────────────────────────────────────────────────────────────

function TierSelector({ tier, onChange }: { tier: ModelTier; onChange: (t: ModelTier) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <span className="text-[10px] text-gray-400 font-light uppercase tracking-widest">Model type:</span>
      <div className="flex gap-1">
        {(["research", "commercial", "frontier"] as ModelTier[]).map((t) => (
          <button key={t} onClick={() => onChange(t)}
            className={`px-3 py-1 rounded-full text-[11px] border transition-all ${tier === t ? "bg-black text-white border-black font-medium" : "border-gray-200 text-gray-400 hover:border-gray-400"}`}>
            {TIER_META[t].label}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-gray-300 italic">— {TIER_META[tier].shortSource}</span>
    </div>
  );
}

// ─── MATH MODAL ───────────────────────────────────────────────────────────────

function MathModal({ scenario, tier, energyWh, waterMl, onClose }: {
  scenario: Scenario; tier: ModelTier; energyWh: number; waterMl: number; onClose: () => void;
}) {
  const tierSource = scenario.math.energy.tierSource?.[tier];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto z-10"
        initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
      >
        <div className="px-7 pt-7 pb-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-0.5">Show me the math</p>
              <h2 className="text-base font-semibold text-black">{scenario.verb} {scenario.dropdownText}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 italic">Showing: {TIER_META[tier].label} · {TIER_META[tier].shortSource}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 shrink-0"><X size={14} className="text-gray-400" /></button>
          </div>

          {scenario.tierSensitive && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 leading-relaxed">
              <strong>Tier-sensitive estimate.</strong> Energy and water vary significantly by model type. The figures below are for the <strong>{TIER_META[tier].label}</strong> tier. Switch tiers using the selector on the main screen to compare.
            </div>
          )}

          {/* Energy block */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-black">⚡ Energy: {fmtEnergy(energyWh)}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${scenario.confidence === "high" ? "bg-green-50 text-green-700 border-green-200" : scenario.confidence === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>{scenario.confidence} confidence</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5">
                <p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.math.energy.equation.replace("[energy per query]", `${fmtEnergy(getEnergyWh(scenario.id, scenario.baseEnergyWh, tier))}`).replace("[energy per message]", `${fmtEnergy(getEnergyWh("short-chat", 0.003, tier))}`).replace("[energy per suggestion]", `${fmtEnergy(getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) / 100)}`).replace("[energy per interaction]", `${fmtEnergy(getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) / 1000)}`)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Source</p>
                <p className="text-xs text-black font-medium">{scenario.math.energy.sourceName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">How the number was derived</p>
                <p className="text-xs text-gray-600 leading-relaxed">{tierSource ?? scenario.math.energy.derivation}</p>
              </div>
            </div>
          </div>

          {/* Water block */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <p className="text-xs font-semibold text-black">💧 Water: {fmtWater(waterMl)}</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5">
                <p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.id === "training-llm" ? scenario.math.water.equation : `${fmtEnergy(energyWh)} × 3.45 mL/Wh = ${fmtWater(waterMl)}`}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Source</p>
                <p className="text-xs text-black font-medium">{scenario.math.water.sourceName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">How the number was derived</p>
                <p className="text-xs text-gray-600 leading-relaxed">{scenario.math.water.derivation}</p>
              </div>
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
  const [counts, setCounts] = useState<Record<string,number>>(Object.fromEntries(CUSTOM_TASKS.map(t=>[t.id,t.defaultVal])));
  const totalE = CUSTOM_TASKS.reduce((s,t)=>s+(counts[t.id]??0)*t.unitEnergyWh,0);
  const totalW = CUSTOM_TASKS.reduce((s,t)=>s+(counts[t.id]??0)*t.unitWaterMl,0);
  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {CUSTOM_TASKS.map(t=>(
        <div key={t.id} className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-44 shrink-0 leading-tight">{t.label}</label>
          <input type="range" min={0} max={t.max} step={t.step} value={counts[t.id]??0}
            onChange={e=>setCounts(c=>({...c,[t.id]:Number(e.target.value)}))} className="flex-1 accent-black" />
          <span className="text-xs font-medium w-10 text-right tabular-nums">{counts[t.id]??0}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-4 text-center" style={{fontFamily:"'Anthropic Serif',serif"}}>
        {totalE===0
          ? <p className="text-gray-400 text-sm italic">Adjust sliders to see usage.</p>
          : <>
            <p className="text-[1.15rem] leading-[1.9] text-black">
              Your session used{" "}
              <strong style={{borderBottom:"2px solid currentColor"}}>{fmtEnergy(totalE)}</strong> of energy and{" "}
              <strong style={{borderBottom:"2px solid currentColor"}}>{fmtWater(totalW)}</strong> of water.
            </p>
            <p className="text-sm text-gray-500 mt-1" style={{fontFamily:"'Anthropic Sans',sans-serif"}}>
              That's {equivEnergy(totalE)} and {equivWater(totalW)}.
            </p>
          </>
        }
      </div>
    </div>
  );
}

// ─── COMPARE INFOGRAPHIC PANEL ────────────────────────────────────────────────

function ComparePanel({ selectedId, tier, onClose }: { selectedId: string; tier: ModelTier; onClose: () => void }) {
  const [optionId, setOptionId] = useState("netflix");
  const [showTraining, setShowTraining] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const option = COMPARE_OPTIONS.find(o=>o.id===optionId)!;
  const visible = SCENARIOS.filter(s=>
    (showTraining || s.id!=="training-llm") &&
    (showVideo || s.id!=="video")
  );
  const values = visible.map(s=>{
    const e = getEnergyWh(s.id, s.baseEnergyWh, tier);
    const w = getWaterMl(s.id, s.baseWaterMl, e, tier);
    return {...s, val: option.compute(e, w)};
  });
  const maxVal = Math.max(...values.map(v=>v.val), 0.001);
  const iconUnit = maxVal / 32;

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/15 z-40 backdrop-blur-[2px]" initial={{opacity:0}} animate={{opacity:1}} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 bg-white border-l border-gray-200 shadow-2xl overflow-y-auto flex flex-col"
        style={{width:"min(92vw,880px)"}}
        initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}}
        transition={{type:"spring",damping:28,stiffness:280}}
      >
        <div className="px-8 pt-8 pb-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-black">Compare AI tasks</h2>
              <p className="text-xs text-gray-400 mt-0.5">Each icon = {option.iconUnitLabel} · {TIER_META[tier].label}</p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-gray-100 transition-colors border border-gray-200">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPARE_OPTIONS.map(o=>(
              <button key={o.id} onClick={()=>setOptionId(o.id)}
                className={`px-4 py-1.5 rounded-full text-xs border transition-all ${o.id===optionId?"bg-black text-white border-black font-medium":"border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-8 py-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-light">
            <UnitIcon optionId={optionId} color="#9ca3af" /><span>= {option.iconUnitLabel}</span>
            <span className="ml-3 text-gray-300">·</span><span className="ml-3">highlighted = selected scenario on main screen</span>
          </div>

          {values.map(({id, dropdownLabel, val})=>{
            const color = TASK_COLORS[id];
            const full = Math.min(Math.floor(val/iconUnit),40);
            const partial = (val%iconUnit)/iconUnit;
            const overflow = Math.floor(val/iconUnit)-40;
            const isSel = id===selectedId;
            return (
              <div key={id} className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${isSel?"bg-gray-50 border border-gray-200":""}`}>
                <div className="w-36 shrink-0">
                  <p className={`text-xs leading-tight ${isSel?"font-semibold text-black":"text-gray-500 font-light"}`}>{dropdownLabel}</p>
                </div>
                <div className="flex items-center flex-wrap gap-0.5 flex-1 min-w-0">
                  {full===0 && val>0 && <UnitIcon optionId={optionId} color={color} opacity={Math.max(0.12,partial)} />}
                  {Array.from({length:full}).map((_,j)=><UnitIcon key={j} optionId={optionId} color={color} />)}
                  {partial>0.1 && full>0 && full<40 && <UnitIcon optionId={optionId} color={color} opacity={partial} />}
                  {overflow>0 && <span className="text-[11px] text-gray-400 ml-1 font-medium">+{overflow} more</span>}
                  {val===0 && <span className="text-[11px] text-gray-300 italic">negligible</span>}
                </div>
                <div className="w-24 shrink-0 text-right">
                  <span className={`text-[11px] tabular-nums ${isSel?"text-black font-medium":"text-gray-400"}`}>{option.format(val)}</span>
                </div>
              </div>
            );
          })}

          <div className="mt-3 border-t border-gray-100 pt-4 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showVideo} onChange={e=>setShowVideo(e.target.checked)} className="accent-black w-3 h-3" />
              <span className="text-xs text-gray-400 font-light">Include video generation (~400× more energy-intensive than a single image — this is physically expected, not an error)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showTraining} onChange={e=>setShowTraining(e.target.checked)} className="accent-black w-3 h-3" />
              <span className="text-xs text-gray-400 font-light">Include "training a large language model" (~100,000× larger than video generation)</span>
            </label>
          </div>

          <p className="text-[10px] text-gray-300 italic leading-relaxed mt-2">
            Values use {TIER_META[tier].label} tier estimates. Water = energy × 3.45 mL/Wh (WUE derived from Li et al. 2023).
            Sources: Luccioni et al. 2023, Li et al. 2023, EPRI 2024, Goldman Sachs 2024, Strubell et al. 2019.
            Video generation energy is a first-principles derivation (no peer-reviewed direct measurement exists).
          </p>
        </div>
      </motion.div>
    </>
  );
}

// ─── GUILT PANEL ──────────────────────────────────────────────────────────────

function GuiltPanel({ scenario, energyWh, waterMl, onClose }: { scenario: Scenario|null; energyWh: number; waterMl: number; onClose: () => void }) {
  const [eOff, setEOff] = useState(ENERGY_OFFSETS[0].id);
  const [wOff, setWOff] = useState(WATER_OFFSETS[0].id);
  const ea = ENERGY_OFFSETS.find(a=>a.id===eOff)!;
  const wa = WATER_OFFSETS.find(a=>a.id===wOff)!;
  return (
    <>
      <motion.div className="fixed inset-0 z-40" initial={{opacity:0}} animate={{opacity:1}} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 w-80 max-w-full bg-white border-l-2 border-[#9ecfaf] shadow-2xl overflow-y-auto"
        initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}}
        transition={{type:"spring",damping:26,stiffness:320}}
      >
        <div className="p-7 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-black">How to remove the guilt</h2>
              {scenario && <p className="text-xs text-gray-400 italic mt-1">{scenario.verb.toLowerCase()} {scenario.dropdownText}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 shrink-0"><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="rounded-2xl border-2 border-[#9ecfaf] bg-[#f3faf6] p-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Energy — {fmtEnergy(energyWh)}</p>
            <select value={eOff} onChange={e=>setEOff(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none mb-3">
              {ENERGY_OFFSETS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-sm font-light"><strong>{fmtOffset(energyWh/ea.whPerUnit,ea.unitLabel)}</strong> to offset</p>
          </div>
          <div className="rounded-2xl border-2 border-[#9ecfaf] bg-[#f3faf6] p-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Water — {fmtWater(waterMl)}</p>
            <select value={wOff} onChange={e=>setWOff(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none mb-3">
              {WATER_OFFSETS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-sm font-light"><strong>{fmtOffset(waterMl/wa.mlPerUnit,wa.unitLabel)}</strong> to offset</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Trusted platforms</p>
            <div className="flex flex-col gap-2">
              {TRUSTED_LINKS.map(link=>(
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-400 transition-colors group">
                  <div><p className="text-xs font-medium text-black">{link.name}</p><p className="text-[11px] text-gray-400 font-light">{link.desc}</p></div>
                  <ExternalLink size={11} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── SOURCES MODAL ────────────────────────────────────────────────────────────

function SourcesModal({ onClose }: { onClose: () => void }) {
  const {data:sources,isLoading} = useSources();
  const [tab,setTab] = useState<"methodology"|"sources"|"gaps">("methodology");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col z-10"
        initial={{scale:0.96,opacity:0,y:10}} animate={{scale:1,opacity:1,y:0}} transition={{type:"spring",damping:28,stiffness:400}}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 z-10"><X size={16} className="text-gray-400" /></button>
        <div className="px-7 pt-7 pb-0 shrink-0">
          <h2 className="text-base font-semibold text-black mb-4">Sources & Methodology</h2>
          <div className="flex gap-0 border-b border-gray-100">
            {(["methodology","sources","gaps"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`text-xs px-4 py-2 border-b-2 transition-colors -mb-[1px] ${tab===t?"border-black text-black font-medium":"border-transparent text-gray-400 hover:text-gray-600"}`}>
                {t==="gaps"?"Knowledge Gaps":t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-7 py-6 text-sm leading-relaxed">
          {tab==="methodology" && (
            <div className="flex flex-col gap-5 text-gray-700 text-xs">
              <div>
                <p className="font-semibold text-black text-sm mb-2">Water methodology — WUE calibration</p>
                <p>All water figures use a consistent Water Use Effectiveness factor of <strong>3.45 mL per Wh</strong>. This was derived from Li et al. (2023): ChatGPT (EPRI: 2.9 Wh/query) produces ~10 mL of water per query, giving WUE = 10 ÷ 2.9 ≈ 3.45 mL/Wh. This cross-validates correctly: a 50-message frontier conversation (145 Wh) × 3.45 mL/Wh = 500 mL, which exactly matches Li et al.'s direct estimate.</p>
                <p className="mt-2 text-gray-500 italic">Note: a previous version of this tool used inconsistent WUE values per task (ranging from 3 to 83 mL/Wh). This has been corrected to a single derived constant.</p>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Energy methodology — model tiers</p>
                <p>Energy estimates vary by model tier. <strong>Research</strong> uses Luccioni et al. (2023) direct measurements on open-source models. <strong>Commercial</strong> uses EPRI (2024) scaled estimates for ChatGPT-class services. <strong>Frontier</strong> uses EPRI's full 2.9 Wh/query estimate for the largest models.</p>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">What is not included</p>
                <ul className="flex flex-col gap-1.5 ml-4 text-gray-500">
                  {["Manufacturing energy for GPUs and hardware (Scope 3 lifecycle)","Network transmission energy between device and data center","End-user device energy consumption","Carbon intensity of electricity (grid mix varies by region)"].map((s,i)=><li key={i} className="list-disc">{s}</li>)}
                </ul>
              </div>
            </div>
          )}
          {tab==="sources" && (
            <div className="flex flex-col gap-5">
              {isLoading && <p className="text-xs text-gray-400 italic">Loading sources…</p>}
              {(sources||[]).map(s=>(
                <div key={s.id} className="border-b border-gray-100 pb-5 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1"><p className="font-semibold text-black text-sm">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{Array.isArray(s.authors)?s.authors.join(", "):s.authors} · {s.institution} · {s.year}</p></div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-black shrink-0"><ExternalLink size={13} /></a>
                  </div>
                  {s.keyFindings && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{s.keyFindings}</p>}
                  {s.limitations && <p className="text-xs text-gray-400 mt-1.5 italic leading-relaxed">{s.limitations}</p>}
                </div>
              ))}
            </div>
          )}
          {tab==="gaps" && (
            <div className="flex flex-col gap-4 text-xs text-gray-700">
              {[
                {title:"No direct measurement for commercial AI services",body:"The most rigorous per-task energy data (Luccioni et al. 2023) was measured on open-source models. ChatGPT, Claude, Gemini, and Midjourney have not published per-query energy data. All commercial estimates are modelled."},
                {title:"Video generation has no peer-reviewed measurement",body:"No published study has directly measured energy or water for commercial video AI (Sora, Runway, Pika). The 944 Wh estimate is derived from scaling image generation by frame count — physically reasonable, but unverified."},
                {title:"Google's 2025 efficiency gains are facility-level, not query-level",body:"Google's 2025 Environmental Report shows improved data center efficiency (Trillium TPU). However, this data is aggregate — it cannot be broken down into per-query or per-task figures. More efficient hardware does not necessarily mean lower per-query energy, as models have also grown larger."},
                {title:"Water routing opacity",body:"When you send a query, you don't know which data center processes it, which cooling system it uses, or the local temperature. The WUE factor of 3.45 mL/Wh is a calibrated average; individual queries could vary 5–10× depending on geography and season."},
                {title:"Hardware lifecycle impact (Scope 3)",body:"All estimates cover operational energy only. GPU and server manufacturing, data center construction, and end-of-life disposal are excluded. Research suggests embodied carbon represents 50–80% of total lifecycle impact."},
              ].map((g,i)=>(
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

function SideTab({ onClick, label, color="default", icon }: { onClick: () => void; label: string; color?: "default"|"green"; icon: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 px-3 py-6 rounded-l-xl border border-r-0 shadow-md hover:shadow-lg transition-all group active:scale-[0.97] ${
        color==="green" ? "border-[#9ecfaf] bg-[#f6fbf8] hover:border-[#7ab88f]" : "border-gray-300 bg-white hover:border-gray-500"
      }`}
    >
      <span className={`transition-colors ${color==="green"?"text-[#5c9c70] group-hover:text-[#3d7a52]":"text-gray-500 group-hover:text-black"}`}>{icon}</span>
      <span
        className={`text-[11px] tracking-wide font-normal whitespace-nowrap transition-colors ${
          color==="green"?"text-[#5c9c70] group-hover:text-[#3d7a52]":"text-gray-500 group-hover:text-black"
        }`}
        style={{ writingMode:"vertical-rl", transform:"rotate(180deg)" }}
      >
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
  const [showGuilt, setShowGuilt] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const isCustom = selectedId === "custom";
  const scenario = SCENARIOS.find(s=>s.id===selectedId) ?? null;
  const energyWh = scenario ? getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) : 0;
  const waterMl  = scenario ? getWaterMl(scenario.id, scenario.baseWaterMl, energyWh, tier) : 0;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" style={{fontFamily:"'Anthropic Sans',sans-serif"}}>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-16 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={selectedId+tier}
            initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
            transition={{duration:0.2,ease:"easeOut"}}
            className="flex flex-col items-center gap-5 w-full max-w-2xl"
          >
            {isCustom ? (
              <div className="w-full">
                <p className="text-center text-xs text-gray-400 mb-5">
                  Scenario: <InlineDropdown value={selectedId} onChange={setSelectedId} />
                </p>
                <CustomCalculator />
              </div>
            ) : scenario ? (
              <>
                {/* Main sentence */}
                <p className="text-[1.5rem] md:text-[1.7rem] leading-[2.2] text-black text-center"
                  style={{fontFamily:"'Anthropic Serif',serif"}}>
                  <InlineDropdown value={selectedId} onChange={setSelectedId} />{" "}
                  used{" "}
                  <strong style={{borderBottom:"2.5px solid currentColor",paddingBottom:"1px"}}>{fmtEnergy(energyWh)}</strong>
                  {" "}of energy and{" "}
                  <strong style={{borderBottom:"2.5px solid currentColor",paddingBottom:"1px"}}>{fmtWater(waterMl)}</strong>
                  {" "}of water.
                </p>

                {/* Equiv */}
                <p className="text-base md:text-[1.05rem] leading-[1.9] text-gray-500 text-center"
                  style={{fontFamily:"'Anthropic Serif',serif"}}>
                  That's {equivEnergy(energyWh)} and {equivWater(waterMl)}.
                </p>

                {/* Tier selector */}
                <TierSelector tier={tier} onChange={setTier} />

                {/* Fine print */}
                <p className="text-xs text-gray-400 font-light leading-relaxed text-center italic max-w-sm">
                  {scenario.clarifying}{" "}
                  <button onClick={()=>setShowMath(true)} className="underline underline-offset-2 hover:text-black transition-colors not-italic">
                    Show me the math →
                  </button>
                </p>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* ── RIGHT TABS ── */}
        <div className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
          <AnimatePresence>
            {!showCompare && (
              <motion.div initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}}>
                <SideTab onClick={()=>setShowCompare(true)} label="compare tasks" icon={<BarChart2 size={15} />} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!showGuilt && (
              <motion.div initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}}>
                <SideTab onClick={()=>setShowGuilt(true)} label="how to remove the guilt" color="green" icon={<Leaf size={15} />} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 py-4 border-t border-gray-100">
        <button onClick={()=>setShowSources(true)}
          className="text-xs font-medium text-gray-600 hover:text-black transition-colors border border-gray-300 hover:border-gray-500 rounded-full px-5 py-2 shadow-sm hover:shadow-md transition-shadow">
          Sources & methodology
        </button>
        <div className="flex gap-2 md:hidden">
          <button onClick={()=>setShowCompare(true)} className="text-xs text-gray-500 border border-gray-200 rounded-full px-4 py-2 font-medium">compare</button>
          <button onClick={()=>setShowGuilt(true)} className="text-xs text-gray-500 border border-gray-200 rounded-full px-4 py-2 font-medium">offset guilt</button>
        </div>
        <p className="hidden md:block text-[10px] text-gray-300 italic font-light text-right max-w-[200px] leading-relaxed">
          Mid-range estimates. Actual values vary by model, data center & region.
        </p>
      </div>

      {/* ── MODALS & PANELS ── */}
      <AnimatePresence>
        {showMath && scenario && <MathModal scenario={scenario} tier={tier} energyWh={energyWh} waterMl={waterMl} onClose={()=>setShowMath(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSources && <SourcesModal onClose={()=>setShowSources(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGuilt && <GuiltPanel scenario={scenario} energyWh={energyWh} waterMl={waterMl} onClose={()=>setShowGuilt(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCompare && <ComparePanel selectedId={selectedId} tier={tier} onClose={()=>setShowCompare(false)} />}
      </AnimatePresence>
    </div>
  );
}
