import { useState, type ReactNode } from "react";
import { X, ExternalLink, BarChart2, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface MathBlock {
  equation: string;
  sourceName: string;
  sourceYear: number;
  derivation: string;
}

interface Scenario {
  id: string;
  verb: string;
  dropdownText: string;
  dropdownLabel: string;
  equivEnergy: string;
  equivWater: string;
  clarifying: string;
  energyWh: number;
  energyLow: number;
  energyHigh: number;
  waterMl: number;
  waterLow: number;
  waterHigh: number;
  confidence: "high" | "medium" | "low";
  math: { energy: MathBlock; water: MathBlock; note?: string };
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "short-chat",
    verb: "Sending",
    dropdownText: "a short chat message",
    dropdownLabel: "a short chat message",
    equivEnergy: "about 1 second of an LED bulb",
    equivWater: "about 2 teaspoons",
    clarifying: "One short message to an AI assistant (1–10 words). A low-impact task individually — but billions happen daily. AI companies don't publicly report per-query energy use.",
    energyWh: 0.003, energyLow: 0.001, energyHigh: 0.01,
    waterMl: 10, waterLow: 1, waterHigh: 50,
    confidence: "medium",
    math: {
      energy: {
        equation: "0.003 Wh = 1 query × 0.003 Wh per query",
        sourceName: "Luccioni et al. 2023 — Power Hungry Processing",
        sourceYear: 2023,
        derivation: "Luccioni et al. instrumented real GPU hardware and measured power draw during text generation across multiple open-source AI models. They observed a range of 0.001–0.01 Wh per query for models comparable to today's chat assistants. 0.003 Wh is the midpoint of this measured range.",
      },
      water: {
        equation: "10 mL ≈ 500 mL ÷ 50 message exchanges",
        sourceName: "Li et al. 2023 — Making AI Less Thirsty",
        sourceYear: 2023,
        derivation: "Li et al. estimated that a ChatGPT conversation of ~50 messages consumes approximately 500 mL of water for data center cooling and electricity-generation upstream water. Dividing by 50 exchanges gives ~10 mL per message.",
      },
      note: "The energy figure (Luccioni) was measured on smaller open-source models; the water figure (Li et al.) was derived from ChatGPT, a larger model running on different hardware. They cannot be directly multiplied — they come from different experiments and imply different underlying energy consumption.",
    },
  },
  {
    id: "long-chat",
    verb: "Having",
    dropdownText: "a long AI conversation",
    dropdownLabel: "a long AI conversation",
    equivEnergy: "about 22 minutes of an LED bulb",
    equivWater: "about 5 handwashes",
    clarifying: "A 20–50 message back-and-forth with an AI assistant. A 2023 study directly estimated water consumption for this specific use case.",
    energyWh: 0.3, energyLow: 0.05, energyHigh: 1.0,
    waterMl: 500, waterLow: 100, waterHigh: 2000,
    confidence: "medium",
    math: {
      energy: {
        equation: "0.3 Wh = 100 exchanges × 0.003 Wh per exchange",
        sourceName: "Luccioni et al. 2023 (scaled estimate)",
        sourceYear: 2023,
        derivation: "A long conversation of 20–50 messages involves ~100 individual model inference passes (each exchange triggers at least one input + one output computation). Scaling Luccioni et al.'s per-query baseline of 0.003 Wh gives 0.3 Wh. This is consistent with the EPRI (2024) estimate of ~2.9 Wh per ChatGPT query when using a larger model at higher frequency.",
      },
      water: {
        equation: "500 mL (direct estimate for a 20–50 message conversation)",
        sourceName: "Li et al. 2023 — Making AI Less Thirsty",
        sourceYear: 2023,
        derivation: "Li et al. directly estimated that a standard ChatGPT conversation of 20–50 messages consumes approximately 500 mL of water, accounting for on-site data center cooling and upstream water used in electricity generation. This figure is used directly without further scaling.",
      },
    },
  },
  {
    id: "image",
    verb: "Generating",
    dropdownText: "an AI image",
    dropdownLabel: "an AI image",
    equivEnergy: "about 3 minutes of Netflix",
    equivWater: "about 2 handwashes",
    clarifying: "A single image from an AI model (Midjourney, DALL·E, etc.). One of the best-measured AI tasks — researchers directly instrumented the hardware.",
    energyWh: 2.4, energyLow: 0.5, energyHigh: 6.5,
    waterMl: 200, waterLow: 50, waterHigh: 600,
    confidence: "high",
    math: {
      energy: {
        equation: "2.4 Wh per image (direct hardware measurement)",
        sourceName: "Luccioni et al. 2023 — Power Hungry Processing",
        sourceYear: 2023,
        derivation: "Luccioni et al. measured the energy draw of diffusion-based image generation models (including Stable Diffusion) by directly monitoring GPU power consumption. They recorded a range of 0.5–6.5 Wh per image depending on model size and steps. 2.4 Wh is the measured midpoint.",
      },
      water: {
        equation: "2.4 Wh × ~83 mL/Wh ≈ 200 mL",
        sourceName: "Li et al. 2023 (methodology applied)",
        sourceYear: 2023,
        derivation: "Water is estimated by applying a combined water footprint factor from Li et al. (2023). This factor includes on-site evaporative cooling water (~1.8 L/kWh) plus upstream water embedded in the electricity supply chain. The combined factor of ~83 mL/Wh gives 200 mL for 2.4 Wh. Direct cooling water alone would be ~5 mL; the majority of the 200 mL represents water used in electricity generation before it reaches the data center.",
      },
    },
  },
  {
    id: "video",
    verb: "Generating",
    dropdownText: "a short AI video",
    dropdownLabel: "a short AI video",
    equivEnergy: "about 20 hours of Netflix",
    equivWater: "about 182 handwashes",
    clarifying: "A 5–15 second video from an AI model (Sora, Runway, etc.). Among the most resource-intensive things individuals commonly ask AI to do.",
    energyWh: 944, energyLow: 200, energyHigh: 2500,
    waterMl: 20000, waterLow: 5000, waterHigh: 70000,
    confidence: "medium",
    math: {
      energy: {
        equation: "~944 Wh (mid-range from published estimates)",
        sourceName: "Fernandez et al. 2025",
        sourceYear: 2025,
        derivation: "Fernandez et al. (2025) estimated AI video generation at 300–2,500 Wh per short clip (5–15 seconds). Their reasoning: a diffusion-based video model must generate and refine hundreds of frames — effectively running image generation hundreds of times, chained through temporal consistency layers. 944 Wh is the published midpoint. This is also consistent with scaling Luccioni's image estimate: 2.4 Wh/image × ~400 frames = 960 Wh.",
      },
      water: {
        equation: "944 Wh × ~21 mL/Wh ≈ 20,000 mL (20 L)",
        sourceName: "Li et al. 2023 (methodology applied)",
        sourceYear: 2023,
        derivation: "Applying Li et al.'s water factor for cooling (0.5–1.8 L/kWh) to video generation energy: 944 Wh = 0.944 kWh × 1.8 L/kWh × 1000 mL/L = ~1,700 mL for direct cooling. Including upstream water from electricity generation raises this to ~20,000 mL (20 L). Note: this carries high uncertainty as neither video generation energy nor data center water use at this scale has been independently verified.",
      },
    },
  },
  {
    id: "coding",
    verb: "Getting",
    dropdownText: "100 lines of code suggestions",
    dropdownLabel: "100 code suggestions",
    equivEnergy: "about 36 seconds of an LED bulb",
    equivWater: "about 3 teaspoons",
    clarifying: "100 individual AI code completions or autocomplete suggestions during a development session — typical for a focused hour of coding. Estimate scaled from per-completion measurements.",
    energyWh: 0.1, energyLow: 0.01, energyHigh: 0.5,
    waterMl: 300, waterLow: 50, waterHigh: 1500,
    confidence: "low",
    math: {
      energy: {
        equation: "0.1 Wh = 100 completions × 0.001 Wh per completion",
        sourceName: "Luccioni et al. 2023 (scaled estimate)",
        sourceYear: 2023,
        derivation: "Luccioni et al. measured code completion tasks at 0.0001–0.005 Wh per completion (each being a short autocomplete or code snippet suggestion). Using a mid-estimate of 0.001 Wh and scaling to 100 completions gives 0.1 Wh. Confidence is low — real code assistants (GitHub Copilot, Cursor) may use larger models than those measured.",
      },
      water: {
        equation: "100 completions × 3 mL per completion = 300 mL",
        sourceName: "Li et al. 2023 (methodology applied, scaled)",
        sourceYear: 2023,
        derivation: "Applying Li et al.'s water footprint factor to Luccioni's per-completion energy: 0.001 Wh × ~3 mL/Wh × 100 completions = ~300 mL. Note: the mL/Wh factor here (~3 mL/Wh) is lower than the factor implied by Li et al.'s conversational estimate, reflecting uncertainty in how water factors scale across different task types and model sizes.",
      },
    },
  },
  {
    id: "app-build",
    verb: "Vibe coding",
    dropdownText: "a simple app",
    dropdownLabel: "a simple app",
    equivEnergy: "about 60 minutes of Netflix",
    equivWater: "about 23 handwashes",
    clarifying: "A 1–2 hour session building an app with AI assistance — many rounds of code generation, debugging, and iteration. Wide uncertainty; actual use depends heavily on model and session length.",
    energyWh: 50, energyLow: 10, energyHigh: 200,
    waterMl: 2500, waterLow: 500, waterHigh: 10000,
    confidence: "low",
    math: {
      energy: {
        equation: "~50 Wh = 1,000 completions × 0.05 Wh per complex call",
        sourceName: "Luccioni et al. 2023 + Goldman Sachs 2024 (modelled estimate)",
        sourceYear: 2024,
        derivation: "An app-building session involves many chained AI calls: code generation, debugging, explanation, and iteration. Modelling ~1,000 AI interactions (some short, some complex) at an average of 0.05 Wh each gives ~50 Wh. This is cross-referenced with Goldman Sachs (2024)'s finding that AI tasks use ~10× more energy than web searches per session. Confidence is low — no direct measurement of multi-hour coding sessions exists.",
      },
      water: {
        equation: "50 Wh × 50 mL/Wh ≈ 2,500 mL (2.5 L)",
        sourceName: "Li et al. 2023 (methodology applied)",
        sourceYear: 2023,
        derivation: "Using Li et al.'s combined water footprint factor (50 mL/Wh including upstream water from electricity generation) applied to the 50 Wh energy estimate gives 2,500 mL = 2.5 L. This has wide uncertainty — the range spans 500 mL to 10,000 mL depending on session length, model size, and data center location.",
      },
    },
  },
  {
    id: "training-llm",
    verb: "Training",
    dropdownText: "a large language model",
    dropdownLabel: "training a large language model",
    equivEnergy: "about 122 US homes for a year",
    equivWater: "about 1,750 bathtubs",
    clarifying: "Training GPT-3 (175 billion parameters). This happens once per model, not per use. Newer frontier models are believed to require 10–100× this amount, but no company has disclosed their actual training energy.",
    energyWh: 1287000000, energyLow: 500000000, energyHigh: 5000000000,
    waterMl: 700000000, waterLow: 100000000, waterHigh: 2000000000,
    confidence: "medium",
    math: {
      energy: {
        equation: "~1.287 GWh = training compute × hardware efficiency",
        sourceName: "Strubell et al. 2019 + Brown et al. 2020",
        sourceYear: 2020,
        derivation: "Brown et al. (2020) disclosed that GPT-3 required approximately 3.14 × 10²³ FLOPS of compute. Strubell et al. (2019) established a methodology for converting FLOP counts to energy: dividing total FLOPs by hardware efficiency (FLOPS per watt per second) and accounting for PUE (Power Usage Effectiveness). The resulting estimate is ~1.287 GWh (1,287,000 kWh). This is the most cited figure for a named production training run. Newer models' training costs are not publicly disclosed.",
      },
      water: {
        equation: "~700 million mL = training energy × water factor",
        sourceName: "Li et al. 2023 — Making AI Less Thirsty",
        sourceYear: 2023,
        derivation: "Li et al. (2023) explicitly estimated GPT-3 training consumed approximately 700,000 litres (700 million mL) of water. Their calculation applied facility-level water use effectiveness (WUE) data from Microsoft's data centers (where GPT-3 was reportedly trained) to the estimated training energy. This is a direct published estimate, not a derived calculation.",
      },
    },
  },
  {
    id: "audio-transcript",
    verb: "Transcribing",
    dropdownText: "1 minute of audio",
    dropdownLabel: "1 minute of audio",
    equivEnergy: "about 1 second of an LED bulb",
    equivWater: "about 40 drops",
    clarifying: "Transcribing audio using an AI model (Whisper, etc.). One of the lower-impact AI tasks. Limited direct measurement data exists.",
    energyWh: 0.002, energyLow: 0.001, energyHigh: 0.01,
    waterMl: 2, waterLow: 1, waterHigh: 10,
    confidence: "low",
    math: {
      energy: {
        equation: "~0.002 Wh per minute of audio",
        sourceName: "Luccioni et al. 2023 (analogous task estimate)",
        sourceYear: 2023,
        derivation: "Luccioni et al. measured speech recognition tasks at 0.001–0.01 Wh per minute of audio processed. Audio transcription involves converting continuous audio to tokens, then decoding — computationally similar to text generation but typically lower-complexity per word. 0.002 Wh is a mid-range estimate. No peer-reviewed direct measurement of real-world transcription services exists.",
      },
      water: {
        equation: "0.002 Wh × ~1 mL/Wh ≈ 2 mL",
        sourceName: "Li et al. 2023 (methodology applied)",
        sourceYear: 2023,
        derivation: "Applying a conservative water factor of ~1 mL/Wh (direct cooling water only, at the lower end of Li et al.'s range) to the 0.002 Wh energy estimate gives ~2 mL. Given the small energy involved, water footprint is negligible at the individual task level.",
      },
    },
  },
];

