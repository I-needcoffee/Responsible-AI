import { useState, type ReactNode } from "react";
import { X, ExternalLink, BarChart2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";

// ─── ENERGY ESTIMATE TIERS ───────────────────────────────────────────────────
// Three separate published estimates — chosen independently of water location.
// "Low"     = Luccioni et al. 2023: direct GPU measurement on small open-source models
// "Average" = Google Cloud 2025: direct measurement, median Gemini text prompt, May 2025
// "High"    = EPRI 2024: estimated for ChatGPT on Azure GPU infrastructure
export type ModelTier = "research" | "commercial" | "frontier";

export const TIER_META: Record<ModelTier, { rangeLabel: string; rangeDesc: string; source: string }> = {
  research: {
    rangeLabel: "Low",
    rangeDesc: "Measured directly on small open-source AI models (BLOOM, OPT, Stable Diffusion). Closest to local/self-hosted AI tools.",
    source: "Luccioni et al. 2023",
  },
  commercial: {
    rangeLabel: "Average",
    rangeDesc: "Direct measurement for Google's Gemini App. A median Gemini text prompt used 0.10 Wh (May 2025). Represents current efficient commercial AI.",
    source: "Google Cloud 2025",
  },
  frontier: {
    rangeLabel: "High",
    rangeDesc: "Estimated for ChatGPT-class models on GPU infrastructure. Goldman Sachs (2024): AI uses ~10× more than a Google Search (0.3 Wh × 10 ≈ 3 Wh). EPRI 2024 full ChatGPT query estimate (2.9 Wh) aligns with this.",
    source: "EPRI 2024 / Goldman Sachs 2024",
  },
};

// ─── WATER LOCATION (WUE) TIERS ──────────────────────────────────────────────
// Water Use Effectiveness (WUE) varies by data center location and cooling type.
// This is independent of energy — different providers use different infrastructure.
// Google 2025: 0.12 mL / 0.10 Wh = 1.2 mL/Wh (efficient TPU DCs, renewable, cold climate)
// Li et al. 2023: calibrated 3.45 mL/Wh for Microsoft/OpenAI Azure infra (US commercial avg)
// IEA 2024: up to 6 mL/Wh for hot-climate evaporative cooling data centers
export type WueTier = "efficient" | "average" | "intensive";

export const WUE_VALUES: Record<WueTier, number> = {
  efficient: 1.2,   // Google Cloud 2025: 0.12 mL / 0.10 Wh = 1.2 mL/Wh
  average:   3.45,  // Li et al. 2023 calibration (ChatGPT/Microsoft Azure, US avg)
  intensive: 6.0,   // IEA 2024 upper: hot climate, evaporative cooling
};

export const WUE_META: Record<WueTier, { label: string; shortDesc: string; source: string }> = {
  efficient: {
    label: "Efficient",
    shortDesc: "Google-class data centers — custom TPUs, renewable energy, cold climate. Measured WUE: 1.2 mL/Wh (Google 2025).",
    source: "Google Cloud 2025",
  },
  average: {
    label: "Typical",
    shortDesc: "Average US commercial data center. Calibrated from Li et al. (2023) using ChatGPT/Azure data. WUE: 3.45 mL/Wh.",
    source: "Li et al. 2023",
  },
  intensive: {
    label: "Water-intensive",
    shortDesc: "Hot-climate data centers with evaporative cooling (Texas, Arizona, etc.). IEA 2024 upper range. WUE: 6 mL/Wh.",
    source: "IEA 2024 (upper)",
  },
};

// ─── ENERGY VALUES BY TASK AND TIER ──────────────────────────────────────────
// Tier-invariant tasks (image, video, training-llm) use base values directly.
// Google 2025 data: 0.10 Wh per median Gemini text prompt (measured, May 2025).
const TIER_ENERGY: Record<string, Record<ModelTier, number>> = {
  "short-chat":    { research: 0.003, commercial: 0.10,  frontier: 2.9   },
  "email-reply":   { research: 0.005, commercial: 0.20,  frontier: 3.0   },
  "ai-search":     { research: 0.01,  commercial: 0.30,  frontier: 8.7   },
  "inbox-search":  { research: 0.03,  commercial: 0.50,  frontier: 5.0   },
  "meeting-notes": { research: 0.06,  commercial: 0.70,  frontier: 5.9   },
  "long-chat":     { research: 0.15,  commercial: 5.0,   frontier: 145   },
  "coding":        { research: 0.1,   commercial: 5.0,   frontier: 29    },
  "app-build":     { research: 50,    commercial: 100,   frontier: 1000  },
};

const TIER_SOURCE: Record<string, Record<ModelTier, string>> = {
  "short-chat": {
    research:   "Luccioni et al. 2023 — direct GPU measurement on open-source text models. Range: 0.001–0.01 Wh per query.",
    commercial: "Google Cloud 2025 — direct measurement. A median Gemini App text-generation prompt uses 0.10 Wh of energy and 0.12 mL of water (data from May 2025). Google's TPU infrastructure (Trillium/Ironwood) is among the most energy-efficient for AI inference. Note: ChatGPT and Claude running on Nvidia GPU infrastructure will use more — see the High estimate for that range.",
    frontier:   "EPRI 2024 / Goldman Sachs 2024 — estimated for ChatGPT on Azure (GPU infrastructure). EPRI's full ChatGPT query estimate: 2.9 Wh. Goldman Sachs (2024): AI uses ~10× more than a Google Search (0.3 Wh × 10 ≈ 3 Wh). Both consistent.",
  },
  "long-chat": {
    research:   "Luccioni et al. 2023 scaled: 50 messages × 0.003 Wh = 0.15 Wh.",
    commercial: "Google Cloud 2025 scaled: 50 messages × 0.10 Wh per Gemini prompt = 5 Wh.",
    frontier:   "EPRI 2024 scaled: 50 messages × 2.9 Wh = 145 Wh. Cross-check: 145 Wh × 3.45 mL/Wh = 500 mL = Li et al.'s direct measurement for a 50-message ChatGPT session. ✓",
  },
  "coding": {
    research:   "Luccioni et al. 2023: code completions at ~0.001 Wh each × 100 = 0.1 Wh.",
    commercial: "Google Cloud 2025 scaled: 100 code completions × ~0.05 Wh = 5 Wh. Code completions are typically shorter than full chat prompts, so scaled at 50% of the full text prompt estimate.",
    frontier:   "EPRI 2024 scaled: 100 × 0.29 Wh = 29 Wh (upper bound — code assistant models are typically more efficient than full GPT-4).",
  },
  "app-build": {
    research:   "Modelled: ~1,000 small model calls (Luccioni 2023 baseline, 0.05 Wh avg) = 50 Wh.",
    commercial: "Google Cloud 2025 scaled: ~1,000 AI interactions × 0.10 Wh = 100 Wh. Represents an app-building session using Gemini-class efficient models.",
    frontier:   "EPRI 2024 scaled: ~500 interactions × 2 Wh avg = 1,000 Wh. Upper bound — coding assistants typically use specialized models, not full frontier LLMs.",
  },
  "inbox-search": {
    research:   "Estimated: batch embedding lookups over ~100 emails (0.001 Wh each) + small-model analysis ≈ 0.03 Wh. Local or on-device models only.",
    commercial: "Google Cloud 2025 basis: semantic search over inbox (~0.30 Wh for 3 retrieval passes) + one synthesis/summary generation (0.20 Wh) ≈ 0.50 Wh. Covers tools like Gmail AI search, Copilot for Outlook, or asking an AI assistant to find and analyze email history.",
    frontier:   "EPRI 2024 basis: full inbox processing with a frontier LLM reading many email threads (multiple calls ≈ 5.0 Wh). Upper bound for frontier models analyzing large email corpora.",
  },
  "ai-search": {
    research:   "Estimated lower bound for a small-model RAG pipeline: 0.01 Wh. Much lower than commercial AI search as it assumes efficient local models.",
    commercial: "Google Cloud 2025 basis, scaled for multi-step processing. AI search (Perplexity, Google AI Overviews, Bing Copilot) performs 3+ model passes — query embedding, source retrieval, and synthesis. Estimate: 0.10 Wh × 3 ≈ 0.30 Wh. No direct measurement published for AI search products.",
    frontier:   "Estimated at ~3× EPRI's full ChatGPT query estimate (2.9 Wh × 3 ≈ 8.7 Wh). Upper bound for frontier-model RAG with multiple retrieval rounds.",
  },
  "email-reply": {
    research:   "Estimated: local embedding search (< 0.001 Wh) + small-model draft (0.003 Wh) ≈ 0.005 Wh.",
    commercial: "Google Cloud 2025 basis: one semantic search/classification pass (~0.10 Wh) + one reply generation (~0.10 Wh) = ~0.20 Wh. Covers tools like Gmail Smart Reply, Copilot for Outlook, or asking an AI assistant to draft a response.",
    frontier:   "EPRI 2024 basis: full thread processing + long-form draft ≈ 3.0 Wh. Upper bound for frontier models with extended email context windows.",
  },
  "meeting-notes": {
    research:   "Luccioni 2023 audio rate (0.002 Wh/min × 30 min) = 0.06 Wh. Small models only, no summarization included.",
    commercial: "Google Cloud 2025 basis: continuous transcription (~0.02 Wh/min × 30 min = 0.60 Wh) + one end-of-meeting summary generation (0.10 Wh) ≈ 0.70 Wh. Covers tools like Otter.ai, Fireflies.ai, and Copilot for Teams. No direct measurement published.",
    frontier:   "EPRI 2024 basis: commercial transcription rate (~0.10 Wh/min × 30 min = 3.0 Wh) + frontier-model summary (2.9 Wh) ≈ 5.9 Wh. Upper bound for meeting AI using frontier LLMs.",
  },
};


function getEnergyWh(id: string, base: number, tier: ModelTier): number {
  return TIER_ENERGY[id]?.[tier] ?? base;
}
function getWaterMl(id: string, baseWater: number, energyWh: number, wue: number): number {
  if (id === "training-llm") return baseWater; // Li et al. direct facility estimate
  return energyWh * wue;
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface MathBlock { equation: string; sourceName: string; derivation: string; tierSource?: Record<ModelTier, string>; }
interface Scenario {
  id: string; verb: string; dropdownText: string; dropdownLabel: string; clarifying: string;
  baseEnergyWh: number; energyLow: number; energyHigh: number; baseWaterMl: number;
  confidence: "high" | "medium" | "low"; tierSensitive: boolean;
  math: { energy: MathBlock; water: MathBlock; note?: string };
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: "short-chat", verb: "Sending", dropdownText: "a short chat message", dropdownLabel: "a short chat message",
    clarifying: "One short message to an AI assistant. Low-impact individually, but billions happen daily. Google measured a median Gemini prompt at 0.10 Wh and 0.12 mL — select 'Average' to see this figure.",
    baseEnergyWh: 0.003, energyLow: 0.003, energyHigh: 2.9, baseWaterMl: 0.003 * 3.45,
    confidence: "high", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 query × [energy per query, by estimate]", sourceName: "Luccioni 2023 · Google Cloud 2025 · EPRI 2024 / Goldman Sachs 2024", derivation: "Select an estimate range to see the source-specific derivation.", tierSource: TIER_SOURCE["short-chat"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024 — see Water Location selector", derivation: "Google Cloud 2025 directly measured 0.12 mL per median Gemini prompt (with 0.10 Wh energy → WUE = 1.2 mL/Wh). Li et al. (2023) calibrated WUE = 3.45 mL/Wh for Microsoft/Azure ChatGPT infrastructure. Select a Water Location to choose the relevant data center type." },
    },
  },
  {
    id: "email-reply", verb: "Drafting", dropdownText: "an AI email reply", dropdownLabel: "an AI email reply",
    clarifying: "AI reads your email thread and drafts a reply — like Gmail Smart Reply, Copilot in Outlook, or asking an AI assistant to write a specific response. One of the lighter everyday AI tasks.",
    baseEnergyWh: 0.005, energyLow: 0.005, energyHigh: 3.0, baseWaterMl: 0.005 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 context read + 1 reply generation", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "Modelled as semantic search over the thread + one text generation call.", tierSource: TIER_SOURCE["email-reply"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Average (0.20 Wh × 3.45 mL/Wh ≈ 0.7 mL). One of the lower-impact everyday AI tasks." },
    },
  },
  {
    id: "ai-search", verb: "Doing", dropdownText: "an AI web search", dropdownLabel: "an AI web search",
    clarifying: "One AI-powered search query — Perplexity, Google AI Overviews, or Bing Copilot. These make 3+ model passes: understanding your query, retrieving sources, and synthesizing an answer — which is why they use more than a single chat message.",
    baseEnergyWh: 0.01, energyLow: 0.01, energyHigh: 8.7, baseWaterMl: 0.01 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~3 model passes × [energy per pass]", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "AI search involves query embedding, document retrieval, and synthesis — modelled as 3× a standard chat query. No direct peer-reviewed measurement of AI search products exists.", tierSource: TIER_SOURCE["ai-search"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Derived from WUE methodology. Average (0.30 Wh × 3.45 mL/Wh = 1 mL). Efficient DC: 0.30 × 1.2 = 0.36 mL." },
    },
  },
  {
    id: "inbox-search", verb: "Searching and analyzing", dropdownText: "your inbox with AI", dropdownLabel: "inbox search and analysis",
    clarifying: "AI searches through your email history, finds relevant threads, and surfaces insights or action items. More intensive than a single reply because it processes many messages — like asking Gmail AI to find all emails about a project and summarize what needs doing.",
    baseEnergyWh: 0.03, energyLow: 0.03, energyHigh: 5.0, baseWaterMl: 0.03 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = inbox retrieval passes + 1 synthesis generation", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "Modelled as 3 semantic retrieval passes over email history (~0.30 Wh) plus one synthesis/summary generation (0.20 Wh) ≈ 0.50 Wh at commercial tier.", tierSource: TIER_SOURCE["inbox-search"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Average (0.50 Wh × 3.45 mL/Wh ≈ 1.7 mL). More costly than a single email reply because of multi-pass retrieval." },
    },
  },
  {
    id: "meeting-notes", verb: "Taking", dropdownText: "AI meeting notes (30 min)", dropdownLabel: "AI meeting notes",
    clarifying: "30 minutes of real-time transcription plus an end-of-meeting summary. Combines continuous audio processing with one full generation call. Tools like Otter.ai, Fireflies.ai, or Microsoft Copilot for Teams.",
    baseEnergyWh: 0.06, energyLow: 0.06, energyHigh: 5.9, baseWaterMl: 0.06 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = transcription (30 min) + 1 summary generation", sourceName: "Estimated — Luccioni 2023 (low) · Google Cloud 2025 basis (avg) · EPRI 2024 (high)", derivation: "Combines continuous audio transcription with a one-shot end-of-meeting summarization pass.", tierSource: TIER_SOURCE["meeting-notes"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Average (0.70 Wh × 3.45 mL/Wh ≈ 2.4 mL). Comparable to a single chat message per minute of meeting." },
    },
  },
  {
    id: "image", verb: "Generating", dropdownText: "an AI image", dropdownLabel: "an AI image",
    clarifying: "A single image from an AI model. This is the best-measured AI task — researchers directly instrumented real GPU hardware during generation.",
    baseEnergyWh: 2.4, energyLow: 0.5, energyHigh: 6.5, baseWaterMl: 2.4 * 1.2,
    confidence: "high", tierSensitive: false,
    math: {
      energy: { equation: "2.4 Wh per image (direct GPU measurement, mid-range)", sourceName: "Luccioni et al. 2023 — Power Hungry Processing", derivation: "Luccioni et al. measured diffusion models directly on GPU hardware. Range: 0.5–6.5 Wh. Mid: 2.4 Wh. This is the highest-confidence estimate in this tool — directly measured, not modelled." },
      water: { equation: "Water = 2.4 Wh × WUE (mL/Wh) — see Water Location selector", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Energy is 2.4 Wh regardless of estimate range. Water depends on which data center processes the request — use the Water Location selector to choose." },
      note: "Image generation energy does not vary by energy estimate — Luccioni's direct measurement is the only credible source. Water varies by data center WUE.",
    },
  },
  {
    id: "long-chat", verb: "Having", dropdownText: "a long AI conversation", dropdownLabel: "a long AI conversation",
    clarifying: "A 20–50 message back-and-forth session. At the Average estimate (Google 2025), each message costs 0.10 Wh. At the High estimate, 50 messages × 2.9 Wh = 145 Wh, which × 3.45 mL/Wh exactly matches Li et al.'s direct measurement of 500 mL.",
    baseEnergyWh: 0.15, energyLow: 0.15, energyHigh: 145, baseWaterMl: 0.15 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 50 messages × [energy per message]", sourceName: "Luccioni 2023 · Google Cloud 2025 · EPRI 2024", derivation: "A long conversation is modelled as 50 AI interactions.", tierSource: TIER_SOURCE["long-chat"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 (WUE methodology)", derivation: "At the High energy estimate with Typical WUE: 145 Wh × 3.45 mL/Wh = 500 mL — exactly matching Li et al.'s direct measurement for a 50-message ChatGPT conversation. ✓" },
    },
  },
  {
    id: "coding", verb: "Getting", dropdownText: "100 AI code suggestions", dropdownLabel: "100 code suggestions",
    clarifying: "100 individual autocomplete or code completion suggestions — a realistic volume for a focused hour of AI-assisted development.",
    baseEnergyWh: 0.1, energyLow: 0.1, energyHigh: 29, baseWaterMl: 0.1 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 100 suggestions × [energy per suggestion]", sourceName: "Luccioni 2023 · Google Cloud 2025 (scaled) · EPRI 2024", derivation: "Each code suggestion is one AI inference call. Code completions are shorter than full chat prompts.", tierSource: TIER_SOURCE["coding"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Average energy (5 Wh) × Typical WUE (3.45) = 17.3 mL per 100 suggestions." },
    },
  },
  {
    id: "app-build", verb: "Vibe coding", dropdownText: "a simple app", dropdownLabel: "a simple app",
    clarifying: "A 1–2 hour session with many rounds of code generation, debugging, and iteration. Wide uncertainty — actual energy depends heavily on which AI model and how many requests.",
    baseEnergyWh: 50, energyLow: 50, energyHigh: 1000, baseWaterMl: 50 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~1,000 AI interactions × [avg energy per interaction]", sourceName: "Modelled · Google Cloud 2025 (average tier) · EPRI 2024 (high tier)", derivation: "A session is modelled as ~1,000 chained AI calls.", tierSource: TIER_SOURCE["app-build"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Average energy (100 Wh) × Typical WUE (3.45) = 345 mL (~0.35 L) per session." },
    },
  },
  {
    id: "video", verb: "Generating", dropdownText: "a short AI video", dropdownLabel: "a short AI video",
    clarifying: "A 5–15 second AI video clip. Being ~400× more energy-intensive than a single image is expected: a 10-second video requires generating ~240 frames, each comparable to an image generation pass.",
    baseEnergyWh: 944, energyLow: 200, energyHigh: 2500, baseWaterMl: 944 * 1.2,
    confidence: "low", tierSensitive: false,
    math: {
      energy: { equation: "~944 Wh ≈ 240 frames × ~4 Wh per frame (first-principles estimate)", sourceName: "Derived from Luccioni et al. 2023 — no direct measurement for commercial video AI", derivation: "No published study has directly measured energy for commercial video AI (Sora, Runway, Pika) as of 2025. Derived: 10 seconds at 24 fps = 240 frames × ~4 Wh/frame (Luccioni upper for diffusion) = 960 Wh. A previous citation ('Fernandez et al. 2025') was removed — that publication could not be verified." },
      water: { equation: "Water = 944 Wh × WUE (mL/Wh) — see Water Location selector", sourceName: "Google Cloud 2025 · Li et al. 2023 · IEA 2024", derivation: "Energy is 944 Wh. Water depends on WUE. Efficient (1.2): ~1.1 L. Typical (3.45): ~3.3 L. Water-intensive (6): ~5.7 L." },
      note: "Video gen being ~400× image gen is physically correct and expected. Low confidence on the absolute number — no peer-reviewed direct measurement for commercial video AI exists.",
    },
  },
  {
    id: "training-llm", verb: "Training", dropdownText: "a large language model", dropdownLabel: "training a large language model",
    clarifying: "Training GPT-3 (175B parameters) — one-time, not per use. Frontier models are estimated to need 10–100× more energy. No company has disclosed training costs.",
    baseEnergyWh: 1287000000, energyLow: 500000000, energyHigh: 5000000000, baseWaterMl: 700000000,
    confidence: "medium", tierSensitive: false,
    math: {
      energy: { equation: "~1.287 GWh = training FLOPs ÷ hardware efficiency ÷ PUE", sourceName: "Strubell et al. 2019 + Brown et al. 2020", derivation: "Brown et al. (2020) disclosed GPT-3 used ~3.14 × 10²³ FLOPs. Strubell et al. (2019) developed the FLOP→energy conversion methodology accounting for PUE." },
      water: { equation: "~700 million mL (700,000 L) — Li et al. direct facility estimate", sourceName: "Li et al. 2023 — Making AI Less Thirsty", derivation: "Li et al. directly estimated GPT-3 training used ~700,000 L at Microsoft Azure data centers (Quincy, WA). Direct estimate — not derived from WUE formula." },
      note: "Training is not estimate-range or water-location sensitive here — Li et al. measured this specific historical event. Frontier model training costs are not publicly disclosed.",
    },
  },
];

