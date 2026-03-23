import { useState, type ReactNode } from "react";
import { X, ExternalLink, BarChart2, Leaf, BookOpen, Coffee, ChevronRight, ChevronLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";

// ─── ENERGY ESTIMATE TIERS ───────────────────────────────────────────────────
// Three separate published estimates — chosen independently of water location.
// "Light"     = Luccioni et al. 2023: direct GPU measurement on small open-source models
// "Standard"  = Google Cloud 2025: comprehensive measurement, median Gemini prompt, Aug 2025
// "Intensive" = EPRI 2024: estimated for ChatGPT on Azure GPU infrastructure (GPU-heavy workloads)
export type ModelTier = "research" | "commercial" | "frontier";

export const TIER_META: Record<ModelTier, { rangeLabel: string; rangeDesc: string; source: string }> = {
  research: {
    rangeLabel: "Light",
    rangeDesc: "Measured directly on small open-source AI models (BLOOM, OPT, Stable Diffusion). Closest to local/self-hosted AI tools and lightweight, task-specific models.",
    source: "Luccioni et al. 2023",
  },
  commercial: {
    rangeLabel: "Standard",
    rangeDesc: "Comprehensive measurement across Google's full Gemini App infrastructure (Aug 2025 paper, arXiv:2508.15734). Covers active AI chips, host CPU, cooling overhead, and idle provisioning. A median Gemini text prompt: 0.24 Wh and 0.26 mL. Google explicitly notes the older 0.10 Wh figure 'substantially underestimates' the real footprint.",
    source: "Google Cloud 2025 (Aug)",
  },
  frontier: {
    rangeLabel: "Intensive",
    rangeDesc: "Demanding AI tasks and older frontier models. EPRI 2024 estimate for ChatGPT on Azure GPU infrastructure: 2.9 Wh — consistent with Li et al.'s direct water measurement for a 50-message session. OpenAI's o3 reasoning model reaches ~3.9 Wh (Jegham et al. 2025). Note: modern GPT-4o is now ~0.34 Wh (Sam Altman, Jun 2025) — nearly Standard-tier.",
    source: "EPRI 2024 · Jegham et al. 2025",
  },
};

// ─── WATER LOCATION (WUE) TIERS ──────────────────────────────────────────────
// Water Use Effectiveness (WUE) varies by data center location and cooling type.
// This is independent of energy — different providers use different infrastructure.
// Google Cloud 2025 (Aug): 0.26 mL / 0.24 Wh ≈ 1.1 mL/Wh (efficient TPU DCs, renewable, cold climate)
// Li et al. 2023: calibrated 3.45 mL/Wh for Microsoft/OpenAI Azure infra (US commercial avg)
// IEA 2024: up to 6 mL/Wh for hot-climate evaporative cooling data centers
export type WueTier = "efficient" | "average" | "intensive";

export const WUE_VALUES: Record<WueTier, number> = {
  efficient: 1.1,   // Google Cloud 2025 (Aug comprehensive): 0.26 mL / 0.24 Wh ≈ 1.1 mL/Wh
  average:   3.45,  // Li et al. 2023 calibration (ChatGPT/Microsoft Azure, US avg)
  intensive: 6.0,   // IEA 2024 upper: hot climate, evaporative cooling
};

export const WUE_META: Record<WueTier, { label: string; shortDesc: string; source: string }> = {
  efficient: {
    label: "Efficient",
    shortDesc: "Google-class data centers — custom TPUs, renewable energy, cold climate. Measured WUE: 1.1 mL/Wh (Google Aug 2025: 0.26 mL per 0.24 Wh prompt).",
    source: "Google Cloud 2025 (Aug)",
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
// Google Cloud 2025 (Aug): 0.24 Wh per median Gemini text prompt (comprehensive measurement).
const TIER_ENERGY: Record<string, Record<ModelTier, number>> = {
  // Source: Luccioni 2023 (research: 0.003Wh), Google Cloud 2025 (commercial: 0.24Wh), EPRI 2024 (frontier: 2.9Wh)
  "short-chat":    { research: 0.003, commercial: 0.24,  frontier: 2.9   },
  // Source: Modelled based on Google Cloud 2025 (commercial: 0.50Wh), EPRI 2024 (frontier: 3.0Wh)
  "email-reply":   { research: 0.005, commercial: 0.50,  frontier: 3.0   },
  // Source: Modelled based on 3x search retrieval passes (commercial: 0.72Wh), EPRI 2024 (frontier: 8.7Wh)
  "ai-search":     { research: 0.01,  commercial: 0.72,  frontier: 8.7   },
  // Source: Modelled multi-pass retrieval based on Google Cloud 2025 (commercial: 1.20Wh), EPRI 2024 (frontier: 5.0Wh)
  // Source: Audio rate Luccioni 2023 (research: 0.06Wh), Google Cloud transcription + summary (commercial: 1.70Wh)
  "inbox-search":  { research: 0.03,  commercial: 1.20,  frontier: 5.0   },
  "meeting-notes": { research: 0.06,  commercial: 1.70,  frontier: 5.9   },
  "scoring-rubric":  { research: 0.005, commercial: 0.24,  frontier: 3.0   },
  "lesson-plan":   { research: 0.015, commercial: 0.50,  frontier: 5.0   },
  "study-guide":   { research: 0.02,  commercial: 0.75,  frontier: 7.5   },
  // Source: 50 messages x base (research: 0.15Wh), Google Cloud 2025 (commercial: 12.0Wh), EPRI 2024 (frontier: 145Wh)
  "long-chat":     { research: 0.15,  commercial: 12.0,  frontier: 145   },
  // Source: 100 completions x base (research: 0.1Wh), Google Cloud 2025 (commercial: 12.0Wh), EPRI 2024 (frontier: 29Wh)
  "coding":        { research: 0.1,   commercial: 12.0,  frontier: 29    },
  // Source: ~1000 interactions x base (research: 50Wh), Google Cloud 2025 (commercial: 240Wh), EPRI 2024 (frontier: 1000Wh)
  "app-build":     { research: 50,    commercial: 240,   frontier: 1000  },
};

const TIER_SOURCE: Record<string, Record<ModelTier, string>> = {
  "short-chat": {
    research:   "Luccioni et al. 2023 — direct GPU measurement on open-source text models. Range: 0.001–0.01 Wh per query.",
    commercial: "Google Cloud 2025 (Aug) — comprehensive measurement (arXiv:2508.15734). A median Gemini App text-generation prompt uses 0.24 Wh and 0.26 mL. Covers active AI chips, host CPU, cooling overhead, and idle provisioning. Google's earlier 0.10 Wh figure (May 2025) counted only active GPU/TPU — the Aug paper explicitly notes that figure 'substantially underestimates' the real footprint.",
    frontier:   "EPRI 2024 — estimated for ChatGPT on Azure (GPU infrastructure). EPRI's full ChatGPT query estimate: 2.9 Wh. Consistent with Li et al. cross-check: 50 messages × 2.9 Wh × 3.45 mL/Wh = 500 mL (matches Li et al. direct measurement). Note: modern GPT-4o is ~0.34 Wh (Sam Altman, Jun 2025); o3 reasoning reaches ~3.9 Wh (Jegham et al. 2025).",
  },
  "long-chat": {
    research:   "Luccioni et al. 2023 scaled: 50 messages × 0.003 Wh = 0.15 Wh.",
    commercial: "Google Cloud 2025 (Aug) scaled: 50 messages × 0.24 Wh per Gemini prompt = 12.0 Wh.",
    frontier:   "EPRI 2024 scaled: 50 messages × 2.9 Wh = 145 Wh. Cross-check: 145 Wh × 3.45 mL/Wh = 500 mL = Li et al.'s direct measurement for a 50-message ChatGPT session. ✓",
  },
  "coding": {
    research:   "Luccioni et al. 2023: code completions at ~0.001 Wh each × 100 = 0.1 Wh.",
    commercial: "Google Cloud 2025 (Aug) scaled: 100 code completions × ~0.12 Wh = 12.0 Wh. Code completions are typically shorter than full chat prompts, so scaled at 50% of the full text prompt estimate (0.24 Wh × 0.5 = 0.12 Wh each).",
    frontier:   "EPRI 2024 scaled: 100 × 0.29 Wh = 29 Wh (upper bound — code assistant models are typically more efficient than full GPT-4).",
  },
  "app-build": {
    research:   "Modelled: ~1,000 small model calls (Luccioni 2023 baseline, 0.05 Wh avg) = 50 Wh.",
    commercial: "Google Cloud 2025 (Aug) scaled: ~1,000 AI interactions × 0.24 Wh = 240 Wh. Represents an app-building session using Gemini-class efficient models.",
    frontier:   "EPRI 2024 scaled: ~500 interactions × 2 Wh avg = 1,000 Wh. Upper bound — coding assistants typically use specialized models, not full frontier LLMs.",
  },
  "inbox-search": {
    research:   "Estimated: batch embedding lookups over ~100 emails (0.001 Wh each) + small-model analysis ≈ 0.03 Wh. Local or on-device models only.",
    commercial: "Google Cloud 2025 (Aug) basis: semantic search over inbox (~0.72 Wh for 3 retrieval passes × 0.24 Wh) + one synthesis/summary generation (0.48 Wh) ≈ 1.20 Wh. Covers tools like Gmail AI search, Copilot for Outlook, or asking an AI assistant to find and analyze email history.",
    frontier:   "EPRI 2024 basis: full inbox processing with a frontier LLM reading many email threads (multiple calls ≈ 5.0 Wh). Upper bound for frontier models analyzing large email corpora.",
  },
  "ai-search": {
    research:   "Estimated lower bound for a small-model RAG pipeline: 0.01 Wh. Much lower than commercial AI search as it assumes efficient local models.",
    commercial: "Google Cloud 2025 (Aug) basis, scaled for multi-step processing. AI search (Perplexity, Google AI Overviews, Bing Copilot) performs 3+ model passes — query embedding, source retrieval, and synthesis. Estimate: 0.24 Wh × 3 = 0.72 Wh. No direct measurement published for AI search products.",
    frontier:   "Estimated at ~3× EPRI's full ChatGPT query estimate (2.9 Wh × 3 ≈ 8.7 Wh). Upper bound for frontier-model RAG with multiple retrieval rounds.",
  },
  "email-reply": {
    research:   "Estimated: local embedding search (< 0.001 Wh) + small-model draft (0.003 Wh) ≈ 0.005 Wh.",
    commercial: "Google Cloud 2025 (Aug) basis: one semantic search/classification pass (~0.24 Wh) + one reply generation (~0.24 Wh) ≈ 0.50 Wh. Covers tools like Gmail Smart Reply, Copilot for Outlook, or asking an AI assistant to draft a response.",
    frontier:   "EPRI 2024 basis: full thread processing + long-form draft ≈ 3.0 Wh. Upper bound for frontier models with extended email context windows.",
  },
  "scoring-rubric": {
    research: "Estimated: small local model tabular formatting.",
    commercial: "Estimated based on a standard commercial text generation prompt (~0.24 Wh).",
    frontier: "Estimated upper bound for long context formatting.",
  },
  "lesson-plan": {
    research: "Estimated: small local model text generation.",
    commercial: "Estimated: requires more context and synthesis (~0.50 Wh).",
    frontier: "Estimated: frontier model planning and generation (~5.0 Wh).",
  },
  "study-guide": {
    research: "Estimated: small local model synthesis.",
    commercial: "Estimated: reading material and generating structured study notes (~0.75 Wh).",
    frontier: "Estimated: frontier model reading large context (~7.5 Wh).",
  },
  "meeting-notes": {
    research:   "Luccioni 2023 audio rate (0.002 Wh/min × 30 min) = 0.06 Wh. Small models only, no summarization included.",
    commercial: "Google Cloud 2025 (Aug) basis: continuous transcription (~0.047 Wh/min × 30 min ≈ 1.40 Wh) + one end-of-meeting summary generation (0.24 Wh) ≈ 1.70 Wh. Covers tools like Otter.ai, Fireflies.ai, and Copilot for Teams. No direct measurement published.",
    frontier:   "EPRI 2024 basis: commercial transcription rate (~0.10 Wh/min × 30 min = 3.0 Wh) + frontier-model summary (2.9 Wh) ≈ 5.9 Wh. Upper bound for meeting AI using frontier LLMs.",
  },
};


function getEnergyWh(id: string, base: number, tier: ModelTier): number {
  return TIER_ENERGY[id]?.[tier] ?? base;
}
function getWaterMl(id: string, baseWater: number, energyWh: number, baseEnergyWh: number, wue: number, tier: ModelTier): number {
  if (id === "training-llm") return baseWater; // Li et al. direct facility estimate
  
  // Specific cited source decoupling rules:
  // Li et al. (2023) directly correlates 2.9 Wh (frontier) with 500 mL for 50 queries.
  // Google Cloud (2025) directly correlates 0.24 Wh (commercial) with 0.26 mL.
  const hasDirectCitation = (id === "short-chat" || id === "long-chat") && (tier === "frontier" || tier === "commercial");
  if (hasDirectCitation || id === "image" || id === "video") {
    return energyWh * wue;
  }
  
  // Decouple water from energy toggle for all other extrapolated tasks (use standard 'commercial' tier baseline)
  const standardEnergy = getEnergyWh(id, baseEnergyWh, "commercial");
  return standardEnergy * wue;
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface MathBlock { equation: string; sourceName: string; derivation: string; tierSource?: Record<ModelTier, string>; }
interface Scenario {
  id: string; verb: string; dropdownText: string; dropdownLabel: string; clarifying: string;
  baseEnergyWh: number; energyLow: number; energyHigh: number; baseWaterMl: number;
  confidence: "high" | "medium" | "low"; tierSensitive: boolean;
  math: { energy: MathBlock; water: MathBlock; note?: string };
  category: string;
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: "short-chat", category: "Chat", verb: "Sending", dropdownText: "a short chat message", dropdownLabel: "a short chat message",
    clarifying: "One short message to an AI assistant. Low-impact individually, but billions happen daily. Google's comprehensive Aug 2025 measurement: 0.24 Wh and 0.26 mL per median Gemini prompt — select 'Standard' to see this figure.",
    baseEnergyWh: 0.003, energyLow: 0.003, energyHigh: 2.9, baseWaterMl: 0.003 * 3.45,
    confidence: "high", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 query × [energy per query, by estimate]", sourceName: "Luccioni 2023 · Google Cloud 2025 · EPRI 2024 / Goldman Sachs 2024", derivation: "Select an estimate range to see the source-specific derivation.", tierSource: TIER_SOURCE["short-chat"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024 — see Water Location selector", derivation: "Google Cloud 2025 (Aug) comprehensively measured 0.26 mL per median Gemini prompt (with 0.24 Wh energy → WUE ≈ 1.1 mL/Wh). Li et al. (2023) calibrated WUE = 3.45 mL/Wh for Microsoft/Azure ChatGPT infrastructure. Select a Water Location to choose the relevant data center type." },
    },
  },
  {
    id: "email-reply", category: "Writing & Office", verb: "Drafting", dropdownText: "an AI email reply", dropdownLabel: "an AI email reply",
    clarifying: "AI reads your email thread and drafts a reply — like Gmail Smart Reply, Copilot in Outlook, or asking an AI assistant to write a specific response. One of the lighter everyday AI tasks.",
    baseEnergyWh: 0.005, energyLow: 0.005, energyHigh: 3.0, baseWaterMl: 0.005 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 context read + 1 reply generation", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "Modelled as semantic search over the thread + one text generation call.", tierSource: TIER_SOURCE["email-reply"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard (0.50 Wh × 3.45 mL/Wh ≈ 1.7 mL). One of the lighter everyday AI tasks." },
    },
  },
  {
    id: "ai-search", category: "Chat", verb: "Doing", dropdownText: "an AI web search", dropdownLabel: "an AI web search",
    clarifying: "One AI-powered search query — Perplexity, Google AI Overviews, or Bing Copilot. These make 3+ model passes: understanding your query, retrieving sources, and synthesizing an answer — which is why they use more than a single chat message.",
    baseEnergyWh: 0.01, energyLow: 0.01, energyHigh: 8.7, baseWaterMl: 0.01 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~3 model passes × [energy per pass]", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "AI search involves query embedding, document retrieval, and synthesis — modelled as 3× a standard chat query. No direct peer-reviewed measurement of AI search products exists.", tierSource: TIER_SOURCE["ai-search"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Derived from WUE methodology. Standard (0.72 Wh × 3.45 mL/Wh ≈ 2.5 mL). Efficient DC: 0.72 × 1.1 = 0.79 mL." },
    },
  },
  {
    id: "inbox-search", category: "Writing & Office", verb: "Searching and analyzing", dropdownText: "your inbox with AI", dropdownLabel: "inbox search and analysis",
    clarifying: "AI searches through your email history, finds relevant threads, and surfaces insights or action items. More intensive than a single reply because it processes many messages — like asking Gmail AI to find all emails about a project and summarize what needs doing.",
    baseEnergyWh: 0.03, energyLow: 0.03, energyHigh: 5.0, baseWaterMl: 0.03 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = inbox retrieval passes + 1 synthesis generation", sourceName: "Estimated — Google Cloud 2025 (Aug) basis · EPRI 2024 (intensive)", derivation: "Modelled as 3 semantic retrieval passes over email history (~0.72 Wh) plus one synthesis/summary generation (0.48 Wh) ≈ 1.20 Wh at standard tier.", tierSource: TIER_SOURCE["inbox-search"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard (1.20 Wh × 3.45 mL/Wh ≈ 4.1 mL). More costly than a single email reply because of multi-pass retrieval." },
    },
  },
  {
    id: "meeting-notes", category: "Writing & Office", verb: "Taking", dropdownText: "AI meeting notes (30 min)", dropdownLabel: "AI meeting notes",
    clarifying: "30 minutes of real-time transcription plus an end-of-meeting summary. Combines continuous audio processing with one full generation call. Tools like Otter.ai, Fireflies.ai, or Microsoft Copilot for Teams.",
    baseEnergyWh: 0.06, energyLow: 0.06, energyHigh: 5.9, baseWaterMl: 0.06 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = transcription (30 min) + 1 summary generation", sourceName: "Estimated — Luccioni 2023 (low) · Google Cloud 2025 basis (avg) · EPRI 2024 (high)", derivation: "Combines continuous audio transcription with a one-shot end-of-meeting summarization pass.", tierSource: TIER_SOURCE["meeting-notes"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard (1.70 Wh × 3.45 mL/Wh ≈ 5.9 mL). Driven by continuous transcription across the meeting duration." },
    },
  },
  {
    id: "scoring-rubric", verb: "Creating", dropdownText: "a scoring rubric", dropdownLabel: "creating a scoring rubric", category: "Education",
    clarifying: "Asking the AI to structure disorganized data into a markdown or HTML table.",
    baseEnergyWh: 0.005, energyLow: 0.005, energyHigh: 3.0, baseWaterMl: 0.005 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 generation pass", sourceName: "Estimated — Google Cloud 2025 basis", derivation: "Standard text formatting task.", tierSource: TIER_SOURCE["scoring-rubric"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023", derivation: "Standard computation." },
    },
  },
  {
    id: "lesson-plan", verb: "Generating", dropdownText: "a teacher's lesson plan", dropdownLabel: "a teacher's lesson plan", category: "Education",
    clarifying: "Taking a curriculum topic and creating a structured 45-minute lesson plan with activities.",
    baseEnergyWh: 0.015, energyLow: 0.015, energyHigh: 5.0, baseWaterMl: 0.015 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 complex generation pass", sourceName: "Estimated — Google Cloud 2025 basis", derivation: "Requires synthesizing pedagogic structure.", tierSource: TIER_SOURCE["lesson-plan"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023", derivation: "Standard computation." },
    },
  },
  {
    id: "study-guide", verb: "Creating", dropdownText: "a student study guide", dropdownLabel: "a student study guide", category: "Education",
    clarifying: "Summarizing lecture notes or textbook chapters into flashcards or review points.",
    baseEnergyWh: 0.02, energyLow: 0.02, energyHigh: 7.5, baseWaterMl: 0.02 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = context parsing + synthesis pass", sourceName: "Estimated — Google Cloud 2025 basis", derivation: "Includes reading up to thousands of words.", tierSource: TIER_SOURCE["study-guide"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023", derivation: "Standard computation." },
    },
  },
  {
    id: "image", category: "Image & Video", verb: "Generating", dropdownText: "an AI image", dropdownLabel: "an AI image",
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
    id: "long-chat", category: "Chat", verb: "Having", dropdownText: "a long AI conversation", dropdownLabel: "a long AI conversation",
    clarifying: "A 20–50 message back-and-forth session. At the Standard estimate (Google 2025), each message costs 0.24 Wh. At the Intensive estimate, 50 messages × 2.9 Wh = 145 Wh, which × 3.45 mL/Wh exactly matches Li et al.'s direct measurement of 500 mL for a ChatGPT conversation.",
    baseEnergyWh: 0.15, energyLow: 0.15, energyHigh: 145, baseWaterMl: 0.15 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 50 messages × [energy per message]", sourceName: "Luccioni 2023 · Google Cloud 2025 · EPRI 2024", derivation: "A long conversation is modelled as 50 AI interactions.", tierSource: TIER_SOURCE["long-chat"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 (WUE methodology)", derivation: "At the High energy estimate with Typical WUE: 145 Wh × 3.45 mL/Wh = 500 mL — exactly matching Li et al.'s direct measurement for a 50-message ChatGPT conversation. ✓" },
    },
  },
  {
    id: "coding", category: "Code", verb: "Getting", dropdownText: "100 AI code suggestions", dropdownLabel: "100 code suggestions",
    clarifying: "100 individual autocomplete or code completion suggestions — a realistic volume for a focused hour of AI-assisted development.",
    baseEnergyWh: 0.1, energyLow: 0.1, energyHigh: 29, baseWaterMl: 0.1 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 100 suggestions × [energy per suggestion]", sourceName: "Luccioni 2023 · Google Cloud 2025 (scaled) · EPRI 2024", derivation: "Each code suggestion is one AI inference call. Code completions are shorter than full chat prompts.", tierSource: TIER_SOURCE["coding"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard energy (12.0 Wh) × Typical WUE (3.45) = 41.4 mL per 100 suggestions." },
    },
  },
  {
    id: "app-build", category: "Code", verb: "Vibe coding", dropdownText: "a simple app", dropdownLabel: "a simple app",
    clarifying: "A 1–2 hour session with many rounds of code generation, debugging, and iteration. Wide uncertainty — actual energy depends heavily on which AI model and how many requests.",
    baseEnergyWh: 50, energyLow: 50, energyHigh: 1000, baseWaterMl: 50 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~1,000 AI interactions × [avg energy per interaction]", sourceName: "Modelled · Google Cloud 2025 (average tier) · EPRI 2024 (high tier)", derivation: "A session is modelled as ~1,000 chained AI calls.", tierSource: TIER_SOURCE["app-build"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard energy (240 Wh) × Typical WUE (3.45) = 828 mL (~0.83 L) per session." },
    },
  },
  {
    id: "video", category: "Image & Video", verb: "Generating", dropdownText: "a short AI video", dropdownLabel: "a short AI video",
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
    id: "training-llm", category: "Specialized", verb: "Training", dropdownText: "a large language model", dropdownLabel: "training a large language model",
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
// Unit values use Standard energy tier (Google Cloud 2025 Aug, 0.24 Wh base) + Efficient WUE (1.1 mL/Wh)
const CUSTOM_TASKS = [
  { id: "chat",    label: "Short chat messages",          unitEnergyWh: 0.24,  unitWaterMl: 0.26,  max: 1000, step: 1, defaultVal: 10  },
  { id: "longchat",label: "Long conversations",           unitEnergyWh: 12.0,  unitWaterMl: 13.0,  max: 100,  step: 1, defaultVal: 0   },
  { id: "image",   label: "AI images generated",         unitEnergyWh: 2.4,   unitWaterMl: 2.64,  max: 200,  step: 1, defaultVal: 0   },
  { id: "video",   label: "AI video clips (5–15 sec)",   unitEnergyWh: 944,   unitWaterMl: 1038,  max: 20,   step: 1, defaultVal: 0   },
  { id: "code",    label: "Code completion suggestions", unitEnergyWh: 0.12,  unitWaterMl: 0.13,  max: 1000, step: 1, defaultVal: 100 },
  { id: "app",     label: "App build sessions",          unitEnergyWh: 240,   unitWaterMl: 264,   max: 10,   step: 1, defaultVal: 0   },
];

// ─── ACTION TIPS ──────────────────────────────────────────────────────────────
const ACTION_TIPS = [
  { impact: "Very high", color: "#c0392b", title: "Skip AI video generation unless essential", body: "One 10-second AI video uses as much energy as ~3,900 chat messages (at Google's measured rate). Describe your idea in words first. If you must generate, generate once — don't regenerate." },
  { impact: "High",      color: "#e67e22", title: "Think before generating AI images",        body: "One AI image uses ~10× more energy than a chat message. Ask: can I describe this in words instead? Reserve image generation for when visuals are truly necessary." },
  { impact: "High",      color: "#e67e22", title: "Get your prompt right the first time",     body: "Every 'try again' or 'make it shorter' is a full new request at the same cost. Spend 30 seconds being specific before submitting. One good prompt beats five mediocre ones." },
  { impact: "Medium",    color: "#f0a500", title: "Use smaller models for simple tasks",      body: "Basic questions and formatting don't need the most powerful AI. A verified standard Gemini prompt uses 0.24 Wh, compared to 2.9+ Wh for older frontier models on intense workloads—over a 10× difference in power." },
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
  "short-chat":   "#9CA3AF",
  "email-reply":  "#6B7280",
  "ai-search":    "#4B5563",
  "inbox-search": "#374151",
  "meeting-notes":"#1F2937",
  "image":        "#9CA3AF",
  "long-chat":    "#6B7280",
  "coding":       "#4B5563",
  "app-build":    "#374151",
  "video":        "#4B5563",
  "training-llm": "#1F2937",
  "scoring-rubric": "#6B7280",
  "lesson-plan":  "#4B5563",
  "study-guide":  "#374151",
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
  const h = ml / 110;
  if (h >= 10000) return `${(h / 1000).toFixed(1)}K handwashes`;
  if (h >= 1) return `${Math.round(h).toLocaleString()} handwash${Math.round(h) === 1 ? "" : "es"}`;
  if (h >= 0.1) return `${h.toFixed(1)} of a handwash`;
  if (h > 0) return `${h.toFixed(2)} of a handwash`;
  return `0 handwashes`;
}

function getEnergyColorRgb(wh: number): { r: number, g: number, b: number } {
  // Dark Green (0 Wh) → Light Grey (1 Wh) → Golden Yellow (500 Wh) → Burnt Orange (1000 Wh) → Deep Red (>1000 Wh)
  if (wh >= 1000) return { r: 180, g: 40, b: 0 };
  if (wh <= 0)    return { r: 22,  g: 120, b: 52 };  // Dark green

  const dkGreen = { r: 22,  g: 120, b: 52  }; // Dark green
  const ltGrey  = { r: 210, g: 210, b: 210 }; // Light grey
  const golden  = { r: 253, g: 186, b: 0   }; // Golden yellow
  const burnt   = { r: 214, g: 90,  b: 0   }; // Burnt orange

  // 0 → 1 Wh: dark green → light grey
  if (wh <= 1) {
    const t = wh;
    return {
      r: Math.round(dkGreen.r + (ltGrey.r - dkGreen.r) * t),
      g: Math.round(dkGreen.g + (ltGrey.g - dkGreen.g) * t),
      b: Math.round(dkGreen.b + (ltGrey.b - dkGreen.b) * t),
    };
  }
  // 1 → 500 Wh: light grey → golden yellow
  if (wh <= 500) {
    const t = (wh - 1) / 499;
    return {
      r: Math.round(ltGrey.r + (golden.r - ltGrey.r) * t),
      g: Math.round(ltGrey.g + (golden.g - ltGrey.g) * t),
      b: Math.round(ltGrey.b + (golden.b - ltGrey.b) * t),
    };
  }
  // 500 → 1000 Wh: golden yellow → burnt orange
  const t = (wh - 500) / 500;
  return {
    r: Math.round(golden.r + (burnt.r - golden.r) * t),
    g: Math.round(golden.g + (burnt.g - golden.g) * t),
    b: Math.round(golden.b + (burnt.b - golden.b) * t),
  };
}

// ─── INLINE PILL DROPDOWN ────────────────────────────────────────────────────
function InlineDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const scenariosByCategory = SCENARIOS.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, Scenario[]>);

  const options = [
    ...SCENARIOS.map(s => ({ id: s.id, text: `${s.verb} ${s.dropdownText}`, label: s.dropdownLabel })),
    { id: "custom", text: "A custom combination", label: "a custom combination" },
  ];
  const selected = options.find(o => o.id === value) ?? options[0];

  return (
    <span className="inline-flex items-stretch h-full">
      <button onClick={() => setOpen(v => !v)}
        className="cursor-pointer inline-flex items-center gap-2 font-semibold transition-all hover:bg-gray-50 active:bg-gray-100 rounded-l-[100px] focus:outline-none"
        style={{
          padding: "6px 14px 6px 22px",
          background: "transparent",
          fontSize: "inherit",
          fontFamily: "'Anthropic Serif', serif",
          color: "#1f2937",
          lineHeight: "inherit",
        }}>
        {selected.text}
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ opacity: 0.55, flexShrink: 0, marginTop: 1 }}>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <span className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white border border-gray-200 rounded-3xl shadow-2xl z-[60] p-4 max-h-[75vh] overflow-y-auto w-[90vw] max-w-[800px] text-left"
              style={{ fontFamily: "'Anthropic Sans', sans-serif", fontSize: "14px" }}>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(scenariosByCategory).map(([category, items]) => (
                  <div key={category} className="flex flex-col gap-2 bg-gray-100/50 rounded-2xl p-4 border border-gray-100">
                    <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-1 px-1">{category}</div>
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      {items.map(s => {
                        const e = getEnergyWh(s.id, s.baseEnergyWh, "commercial");
                        const rgb = getEnergyColorRgb(e);
                        
                        const isSelected = s.id === value;
                        const baseBg = isSelected ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)` : `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`;
                        const hoverBg = isSelected ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`;
                        const baseBorder = isSelected ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)` : `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`;
                        const hoverBorder = isSelected ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)` : `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;

                        return (
                          <button key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
                            title={`${s.verb} ${s.dropdownText}`}
                            style={{ backgroundColor: baseBg, borderColor: baseBorder }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = hoverBorder; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = baseBg; e.currentTarget.style.borderColor = baseBorder; }}
                            className={`text-left px-3 py-2 rounded-xl transition-all shadow-sm text-[13px] flex items-center min-h-[44px] border-2 text-gray-800 ${isSelected ? "font-bold shadow-md" : "font-medium"}`}>
                            <span className="line-clamp-2 leading-tight">{s.verb} {s.dropdownText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => { onChange("custom"); setOpen(false); }}
                  className={`px-5 py-2 rounded-full transition-all border text-[12px] ${"custom" === value ? "bg-white border-black border-2 font-bold text-black shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium text-gray-700 shadow-sm"}`}>
                  Custom combination
                </button>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                  <span>Energy:</span>
                  <span>0 Wh</span>
                  <div className="w-28 h-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(22,120,52) 0%, rgb(210,210,210) 3%, rgb(253,186,0) 50%, rgb(214,90,0) 100%)" }}></div>
                  <span>1 kWh</span>
                  <div className="w-2 h-2 rounded-full ml-1" style={{ background: 'rgb(180,40,0)' }}></div>
                  <span>&gt;100 kWh</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

function InlineMultiplier({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-stretch relative">
      <button onClick={() => setOpen(v => !v)}
        className={`cursor-pointer inline-flex items-center justify-center transition-colors focus:outline-none ${open ? '' : 'rounded-r-[100px]'}`}
        style={{ fontFamily: "'Anthropic Sans', sans-serif", fontSize: "14px", padding: "6px 20px 6px 14px" }}>
        <span className="font-bold text-gray-500 hover:text-gray-700 flex items-baseline leading-none">
          <span className="text-[0.75em] mr-[1px]">×</span>
          <span>{value}</span>
        </span>
      </button>
      <AnimatePresence>
        {open && (
           <motion.div
             initial={{ width: 0, opacity: 0 }}
             animate={{ width: "auto", opacity: 1 }}
             exit={{ width: 0, opacity: 0 }}
             transition={{ duration: 0.2, ease: "easeOut" }}
             className="overflow-hidden flex items-center bg-gray-50 rounded-r-[100px]"
           >
              <div className="pl-2 pr-5 py-0 flex items-center w-[130px] sm:w-[150px]">
                <input type="range" min={1} max={50} value={value} 
                       onChange={e => onChange(Number(e.target.value))} 
                       onMouseUp={() => setOpen(false)}
                       onTouchEnd={() => setOpen(false)}
                       className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-black" />
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DUAL ESTIMATE SELECTORS ─────────────────────────────────────────────────
function EstimateSelectors({ tier, wueTier, onTierChange, onWueTierChange, isTierFixed }: {
  tier: ModelTier; wueTier: WueTier; onTierChange: (t: ModelTier) => void; onWueTierChange: (w: WueTier) => void; isTierFixed?: boolean;
}) {
  const displayTier = isTierFixed ? "commercial" : tier;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-gray-400 font-medium w-[50px] text-right leading-tight shrink-0">Energy<br/>estimate</span>
        <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
          {(["research", "commercial", "frontier"] as ModelTier[]).map(t => (
            <button key={t} onClick={() => !isTierFixed && onTierChange(t)}
              disabled={isTierFixed && t !== "commercial"}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${(isTierFixed ? t === "commercial" : tier === t) ? "bg-white text-black shadow-sm" : isTierFixed ? "text-gray-300 opacity-50 cursor-not-allowed" : "text-gray-400 hover:text-gray-600"}`}>
              {TIER_META[t].rangeLabel}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-gray-400 font-medium w-[50px] text-right leading-tight shrink-0">Water<br/>location</span>
        <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
          {(["efficient", "average", "intensive"] as WueTier[]).map(w => (
            <button key={w} onClick={() => onWueTierChange(w)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${wueTier === w ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
              {WUE_META[w].label}
            </button>
          ))}
        </div>
      </div>
      {isTierFixed && (
        <p className="text-[10px] text-gray-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-2 mb-1">
          Only "Average" (Standard) data is available for this medium
        </p>
      )}
      <p className="text-[10px] text-gray-400 italic text-center max-w-xs leading-relaxed mt-0.5">
        {TIER_META[displayTier].source} (energy) · {WUE_META[wueTier].source} (water)
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 leading-relaxed">
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
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200">{WUE_META[wueTier].label} DC · {WUE_VALUES[wueTier]} mL/Wh</span>
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

// ─── COMPARE PANEL (LIGHT MODAL) ───────────────────────────────────────────────
function CompareModal({ selectedId, tier, wueTier, multiplier, onClose }: { selectedId: string; tier: ModelTier; wueTier: WueTier; multiplier: number; onClose: () => void }) {
  const [optionId, setOptionId] = useState("netflix");
  const [showTraining, setShowTraining] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const option = COMPARE_OPTIONS.find(o => o.id === optionId)!;
  const wue = WUE_VALUES[wueTier];

  const compareIds = new Set(["short-chat", "long-chat", "app-build", "email-reply", "meeting-notes", "video", "image-1", selectedId]);
  const rows = SCENARIOS
    .filter(s => compareIds.has(s.id))
    .map(s => {
      const e = getEnergyWh(s.id, s.baseEnergyWh, tier);
      const w = getWaterMl(s.id, s.baseWaterMl, e, s.baseEnergyWh, wue, tier);
      return { ...s, val: option.compute(e, w), energy: e, water: w, color: TASK_COLORS[s.id] };
    })
    .sort((a, b) => a.val - b.val);

  const selectedTaskScore = rows.find(r => r.id === selectedId)?.val;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-lg text-xs font-medium z-50 relative pointer-events-none">
          <p className="text-gray-900 mb-1 font-semibold">{data.dropdownLabel}</p>
          <p className="text-gray-600">{option.format(data.val)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col z-10 overflow-hidden"
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 28, stiffness: 400 }}>
        
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 z-20 transition-colors">
          <X size={18} className="text-gray-400 hover:text-gray-600" />
        </button>

        <div className="px-8 pt-8 pb-5 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-start justify-between mb-4 pr-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">How does this compare?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Visualizing physical equivalents · sorted from smallest to largest
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPARE_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setOptionId(o.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${optionId === o.id ? "bg-gray-900 text-white shadow-md border border-gray-900" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-8 py-6 flex flex-col gap-4 overflow-y-auto bg-gray-50/50">
          <div className="text-sm text-gray-500 mb-1 px-2">
            Comparison measured in <strong>{option.unit.toLowerCase()}</strong>
          </div>

          <div className="w-full h-[550px] shrink-0 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={rows} margin={{ top: 30, right: 30, left: 10, bottom: 20 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="dropdownLabel" type="category" width={180} interval={0} tick={{ fontSize: 13, fill: '#4B5563', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<CustomTooltip />} />
                {selectedTaskScore && (
                  <ReferenceLine 
                    x={selectedTaskScore} 
                    stroke="#1F2937" 
                    strokeWidth={2} 
                    strokeDasharray="3 3" 
                    opacity={0.6}
                    label={{ 
                      value: `Selected: ×${multiplier}`, 
                      position: 'top', 
                      fill: '#4B5563', 
                      fontSize: 12, 
                      fontWeight: 600,
                      offset: 10
                    }} 
                  />
                )}
                <Bar dataKey="val" radius={[0, 4, 4, 0]} maxBarSize={32} isAnimationActive={true} animationDuration={600}>
                  {rows.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.id === selectedId ? "#1F2937" : (entry.color || "#9CA3AF")} opacity={entry.id === selectedId ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col gap-3 shrink-0">
            <p className="text-sm font-semibold text-gray-900 tracking-tight">Heavy-duty specialized tasks</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showVideo} onChange={e => setShowVideo(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-relaxed transition-colors">
                <strong className="text-gray-900 font-medium">Video Generation</strong> — A short 10-second clip requires rendering hundreds of frames. It takes about {Math.round(944/0.24)}× more power than a simple text prompt.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showTraining} onChange={e => setShowTraining(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-relaxed transition-colors">
                <strong className="text-gray-900 font-medium">Training an AI model</strong> — Building the brain before anyone uses it. This massive operation occurs once but consumes millions of times more resources than daily usage.
              </span>
            </label>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ACTION MODAL ────────────────────────────────────────────────────────────
function ActionModal({ scenario, energyWh, waterMl, onClose }: { scenario: Scenario | null; energyWh: number; waterMl: number; onClose: () => void }) {
  const [eOff, setEOff] = useState(ENERGY_OFFSETS[0].id);
  const [wOff, setWOff] = useState(WATER_OFFSETS[0].id);
  const [tab, setTab] = useState<"habits" | "offset">("offset");
  const ea = ENERGY_OFFSETS.find(a => a.id === eOff)!;
  const wa = WATER_OFFSETS.find(a => a.id === wOff)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col z-10 overflow-hidden"
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 28, stiffness: 400 }}>
        
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 z-20 transition-colors">
          <X size={18} className="text-gray-400 hover:text-gray-600" />
        </button>

        <div className="px-8 pt-8 pb-5 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-start justify-between mb-4 pr-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">How do we fix this?</h2>
              {scenario && <p className="text-sm text-gray-500 mt-1">Actions for when {scenario.verb.toLowerCase()} {scenario.dropdownText}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-4 bg-gray-100/50 rounded-full p-1 border border-gray-100">
            <button onClick={() => setTab("offset")} className={`flex-1 text-sm py-2 rounded-full font-medium transition-all shadow-sm ${tab === "offset" ? "bg-white text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"}`}>
              Offset My Impact
            </button>
            <button onClick={() => setTab("habits")} className={`flex-1 text-sm py-2 rounded-full font-medium transition-all shadow-sm ${tab === "habits" ? "bg-white text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"}`}>
              Simple Habits
            </button>
          </div>
        </div>

        <div className="flex-1 px-8 py-6 flex flex-col gap-4 overflow-y-auto bg-gray-50/50">
          {tab === "habits" && (
            <>
              <p className="text-sm text-gray-500 mb-1">Practical ways to reconsider using AI, ranked by impact.</p>
              {ACTION_TIPS.map((tip, i) => (
                <div key={i} className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3 inline-block tracking-wide uppercase shadow-sm"
                    style={{ background: tip.color + "15", color: tip.color, border: `1px solid ${tip.color}30` }}>{tip.impact} impact</span>
                  <p className="text-base font-semibold text-gray-900 leading-snug mb-1.5">{tip.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{tip.body}</p>
                </div>
              ))}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-900 mb-4">Support Environmental Projects</p>
                <div className="grid gap-3">
                {TRUSTED_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{link.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                    </div>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                  </a>
                ))}
                </div>
              </div>
            </>
          )}
          {tab === "offset" && (
            <>
              <p className="text-sm text-gray-500 mb-2">Equivalent real-world trade-offs for this task.</p>
              <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm mb-2">
                <p className="text-sm font-semibold text-gray-900 mb-4">⚡ To balance out the power usage...</p>
                <select value={eOff} onChange={e => setEOff(e.target.value)}
                  className="w-full text-sm rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-shadow cursor-pointer bg-gray-50 border border-gray-200 text-gray-800 font-medium shadow-inner">
                  {ENERGY_OFFSETS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                <p className="text-3xl font-light text-gray-800"><strong className="font-semibold">{fmtOffset(energyWh / ea.whPerUnit, ea.unitLabel)}</strong></p>
              </div>
              <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-4">💧 To conserve the water usage...</p>
                <select value={wOff} onChange={e => setWOff(e.target.value)}
                  className="w-full text-sm rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-shadow cursor-pointer bg-gray-50 border border-gray-200 text-gray-800 font-medium shadow-inner">
                  {WATER_OFFSETS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                <p className="text-3xl font-light text-gray-800"><strong className="font-semibold">{fmtOffset(waterMl / wa.mlPerUnit, wa.unitLabel)}</strong></p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
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
                  <li className="list-disc"><strong>Energy → Light/Standard/Intensive:</strong> represents different published study estimates for energy per AI query.</li>
                  <li className="list-disc"><strong>Water → Efficient/Typical/Water-intensive:</strong> represents the Water Use Effectiveness (WUE) of the data center, which varies by location and cooling type.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Energy estimates</p>
                <ul className="ml-4 flex flex-col gap-1.5">
                  <li className="list-disc"><strong>Light (Luccioni et al. 2023):</strong> directly measured on open-source GPU hardware. Small models like BLOOM, OPT, Stable Diffusion 1.5. Closest to local or self-hosted AI.</li>
                  <li className="list-disc"><strong>Standard (Google Cloud 2025, Aug):</strong> comprehensive measurement (arXiv:2508.15734). A median Gemini App text prompt: 0.24 Wh and 0.26 mL — covers active AI chips, host CPU, cooling overhead, and idle provisioning. Google's earlier May 2025 figure of 0.10 Wh was partial (GPU/TPU active only); Google's Aug paper explicitly notes it "substantially underestimates" the real footprint.</li>
                  <li className="list-disc"><strong>Intensive (EPRI 2024 · Jegham et al. 2025):</strong> estimated for ChatGPT-class models on Azure GPU infrastructure. EPRI's ChatGPT query estimate: 2.9 Wh. OpenAI's o3 reasoning model: ~3.9 Wh (Jegham et al. 2025). Note: modern GPT-4o is ~0.34 Wh (Sam Altman, Jun 2025) — now close to Standard-tier.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-black text-sm mb-2">Water Use Effectiveness (WUE)</p>
                <ul className="ml-4 flex flex-col gap-1.5">
                  <li className="list-disc"><strong>Efficient (1.1 mL/Wh, Google Cloud 2025 Aug):</strong> derived from Google's comprehensive measurement — 0.26 mL water per 0.24 Wh prompt ≈ 1.1 mL/Wh. Google uses renewable energy, custom TPU hardware, and operates in cooler climates.</li>
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
                <p className="font-semibold text-black text-sm mb-2">Google Cloud 2025 (Aug)</p>
                <p className="text-xs text-gray-500 mb-2">Google Cloud Infrastructure — August 2025 (arXiv:2508.15734)</p>
                <p className="text-xs text-gray-600 leading-relaxed">Comprehensive measurement of a median Gemini App text-generation prompt: 0.24 Wh energy, 0.03 g CO₂, 0.26 mL water (Aug 2025 paper). Covers active AI chips (TPU/GPU), host CPU &amp; DRAM, cooling overhead, and idle machine provisioning. Google's earlier May 2025 blog figure of 0.10 Wh / 0.12 mL counted only active GPU/TPU — the Aug paper explicitly notes that approach "substantially underestimates" the real footprint. Used as the "Standard" energy estimate and source for the Efficient (1.1 mL/Wh) WUE value in this tool.</p>
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
                { title: "Water varies dramatically by data center location", body: "WUE can range from ~1.1 mL/Wh (Google's efficient TPU data centers) to 6+ mL/Wh (hot-climate evaporative cooling). When you make an AI request, you typically don't know where it will be processed." },
                { title: "Hardware lifecycle excluded", body: "All estimates cover operational energy only. GPU and server manufacturing, data center construction, and end-of-life disposal are excluded. Research suggests embodied carbon represents 50–80% of total lifecycle impact." },
                { title: "Google's 2025 efficiency may not apply to other providers", body: "Google uses custom TPUs (Trillium/Ironwood) that are 30× more energy-efficient than their first TPU. ChatGPT and Claude run primarily on Nvidia GPUs in third-party cloud infrastructure — likely closer to the 'Intensive' energy estimate for older workloads, though modern GPT-4o is now near the 'Standard' range." },
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

// ─── GET INVOLVED MODAL ────────────────────────────────────────────────────────
function GetInvolvedModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-10"
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 28, stiffness: 400 }}>
        
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 z-20 transition-colors">
          <X size={18} className="text-gray-400 hover:text-gray-600" />
        </button>

        <div className="px-8 pt-8 pb-5 border-b border-gray-100 shrink-0 bg-white">
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Get Involved</h2>
        </div>

        <div className="p-8 flex flex-col gap-8 bg-gray-50/50">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Feedback & Collaboration</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Notice a bug, have better data, or want to suggest a feature? This project is open source.
            </p>
            <a href="https://github.com/I-needcoffee/Responsible-AI" target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-800 font-medium px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:border-gray-300 transition-all self-start">
              <ExternalLink size={16} className="text-gray-500" />
              GitHub Issues
            </a>
          </div>

          <div className="h-px bg-gray-200/60 w-full" />

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Support the Project</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you found this tool helpful and want to support future updates, you can buy me a coffee on Venmo or PayPal.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <a href="https://account.venmo.com/u/Tim_Meyers" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#008CFF] text-white font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-[#007AE6] transition-all">
                <Coffee size={16} />
                Venmo
              </a>
              <a href="https://paypal.me/coffee4tim" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#003087] text-white font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-[#001C4F] transition-all">
                <Coffee size={16} />
                PayPal
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
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
  const [showGetInvolved, setShowGetInvolved] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
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

  const energyWh = (isCustom ? customTotalE : scenario ? getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) : 0) * (isCustom ? 1 : multiplier);
  const waterMl  = (isCustom ? customTotalW : scenario ? getWaterMl(scenario.id, scenario.baseWaterMl, energyWh / (isCustom ? 1 : multiplier), scenario.baseEnergyWh, wue, tier) : 0) * (isCustom ? 1 : multiplier);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>

      {/* Bottom Right FABs — icon slides left, text revealed to the right */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:flex flex-col items-end gap-3">
        {/* Action FAB (Top) — Leaf icon */}
        <button onClick={() => setShowAction(true)}
          className="bg-white overflow-hidden rounded-full shadow-lg border border-gray-100/50 hover:shadow-xl active:scale-95 flex items-center h-[52px] cursor-pointer"
          style={{ width: 52, transition: 'width 0.35s cubic-bezier(0.25,1,0.5,1), box-shadow 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.width = '200px'; }}
          onMouseLeave={e => { e.currentTarget.style.width = '52px'; }}
          title="How to fix this">
          <div className="min-w-[52px] min-h-[52px] flex items-center justify-center shrink-0 rounded-full text-green-600">
            <Leaf size={20} />
          </div>
          <span className="whitespace-nowrap font-medium text-sm text-gray-800 pr-5">
            Offset My Impact
          </span>
        </button>

        {/* Sources FAB (Middle) — BookOpen icon */}
        <button onClick={() => setShowSources(true)}
          className="bg-white overflow-hidden rounded-full shadow-lg border border-gray-100/50 hover:shadow-xl active:scale-95 flex items-center h-[52px] cursor-pointer"
          style={{ width: 52, transition: 'width 0.35s cubic-bezier(0.25,1,0.5,1), box-shadow 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.width = '200px'; }}
          onMouseLeave={e => { e.currentTarget.style.width = '52px'; }}
          title="Methodology">
          <div className="min-w-[52px] min-h-[52px] flex items-center justify-center shrink-0 rounded-full text-blue-500">
            <BookOpen size={20} />
          </div>
          <span className="whitespace-nowrap font-medium text-sm text-gray-800 pr-5">
            Sources & Data
          </span>
        </button>

        {/* Coffee FAB (Bottom) — Coffee icon */}
        <button onClick={() => setShowGetInvolved(true)}
          className="bg-white overflow-hidden rounded-full shadow-lg border border-gray-100/50 hover:shadow-xl active:scale-95 flex items-center h-[52px] cursor-pointer"
          style={{ width: 52, transition: 'width 0.35s cubic-bezier(0.25,1,0.5,1), box-shadow 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.width = '200px'; }}
          onMouseLeave={e => { e.currentTarget.style.width = '52px'; }}
          title="Get Involved">
          <div className="min-w-[52px] min-h-[52px] flex items-center justify-center shrink-0 rounded-full text-yellow-500">
            <Coffee size={20} />
          </div>
          <span className="whitespace-nowrap font-medium text-sm text-gray-800 pr-5">
            Feedback & Coffee
          </span>
        </button>
      </div>

      {/* Scrollable center — centers when content fits, scrolls on small screens */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-center min-h-full relative px-4 sm:px-8 md:px-16 py-5">
          <AnimatePresence mode="wait">
            <motion.div key={selectedId + tier + wueTier}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 md:gap-5 w-full max-w-4xl">
              
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
                  {/* Primary block: dropdown + data sentence — same font, dominant element */}
                  <div className="flex flex-col items-center gap-3 text-[1.15rem] sm:text-[1.35rem] md:text-[1.65rem] leading-[1.5] text-black text-center"
                    style={{ fontFamily: "'Anthropic Serif', serif" }}>
                    
                    <div>
                      {(() => {
                        const rgb = getEnergyColorRgb(energyWh);
                        const pillStyle = {
                          borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
                          boxShadow: `0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
                        };

                        return (
                          <span style={pillStyle} className="inline-flex items-stretch flex-wrap justify-center bg-white border-2 rounded-[100px] hover:shadow-lg transition-all relative">
                            <InlineDropdown value={selectedId} onChange={setSelectedId} />
                            <div className="w-px bg-gray-200 my-2" />
                            <InlineMultiplier value={multiplier} onChange={setMultiplier} />
                          </span>
                        );
                      })()}
                    </div>

                    <div className="mt-2 md:mt-3 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-2 px-4">
                      <span>will use</span>
                      <strong className="inline-block min-w-[5.5rem] text-center whitespace-nowrap" style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}>{fmtEnergy(energyWh)}</strong>
                      <span>of energy and</span>
                      <strong className="inline-block min-w-[5.5rem] text-center whitespace-nowrap" style={{ borderBottom: "2.5px solid currentColor", paddingBottom: "1px" }}>{fmtWater(waterMl)}</strong>
                      <span>of water.</span>
                    </div>
                  </div>

                  {/* Secondary: equivalency */}
                  <p className="text-sm md:text-[1.1rem] leading-[1.7] text-gray-500 text-center mt-1 mb-2"
                    style={{ fontFamily: "'Anthropic Serif', serif" }}>
                    That's {equivEnergy(energyWh)} and {equivWater(waterMl)}.
                  </p>

                  {/* Tertiary: selectors */}
                  <EstimateSelectors tier={tier} wueTier={wueTier} onTierChange={setTier} onWueTierChange={setWueTier} isTierFixed={!scenario.tierSensitive} />

                  {/* Fine print */}
                  <p className="text-[11px] md:text-xs text-gray-400 font-light leading-relaxed text-center italic max-w-xs">
                    {scenario.clarifying}{" "}
                    <button onClick={() => setShowMath(true)} className="underline underline-offset-2 hover:text-black transition-colors not-italic font-medium">
                      Wait, how did we get these numbers? →
                    </button>
                  </p>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      {/* Original Coffee FAB has been moved to the bottom right FAB group. */}

      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-xl border border-gray-100 w-[95%] max-w-[340px] justify-between">
        <button onClick={() => setShowSources(true)} className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-gray-900 active:text-black flex-1 transition-colors">
          <BookOpen size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Sources</span>
        </button>
        <div className="w-px h-8 bg-gray-200 shrink-0" />
        <button onClick={() => setShowAction(true)} className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-green-600 active:text-green-700 flex-1 transition-colors">
          <Leaf size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Action</span>
        </button>
        <div className="w-px h-8 bg-gray-200 shrink-0" />
        <button onClick={() => setShowGetInvolved(true)} className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-yellow-600 active:text-yellow-700 flex-1 transition-colors">
          <Coffee size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Coffee</span>
        </button>
      </div>

      <AnimatePresence>
        {showMath && scenario && <MathModal scenario={scenario} tier={tier} wueTier={wueTier} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowMath(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSources && <SourcesModal onClose={() => setShowSources(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAction && <ActionModal scenario={scenario} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowAction(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCompare && <CompareModal selectedId={selectedId} tier={tier} wueTier={wueTier} multiplier={multiplier} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGetInvolved && <GetInvolvedModal onClose={() => setShowGetInvolved(false)} />}
      </AnimatePresence>
    </div>
  );
}