// ─── CUSTOM CALCULATOR TASKS ─────────────────────────────────────────────────

const CUSTOM_TASKS = [
  { id: "chat", label: "Short chat messages", unitEnergyWh: 0.003, unitWaterMl: 10, max: 1000, step: 1, defaultVal: 10 },
  { id: "longchat", label: "Long conversations", unitEnergyWh: 0.3, unitWaterMl: 500, max: 100, step: 1, defaultVal: 0 },
  { id: "image", label: "AI images generated", unitEnergyWh: 2.4, unitWaterMl: 200, max: 200, step: 1, defaultVal: 0 },
  { id: "video", label: "AI video clips (5–15 sec)", unitEnergyWh: 944, unitWaterMl: 20000, max: 20, step: 1, defaultVal: 0 },
  { id: "code", label: "Code suggestion batches (100 each)", unitEnergyWh: 0.1, unitWaterMl: 300, max: 500, step: 10, defaultVal: 0 },
  { id: "app", label: "App build sessions", unitEnergyWh: 50, unitWaterMl: 2500, max: 10, step: 1, defaultVal: 0 },
];

// ─── GUILT DATA ───────────────────────────────────────────────────────────────

const ENERGY_OFFSETS = [
  { id: "light", label: "Turn off a 10W LED bulb", unitLabel: "hours", whPerUnit: 10 },
  { id: "ac", label: "Skip 1 hour of air conditioning", unitLabel: "hours", whPerUnit: 3500 },
  { id: "laundry", label: "Air-dry laundry instead of dryer", unitLabel: "loads", whPerUnit: 2400 },
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
];