// ─── CUSTOM CALCULATOR ────────────────────────────────────────────────────────
const CUSTOM_TASKS = [
  { id: "chat",    label: "Short chat messages",          unitEnergyWh: 0.10,  unitWaterMl: 0.12,  max: 1000, step: 1, defaultVal: 10  },
  { id: "longchat",label: "Long conversations",           unitEnergyWh: 5.0,   unitWaterMl: 6.0,   max: 100,  step: 1, defaultVal: 0   },
  { id: "image",   label: "AI images generated",         unitEnergyWh: 2.4,   unitWaterMl: 2.88,  max: 200,  step: 1, defaultVal: 0   },
  { id: "video",   label: "AI video clips (5–15 sec)",   unitEnergyWh: 944,   unitWaterMl: 1133,  max: 20,   step: 1, defaultVal: 0   },
  { id: "code",    label: "Code completion suggestions", unitEnergyWh: 0.05,  unitWaterMl: 0.06,  max: 1000, step: 1, defaultVal: 100 },
  { id: "app",     label: "App build sessions",          unitEnergyWh: 100,   unitWaterMl: 120,   max: 10,   step: 1, defaultVal: 0   },
];

// ─── ACTION TIPS ──────────────────────────────────────────────────────────────
const ACTION_TIPS = [
  { impact: "Very high", color: "#c0392b", title: "Skip AI video generation unless essential", body: "One 10-second AI video uses as much energy as ~9,400 chat messages (at Google's efficient rate). Describe your idea in words first. If you must generate, generate once — don't regenerate." },
  { impact: "High",      color: "#e67e22", title: "Think before generating AI images",        body: "One AI image uses ~24× more energy than a chat message. Ask: can I describe this in words instead? Reserve image generation for when visuals are truly necessary." },
  { impact: "High",      color: "#e67e22", title: "Get your prompt right the first time",     body: "Every 'try again' or 'make it shorter' is a full new request at the same cost. Spend 30 seconds being specific before submitting. One good prompt beats five mediocre ones." },
  { impact: "Medium",    color: "#f0a500", title: "Use smaller models for simple tasks",      body: "Basic questions and formatting don't need the most powerful AI. Google's Gemini Flash or GPT-4o Mini use significantly less energy than their full counterparts for everyday tasks." },
  { impact: "Medium",    color: "#f0a500", title: "Batch your questions into one prompt",     body: "Three separate messages cost 3× more than one well-structured prompt. Combine related questions: 'What is X, why does Y happen, and how do I fix Z?' beats asking each separately." },
  { impact: "Medium",    color: "#f0a500", title: "Keep conversations focused",               body: "A 50-message conversation uses ~50× more energy than one focused message. Use AI for specific tasks, not extended back-and-forth. Shorter, more targeted sessions are more efficient." },
  { impact: "Low",       color: "#27ae60", title: "Request plain text over formatted output", body: "Asking for tables, bullet points, markdown, or code blocks generates more tokens and uses slightly more energy. When you just need the answer, say 'reply without formatting.'" },
  { impact: "Low",       color: "#27ae60", title: "Try on-device AI for basic tasks",         body: "Voice-to-text on your phone, Siri, Google Assistant, and offline apps process data locally — no data center energy required. Reserve cloud AI for tasks that genuinely need it." },
];

