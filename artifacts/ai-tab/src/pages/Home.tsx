import { useState, useEffect, useRef, type ReactNode } from "react";
import { X, ExternalLink, BarChart2, Leaf, BookOpen, Coffee, ChevronRight, ChevronLeft, Info, Moon, Sun, Check, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { SlideHoverIcon, OffsetsPanel, MethodologyPanel, SupportModal } from "./InlineSections";
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
  // Composite: 15 chat + 2 email + 1 search + 1 image
  "typical-daily": { research: 0.045 + 0.010 + 0.01 + 2.4, commercial: 3.60 + 1.00 + 0.72 + 2.4, frontier: 43.5 + 6.0 + 8.7 + 2.4 },
  // Composite: 100 chat + 10 email + 5 search + 3 image + 1 long chat + 1 meeting
  "typical-weekly": { research: 0.3 + 0.05 + 0.05 + 7.2 + 0.15 + 0.06, commercial: 24.0 + 5.0 + 3.6 + 7.2 + 12.0 + 1.7, frontier: 290 + 30 + 43.5 + 7.2 + 145 + 5.9 },
  // Composite: 400 chat + 40 email + 20 search + 10 image + 4 long chat + 4 meeting + 200 code + 1 video
  "typical-monthly": { research: 1.2 + 0.2 + 0.2 + 24 + 0.6 + 0.24 + 20 + 944, commercial: 96 + 20 + 14.4 + 24 + 48 + 6.8 + 24 + 944, frontier: 1160 + 120 + 174 + 24 + 580 + 23.6 + 5800 + 944 },
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
export interface Scenario {
  id: string; verb: string; dropdownText: string; dropdownLabel: string; buttonText: string; clarifying: string;
  baseEnergyWh: number; energyLow: number; energyHigh: number; baseWaterMl: number;
  confidence: "high" | "medium" | "low"; tierSensitive: boolean;
  math: { energy: MathBlock; water: MathBlock; note?: string };
  category: string;
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: "short-chat", category: "Chat", verb: "Sending", dropdownText: "a short chat message", dropdownLabel: "a short chat message", buttonText: "Chat message",
    clarifying: "One short message to an AI assistant. Low-impact individually, but billions happen daily. Google's comprehensive Aug 2025 measurement: 0.24 Wh and 0.26 mL per median Gemini prompt — select 'Standard' to see this figure.",
    baseEnergyWh: 0.003, energyLow: 0.003, energyHigh: 2.9, baseWaterMl: 0.003 * 3.45,
    confidence: "high", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 query × [energy per query, by estimate]", sourceName: "Luccioni 2023 · Google Cloud 2025 · EPRI 2024 / Goldman Sachs 2024", derivation: "Select an estimate range to see the source-specific derivation.", tierSource: TIER_SOURCE["short-chat"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024 — see Water Location selector", derivation: "Google Cloud 2025 (Aug) comprehensively measured 0.26 mL per median Gemini prompt (with 0.24 Wh energy → WUE ≈ 1.1 mL/Wh). Li et al. (2023) calibrated WUE = 3.45 mL/Wh for Microsoft/Azure ChatGPT infrastructure. Select a Water Location to choose the relevant data center type." },
    },
  },
  {
    id: "email-reply", category: "Writing & Office", verb: "Drafting", dropdownText: "an AI email reply", dropdownLabel: "an AI email reply", buttonText: "Email reply",
    clarifying: "AI reads your email thread and drafts a reply — like Gmail Smart Reply, Copilot in Outlook, or asking an AI assistant to write a specific response. One of the lighter everyday AI tasks.",
    baseEnergyWh: 0.005, energyLow: 0.005, energyHigh: 3.0, baseWaterMl: 0.005 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 context read + 1 reply generation", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "Modelled as semantic search over the thread + one text generation call.", tierSource: TIER_SOURCE["email-reply"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard (0.50 Wh × 3.45 mL/Wh ≈ 1.7 mL). One of the lighter everyday AI tasks." },
    },
  },
  {
    id: "ai-search", category: "Chat", verb: "Doing", dropdownText: "an AI web search", dropdownLabel: "an AI web search", buttonText: "Web search",
    clarifying: "One AI-powered search query — Perplexity, Google AI Overviews, or Bing Copilot. These make 3+ model passes: understanding your query, retrieving sources, and synthesizing an answer — which is why they use more than a single chat message.",
    baseEnergyWh: 0.01, energyLow: 0.01, energyHigh: 8.7, baseWaterMl: 0.01 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~3 model passes × [energy per pass]", sourceName: "Estimated — Google Cloud 2025 basis · EPRI 2024 (high)", derivation: "AI search involves query embedding, document retrieval, and synthesis — modelled as 3× a standard chat query. No direct peer-reviewed measurement of AI search products exists.", tierSource: TIER_SOURCE["ai-search"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Derived from WUE methodology. Standard (0.72 Wh × 3.45 mL/Wh ≈ 2.5 mL). Efficient DC: 0.72 × 1.1 = 0.79 mL." },
    },
  },
  {
    id: "inbox-search", category: "Writing & Office", verb: "Searching", dropdownText: "your inbox with AI", dropdownLabel: "inbox search and analysis", buttonText: "Inbox search",
    clarifying: "AI searches through your email history, finds relevant threads, and surfaces insights or action items. More intensive than a single reply because it processes many messages — like asking Gmail AI to find all emails about a project and summarize what needs doing.",
    baseEnergyWh: 0.03, energyLow: 0.03, energyHigh: 5.0, baseWaterMl: 0.03 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = inbox retrieval passes + 1 synthesis generation", sourceName: "Estimated — Google Cloud 2025 (Aug) basis · EPRI 2024 (intensive)", derivation: "Modelled as 3 semantic retrieval passes over email history (~0.72 Wh) plus one synthesis/summary generation (0.48 Wh) ≈ 1.20 Wh at standard tier.", tierSource: TIER_SOURCE["inbox-search"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard (1.20 Wh × 3.45 mL/Wh ≈ 4.1 mL). More costly than a single email reply because of multi-pass retrieval." },
    },
  },
  {
    id: "meeting-notes", category: "Writing & Office", verb: "Taking", dropdownText: "AI meeting notes (30 min)", dropdownLabel: "AI meeting notes", buttonText: "Meeting notes",
    clarifying: "30 minutes of real-time transcription plus an end-of-meeting summary. Combines continuous audio processing with one full generation call. Tools like Otter.ai, Fireflies.ai, or Microsoft Copilot for Teams.",
    baseEnergyWh: 0.06, energyLow: 0.06, energyHigh: 5.9, baseWaterMl: 0.06 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = transcription (30 min) + 1 summary generation", sourceName: "Estimated — Luccioni 2023 (low) · Google Cloud 2025 basis (avg) · EPRI 2024 (high)", derivation: "Combines continuous audio transcription with a one-shot end-of-meeting summarization pass.", tierSource: TIER_SOURCE["meeting-notes"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard (1.70 Wh × 3.45 mL/Wh ≈ 5.9 mL). Driven by continuous transcription across the meeting duration." },
    },
  },
  {
    id: "scoring-rubric", verb: "Drafting", dropdownText: "a scoring rubric", dropdownLabel: "creating a scoring rubric", buttonText: "Scoring rubric", category: "Education",
    clarifying: "Asking the AI to structure disorganized data into a markdown or HTML table.",
    baseEnergyWh: 0.005, energyLow: 0.005, energyHigh: 3.0, baseWaterMl: 0.005 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 generation pass", sourceName: "Estimated — Google Cloud 2025 basis", derivation: "Standard text formatting task.", tierSource: TIER_SOURCE["scoring-rubric"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023", derivation: "Standard computation." },
    },
  },
  {
    id: "lesson-plan", verb: "Generating", dropdownText: "a teacher's lesson plan", dropdownLabel: "a teacher's lesson plan", buttonText: "Lesson plan", category: "Education",
    clarifying: "Taking a curriculum topic and creating a structured 45-minute lesson plan with activities.",
    baseEnergyWh: 0.015, energyLow: 0.015, energyHigh: 5.0, baseWaterMl: 0.015 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 1 complex generation pass", sourceName: "Estimated — Google Cloud 2025 basis", derivation: "Requires synthesizing pedagogic structure.", tierSource: TIER_SOURCE["lesson-plan"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023", derivation: "Standard computation." },
    },
  },
  {
    id: "study-guide", verb: "Creating", dropdownText: "a student study guide", dropdownLabel: "a student study guide", buttonText: "Study guide", category: "Education",
    clarifying: "Summarizing lecture notes or textbook chapters into flashcards or review points.",
    baseEnergyWh: 0.02, energyLow: 0.02, energyHigh: 7.5, baseWaterMl: 0.02 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = context parsing + synthesis pass", sourceName: "Estimated — Google Cloud 2025 basis", derivation: "Includes reading up to thousands of words.", tierSource: TIER_SOURCE["study-guide"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023", derivation: "Standard computation." },
    },
  },
  {
    id: "image", category: "Image & Video", verb: "Generating", dropdownText: "an AI image", dropdownLabel: "an AI image", buttonText: "AI image",
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
    id: "long-chat", category: "Chat", verb: "Having", dropdownText: "a long AI conversation", dropdownLabel: "a long AI conversation", buttonText: "Long chat",
    clarifying: "A 20–50 message back-and-forth session. At the Standard estimate (Google 2025), each message costs 0.24 Wh. At the Intensive estimate, 50 messages × 2.9 Wh = 145 Wh, which × 3.45 mL/Wh exactly matches Li et al.'s direct measurement of 500 mL for a ChatGPT conversation.",
    baseEnergyWh: 0.15, energyLow: 0.15, energyHigh: 145, baseWaterMl: 0.15 * 3.45,
    confidence: "medium", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 50 messages × [energy per message]", sourceName: "Luccioni 2023 · Google Cloud 2025 · EPRI 2024", derivation: "A long conversation is modelled as 50 AI interactions.", tierSource: TIER_SOURCE["long-chat"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023 (WUE methodology)", derivation: "At the High energy estimate with Typical WUE: 145 Wh × 3.45 mL/Wh = 500 mL — exactly matching Li et al.'s direct measurement for a 50-message ChatGPT conversation. ✓" },
    },
  },
  {
    id: "coding", category: "Code", verb: "Getting", dropdownText: "100 AI code suggestions", dropdownLabel: "100 code suggestions", buttonText: "100 code prompts",
    clarifying: "100 individual autocomplete or code completion suggestions — a realistic volume for a focused hour of AI-assisted development.",
    baseEnergyWh: 0.1, energyLow: 0.1, energyHigh: 29, baseWaterMl: 0.1 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 100 suggestions × [energy per suggestion]", sourceName: "Luccioni 2023 · Google Cloud 2025 (scaled) · EPRI 2024", derivation: "Each code suggestion is one AI inference call. Code completions are shorter than full chat prompts.", tierSource: TIER_SOURCE["coding"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard energy (12.0 Wh) × Typical WUE (3.45) = 41.4 mL per 100 suggestions." },
    },
  },
  {
    id: "app-build", category: "Code", verb: "Building", dropdownText: "a simple app", dropdownLabel: "a simple app", buttonText: "App building",
    clarifying: "A 1–2 hour session with many rounds of code generation, debugging, and iteration. Wide uncertainty — actual energy depends heavily on which AI model and how many requests.",
    baseEnergyWh: 50, energyLow: 50, energyHigh: 1000, baseWaterMl: 50 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = ~1,000 AI interactions × [avg energy per interaction]", sourceName: "Modelled · Google Cloud 2025 (average tier) · EPRI 2024 (high tier)", derivation: "A session is modelled as ~1,000 chained AI calls.", tierSource: TIER_SOURCE["app-build"] },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 (Aug) · Li et al. 2023 · IEA 2024", derivation: "Standard energy (240 Wh) × Typical WUE (3.45) = 828 mL (~0.83 L) per session." },
    },
  },
  {
    id: "video", category: "Image & Video", verb: "Generating", dropdownText: "a short AI video", dropdownLabel: "a short AI video", buttonText: "Short video",
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
    id: "training-llm", category: "Specialized", verb: "Training", dropdownText: "a large language model", dropdownLabel: "training a large language model", buttonText: "Training an LLM",
    clarifying: "Training GPT-3 (175B parameters) — one-time, not per use. Frontier models are estimated to need 10–100× more energy. No company has disclosed training costs.",
    baseEnergyWh: 1287000000, energyLow: 500000000, energyHigh: 5000000000, baseWaterMl: 700000000,
    confidence: "medium", tierSensitive: false,
    math: {
      energy: { equation: "~1.287 GWh = training FLOPs ÷ hardware efficiency ÷ PUE", sourceName: "Strubell et al. 2019 + Brown et al. 2020", derivation: "Brown et al. (2020) disclosed GPT-3 used ~3.14 × 10²³ FLOPs. Strubell et al. (2019) developed the FLOP→energy conversion methodology accounting for PUE." },
      water: { equation: "~700 million mL (700,000 L) — Li et al. direct facility estimate", sourceName: "Li et al. 2023 — Making AI Less Thirsty", derivation: "Li et al. directly estimated GPT-3 training used ~700,000 L at Microsoft Azure data centers (Quincy, WA). Direct estimate — not derived from WUE formula." },
      note: "Training is not estimate-range or water-location sensitive here — Li et al. measured this specific historical event. Frontier model training costs are not publicly disclosed.",
    },
  },
  // ─── TYPICAL USAGE PRESETS ──────────────────────────────────────────────────
  // Composite scenarios representing realistic accumulated AI use.
  // Energy = sum of component tasks at Standard tier (Google Cloud 2025 Aug, 0.24 Wh base)
  {
    id: "typical-daily", category: "Typical Usage", verb: "Using AI for", dropdownText: "a typical day", dropdownLabel: "a typical day of AI use", buttonText: "Daily AI use",
    clarifying: "A realistic day: ~15 short chat messages, 2 AI email replies, 1 AI search, and 1 AI image. Based on moderate AI usage patterns (MIT Technology Review 2025 analysis of daily habits).",
    baseEnergyWh: 2.465, energyLow: 2.465, energyHigh: 60.6, baseWaterMl: 2.465 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 15 × chat + 2 × email + 1 × AI search + 1 × image", sourceName: "Composite — Google Cloud 2025 · Luccioni 2023 · MIT Tech Review 2025", derivation: "Standard tier: (15 × 0.24) + (2 × 0.50) + (1 × 0.72) + (1 × 2.4) = 3.60 + 1.00 + 0.72 + 2.40 = 7.72 Wh. Light tier: ~2.47 Wh. Intensive tier: ~60.6 Wh." },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023", derivation: "Standard energy × Typical WUE: 7.72 Wh × 3.45 mL/Wh ≈ 26.6 mL per day." },
    },
  },
  {
    id: "typical-weekly", category: "Typical Usage", verb: "Using AI for", dropdownText: "a typical week", dropdownLabel: "a typical week of AI use", buttonText: "Weekly AI use",
    clarifying: "A week of moderate use: ~100 chat messages, 10 email replies, 5 AI searches, 3 images, 1 long conversation, and 1 meeting-notes session. Represents a knowledge worker who uses AI tools regularly.",
    baseEnergyWh: 7.81, energyLow: 7.81, energyHigh: 521.6, baseWaterMl: 7.81 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 100 × chat + 10 × email + 5 × search + 3 × image + 1 × long chat + 1 × meeting notes", sourceName: "Composite — Google Cloud 2025 · Luccioni 2023 · MIT Tech Review 2025", derivation: "Standard: (100 × 0.24) + (10 × 0.50) + (5 × 0.72) + (3 × 2.4) + (1 × 12.0) + (1 × 1.70) = 24 + 5 + 3.6 + 7.2 + 12 + 1.7 = 53.5 Wh." },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023", derivation: "Standard energy × Typical WUE: 53.5 Wh × 3.45 mL/Wh ≈ 184 mL per week." },
    },
  },
  {
    id: "typical-monthly", category: "Typical Usage", verb: "Using AI for", dropdownText: "a typical month", dropdownLabel: "a typical month of AI use", buttonText: "Monthly AI use",
    clarifying: "A month of active use: ~400 chat messages, 40 email replies, 20 AI searches, 10 images, 4 long conversations, 4 meeting-notes sessions, 200 code suggestions, and 1 short AI video. A power-user knowledge worker.",
    baseEnergyWh: 990.44, energyLow: 990.44, energyHigh: 8435.6, baseWaterMl: 990.44 * 3.45,
    confidence: "low", tierSensitive: true,
    math: {
      energy: { equation: "Energy = 400 × chat + 40 × email + 20 × search + 10 × image + 4 × long chat + 4 × meeting + 200 × code + 1 × video", sourceName: "Composite — Google Cloud 2025 · Luccioni 2023 · MIT Tech Review 2025", derivation: "Standard: (400 × 0.24) + (40 × 0.50) + (20 × 0.72) + (10 × 2.4) + (4 × 12) + (4 × 1.7) + (200 × 0.12) + (1 × 944) = 96 + 20 + 14.4 + 24 + 48 + 6.8 + 24 + 944 = 1,177 Wh." },
      water: { equation: "Water = Energy (Wh) × WUE (mL/Wh)", sourceName: "Google Cloud 2025 · Li et al. 2023", derivation: "Standard energy × Typical WUE: 1,177 Wh × 3.45 mL/Wh ≈ 4.1 L per month." },
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
export const ACTION_TIPS = [
  { impact: "Very high", color: "#c0392b", title: "Skip AI video generation unless essential", body: "One 10-second AI video uses as much energy as ~3,900 chat messages (at Google's measured rate). Describe your idea in words first. If you must generate, generate once — don't regenerate." },
  { impact: "High",      color: "#e67e22", title: "Think before generating AI images",        body: "One AI image uses ~10× more energy than a chat message. Ask: can I describe this in words instead? Reserve image generation for when visuals are truly necessary." },
  { impact: "High",      color: "#e67e22", title: "Get your prompt right the first time",     body: "Every 'try again' or 'make it shorter' is a full new request at the same cost. Spend 30 seconds being specific before submitting. One good prompt beats five mediocre ones." },
  { impact: "High",      color: "#e67e22", title: "Avoid 'deep research' and reasoning modes for simple tasks", body: "Reasoning models (like o3 or DeepSeek R1) can use up to 43× more energy than standard chat for the same question (Luccioni, cited in MIT Technology Review 2025). Use standard chat for straightforward questions — reserve reasoning and deep research modes for genuinely complex problems." },
  { impact: "Medium",    color: "#f0a500", title: "Use smaller models for simple tasks",      body: "Basic questions and formatting don't need the most powerful AI. A verified standard Gemini prompt uses 0.24 Wh, compared to 2.9+ Wh for older frontier models on intense workloads—over a 10× difference in power." },
  { impact: "Medium",    color: "#f0a500", title: "Batch your questions into one prompt",     body: "Three separate messages cost 3× more than one well-structured prompt. Combine related questions: 'What is X, why does Y happen, and how do I fix Z?' beats asking each separately." },
  { impact: "Medium",    color: "#f0a500", title: "Keep conversations focused",               body: "A 50-message conversation uses ~50× more energy than one focused message. Use AI for specific tasks, not extended back-and-forth. Shorter, more targeted sessions are more efficient." },
  { impact: "Low",       color: "#27ae60", title: "Request plain text over formatted output", body: "Asking for tables, bullet points, markdown, or code blocks generates more tokens and uses slightly more energy. When you just need the answer, say 'reply without formatting.'" },
  { impact: "Low",       color: "#27ae60", title: "Try on-device AI for basic tasks",         body: "Voice-to-text on your phone, Siri, Google Assistant, and offline apps process data locally — no data center energy required. Reserve cloud AI for tasks that genuinely need it." },
];

// ─── ENERGY / WATER OFFSETS ───────────────────────────────────────────────────
export const ENERGY_OFFSETS = [
  { id: "light",   label: "Turn off a 10W LED bulb",         unitLabel: "hours",   whPerUnit: 10   },
  { id: "ac",      label: "Skip 1 hour of air conditioning", unitLabel: "hours",   whPerUnit: 3500 },
  { id: "laundry", label: "Air-dry laundry (skip dryer)",     unitLabel: "loads",   whPerUnit: 2400 },
  { id: "walk",    label: "Walk instead of drive",            unitLabel: "km",      whPerUnit: 200  },
  { id: "laptop",  label: "Turn off a laptop",                unitLabel: "hours",   whPerUnit: 45   },
];
export const WATER_OFFSETS = [
  { id: "shower", label: "Take a shorter shower",              unitLabel: "min shorter", mlPerUnit: 8000  },
  { id: "flush",  label: "Skip a toilet flush",                unitLabel: "flushes",     mlPerUnit: 9000  },
  { id: "dishes", label: "Dishwasher instead of hand-washing", unitLabel: "loads",       mlPerUnit: 50000 },
  { id: "tap",    label: "Turn off tap while brushing teeth",  unitLabel: "times",       mlPerUnit: 2000  },
];
export const TRUSTED_LINKS = [
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
  "typical-daily": "#6366F1",
  "typical-weekly": "#8B5CF6",
  "typical-monthly": "#A855F7",
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
export function fmtOffset(v: number, u: string) {
  if (v < 0.01) return `< 0.01 ${u}`;
  if (v < 100) return `${(Math.round(v * 10) / 10).toLocaleString()} ${u}`;
  return `${Math.round(v).toLocaleString()} ${u}`;
}
// ─── COMPARABLE UNITS ─────────────────────────────────────────────────────────
const ENERGY_COMPARABLES = [
  { id: "netflix",    label: "hours of Netflix",     unitWh: 0.8 * 60, fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "microwave",  label: "minutes of microwaving", unitWh: 1000 / 60, fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "ebike",      label: "miles on an e-bike",   unitWh: 15,    fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "phone",      label: "smartphone charges",   unitWh: 12,    fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "ev",         label: "miles in an EV",       unitWh: 300,   fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
];

const WATER_COMPARABLES = [
  { id: "handwash",   label: "handwashes",           unitMl: 110,   fmt: (n: number) => n >= 10000 ? `${(n/1000).toFixed(1)}K` : n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "bottle",     label: "water bottles",        unitMl: 500,   fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "glass",      label: "glasses of water",     unitMl: 250,   fmt: (n: number) => n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "shower",     label: "showers",              unitMl: 65000, fmt: (n: number) => n < 0.01 ? n.toFixed(4) : n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
  { id: "bath",       label: "baths",                unitMl: 150000,fmt: (n: number) => n < 0.01 ? n.toFixed(4) : n < 0.1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString() },
];

function equivEnergyVal(wh: number, compId: string): string {
  const comp = ENERGY_COMPARABLES.find(c => c.id === compId) ?? ENERGY_COMPARABLES[0];
  return comp.fmt(wh / comp.unitWh);
}
function equivWaterVal(ml: number, compId: string): string {
  const comp = WATER_COMPARABLES.find(c => c.id === compId) ?? WATER_COMPARABLES[0];
  return comp.fmt(ml / comp.unitMl);
}
function getCompLabel(comparables: typeof ENERGY_COMPARABLES | typeof WATER_COMPARABLES, id: string): string {
  return comparables.find(c => c.id === id)?.label ?? comparables[0].label;
}

function getEnergyColorRgb(wh: number): { r: number, g: number, b: number } {
  // 0 Wh: Dark Green -> 10 Wh: Yellow -> 100 Wh: Orange -> 1000 Wh: Red -> 100,000 Wh: Dark Red
  if (wh >= 100000) return { r: 124, g: 17, b: 3 }; // Dark Red (#7c1103)
  if (wh >= 1000)   return { r: 210, g: 40, b: 30 }; // Red
  if (wh <= 0)      return { r: 15,  g: 60, b: 45 }; // Dark forest green

  const dkGreen = { r: 15,  g: 60,  b: 45  }; 
  const yellow  = { r: 215, g: 190, b: 35  }; 
  const orange  = { r: 225, g: 110, b: 25  }; 
  const red     = { r: 210, g: 40,  b: 30  }; 

  if (wh <= 10) {
    const t = wh / 10;
    return {
      r: Math.round(dkGreen.r + (yellow.r - dkGreen.r) * t),
      g: Math.round(dkGreen.g + (yellow.g - dkGreen.g) * t),
      b: Math.round(dkGreen.b + (yellow.b - dkGreen.b) * t),
    };
  }
  if (wh <= 100) {
    const t = (wh - 10) / 90;
    return {
      r: Math.round(yellow.r + (orange.r - yellow.r) * t),
      g: Math.round(yellow.g + (orange.g - yellow.g) * t),
      b: Math.round(yellow.b + (orange.b - yellow.b) * t),
    };
  }
  const t = Math.min(1, (wh - 100) / 900);
  return {
    r: Math.round(orange.r + (red.r - orange.r) * t),
    g: Math.round(orange.g + (red.g - orange.g) * t),
    b: Math.round(orange.b + (red.b - orange.b) * t),
  };
}


// ─── COMPARABLE DROPDOWN ───────────────────────────────────────────────────
function ComparableDropdown({ value, onChange, options }: { value: string; onChange: (id: string) => void; options: readonly { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value) ?? options[0];

  return (
    <span className="relative inline-flex items-center">
      <button onClick={() => setOpen(v => !v)}
        className="cursor-pointer inline-flex items-center gap-1.5 transition-all outline-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        style={{ fontFamily: "'Anthropic Serif', serif" }}>
        <span>{selected.label}</span>
        <svg width="10" height="6" viewBox="0 0 12 8" fill="none" style={{ opacity: 0.6, flexShrink: 0, marginTop: 2 }}>
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
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-[60] p-2 min-w-[200px] flex flex-col gap-1"
              style={{ fontFamily: "'Anthropic Sans', sans-serif", fontSize: "14px" }}>
              {options.map(o => {
                const isSelected = o.id === value;
                return (
                  <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                    className={`text-left px-3 py-2 rounded-xl transition-colors ${isSelected ? "bg-gray-100 dark:bg-gray-800 font-bold" : "hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium"} text-gray-700 dark:text-gray-300`}>
                    {o.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── INLINE PILL DROPDOWN ────────────────────────────────────────────────────
function InlineDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const scenariosByCategory = SCENARIOS.filter(s => s.category !== "Typical Usage").reduce((acc, s) => {
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
        className="cursor-pointer inline-flex items-center gap-2 font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#1a1a1a] active:bg-gray-100 dark:active:bg-[#222222] rounded-l-[100px] focus:outline-none dark:text-gray-100"
        style={{
          padding: "6px 14px 6px 22px",
          background: "transparent",
          fontSize: "inherit",
          fontFamily: "'Anthropic Serif', serif",
          lineHeight: "inherit",
        }}>
        {selected.text}
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ opacity: 0.55, flexShrink: 0, marginTop: 1 }} className="text-gray-900 dark:text-gray-100">
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
              className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl z-[60] flex flex-col overflow-hidden w-[90vw] max-w-[800px] text-left"
              style={{
                fontFamily: "'Anthropic Sans', sans-serif",
                fontSize: "min(1.2rem, 16px)",
              }}>
              <div className="p-3 flex flex-col gap-3 max-h-[calc(80vh-20px)] overflow-y-auto">

                {/* ── Average Compiled Usage at the top ── */}
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1.5 text-center w-full" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>Average Compiled Usage</div>
                  <div className="flex gap-2">
                    {SCENARIOS.filter(s => s.category === 'Typical Usage').map(s => {
                      const e = getEnergyWh(s.id, s.baseEnergyWh, 'commercial');
                      const rgb = getEnergyColorRgb(e);
                      const isSelected = s.id === value;
                      const baseBg = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
                      const isDark = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) < 140; 
                      const textColor = isDark ? 'text-white' : 'text-gray-900';
                      return (
                        <button key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
                          style={{ 
                            backgroundColor: baseBg, 
                            boxShadow: `0 3px 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`,
                            fontFamily: "'Anthropic Sans', sans-serif" 
                          }}
                          className={`flex-1 text-center px-4 rounded-xl text-[13px] h-10 flex items-center justify-center transition-all border-0 ${isSelected ? 'font-bold scale-[1.03] ring-1 ring-black/10' : 'font-medium filter brightness-105 hover:brightness-110 hover:scale-[1.01]'} ${textColor}`}>
                          <span className="truncate whitespace-nowrap">{s.buttonText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Task categories grid ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(scenariosByCategory).map(([category, items]) => (
                    <div key={category} className="flex flex-col gap-1.5 bg-gray-100/50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
                      <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase text-center w-full" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>{category}</div>
                      <div className="flex flex-col gap-1">
                        {items.filter(s => s.dropdownText.toLowerCase().includes(search.toLowerCase()) || s.verb.toLowerCase().includes(search.toLowerCase())).map(s => {
                          const e = getEnergyWh(s.id, s.baseEnergyWh, 'commercial');
                          const rgb = getEnergyColorRgb(e);
                          const isSelected = s.id === value;
                          const baseBg = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
                          const isDark = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) < 140;
                          const textColor = isDark ? 'text-white' : 'text-gray-900';
                          return (
                            <button key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
                              title={`${s.verb} ${s.dropdownText}`}
                              style={{ 
                                backgroundColor: baseBg, 
                                boxShadow: `0 3px 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`,
                                fontFamily: "'Anthropic Sans', sans-serif" 
                              }}
                              className={`text-center px-2 rounded-xl text-[12px] flex items-center justify-center h-10 transition-all border-0 overflow-hidden ${isSelected ? 'font-bold scale-[1.03] ring-1 ring-black/10' : 'font-medium filter brightness-105 hover:brightness-110 hover:scale-[1.01]'} ${textColor}`}>
                              <span className="truncate whitespace-nowrap w-full">{s.buttonText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Footer: Custom button + legend on same row ── */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>
                  <button onClick={() => { onChange('custom'); setOpen(false); }}
                    style={{ fontFamily: "'Anthropic Sans', sans-serif" }}
                    className={`px-4 py-1.5 rounded-xl text-[12px] border transition-all shrink-0 ${value === 'custom' ? 'bg-white dark:bg-gray-700 border-black dark:border-white border-2 font-bold text-black dark:text-white shadow-sm' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 shadow-sm'}`}>
                    Custom
                  </button>
                  {/* Color scale legend: gradient bar + separate >100 kWh dot */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex w-full h-2 rounded-full overflow-hidden">
                        {/* Segment 1: 0 -> 10 Wh (35% width) */}
                        <div className="w-[35%] h-full" style={{ background: 'linear-gradient(to right, rgb(15,60,45), rgb(215,190,35))' }} />
                        <div className="w-[1px] bg-white/40 h-full shrink-0" />
                        {/* Segment 2: 10 -> 1000 Wh (Remaining width) */}
                        <div className="flex-1 h-full" style={{ background: 'linear-gradient(to right, rgb(215,190,35) 0%, rgb(225,110,25) 10%, rgb(210,40,30) 100%)' }} />
                      </div>

                      <div className="relative w-full h-3 mt-0.5 text-[8.5px] text-gray-400" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>
                        <span className="absolute left-0">0 Wh</span>
                        <span className="absolute left-[35%] -translate-x-1/2">10 Wh</span>
                        <span className="absolute right-0">1 kWh</span>
                      </div>
                    </div>
                    {/* Separate >100 kWh outlier indicator - distinctly darker red */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0 ml-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7c1103' }} />
                      <span className="text-[8px] text-gray-400 leading-none whitespace-nowrap" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>&gt;100 kWh</span>
                    </div>
                  </div>
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
function EstimateSelectors({ tier, wueTier, onTierChange, onWueTierChange, isTierFixed, showReasoning, isReasoningModel, onReasoningChange }: {
  tier: ModelTier; wueTier: WueTier; onTierChange: (t: ModelTier) => void; onWueTierChange: (w: WueTier) => void; isTierFixed?: boolean;
  showReasoning?: boolean; isReasoningModel?: boolean; onReasoningChange?: (v: boolean) => void;
}) {
  const displayTier = isTierFixed ? "commercial" : tier;
  return (
    <div className="flex flex-col items-center gap-1.5 relative z-[100] w-full max-w-lg mx-auto">
      <div className="flex items-center justify-center relative z-[100] w-full gap-1.5 sm:gap-4 flex-nowrap w-max sm:w-full transform scale-[0.9] sm:scale-100">
        
        {/* Energy Estimate Group (Inline Right) */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium w-[50px] text-right leading-tight shrink-0">Energy<br/>estimate</span>
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800/80 rounded-full p-0.5">
            {(["research", "commercial", "frontier"] as ModelTier[]).map(t => (
              <button key={t} onClick={() => !isTierFixed && onTierChange(t)}
                disabled={isTierFixed && t !== "commercial"}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${(isTierFixed ? t === "commercial" : tier === t) ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" : isTierFixed ? "text-gray-300 dark:text-gray-600 opacity-50 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}>
                {TIER_META[t].rangeLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Reasoning AI Toggle (Inline Left) */}
        {showReasoning && onReasoningChange && (
          <div className="relative group flex items-center shrink-0 z-[100]">
            <button 
              onClick={() => onReasoningChange(!isReasoningModel)}
              className={`px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full text-[12px] sm:text-[11px] font-medium transition-all shadow-sm border ${isReasoningModel ? 'bg-gray-900 border-gray-900 text-white dark:bg-gray-100 dark:border-gray-100 dark:text-gray-900' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:bg-transparent dark:border-gray-700 dark:text-gray-500 dark:hover:text-gray-300'}`}
            >
               Reasoning AI
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-gray-900 text-white text-[10px] sm:text-[11px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[999] text-center font-sans shadow-xl pointer-events-none">
              Models that 'think' before answering generate invisible background tokens, using up to 30x more energy per prompt.
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-gray-900"></div>
            </div>
          </div>
        )}

      </div>
      <div className="flex items-center gap-2 mt-1 relative w-full justify-center">
        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium w-[50px] text-right leading-tight shrink-0">Water<br/>location</span>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800/80 rounded-full p-0.5">
          {(["efficient", "average", "intensive"] as WueTier[]).map(w => (
            <button key={w} onClick={() => onWueTierChange(w)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${wueTier === w ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}>
              {WUE_META[w].label}
            </button>
          ))}
        </div>
      </div>
      {isTierFixed && (
        <p className="text-[10px] text-gray-600 dark:text-amber-800 font-medium bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mt-1 mb-0.5">
          Only "Average" (Standard) data is available for this medium
        </p>
      )}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic text-center max-w-sm leading-relaxed mt-0.5">
        {TIER_META[displayTier].source} (energy) · {WUE_META[wueTier].source} (water)
      </p>
    </div>
  );
}



// ─── CUSTOM CALCULATOR ────────────────────────────────────────────────────────
function CustomCalculator({ counts, onChange, totalE, totalW, energyComp, setEnergyComp, waterComp, setWaterComp }: {
  counts: Record<string, number>;
  onChange: (id: string, val: number) => void;
  totalE: number;
  totalW: number;
  energyComp: string;
  setEnergyComp: (id: string) => void;
  waterComp: string;
  setWaterComp: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto mt-2">
      {CUSTOM_TASKS.map(t => (
        <div key={t.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
          <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 w-44 shrink-0 leading-tight">{t.label}</label>
          <input type="range" min={0} max={t.max} step={t.step} value={counts[t.id] ?? 0}
            onChange={e => onChange(t.id, Number(e.target.value))} className="flex-1 accent-gray-900 dark:accent-gray-100 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          <input type="number" min={0} max={t.max} value={counts[t.id] ?? 0}
            onChange={e => onChange(t.id, Number(e.target.value))}
            className="text-[13px] font-bold w-16 text-right tabular-nums text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 px-2 py-1 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors" />
        </div>
      ))}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-5 mt-2 text-center" style={{ fontFamily: "'Anthropic Serif', serif" }}>
        {totalE === 0
          ? <p className="text-gray-400 dark:text-gray-500 text-sm italic">Adjust sliders to see your usage.</p>
          : <>
            <p className="text-[1.15rem] leading-[2] text-black dark:text-gray-100">
              Your combination uses{" "}
              <strong style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px", whiteSpace: "nowrap" }}>{fmtEnergy(totalE)}</strong>{" "}
              of energy and{" "}
              <strong style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px", whiteSpace: "nowrap" }}>{fmtWater(totalW)}</strong>{" "}
              of water.
            </p>
            <div className="text-[0.9rem] min-[400px]:text-[1.05rem] sm:text-[1.15rem] md:text-[1.25rem] leading-[1.6] text-gray-500 dark:text-gray-400 text-center mt-3 mb-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 max-w-2xl px-2 sm:px-4" style={{ fontFamily: "'Anthropic Serif', serif" }}>
              <span>That's</span>
              <span className="font-medium text-gray-500 dark:text-gray-400">{equivEnergyVal(totalE, energyComp)}</span>
              <ComparableDropdown value={energyComp} onChange={setEnergyComp} options={ENERGY_COMPARABLES} />
              <span>and</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-medium text-gray-500 dark:text-gray-400">{equivWaterVal(totalW, waterComp)}</span>
                <ComparableDropdown value={waterComp} onChange={setWaterComp} options={WATER_COMPARABLES} />
              </span>
            </div>
          </>
        }
      </div>
    </div>
  );
}

// ─── COMPARE PANEL (LIGHT MODAL) ───────────────────────────────────────────────
function CompareModal({ selectedId, tier, wueTier, onClose }: { selectedId: string; tier: ModelTier; wueTier: WueTier; onClose: () => void }) {
  const [optionId, setOptionId] = useState("netflix");
  const [showTraining, setShowTraining] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const option = COMPARE_OPTIONS.find(o => o.id === optionId)!;
  const wue = WUE_VALUES[wueTier];

  const rows = SCENARIOS
    .filter(s => (showTraining || s.id !== "training-llm") && (showVideo || s.id !== "video"))
    .map(s => {
      const e = getEnergyWh(s.id, s.baseEnergyWh, tier);
          const w = getWaterMl(s.id, s.baseWaterMl, e, s.baseEnergyWh, wue, tier);
      return { ...s, val: option.compute(e, w), energy: e, water: w };
    })
    .sort((a, b) => a.val - b.val);

  const maxVal = Math.max(...rows.map(r => r.val), 0.001);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col z-10 overflow-hidden"
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
          <div className="text-sm text-gray-500 mb-2">
            Comparison measured in <strong>{option.unit.toLowerCase()}</strong>
          </div>

          {rows.map(({ id, dropdownLabel, val, energy, water }, i) => {
            const rgb = getEnergyColorRgb(energy);
            const color = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isSel = id === selectedId;
            const smallestVal = rows[0]?.val ?? 1;
            const relToSmallest = smallestVal > 0 ? val / smallestVal : 1;

            return (
              <motion.div key={id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={`rounded-2xl p-4 transition-all bg-white border ${isSel ? "border-blue-200 shadow-sm ring-1 ring-blue-50" : "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200"}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: color }} />
                  <span className={`text-sm flex-1 ${isSel ? "text-gray-900 font-semibold" : "text-gray-700 font-medium"}`}>
                    {dropdownLabel}
                    {isSel && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 font-medium">Current</span>}
                  </span>
                  {relToSmallest > 1.5 && i > 0 && (
                    <span className="text-xs text-gray-400 font-mono shrink-0 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 tracking-tight">×{Math.round(relToSmallest)}</span>
                  )}
                  <span className={`text-base font-semibold tabular-nums shrink-0 ${isSel ? "text-gray-900" : "text-gray-700"}`}>
                    {option.format(val)}
                  </span>
                </div>
                <div className="relative h-4 rounded-full overflow-hidden bg-gray-100 shadow-inner">
                  <motion.div className="absolute left-0 top-0 h-full rounded-full"
                    style={{ background: color, opacity: isSel ? 1 : 0.85 }}
                    initial={{ width: "0%" }} animate={{ width: `${Math.max(pct, 0.5)}%` }}
                    transition={{ delay: i * 0.04 + 0.15, duration: 0.55, ease: "easeOut" }} />
                </div>
              </motion.div>
            );
          })}

          <div className="mt-6 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-900 tracking-tight">Heavy-duty specialized tasks</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showVideo} onChange={e => setShowVideo(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-relaxed transition-colors">
                <strong className="text-gray-900 font-medium">Video Generation</strong> — A short 10-second clip requires rendering hundreds of frames. It takes about {Math.round(944/0.24)}× more power than a simple text prompt.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={showTraining} onChange={e => setShowTraining(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
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
  const [tab, setTab] = useState<"habits" | "offset">("habits");
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
            <button onClick={() => setTab("habits")} className={`flex-1 text-sm py-2 rounded-full font-medium transition-all shadow-sm ${tab === "habits" ? "bg-white text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"}`}>
              Simple Habits
            </button>
            <button onClick={() => setTab("offset")} className={`flex-1 text-sm py-2 rounded-full font-medium transition-all shadow-sm ${tab === "offset" ? "bg-white text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"}`}>
              Offset My Impact
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
              <div>
                <p className="font-semibold text-black text-sm mb-2">Reasoning Models & Embodied Carbon</p>
                <ul className="ml-4 flex flex-col gap-1.5">
                  <li className="list-disc"><strong>Reasoning AI (o1, DeepSeek):</strong> Models that 'think' via chain-of-thought loops generate thousands of invisible background tokens before outputting an answer. This pushes energy consumption up to 30x higher than a standard prompt (Dauner et al., 2025; URI AI Lab, 2025).</li>
                  <li className="list-disc"><strong>Embodied Carbon:</strong> These calculations measure only <em>operational</em> energy. They do not account for the significant environmental cost of manufacturing and disposing of the AI hardware and GPUs themselves (Dodge et al., 2022).</li>
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
                { title: "Reasoning models use dramatically more energy", body: "Chain-of-thought reasoning models (like OpenAI o3 or DeepSeek R1) can use up to 43× more energy than standard chat for simple problems (Luccioni, cited in MIT Technology Review 2025). Our tool's estimates are for standard inference — reasoning-heavy workloads and 'deep research' features are not yet captured and would significantly increase real-world energy use." },
                { title: "Video generation is unverified", body: "No peer-reviewed study has directly measured energy for commercial video AI (Sora, Runway, Pika) as of 2025. The 944 Wh estimate is derived by scaling image measurements by frame count — physically reasonable but unconfirmed. MIT Technology Review's independent CogVideoX measurement (~944 Wh for 5 seconds at 16fps) aligns with our estimate." },
                { title: "Water varies dramatically by data center location", body: "WUE can range from ~1.1 mL/Wh (Google's efficient TPU data centers) to 6+ mL/Wh (hot-climate evaporative cooling). When you make an AI request, you typically don't know where it will be processed." },
                { title: "Hardware lifecycle excluded", body: "All estimates cover operational energy only. GPU and server manufacturing, data center construction, and end-of-life disposal are excluded. Research suggests embodied carbon represents 50–80% of total lifecycle impact." },
                { title: "Data centers use dirtier-than-average electricity", body: "A Harvard preprint study found that the carbon intensity of electricity used by data centers was 48% higher than the US average. Data centers cluster in coal-heavy regions (Virginia, West Virginia) and run 24/7, including when cleaner sources aren't available. The same AI query produces very different emissions depending on location and time of day (MIT Technology Review 2025)." },
                { title: "AI infrastructure costs may be passed to consumers", body: "A 2024 Virginia legislature report estimated that data center energy costs could add ~$37.50/month to average residential electricity bills. Harvard researchers found that utility discounts given to Big Tech data centers can raise rates for other consumers. As AI infrastructure grows, these costs are increasingly socialized (MIT Technology Review 2025)." },
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

// ─── MATH MODAL ───────────────────────────────────────────────────────────────
function MathModal({ scenario, tier, wueTier, energyWh, waterMl, onClose }: {
  scenario: Scenario; tier: ModelTier; wueTier: WueTier; energyWh: number; waterMl: number; onClose: () => void;
}) {
  const tierSrc = scenario.math.energy.tierSource?.[tier];
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
      <motion.div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto z-10"
        initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 8 }} transition={{ type: "spring", damping: 28, stiffness: 400 }}>
        <div className="px-7 pt-7 pb-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-0.5">Show me the math</p>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{scenario.verb} {scenario.dropdownText}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 italic">{TIER_META[tier].rangeLabel} energy · {WUE_META[wueTier].label} water · {TIER_META[tier].source} / {WUE_META[wueTier].source}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={14} className="text-gray-400" /></button>
          </div>
          {scenario.tierSensitive && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Energy varies by estimate range. Currently: <strong>{TIER_META[tier].rangeLabel}</strong> ({TIER_META[tier].source}). Change using the selectors on the main screen.
            </div>
          )}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">⚡ Energy: {fmtEnergy(energyWh)}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${scenario.confidence === "high" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" : scenario.confidence === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"}`}>{scenario.confidence} confidence</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 dark:bg-black rounded-lg px-4 py-2.5"><p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.math.energy.equation}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Source</p><p className="text-xs text-gray-900 dark:text-gray-100 font-medium">{scenario.math.energy.sourceName}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Derivation</p><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{tierSrc ?? scenario.math.energy.derivation}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">💧 Water: {fmtWater(waterMl)}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">{WUE_META[wueTier].label} DC · {WUE_VALUES[wueTier]} mL/Wh</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-900 dark:bg-black rounded-lg px-4 py-2.5"><p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.id === "training-llm" ? scenario.math.water.equation : `${fmtEnergy(energyWh)} × ${WUE_VALUES[wueTier]} mL/Wh = ${fmtWater(waterMl)}`}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Water source</p><p className="text-xs text-gray-900 dark:text-gray-100 font-medium">{scenario.math.water.sourceName}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-1">Derivation</p><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{scenario.math.water.derivation}</p></div>
            </div>
          </div>
          {scenario.math.note && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-5 py-4">
              <p className="text-[10px] text-amber-700 dark:text-amber-500 uppercase tracking-widest font-medium mb-1">Note</p>
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">{scenario.math.note}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home() {
  const [selectedId, setSelectedId] = useState("short-chat");
  const [tier, setTier] = useState<ModelTier>("commercial");
  const [wueTier, setWueTier] = useState<WueTier>("average");
  const { theme, setTheme } = useTheme();
  const [showMath, setShowMath] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [activePanel, setActivePanel] = useState<'methodology' | 'offsets' | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const isMd = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const [multiplier, setMultiplier] = useState(1);
  const [energyComp, setEnergyComp] = useState("netflix");
  const [waterComp, setWaterComp] = useState("handwash");
  const [customCounts, setCustomCounts] = useState<Record<string, number>>(
    Object.fromEntries(CUSTOM_TASKS.map(t => [t.id, t.defaultVal]))
  );
  const [isReasoningModel, setIsReasoningModel] = useState(false);
  const { toast } = useToast();

  const isCustom = selectedId === "custom";
  const scenario = SCENARIOS.find(s => s.id === selectedId) ?? null;

  useEffect(() => {
    if (!scenario) return;
    const textToCheck = (scenario.id + " " + scenario.dropdownText + " " + scenario.category).toLowerCase();
    const keywords = ["code", "coding", "math", "o1", "deepseek", "reasoning", "logic", "complex"];
    
    // Auto-select reasoning mode if keywords match and it's a valid text scenario
    const isValidTextTask = !["image", "video", "training-llm"].includes(scenario.id);
    if (isValidTextTask && keywords.some(k => textToCheck.includes(k))) {
      setIsReasoningModel(true);
      toast({
        title: "Reasoning Mode active",
        description: "Auto-switched to Reasoning AI. Chain-of-thought tasks require significantly more compute.",
        duration: 4000,
      });
    } else {
      setIsReasoningModel(false);
    }
  }, [selectedId, toast]);
  const wue = WUE_VALUES[wueTier];

  const customTotalE = CUSTOM_TASKS.reduce((s, t) => s + (customCounts[t.id] ?? 0) * t.unitEnergyWh, 0);
  const customTotalW = CUSTOM_TASKS.reduce((s, t) => s + (customCounts[t.id] ?? 0) * t.unitWaterMl, 0);

  const baseTaskEnergy = isCustom ? customTotalE : scenario ? getEnergyWh(scenario.id, scenario.baseEnergyWh, tier) : 0;
  const baseTaskWater  = isCustom ? customTotalW : scenario ? getWaterMl(scenario.id, scenario.baseWaterMl, baseTaskEnergy, scenario.baseEnergyWh, wue, tier) : 0;

  const isTextTask = isCustom || (scenario && !["image", "video", "training-llm"].includes(scenario.id));
  const reasoningMult = (isReasoningModel && isTextTask) ? 30 : 1;
  const userMult = isCustom ? 1 : multiplier;

  const energyWh = baseTaskEnergy * userMult * reasoningMult;
  const waterMl  = baseTaskWater  * userMult * reasoningMult;

  const panelOpen = activePanel !== null;

  return (
    <div className="md:h-screen bg-white dark:bg-[#0a0a0a] flex flex-col md:flex-row md:overflow-hidden transition-colors duration-500 text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Anthropic Sans', sans-serif" }}>

      {/* ─── LEFT COLUMN: primary calculator ─── */}
      <motion.div
        className="flex flex-col md:h-full md:overflow-y-auto min-h-0 shrink-0"
        animate={{ width: isMd && panelOpen ? '35%' : '100%' }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ minWidth: 0 }}
      >
        <div className={`flex flex-col justify-center items-center min-h-screen md:min-h-full relative px-4 sm:px-8 py-12 md:py-0 ${isMd && panelOpen ? 'md:pl-8 lg:pl-12 md:items-start' : 'md:px-16'}`}>
          <AnimatePresence mode="wait">
            <motion.div key={selectedId + tier + wueTier}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`flex flex-col items-center gap-3 md:gap-5 w-full ${isMd && panelOpen ? 'max-w-xl' : 'max-w-4xl'} ${panelOpen ? 'cursor-pointer' : ''}`}
              onClick={panelOpen ? () => setActivePanel(null) : undefined}>
              
              <div className={`flex flex-col items-center gap-3 ${isMd && panelOpen ? 'text-[1rem] sm:text-[1.1rem] md:text-[1.25rem] leading-[1.4]' : 'text-[1.15rem] sm:text-[1.35rem] md:text-[1.65rem] leading-[1.5]'} text-black dark:text-gray-100 text-center`}
                style={{ fontFamily: "'Anthropic Serif', serif" }}>
                
                <div className="flex flex-col items-center gap-2">
                  {(() => {
                    const rgb = getEnergyColorRgb(energyWh);
                    const pillStyle = {
                      borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
                      boxShadow: `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35), 0 0 50px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), 0 0 80px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
                      transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
                    };

                    return (
                      <span style={pillStyle} className="inline-flex items-stretch flex-wrap justify-center z-50 bg-white dark:bg-[#121212] border-[3px] rounded-[100px] hover:shadow-lg transition-all relative">
                        <InlineDropdown value={selectedId} onChange={setSelectedId} />
                        {!isCustom && (
                          <>
                            <div className="w-px bg-gray-200 dark:bg-gray-700 my-2" />
                            <InlineMultiplier value={multiplier} onChange={setMultiplier} />
                          </>
                        )}
                      </span>
                    );
                  })()}
                </div>

                {!isCustom && (
                  <div className="mt-2 md:mt-3 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-2 px-4">
                    <span>will use</span>
                    <strong className="inline-block min-w-[5.5rem] text-center whitespace-nowrap" style={{ borderBottom: "3px solid currentColor", paddingBottom: "1px" }}>{fmtEnergy(energyWh)}</strong>
                    <span>of energy and</span>
                    <strong className="inline-block min-w-[5.5rem] text-center whitespace-nowrap" style={{ borderBottom: "3px solid currentColor", paddingBottom: "1px" }}>{fmtWater(waterMl)}</strong>
                    <span>of water.</span>
                  </div>
                )}
              </div>

              {isCustom ? (
                <div className="w-full mt-4">
                  <CustomCalculator
                    counts={customCounts}
                    onChange={(id, val) => setCustomCounts(prev => ({ ...prev, [id]: val }))}
                    totalE={customTotalE}
                    totalW={customTotalW}
                    energyComp={energyComp}
                    setEnergyComp={setEnergyComp}
                    waterComp={waterComp}
                    setWaterComp={setWaterComp}
                  />
                </div>
              ) : scenario ? (
                <>
                  {/* Secondary: equivalency */}
                  <div className={`${isMd && panelOpen ? 'text-[0.8rem] sm:text-[0.95rem]' : 'text-[0.9rem] min-[400px]:text-[1.05rem] sm:text-[1.15rem] md:text-[1.25rem]'} leading-[1.6] text-gray-500 dark:text-gray-400 text-center mt-3 mb-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 max-w-2xl px-2 sm:px-4`}
                    style={{ fontFamily: "'Anthropic Serif', serif" }}>
                    <span>That's</span>
                    <span className="font-medium text-gray-500 dark:text-gray-400">{equivEnergyVal(energyWh, energyComp)}</span>
                    <ComparableDropdown value={energyComp} onChange={setEnergyComp} options={ENERGY_COMPARABLES} />
                    <span>and</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-medium text-gray-500 dark:text-gray-400">{equivWaterVal(waterMl, waterComp)}</span>
                      <ComparableDropdown value={waterComp} onChange={setWaterComp} options={WATER_COMPARABLES} />
                    </span>
                  </div>

                  {/* Tertiary: selectors */}
                  <div className="flex flex-col items-center gap-4 mt-2 mb-1 w-full relative z-10">
                    <EstimateSelectors 
                      tier={tier} wueTier={wueTier} onTierChange={setTier} onWueTierChange={setWueTier} isTierFixed={!scenario.tierSensitive}
                      showReasoning={scenario ? !["image", "video", "training-llm"].includes(scenario.id) : false}
                      isReasoningModel={isReasoningModel}
                      onReasoningChange={setIsReasoningModel}
                    />
                  </div>

                  {/* Hover icons: Book + Leaf — below selectors */}
                  <div className="flex items-center gap-4 mt-3">
                    <SlideHoverIcon
                      icon={<BookOpen size={18} />}
                      label="Methodology & Sources"
                      active={activePanel === 'methodology'}
                      onClick={() => setActivePanel(activePanel === 'methodology' ? null : 'methodology')}
                    />
                    <SlideHoverIcon
                      icon={<Leaf size={18} />}
                      label="Offset My Impact"
                      active={activePanel === 'offsets'}
                      onClick={() => setActivePanel(activePanel === 'offsets' ? null : 'offsets')}
                    />
                  </div>

                  {/* Mobile-only: panel content rendered below */}
                  <div className="md:hidden w-full mt-4">
                    <AnimatePresence mode="wait">
                      {activePanel && (
                        <motion.div
                          key={activePanel}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gray-50/50 dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-4">
                            <button
                              onClick={() => setActivePanel(null)}
                              className="text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 flex items-center gap-1 transition-colors"
                            >
                              <ChevronLeft size={14} /> Close
                            </button>
                            {activePanel === 'methodology' && <MethodologyPanel scenario={scenario} tier={tier} wueTier={wueTier} energyWh={energyWh} waterMl={waterMl} onShowMath={() => { setActivePanel(null); setShowMath(true); }} />}
                            {activePanel === 'offsets' && <OffsetsPanel energyWh={energyWh} waterMl={waterMl} />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── RIGHT COLUMN: panel content (2/3) ─── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key={activePanel}
            className="h-full border-l border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0d0d0d] overflow-y-auto hidden md:block"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '65%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="p-6 md:p-10 lg:p-12">
              <button
                onClick={() => setActivePanel(null)}
                className="text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={14} /> Close panel
              </button>
              {activePanel === 'methodology' && <MethodologyPanel scenario={scenario} tier={tier} wueTier={wueTier} energyWh={energyWh} waterMl={waterMl} onShowMath={() => { setActivePanel(null); setShowMath(true); }} />}
              {activePanel === 'offsets' && <OffsetsPanel energyWh={energyWh} waterMl={waterMl} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BOTTOM RIGHT: Coffee & Theme toggles ─── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <SlideHoverIcon
          icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          label="Toggle Theme"
          direction="left"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
        <SlideHoverIcon
          icon={<Coffee size={16} />}
          label="Feedback & Coffee"
          direction="left"
          onClick={() => setShowSupport(true)}
        />
      </div>

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {showMath && scenario && <MathModal scenario={scenario} tier={tier} wueTier={wueTier} energyWh={energyWh} waterMl={waterMl} onClose={() => setShowMath(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCompare && <CompareModal selectedId={selectedId} tier={tier} wueTier={wueTier} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      </AnimatePresence>
    </div>
  );
}