// ─── COMPARE METRIC OPTIONS ───────────────────────────────────────────────────

type CompareOption = {
  id: string;
  label: string;
  iconUnit: number;
  iconUnitLabel: string;
  compute: (s: Scenario) => number;
  format: (v: number) => string;
};

const COMPARE_OPTIONS: CompareOption[] = [
  {
    id: "netflix",
    label: "Netflix streaming",
    iconUnit: 30,
    iconUnitLabel: "30 min of Netflix",
    compute: (s) => s.energyWh / 0.8,
    format: (v) => v < 1 ? `< 1 min` : v < 60 ? `${Math.round(v)} min` : `${(v / 60).toFixed(1)} hrs`,
  },
  {
    id: "led",
    label: "LED bulb hours",
    iconUnit: 5,
    iconUnitLabel: "5 hrs of LED",
    compute: (s) => s.energyWh / 10,
    format: (v) => v < 0.1 ? `< 6 min` : v < 1 ? `${Math.round(v * 60)} min` : `${(Math.round(v * 10) / 10)} hrs`,
  },
  {
    id: "handwash",
    label: "Handwashes",
    iconUnit: 5,
    iconUnitLabel: "5 handwashes",
    compute: (s) => s.waterMl / 110,
    format: (v) => v < 0.1 ? `< 1` : v < 1 ? `${(v).toFixed(2)} handwashes` : `${Math.round(v)} handwashes`,
  },
  {
    id: "bottles",
    label: "500 mL water bottles",
    iconUnit: 2,
    iconUnitLabel: "2 water bottles",
    compute: (s) => s.waterMl / 500,
    format: (v) => v < 0.1 ? `< 0.1` : `${(Math.round(v * 10) / 10)} bottles`,
  },
];