// ─── ENERGY / WATER OFFSETS ───────────────────────────────────────────────────
const ENERGY_OFFSETS = [
  { id: "light",   label: "Turn off a 10W LED bulb",         unitLabel: "hours",   whPerUnit: 10   },
  { id: "ac",      label: "Skip 1 hour of air conditioning", unitLabel: "hours",   whPerUnit: 3500 },
  { id: "laundry", label: "Air-dry laundry (skip dryer)",     unitLabel: "loads",   whPerUnit: 2400 },
  { id: "walk",    label: "Walk instead of drive",            unitLabel: "km",      whPerUnit: 200  },
  { id: "laptop",  label: "Turn off a laptop",                unitLabel: "hours",   whPerUnit: 45   },
];
const WATER_OFFSETS = [
  { id: "shower", label: "Take a shorter shower",              unitLabel: "min shorter", mlPerUnit: 8000  },
  { id: "flush",  label: "Skip a toilet flush",                unitLabel: "flushes",     mlPerUnit: 9000  },
  { id: "dishes", label: "Dishwasher instead of hand-washing", unitLabel: "loads",       mlPerUnit: 50000 },
  { id: "tap",    label: "Turn off tap while brushing teeth",  unitLabel: "times",       mlPerUnit: 2000  },
];
const TRUSTED_LINKS = [
  { name: "Arcadia",        url: "https://arcadia.com",             desc: "Switch home energy to clean sources" },
  { name: "Wren",           url: "https://www.wren.co",            desc: "Monthly carbon offset subscription"   },
  { name: "EPA WaterSense", url: "https://www.epa.gov/watersense", desc: "Water efficiency programs"            },
];