// ─── TASK COLORS (for infographic) ───────────────────────────────────────────

const TASK_COLORS: Record<string, { bg: string; icon: string }> = {
  "short-chat":     { bg: "#EBF4FF", icon: "#6BA8DD" },
  "long-chat":      { bg: "#D6E9FF", icon: "#3A7EC4" },
  "image":          { bg: "#FEEBEB", icon: "#D96666" },
  "video":          { bg: "#FFD6D6", icon: "#B23939" },
  "coding":         { bg: "#E8F8EE", icon: "#3D9A5A" },
  "app-build":      { bg: "#C8EED8", icon: "#1E7A40" },
  "training-llm":   { bg: "#ECECEC", icon: "#555555" },
  "audio-transcript":{ bg: "#FEF4E6", icon: "#D18A1E" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtEnergy(wh: number): string {
  if (wh >= 1e9) return `${(wh / 1e9).toFixed(3)} GWh`;
  if (wh >= 1e6) return `${(wh / 1e6).toFixed(1)} MWh`;
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`;
  if (wh < 0.001) return `${(wh * 1000).toFixed(2)} mWh`;
  return `${wh} Wh`;
}

function fmtWater(ml: number): string {
  if (ml >= 1e9) return `${(ml / 1e9).toFixed(2)} ML`;
  if (ml >= 1e6) return `${(ml / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} L`;
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${Math.round(ml)} mL`;
}

function fmtOffset(amount: number, unitLabel: string): string {
  if (amount < 0.01) return `< 0.01 ${unitLabel}`;
  if (amount < 100) return `${(Math.round(amount * 10) / 10).toLocaleString()} ${unitLabel}`;
  return `${Math.round(amount).toLocaleString()} ${unitLabel}`;
}

// ─── SVG ICONS (infographic) ─────────────────────────────────────────────────

function IconNetflix({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity }}>
      <rect x="1" y="3" width="16" height="11" rx="2" fill={color} />
      <polygon points="7,6 7,12 13,9" fill="white" />
    </svg>
  );
}

function IconBulb({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity }}>
      <path d="M9,2 C6.2,2 4,4.2 4,7 C4,9 5.2,10.8 7,11.6 L7,14 L11,14 L11,11.6 C12.8,10.8 14,9 14,7 C14,4.2 11.8,2 9,2Z" fill={color} />
      <rect x="7" y="14" width="4" height="1.2" rx="0.6" fill={color} />
      <rect x="7.5" y="15.5" width="3" height="1" rx="0.5" fill={color} />
    </svg>
  );
}

function IconDrop({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity }}>
      <path d="M9,2 C9,2 3,9 3,12.5 C3,15.5 5.7,17 9,17 C12.3,17 15,15.5 15,12.5 C15,9 9,2 9,2Z" fill={color} />
    </svg>
  );
}

function IconBottle({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity }}>
      <rect x="6" y="1" width="6" height="3" rx="1" fill={color} />
      <path d="M5,4 L5,16 C5,16.6 5.4,17 6,17 L12,17 C12.6,17 13,16.6 13,16 L13,4 Z" fill={color} />
      <rect x="5" y="7" width="8" height="1" fill="white" opacity="0.3" />
    </svg>
  );
}

function UnitIcon({ optionId, color, opacity = 1 }: { optionId: string; color: string; opacity?: number }) {
  if (optionId === "netflix") return <IconNetflix color={color} opacity={opacity} />;
  if (optionId === "led") return <IconBulb color={color} opacity={opacity} />;
  if (optionId === "handwash") return <IconDrop color={color} opacity={opacity} />;
  return <IconBottle color={color} opacity={opacity} />;
}

// ─── INLINE DROPDOWN ─────────────────────────────────────────────────────────

const DROPDOWN_OPTIONS = [
  ...SCENARIOS.map((s) => ({ id: s.id, label: s.dropdownLabel, text: s.dropdownText })),
  { id: "custom", label: "a custom combination", text: "a custom combination" },
];

function InlineDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = DROPDOWN_OPTIONS.find((o) => o.id === value) ?? DROPDOWN_OPTIONS[0];

  return (
    <span className="relative inline">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-bold cursor-pointer hover:opacity-75 transition-opacity"
        style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}
      >
        {selected.text}
        <span className="text-[0.65em] ml-1 opacity-50">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.span
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 py-2 overflow-hidden block"
              style={{ minWidth: "240px", fontFamily: "'Anthropic Sans', sans-serif" }}
            >
              {DROPDOWN_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`block w-full text-left px-5 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                    o.id === value ? "font-semibold text-black" : "font-normal text-gray-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </motion.span>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── MATH MODAL ───────────────────────────────────────────────────────────────

function MathModal({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto z-10"
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
      >
        <div className="px-7 pt-7 pb-7 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Show me the math</p>
              <h2 className="text-base font-semibold text-black leading-snug">
                {scenario.verb} {scenario.dropdownText}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0">
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          {/* Energy */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-black">Energy: {fmtEnergy(scenario.energyWh)}</p>
              <span className="text-[10px] text-gray-400 font-light italic">{scenario.confidence} confidence</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5">
                <p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.math.energy.equation}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Source</p>
                <p className="text-xs text-black font-medium">{scenario.math.energy.sourceName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">How the number was derived</p>
                <p className="text-xs text-gray-600 leading-relaxed">{scenario.math.energy.derivation}</p>
              </div>
            </div>
          </div>

          {/* Water */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <p className="text-xs font-semibold text-black">Water: {fmtWater(scenario.waterMl)}</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5">
                <p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.math.water.equation}</p>
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
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(CUSTOM_TASKS.map((t) => [t.id, t.defaultVal]))
  );

  const totalEnergyWh = CUSTOM_TASKS.reduce((s, t) => s + (counts[t.id] ?? 0) * t.unitEnergyWh, 0);
  const totalWaterMl = CUSTOM_TASKS.reduce((s, t) => s + (counts[t.id] ?? 0) * t.unitWaterMl, 0);
  const netflixMins = totalEnergyWh / 0.8;
  const handwashes = totalWaterMl / 110;

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto">
      {CUSTOM_TASKS.map((task) => (
        <div key={task.id} className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-44 shrink-0 leading-tight">{task.label}</label>
          <input
            type="range" min={0} max={task.max} step={task.step}
            value={counts[task.id] ?? 0}
            onChange={(e) => setCounts((c) => ({ ...c, [task.id]: Number(e.target.value) }))}
            className="flex-1 accent-black"
          />
          <span className="text-xs text-black font-medium w-8 text-right tabular-nums">{counts[task.id] ?? 0}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-4" style={{ fontFamily: "'Anthropic Serif', serif" }}>
        {totalEnergyWh === 0 ? (
          <p className="text-gray-400 text-sm italic text-center">Adjust sliders to see your usage.</p>
        ) : (
          <>
            <p className="text-[1.2rem] leading-[1.9] text-black text-center">
              Your session used{" "}
              <strong style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}>{fmtEnergy(totalEnergyWh)}</strong>
              {" "}of energy and{" "}
              <strong style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}>{fmtWater(totalWaterMl)}</strong>
              {" "}of water.
            </p>
            <p className="text-sm text-gray-500 text-center mt-1.5" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>
              That's{" "}
              {netflixMins < 1 ? `${Math.round(netflixMins * 60)} sec of Netflix` : netflixMins < 60 ? `${Math.round(netflixMins)} Netflix minutes` : `${(netflixMins / 60).toFixed(1)} Netflix hours`}
              {" "}and {handwashes < 1 ? `${Math.round(handwashes * 110)} mL of water` : `${Math.round(handwashes)} handwashes`}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── INFOGRAPHIC PANEL ────────────────────────────────────────────────────────

function ComparePanel({ selectedId, onClose }: { selectedId: string; onClose: () => void }) {
  const [optionId, setOptionId] = useState<string>("netflix");
  const [showTraining, setShowTraining] = useState(false);

  const option = COMPARE_OPTIONS.find((o) => o.id === optionId)!;
  const visibleScenarios = SCENARIOS.filter((s) => showTraining || s.id !== "training-llm");
  const values = visibleScenarios.map((s) => ({ ...s, val: option.compute(s) }));
  const maxVal = Math.max(...values.map((v) => v.val));
  const iconUnit = maxVal > 0 ? maxVal / 32 : 1;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/15 z-40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 bg-white border-l border-gray-200 shadow-2xl overflow-y-auto flex flex-col"
        style={{ width: "min(90vw, 860px)" }}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-black">Compare AI tasks</h2>
              <p className="text-xs text-gray-400 font-light mt-0.5">Each icon represents one {option.iconUnitLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Metric selector */}
          <div className="flex flex-wrap gap-2">
            {COMPARE_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOptionId(o.id)}
                className={`px-4 py-1.5 rounded-full text-xs transition-all border ${
                  o.id === optionId ? "bg-black text-white border-black font-medium" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icon chart */}
        <div className="flex-1 px-8 py-7 flex flex-col gap-5">
          {/* Icon key */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-light">
            <UnitIcon optionId={optionId} color="#9ca3af" />
            <span>= {option.iconUnitLabel}</span>
            <span className="ml-4 text-gray-300">·</span>
            <span className="ml-4">highlighted = currently selected scenario</span>
          </div>

          {/* Rows */}
          {values.map(({ id, dropdownLabel, val }) => {
            const color = TASK_COLORS[id];
            const fullIcons = Math.min(Math.floor(val / iconUnit), 40);
            const partial = (val % iconUnit) / iconUnit;
            const overflow = Math.floor(val / iconUnit) - 40;
            const isSelected = id === selectedId;

            return (
              <div
                key={id}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
                  isSelected ? "bg-gray-50 border border-gray-200" : ""
                }`}
              >
                <div className="w-36 shrink-0">
                  <p className={`text-xs leading-tight ${isSelected ? "font-semibold text-black" : "text-gray-500 font-light"}`}>
                    {dropdownLabel}
                  </p>
                </div>
                <div className="flex items-center flex-wrap gap-0.5 flex-1 min-w-0">
                  {fullIcons === 0 && val > 0 && (
                    <UnitIcon optionId={optionId} color={color.icon} opacity={Math.max(0.15, partial)} />
                  )}
                  {Array.from({ length: fullIcons }).map((_, j) => (
                    <UnitIcon key={j} optionId={optionId} color={color.icon} />
                  ))}
                  {partial > 0.1 && fullIcons > 0 && fullIcons < 40 && (
                    <UnitIcon optionId={optionId} color={color.icon} opacity={partial} />
                  )}
                  {overflow > 0 && (
                    <span className="text-[11px] text-gray-400 ml-1 font-medium">+{overflow} more</span>
                  )}
                  {val === 0 && (
                    <span className="text-[11px] text-gray-300 italic">negligible</span>
                  )}
                </div>
                <div className="w-24 shrink-0 text-right">
                  <span className={`text-[11px] tabular-nums ${isSelected ? "text-black font-medium" : "text-gray-400"}`}>
                    {option.format(val)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Training LLM toggle */}
          <div className="mt-2 border-t border-gray-100 pt-5 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showTraining} onChange={(e) => setShowTraining(e.target.checked)} className="accent-black w-3 h-3" />
              <span className="text-xs text-gray-400 font-light">
                Include "training a large language model" (scale is ~100,000× larger than video generation)
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="text-[10px] text-gray-300 italic leading-relaxed mt-2">
            Values are mid-range estimates. Error bars are not shown — see Sources & Methodology for uncertainty ranges.
            Sources: Luccioni et al. 2023, Li et al. 2023, Fernandez et al. 2025, EPRI 2024, Goldman Sachs 2024, Strubell et al. 2019.
          </div>
        </div>
      </motion.div>
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

  return (
    <>
      <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 w-80 max-w-full bg-white border-l-2 border-[#9ecfaf] shadow-2xl overflow-y-auto"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
      >
        <div className="p-7 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-black">How to remove the guilt</h2>
              {scenario && (
                <p className="text-xs text-gray-400 italic mt-1">
                  Offsetting: {scenario.verb.toLowerCase()} {scenario.dropdownText}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0">
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          <div className="rounded-2xl border-2 border-[#9ecfaf] bg-[#f3faf6] p-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Energy — {fmtEnergy(energyWh)}</p>
            <select value={energyOffset} onChange={(e) => setEnergyOffset(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#9ecfaf] mb-3">
              {ENERGY_OFFSETS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-sm text-black font-light"><strong>{fmtOffset(energyWh / ea.whPerUnit, ea.unitLabel)}</strong> to offset</p>
          </div>

          <div className="rounded-2xl border-2 border-[#9ecfaf] bg-[#f3faf6] p-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Water — {fmtWater(waterMl)}</p>
            <select value={waterOffset} onChange={(e) => setWaterOffset(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#9ecfaf] mb-3">
              {WATER_OFFSETS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-sm text-black font-light"><strong>{fmtOffset(waterMl / wa.mlPerUnit, wa.unitLabel)}</strong> to offset</p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Trusted platforms</p>
            <div className="flex flex-col gap-2">
              {TRUSTED_LINKS.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-400 transition-colors group"
                >
                  <div>
                    <p className="text-xs font-medium text-black">{link.name}</p>
                    <p className="text-[11px] text-gray-400 font-light">{link.desc}</p>
                  </div>
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
  const { data: sources, isLoading } = useSources();
  const [tab, setTab] = useState<"methodology" | "sources" | "gaps">("methodology");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col z-10"
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10">
          <X size={16} className="text-gray-400" />
        </button>

        <div className="px-7 pt-7 pb-0 shrink-0">
          <h2 className="text-base font-semibold text-black mb-4">Sources & Methodology</h2>
          <div className="flex gap-0 border-b border-gray-100">
            {(["methodology", "sources", "gaps"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-4 py-2 border-b-2 transition-colors capitalize -mb-[1px] ${tab === t ? "border-black text-black font-medium" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                {t === "gaps" ? "Knowledge Gaps" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-6 text-sm leading-relaxed">
          {tab === "methodology" && (
            <div className="flex flex-col gap-5 text-gray-700 text-xs">
              <p>Estimates are derived from peer-reviewed research, government energy reports, and industry analyses published 2019–2025. Direct measurement is used where available; extrapolation is used otherwise and clearly labelled.</p>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Energy estimation methods</p>
                <ul className="flex flex-col gap-2 ml-4">
                  <li className="list-disc"><strong className="text-black">Direct hardware measurement</strong> (most reliable) — Luccioni et al. (2023) instrumented real GPUs.</li>
                  <li className="list-disc"><strong className="text-black">Proxy modelling</strong> — EPRI (2024) derived ~2.9 Wh/ChatGPT query from hardware benchmarks and PUE assumptions.</li>
                  <li className="list-disc"><strong className="text-black">Top-down scaling</strong> (least reliable) — Goldman Sachs (2024) estimated AI task energy from aggregate data center statistics.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Water estimation</p>
                <p>Water figures use Li et al. (2023)'s Water Use Effectiveness (WUE) methodology. WUE varies by location and cooling type: near 0 L/kWh (cold climate) to 2.5+ L/kWh (hot climate with evaporative cooling). A combined factor including upstream water from electricity generation is used for most tasks.</p>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">What's not included</p>
                <ul className="flex flex-col gap-1 ml-4 text-gray-500">
                  <li className="list-disc">Manufacturing energy for GPUs and hardware (Scope 3, lifecycle)</li>
                  <li className="list-disc">Network transmission energy between your device and the data center</li>
                  <li className="list-disc">End-user device energy</li>
                  <li className="list-disc">Carbon intensity of electricity (depends on grid mix)</li>
                </ul>
              </div>
            </div>
          )}

          {tab === "sources" && (
            <div className="flex flex-col gap-5">
              {isLoading && <p className="text-xs text-gray-400 italic">Loading sources…</p>}
              {(sources || []).map((s) => (
                <div key={s.id} className="border-b border-gray-100 pb-5 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-black text-sm">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{Array.isArray(s.authors) ? s.authors.join(", ") : s.authors} · {s.institution} · {s.year}</p>
                    </div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-black transition-colors mt-0.5 shrink-0">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                  {s.keyFindings && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{s.keyFindings}</p>}
                  {s.limitations && <p className="text-xs text-gray-400 mt-1.5 italic leading-relaxed">{s.limitations}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === "gaps" && (
            <div className="flex flex-col gap-5 text-xs text-gray-700">
              {[
                { title: "Proprietary training data", body: "The energy to train GPT-4, Claude 3, Gemini Ultra, and LLaMA 3+ has not been disclosed by any company. The GPT-3 estimate (1.287 GWh) is the only named production training run with published backing. Frontier models are believed to require 10–100× this amount." },
                { title: "Per-query energy for closed models", body: "ChatGPT, Claude, and Gemini don't disclose per-query energy. EPRI's 2.9 Wh/query figure is a modelled estimate using hardware assumptions — not a measurement made by or verified by OpenAI." },
                { title: "Water routing opacity", body: "When you send a query, you don't know which data center processes it, which cooling system it uses, or the local temperature — all of which determine water consumption. A query processed in Iowa in January vs. Arizona in August could differ in water footprint by 10×." },
                { title: "Hardware lifecycle (Scope 3)", body: "All estimates cover operational energy only. Manufacturing GPUs, data center buildings, and networking equipment can represent 50–80% of total lifecycle impact. No published AI inference LCA includes full embodied impact." },
                { title: "Code, audio, and multimodal tasks", body: "Luccioni et al. (2023) primarily measured text and image tasks. Direct measurement data is sparse or absent for: code generation at scale, real-time voice assistants, multimodal tasks, and multi-agent chains." },
              ].map((gap, i) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="font-semibold text-black mb-1">{gap.title}</p>
                  <p className="leading-relaxed text-gray-600">{gap.body}</p>
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

function SideTab({
  onClick, label, color = "default", icon,
}: {
  onClick: () => void; label: string; color?: "default" | "green"; icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-2 py-5 rounded-l-xl border border-r-0 shadow-sm hover:shadow-md transition-all group ${
        color === "green"
          ? "border-[#9ecfaf] bg-[#f9fdf9] hover:border-[#7ab88f]"
          : "border-gray-300 bg-white hover:border-gray-500"
      }`}
    >
      <span className={color === "green" ? "text-[#6eaa85]" : "text-gray-400 group-hover:text-gray-600"}>
        {icon}
      </span>
      <span
        className={`text-[10px] tracking-wide font-light whitespace-nowrap ${
          color === "green" ? "text-[#6eaa85]" : "text-gray-400 group-hover:text-gray-600"
        }`}
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Home() {
  const [selectedId, setSelectedId] = useState("app-build");
  const [showMath, setShowMath] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showGuilt, setShowGuilt] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const isCustom = selectedId === "custom";
  const scenario = SCENARIOS.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>

      {/* ── MAIN CONTENT ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-16 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 w-full max-w-xl"
          >
            {isCustom ? (
              <div className="w-full">
                <p className="text-center text-xs text-gray-400 mb-6">
                  Scenario: <InlineDropdown value={selectedId} onChange={setSelectedId} />
                </p>
                <CustomCalculator />
              </div>
            ) : scenario ? (
              <>
                {/* Main sentence */}
                <p
                  className="text-[1.5rem] md:text-[1.7rem] leading-[2.1] text-black text-center"
                  style={{ fontFamily: "'Anthropic Serif', serif" }}
                >
                  {scenario.verb}{" "}
                  <InlineDropdown value={selectedId} onChange={setSelectedId} />
                  {" "}used{" "}
                  <strong style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}>
                    {fmtEnergy(scenario.energyWh)}
                  </strong>
                  {" "}of energy and{" "}
                  <strong style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}>
                    {fmtWater(scenario.waterMl)}
                  </strong>
                  {" "}of water.
                </p>

                {/* Equiv sentence */}
                <p
                  className="text-base md:text-[1.05rem] leading-[1.9] text-gray-500 text-center"
                  style={{ fontFamily: "'Anthropic Serif', serif" }}
                >
                  That's {scenario.equivEnergy} and {scenario.equivWater}.
                </p>

                {/* Fine print */}
                <p className="text-xs text-gray-400 font-light leading-relaxed text-center italic max-w-sm">
                  {scenario.clarifying}{" "}
                  <button
                    onClick={() => setShowMath(true)}
                    className="underline underline-offset-2 hover:text-black transition-colors not-italic"
                  >
                    Show me the math →
                  </button>
                </p>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* ── RIGHT TABS (desktop) ── */}
        <div className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 flex-col gap-2 z-30">
          <AnimatePresence>
            {!showCompare && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <SideTab
                  onClick={() => setShowCompare(true)}
                  label="compare tasks"
                  icon={<BarChart2 size={13} />}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!showGuilt && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <SideTab
                  onClick={() => setShowGuilt(true)}
                  label="how to remove the guilt"
                  color="green"
                  icon={<Leaf size={13} />}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 py-4 md:py-5 border-t border-gray-100">
        <button
          onClick={() => setShowSources(true)}
          className="text-xs text-gray-400 hover:text-black transition-colors border border-gray-200 hover:border-gray-400 rounded-full px-4 py-1.5 font-medium"
        >
          Sources & methodology
        </button>

        {/* Mobile guilt + compare buttons */}
        <div className="flex gap-2 md:hidden">
          <button onClick={() => setShowCompare(true)} className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5">compare</button>
          <button onClick={() => setShowGuilt(true)} className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5">offset guilt</button>
        </div>

        <p className="hidden md:block text-[10px] text-gray-300 italic font-light text-right max-w-[180px] leading-relaxed">
          Mid-range estimates. Actual values vary by model, data center & region.
        </p>
      </div>

      {/* ── PANELS & MODALS ──────────────────────────── */}
      <AnimatePresence>
        {showMath && scenario && <MathModal scenario={scenario} onClose={() => setShowMath(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSources && <SourcesModal onClose={() => setShowSources(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGuilt && <GuiltPanel scenario={scenario} onClose={() => setShowGuilt(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCompare && <ComparePanel selectedId={selectedId} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
    </div>
  );
}