// ─── COMPARE OPTIONS ──────────────────────────────────────────────────────────
type CompareOption = { id: string; label: string; unit: string; compute: (e: number, w: number) => number; format: (v: number) => string; };
const COMPARE_OPTIONS: CompareOption[] = [
  { id: "netflix",  label: "Netflix minutes", unit: "min of Netflix",
    compute: (e) => e / 0.8,
    format: (v) => v < 1 ? `${Math.round(v * 60)} sec` : v < 60 ? `${Math.round(v)} min` : v < 1440 ? `${(v/60).toFixed(1)} hrs` : `${(v/60/24).toFixed(1)} days` },
  { id: "led",      label: "LED bulb hours",  unit: "hrs of LED bulb (10W)",
    compute: (e) => e / 10,
    format: (v) => v < 1/60 ? `< 1 min` : v < 1 ? `${Math.round(v * 60)} min` : `${(Math.round(v * 10) / 10)} hrs` },
  { id: "handwash", label: "Handwashes",       unit: "handwashes",
    compute: (_, w) => w / 110,
    format: (v) => v < 0.01 ? `< 0.01` : v < 1 ? `${v.toFixed(2)} washes` : `${Math.round(v)} washes` },
  { id: "bottles",  label: "500 mL bottles",  unit: "500mL water bottles",
    compute: (_, w) => w / 500,
    format: (v) => v < 0.01 ? `< 0.01` : `${(Math.round(v * 100) / 100)}` },
];

const TASK_COLORS: Record<string, string> = {
  "short-chat":   "#5B9FD4",
  "email-reply":  "#10B981",
  "ai-search":    "#8B5CF6",
  "inbox-search": "#3B82F6",
  "meeting-notes":"#F59E0B",
  "image":        "#D96666",
  "long-chat":    "#2E80C0",
  "coding":       "#3D9A5A",
  "app-build":    "#1A6E38",
  "video":        "#A52B2B",
  "training-llm": "#888888",
};

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
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
  const h = ml / 110;
  if (h >= 10000) return `${(h / 1000).toFixed(1)}K handwashes`;
  if (h >= 1) return `${Math.round(h).toLocaleString()} handwash${Math.round(h) === 1 ? "" : "es"}`;
  if (h >= 0.05) return `${(Math.round(h * 10) / 10)} of a handwash`;
  return `${Math.round(ml)} mL of water`;
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
        style={{ border: "1.5px solid #c0c0c0", borderRadius: "100px", padding: "3px 16px 4px 16px", background: "transparent", fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>
        {selected.text}
        <span style={{ fontSize: "0.55em", opacity: 0.4, marginLeft: 3 }}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }}
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

// ─── DUAL ESTIMATE SELECTORS ─────────────────────────────────────────────────
function EstimateSelectors({ tier, wueTier, onTierChange, onWueTierChange }: {
  tier: ModelTier; wueTier: WueTier; onTierChange: (t: ModelTier) => void; onWueTierChange: (w: WueTier) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-400 font-medium w-[58px] text-right leading-tight shrink-0">Energy<br/>estimate</span>
        <div className="flex gap-1 bg-gray-100 rounded-full p-1">
          {(["research", "commercial", "frontier"] as ModelTier[]).map(t => (
            <button key={t} onClick={() => onTierChange(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${tier === t ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {TIER_META[t].rangeLabel}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-400 font-medium w-[58px] text-right leading-tight shrink-0">Water<br/>location</span>
        <div className="flex gap-1 bg-gray-100 rounded-full p-1">
          {(["efficient", "average", "intensive"] as WueTier[]).map(w => (
            <button key={w} onClick={() => onWueTierChange(w)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${wueTier === w ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {WUE_META[w].label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 italic text-center max-w-xs leading-relaxed mt-0.5">
        {TIER_META[tier].source} (energy) · {WUE_META[wueTier].source} (water)
      </p>
    </div>
  );
}

// ─── MATH MODAL ───────────────────────────────────────────────────────────────
function MathModal({ scenario, tier, wueTier, energyWh, waterMl, onClose }: {
  scenario: Scenario; tier: ModelTier; wueTier: WueTier; energyWh: number; waterMl: number; onClose: () => void;
}) {
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
              <p className="text-[11px] text-gray-400 mt-0.5 italic">{TIER_META[tier].rangeLabel} energy · {WUE_META[wueTier].label} water · {TIER_META[tier].source} / {WUE_META[wueTier].source}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={14} className="text-gray-400" /></button>
          </div>
          {scenario.tierSensitive && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 leading-relaxed">
              Energy varies by estimate range. Currently: <strong>{TIER_META[tier].rangeLabel}</strong> ({TIER_META[tier].source}). Change using the selectors on the main screen.
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
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-black">💧 Water: {fmtWater(waterMl)}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-blue-50 text-blue-700 border-blue-200">{WUE_META[wueTier].label} DC · {WUE_VALUES[wueTier]} mL/Wh</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-2.5"><p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.id === "training-llm" ? scenario.math.water.equation : `${fmtEnergy(energyWh)} × ${WUE_VALUES[wueTier]} mL/Wh = ${fmtWater(waterMl)}`}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Water source</p><p className="text-xs text-black font-medium">{scenario.math.water.sourceName}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Derivation</p><p className="text-xs text-gray-600 leading-relaxed">{scenario.math.water.derivation}</p></div>
            </div>
          </div>
          {scenario.math.note && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-[10px] text-amber-700 uppercase tracking-widest font-medium mb-1">Note</p>
              <p className="text-xs text-amber-800 leading-relaxed">{scenario.math.note}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── CUSTOM CALCULATOR ────────────────────────────────────────────────────────
function CustomCalculator({ counts, onChange, totalE, totalW }: {
  counts: Record<string, number>;
  onChange: (id: string, val: number) => void;
  totalE: number;
  totalW: number;
}) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {CUSTOM_TASKS.map(t => (
        <div key={t.id} className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-44 shrink-0 leading-tight">{t.label}</label>
          <input type="range" min={0} max={t.max} step={t.step} value={counts[t.id] ?? 0}
            onChange={e => onChange(t.id, Number(e.target.value))} className="flex-1 accent-black" />
          <span className="text-xs font-medium w-10 text-right tabular-nums">{counts[t.id] ?? 0}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-4 text-center" style={{ fontFamily: "'Anthropic Serif', serif" }}>
        {totalE === 0
          ? <p className="text-gray-400 text-sm italic">Adjust sliders to see your usage.</p>
          : <>
            <p className="text-[1.1rem] leading-[2] text-black">
              Your session used{" "}
              <strong style={{ borderBottom: "2px solid currentColor", whiteSpace: "nowrap" }}>{fmtEnergy(totalE)}</strong>{" "}
              of energy and{" "}
              <strong style={{ borderBottom: "2px solid currentColor", whiteSpace: "nowrap" }}>{fmtWater(totalW)}</strong>{" "}
              of water.
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
function ComparePanel({ selectedId, tier, wueTier, onClose }: { selectedId: string; tier: ModelTier; wueTier: WueTier; onClose: () => void }) {
  const [optionId, setOptionId] = useState("netflix");
  const [showTraining, setShowTraining] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const option = COMPARE_OPTIONS.find(o => o.id === optionId)!;
  const wue = WUE_VALUES[wueTier];

  const rows = SCENARIOS
    .filter(s => (showTraining || s.id !== "training-llm") && (showVideo || s.id !== "video"))
    .map(s => {
      const e = getEnergyWh(s.id, s.baseEnergyWh, tier);
      const w = getWaterMl(s.id, s.baseWaterMl, e, wue);
      return { ...s, val: option.compute(e, w), energy: e, water: w };
    })
    .sort((a, b) => a.val - b.val);

  const maxVal = Math.max(...rows.map(r => r.val), 0.001);

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto flex flex-col"
        style={{ width: "min(95vw, 900px)", background: "#333333" }}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}>

        <div className="px-8 pt-8 pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Compare AI tasks</h2>
              <p className="text-sm text-white/40 mt-0.5">
                {TIER_META[tier].rangeLabel} energy · {WUE_META[wueTier].label} water · sorted smallest → largest
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10 border border-white/20">
              <X size={16} className="text-white/70" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPARE_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setOptionId(o.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${optionId === o.id ? "bg-white text-black border-white" : "border-white/25 text-white/50 hover:border-white/50 hover:text-white/75"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-8 py-6 flex flex-col gap-3">
          <div className="text-xs text-white/30 italic mb-1">
            Bars show proportion relative to the largest visible task · {option.unit}
          </div>

          {rows.map(({ id, dropdownLabel, val, energy, water }, i) => {
            const color = TASK_COLORS[id];
            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isSel = id === selectedId;
            const smallestVal = rows[0]?.val ?? 1;
            const relToSmallest = smallestVal > 0 ? val / smallestVal : 1;

            return (
              <motion.div key={id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={`rounded-xl p-4 transition-colors ${isSel ? "ring-1 ring-white/30" : "hover:bg-white/5"}`}
                style={isSel ? { background: "rgba(255,255,255,0.1)" } : {}}>
                <div className="flex items-center gap-4 mb-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className={`text-xs flex-1 ${isSel ? "text-white font-medium" : "text-white/60"}`}>
                    {dropdownLabel}
                    {isSel && <span className="ml-2 text-[10px] text-white/35 italic font-normal">← current</span>}
                  </span>
                  {relToSmallest > 1.5 && i > 0 && (
                    <span className="text-[10px] text-white/30 font-mono shrink-0">×{Math.round(relToSmallest)}</span>
                  )}
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${isSel ? "text-white" : "text-white/70"}`}>
                    {option.format(val)}
                  </span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div className="absolute left-0 top-0 h-full rounded-full"
                    style={{ background: color, opacity: isSel ? 1 : 0.75 }}
                    initial={{ width: "0%" }} animate={{ width: `${Math.max(pct, 0.4)}%` }}
                    transition={{ delay: i * 0.04 + 0.15, duration: 0.55, ease: "easeOut" }} />
                </div>
                <div className="flex gap-4 mt-1.5">
                  <span className="text-[10px] text-white/25">⚡ {fmtEnergy(energy)}</span>
                  <span className="text-[10px] text-white/25">💧 {fmtWater(water)}</span>
                </div>
              </motion.div>
            );
          })}

          <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-3">
            <p className="text-xs text-white/30 font-medium uppercase tracking-widest">Show high-impact tasks</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showVideo} onChange={e => setShowVideo(e.target.checked)} className="accent-white mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span className="text-xs text-white/50 group-hover:text-white/70 leading-relaxed">
                <strong className="text-white/70">Video generation</strong> — one 10-sec clip uses ~{Math.round(944/0.10)}× more energy than a single Gemini text prompt. Physically expected (hundreds of image generation passes per video).
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showTraining} onChange={e => setShowTraining(e.target.checked)} className="accent-white mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span className="text-xs text-white/50 group-hover:text-white/70 leading-relaxed">
                <strong className="text-white/70">Training a large language model</strong> — happens once per model, not per use. ~{(1287000000 / 944).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}× more energy than video generation.
              </span>
            </label>
          </div>

          <p className="text-[10px] text-white/20 italic leading-relaxed mt-2">
            {TIER_META[tier].rangeLabel} energy ({TIER_META[tier].source}) · {WUE_META[wueTier].label} water ({WUE_VALUES[wueTier]} mL/Wh, {WUE_META[wueTier].source}) · Video gen is first-principles derived — no peer-reviewed direct measurement exists.
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
  const [tab, setTab] = useState<"habits" | "offset">("habits");
  const ea = ENERGY_OFFSETS.find(a => a.id === eOff)!;
  const wa = WATER_OFFSETS.find(a => a.id === wOff)!;

  return (
    <>
      <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto flex flex-col"
        style={{ width: "min(95vw, 380px)", background: "#333333" }}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}>

        <div className="px-6 pt-7 pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Take Action</h2>
              {scenario && <p className="text-xs text-white/40 italic mt-0.5">{scenario.verb.toLowerCase()} {scenario.dropdownText}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 shrink-0"><X size={14} className="text-white/50" /></button>
          </div>
          <div className="flex gap-1 mt-4 bg-white/8 rounded-full p-1">
            <button onClick={() => setTab("habits")} className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-all ${tab === "habits" ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}>
              Everyday habits
            </button>
            <button onClick={() => setTab("offset")} className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-all ${tab === "offset" ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}>
              Offset this task
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {tab === "habits" && (
            <>
              <p className="text-[11px] text-white/40 italic">Ranked by biggest energy impact first</p>
              {ACTION_TIPS.map((tip, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 inline-block"
                    style={{ background: tip.color + "28", color: tip.color }}>{tip.impact} impact</span>
                  <p className="text-xs font-semibold text-white leading-snug mt-1 mb-1.5">{tip.title}</p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{tip.body}</p>
                </div>
              ))}
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-3">Clean energy & offsets</p>
                {TRUSTED_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-2 hover:bg-white/10 transition-colors group"
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
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium mb-3">⚡ Offset {fmtEnergy(energyWh)} of energy</p>
                <select value={eOff} onChange={e => setEOff(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 mb-3 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                  {ENERGY_OFFSETS.map(a => <option key={a.id} value={a.id} style={{ background: "#333", color: "#fff" }}>{a.label}</option>)}
                </select>
                <p className="text-lg font-light text-white"><strong className="font-semibold">{fmtOffset(energyWh / ea.whPerUnit, ea.unitLabel)}</strong></p>
              </div>
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium mb-3">💧 Offset {fmtWater(waterMl)} of water</p>
                <select value={wOff} onChange={e => setWOff(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 mb-3 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                  {WATER_OFFSETS.map(a => <option key={a.id} value={a.id} style={{ background: "#333", color: "#fff" }}>{a.label}</option>)}
                </select>
                <p className="text-lg font-light text-white"><strong className="font-semibold">{fmtOffset(waterMl / wa.mlPerUnit, wa.unitLabel)}</strong></p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-3">Structured offsets</p>
                {TRUSTED_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-2 hover:bg-white/10 transition-colors group"
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
                <p className="font-semibold text-black text-sm mb-2">Two independent selectors — energy and water</p>
                <p>Energy and water are controlled separately because they depend on different factors. Energy depends on which AI model and infrastructure you use. Water depends on where the data center is located and what cooling system it uses — independently of the AI model.</p>
                <ul className="mt-2 ml-4 flex flex-col gap-1.5">
                  <li className="list-disc"><strong>Energy → Low/Average/High:</strong> represents different published study estimates for energy per AI query.</li>
                  <li className="list-disc"><strong>Water → Efficient/Typical/Water-intensive:</strong> represents the Water Use Effectiveness (WUE) of the data center, which varies by location and cooling type.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Energy estimates</p>
                <ul className="ml-4 flex flex-col gap-1.5">
                  <li className="list-disc"><strong>Low (Luccioni 2023):</strong> directly measured on open-source GPU hardware. Small models like BLOOM, OPT, Stable Diffusion 1.5.</li>
                  <li className="list-disc"><strong>Average (Google Cloud 2025):</strong> direct measurement. A median Gemini App text-generation prompt used 0.10 Wh and 0.12 mL (May 2025 data). Google's TPU infrastructure (Trillium/Ironwood) is among the most efficient for AI inference.</li>
                  <li className="list-disc"><strong>High (EPRI 2024 / Goldman Sachs 2024):</strong> estimated for ChatGPT-class models on GPU infrastructure (Azure). Goldman Sachs: AI uses ~10× more than a Google Search (0.3 Wh × 10 ≈ 3 Wh). EPRI's ChatGPT estimate: 2.9 Wh.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Water Use Effectiveness (WUE)</p>
                <ul className="ml-4 flex flex-col gap-1.5">
                  <li className="list-disc"><strong>Efficient (1.2 mL/Wh, Google 2025):</strong> derived from Google's direct measurement — 0.12 mL water per 0.10 Wh prompt = 1.2 mL/Wh. Google uses renewable energy, TPU hardware, and operates in cooler climates.</li>
                  <li className="list-disc"><strong>Typical (3.45 mL/Wh, Li et al. 2023):</strong> calibrated from Li et al.'s estimate that ChatGPT produces ~10 mL per query at 2.9 Wh/query → 10/2.9 ≈ 3.45 mL/Wh. Represents average US commercial AI infrastructure (Azure-class).</li>
                  <li className="list-disc"><strong>Water-intensive (6.0 mL/Wh, IEA 2024):</strong> upper range for hot-climate data centers (Texas, Arizona) using evaporative cooling during summer months.</li>
                </ul>
              </div>
            </div>
          )}
          {tab === "sources" && (
            <div className="flex flex-col gap-5">
              {isLoading && <p className="text-xs text-gray-400 italic">Loading sources…</p>}
              {((sources || []) as any[]).map((s: any) => (
                <div key={s.id} className="border-b border-gray-100 pb-5 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1"><p className="font-semibold text-black text-sm">{s.title}</p><p className="text-xs text-gray-400 mt-0.5">{Array.isArray(s.authors) ? s.authors.join(", ") : s.authors} · {s.institution} · {s.year}</p></div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-black shrink-0"><ExternalLink size={13} /></a>
                  </div>
                  {s.keyFindings && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{s.keyFindings}</p>}
                  {s.limitations && <p className="text-xs text-gray-400 mt-1.5 italic leading-relaxed">{s.limitations}</p>}
                </div>
              ))}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="font-semibold text-black text-sm mb-2">Google Cloud 2025</p>
                <p className="text-xs text-gray-500 mb-2">Google Cloud Infrastructure — May 2025</p>
                <p className="text-xs text-gray-600 leading-relaxed">Direct measurement of a median Gemini App text-generation prompt: 0.10 Wh energy, 0.03 g CO₂, 0.12 mL water (May 2025 point-in-time data). Methodology: energy per prompt × Google's 2024 average fleetwide grid carbon intensity (emissions) and water usage effectiveness (water). Used as the "Average" energy estimate and source for the Efficient (1.2 mL/Wh) WUE value in this tool.</p>
                <a href="https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 mt-2 hover:underline">
                  Read the Google Cloud blog post <ExternalLink size={11} />
                </a>
              </div>
            </div>
          )}
          {tab === "gaps" && (
            <div className="flex flex-col gap-4 text-xs text-gray-700">
              {[
                { title: "Only Google has published per-prompt measurements (2025)", body: "Google Cloud's May 2025 blog post is the only major AI company to publish direct per-prompt energy and water measurements. ChatGPT (OpenAI/Azure), Claude (Anthropic/AWS), and Midjourney have not published per-query figures. All estimates for non-Google commercial AI are modelled." },
                { title: "Video generation is unverified", body: "No peer-reviewed study has directly measured energy for commercial video AI (Sora, Runway, Pika) as of 2025. The 944 Wh estimate is derived by scaling image measurements by frame count — physically reasonable but unconfirmed." },
                { title: "Water varies dramatically by data center location", body: "WUE can range from ~1.2 mL/Wh (Google's efficient TPU data centers) to 6+ mL/Wh (hot-climate evaporative cooling). When you make an AI request, you typically don't know where it will be processed." },
                { title: "Hardware lifecycle excluded", body: "All estimates cover operational energy only. GPU and server manufacturing, data center construction, and end-of-life disposal are excluded. Research suggests embodied carbon represents 50–80% of total lifecycle impact." },
                { title: "Google's 2025 efficiency may not apply to other providers", body: "Google uses custom TPUs (Trillium/Ironwood) that are 30× more energy-efficient than their first TPU. ChatGPT and Claude run primarily on Nvidia GPUs in third-party cloud infrastructure — likely closer to the 'High' energy estimate." },
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
function SideTab({ onClick, label, bg = "#333333", textColor = "rgba(255,255,255,0.8)", icon }: {
  onClick: () => void; label: string; bg?: string; textColor?: string; icon: ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 px-3 py-5 rounded-l-2xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.97] group"
      style={{ background: bg }}>
      <span style={{ color: textColor, opacity: 0.8 }} className="group-hover:opacity-100 transition-opacity">{icon}</span>
      <span style={{
        writingMode: "vertical-rl", transform: "rotate(180deg)", color: textColor,
        opacity: 0.65, fontSize: "11px", letterSpacing: "0.04em", whiteSpace: "nowrap", fontWeight: 400
      }} className="group-hover:opacity-90 transition-opacity">
        {label}
      </span>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home() {
  const [selectedId, setSelectedId] = useState("app-build");
  const [tier, setTier] = useState<ModelTier>("commercial");
  const [wueTier, setWueTier] = useState<WueTier>("average");
  const [showMath, setShowMath] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [customCounts, setCustomCounts] = useState<Record<string, number>>(
    Object.fromEntries(CUSTOM_TASKS.map(t => [t.id, t.defaultVal]))
  );

  const handleCustomChange = (id: string, val: number) =>
    setCustomCounts(c => ({ ...c, [id]: val }));

  const isCustom = selectedId === "custom";
  const scenario = SCENARIOS.find(s => s.id === selectedId) ?? null;
  const wue = WUE_VALUES[wueTier];

  const customTotalE = CUSTOM_TASKS.reduce((s, t) => s + (customCounts[t.id] ?? 0) * t.unitEnergyWh, 0);
  const customTotalW = CUSTOM_TASKS.reduce((s, t) => s + (customCounts[t.id] ?? 0) * t.unitWaterMl, 0);

  const energyWh = isCustom ? customTotalE : scenario ? getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) : 0;
  const waterMl  = isCustom ? customTotalW : scenario ? getWaterMl(scenario.id, scenario.baseWaterMl, energyWh, wue) : 0;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>

      {/* Scrollable center — centers when content fits, scrolls on small screens */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-center min-h-full relative px-4 sm:px-8 md:px-16 py-5">
          <AnimatePresence mode="wait">
            <motion.div key={selectedId + tier + wueTier}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 md:gap-5 w-full max-w-xl">

              {isCustom ? (
                <div className="w-full">
                  <p className="text-center text-xs text-gray-400 mb-4">
                    Scenario: <InlineDropdown value={selectedId} onChange={setSelectedId} />
                  </p>
                  <CustomCalculator
                    counts={customCounts}
                    onChange={handleCustomChange}
                    totalE={customTotalE}
                    totalW={customTotalW}
                  />
                </div>
              ) : scenario ? (
                <>
                  {/* Line 1: dropdown */}
                  <InlineDropdown value={selectedId} onChange={setSelectedId} />

                  {/* Line 2: data sentence */}
                  <p className="text-[1.15rem] sm:text-[1.35rem] md:text-[1.65rem] leading-[1.5] text-black text-center -mt-1"
                    style={{ fontFamily: "'Anthropic Serif', serif" }}>
                    used{" "}
                    <strong style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px", whiteSpace: "nowrap" }}>{fmtEnergy(energyWh)}</strong>
                    {" "}of energy and{" "}
                    <strong style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px", whiteSpace: "nowrap" }}>{fmtWater(waterMl)}</strong>
                    {" "}of water.
                  </p>

                  {/* Equivalent */}
                  <p className="text-sm md:text-[1.05rem] leading-[1.7] text-gray-500 text-center -mt-1"
                    style={{ fontFamily: "'Anthropic Serif', serif" }}>
                    That's {equivEnergy(energyWh)} and {equivWater(waterMl)}.
                  </p>

                  {/* Dual selectors */}
                  <EstimateSelectors tier={tier} wueTier={wueTier} onTierChange={setTier} onWueTierChange={setWueTier} />

                  {/* Fine print */}
                  <p className="text-[11px] md:text-xs text-gray-400 font-light leading-relaxed text-center italic max-w-xs">
                    {scenario.clarifying}{" "}
                    <button onClick={() => setShowMath(true)} className="underline underline-offset-2 hover:text-black transition-colors not-italic">
                      Show me the math →
                    </button>
                  </p>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {/* Desktop-only side tabs */}
          <div className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
            <AnimatePresence>
              {!showCompare && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <SideTab onClick={() => setShowCompare(true)} label="compare tasks" bg="#333333" icon={<BarChart2 size={15} color="rgba(255,255,255,0.85)" />} />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!showAction && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <SideTab onClick={() => setShowAction(true)} label="take action" bg="#333333" icon={<Sparkles size={15} color="rgba(255,255,255,0.85)" />} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom bar — three evenly spaced buttons on mobile, left+right layout on desktop */}
      <div className="flex-shrink-0 border-t border-gray-100 px-3 md:px-10 py-3 md:py-4">
        {/* Mobile: three pill buttons side by side */}
        <div className="flex md:hidden items-center gap-2 justify-between">
          <button onClick={() => setShowSources(true)}
            className="flex-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-full px-3 py-2 text-center">
            Sources
          </button>
          <button onClick={() => setShowCompare(true)}
            className="flex-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-full px-3 py-2 text-center">
            Compare
          </button>
          <button onClick={() => setShowAction(true)}
            className="flex-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-full px-3 py-2 text-center">
            Take action
          </button>
        </div>
        {/* Desktop: sources left, info text right */}
        <div className="hidden md:flex items-center justify-between">
          <button onClick={() => setShowSources(true)}
            className="text-xs font-medium text-gray-600 hover:text-black transition-colors border border-gray-300 hover:border-gray-600 rounded-full px-5 py-2 shadow-sm hover:shadow-md">
            Sources & methodology
          </button>
          <p className="text-[10px] text-gray-300 italic font-light text-right max-w-[220px] leading-relaxed">
            Varies by model, data center & region. Average energy = Google Cloud 2025.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showMath && scenario && <MathModal scenario={scenario} tier={tier} wueTier={wueTier} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowMath(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSources && <SourcesModal onClose={() => setShowSources(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAction && <ActionPanel scenario={scenario} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowAction(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCompare && <ComparePanel selectedId={selectedId} tier={tier} wueTier={wueTier} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
    </div>
  );
}
