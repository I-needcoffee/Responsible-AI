import { Router, type IRouter } from "express";

const router: IRouter = Router();

// All energy/water/CO2 estimates are derived from published academic and industry sources.
// When data does not exist from published sources, dataExists is set to false and values are null.
// Sources: Luccioni et al. 2023, Li et al. 2023, Strubell et al. 2019, Patterson et al. 2022
const AI_TASKS = [
  {
    id: "text-chat-simple",
    name: "Short Chat Message (1–10 words)",
    category: "chat",
    description: "A single short prompt to an AI assistant, like asking a quick question or giving a brief instruction.",
    energyWh: {
      low: 0.001,
      mid: 0.003,
      high: 0.01,
      unit: "Wh",
      dataExists: true,
      notes: "Based on Luccioni et al. 2023 (Power Hungry Processing) measuring inference energy for text generation models at 0.0003 kWh per 1,000 tokens avg, and Goldman Sachs 2024 estimate of ~0.001 kWh per ChatGPT query. Actual varies by model size, GPU efficiency, and data center PUE."
    },
    waterMl: {
      low: 1,
      mid: 10,
      high: 50,
      unit: "mL",
      dataExists: true,
      notes: "Based on Li et al. 2023 (Making AI Less Thirsty) estimating ~500 mL per 20-50 query conversation, scaled down to single short query. Significant uncertainty due to non-disclosure by operators. Water use varies with data center cooling method and climate."
    },
    co2Grams: {
      low: 0.0004,
      mid: 0.002,
      high: 0.008,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate combined with US average grid carbon intensity (~0.4 kg CO2/kWh per EPA 2023). Actual varies enormously by region and renewable energy use."
    },
    equivalents: [
      { activity: "Boiling water for tea", duration: "0.003 seconds", icon: "🫖" },
      { activity: "LED bulb on", duration: "0.36 seconds", icon: "💡" },
      { activity: "Smartphone charging", duration: "0.003% of one full charge", icon: "📱" }
    ],
    sourceIds: ["luccioni2023", "li2023", "dodge2022"],
    dataConfidence: "medium",
    notes: "Estimates vary significantly between studies. Luccioni et al. 2023 is the most methodologically rigorous inference-specific study available. Most public figures for 'ChatGPT energy per query' are estimates, not direct measurements of closed models."
  },
  {
    id: "text-chat-long",
    name: "Long Conversation (20–50 back-and-forth messages)",
    category: "chat",
    description: "An extended AI conversation session, like using ChatGPT to help draft a document or brainstorm ideas over multiple turns.",
    energyWh: {
      low: 0.05,
      mid: 0.3,
      high: 1.0,
      unit: "Wh",
      dataExists: true,
      notes: "Scaled from per-query estimates in Luccioni et al. 2023, accounting for longer context windows in later turns which increases compute. Goldman Sachs (2024) estimated ChatGPT uses ~10x more electricity per query than Google Search; Google Search estimated at ~0.3 Wh, implying ~3 Wh per ChatGPT query — this is an industry analyst estimate, not a direct measurement."
    },
    waterMl: {
      low: 100,
      mid: 500,
      high: 2000,
      unit: "mL",
      dataExists: true,
      notes: "Li et al. 2023 directly estimates 500 mL for a 20-50 question ChatGPT conversation. This is the primary citation for this figure. Uncertainty remains high as Microsoft and OpenAI have not confirmed or denied this figure."
    },
    co2Grams: {
      low: 0.02,
      mid: 0.12,
      high: 0.4,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate × US avg grid intensity. Carbon intensity varies 40x by location per Dodge et al. 2022."
    },
    equivalents: [
      { activity: "Washing your hands", duration: "~7 seconds of water use", icon: "🤲" },
      { activity: "Drinking water (16oz)", duration: "That's a water bottle's worth", icon: "💧" },
      { activity: "Netflix streaming (HD)", duration: "~1–2 minutes", icon: "📺" }
    ],
    sourceIds: ["li2023", "luccioni2023", "iea2024"],
    dataConfidence: "medium",
    notes: "The 500 mL figure from Li et al. 2023 is widely cited but is a modeled estimate, not a direct measurement. Water use is highly location-dependent — data centers in arid regions use more water for cooling."
  },
  {
    id: "image-generation",
    name: "AI Image Generation (single image)",
    category: "image",
    description: "Generating one image using a diffusion model like DALL-E, Midjourney, Stable Diffusion, or similar.",
    energyWh: {
      low: 0.5,
      mid: 2.4,
      high: 6.5,
      unit: "Wh",
      dataExists: true,
      notes: "Luccioni et al. 2023 directly measured image generation using A100 GPUs across multiple diffusion models. Found 0.0024 kWh (2.4 Wh) average per image for SDXL-class models. Stable Diffusion XL measured at 2.4 Wh; smaller models lower, larger models higher. This is 5–133x more energy than a single text query."
    },
    waterMl: {
      low: 50,
      mid: 200,
      high: 600,
      unit: "mL",
      dataExists: true,
      notes: "Extrapolated from Li et al. 2023 methodology applied to Luccioni et al. 2023 energy figures for image generation. No study has directly measured water use for image generation specifically. This estimate has higher uncertainty than text chat figures."
    },
    co2Grams: {
      low: 0.2,
      mid: 1.0,
      high: 2.6,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from Luccioni et al. 2023 energy figure × grid carbon intensity from Dodge et al. 2022."
    },
    equivalents: [
      { activity: "Charging a smartphone", duration: "~5% of a full charge", icon: "📱" },
      { activity: "LED bulb on", duration: "~8 minutes", icon: "💡" },
      { activity: "Driving a car (avg)", duration: "~15–30 meters", icon: "🚗" }
    ],
    sourceIds: ["luccioni2023", "li2023", "dodge2022"],
    dataConfidence: "high",
    notes: "This is one of the best-documented task types. Luccioni et al. 2023 directly measured multiple image generation models and found image generation is consistently the most energy-intensive common AI task. Image generation uses 5–133x more energy than text generation per task."
  },
  {
    id: "video-generation",
    name: "AI Video Generation (short clip, 5–15 seconds)",
    category: "video",
    description: "Generating a short video clip using AI tools like Sora, Runway, Kling, or similar video generation models.",
    energyWh: {
      low: null,
      mid: null,
      high: null,
      unit: "Wh",
      dataExists: false,
      notes: "No published academic or industry study has measured energy consumption for AI video generation inference as of March 2026. Video generation models (Sora, Runway Gen-2/3, Kling, Stable Video Diffusion) are newer and have not been included in measurement studies. Based on the image generation precedent and the significantly higher compute required for temporal consistency across frames, video generation is likely substantially more energy-intensive than image generation, but no verified figures exist."
    },
    waterMl: {
      low: null,
      mid: null,
      high: null,
      unit: "mL",
      dataExists: false,
      notes: "No published data exists on water use for AI video generation. Cannot estimate without energy figures as a baseline."
    },
    co2Grams: {
      low: null,
      mid: null,
      high: null,
      unit: "g CO2eq",
      dataExists: false,
      notes: "No published data. Would be derived from energy use, which is also undocumented."
    },
    equivalents: [],
    sourceIds: ["luccioni2023"],
    dataConfidence: "unknown",
    notes: "This is a significant knowledge gap. AI video generation is one of the fastest-growing AI capabilities but has essentially no published environmental impact data. The companies offering these services (OpenAI/Sora, Runway, Google/Veo) have not disclosed energy or water figures."
  },
  {
    id: "code-completion",
    name: "Code Completion / Autocomplete",
    category: "code",
    description: "AI-powered code suggestions like GitHub Copilot, Cursor, or Codeium completing a line or function.",
    energyWh: {
      low: 0.0001,
      mid: 0.001,
      high: 0.005,
      unit: "Wh",
      dataExists: true,
      notes: "Code completion queries are typically short (small context window, short output) compared to chat. Luccioni et al. 2023 measured code-related LLM inference at the lower end of text generation energy. GitHub Copilot uses OpenAI Codex/GPT-4 family models — exact figures not disclosed. Estimates extrapolated from text generation measurements for comparable-length completions."
    },
    waterMl: {
      low: 0.5,
      mid: 3,
      high: 15,
      unit: "mL",
      dataExists: true,
      notes: "Extrapolated from Li et al. 2023 methodology scaled to code completion energy use estimates. Very rough estimate; no study has specifically measured water use for code completion tasks."
    },
    co2Grams: {
      low: 0.00004,
      mid: 0.0004,
      high: 0.002,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate × avg grid intensity. Lower confidence than chat estimates."
    },
    equivalents: [
      { activity: "LED bulb on", duration: "less than 1 second", icon: "💡" },
      { activity: "Dripping faucet", duration: "less than 1 drop", icon: "💧" }
    ],
    sourceIds: ["luccioni2023", "li2023"],
    dataConfidence: "low",
    notes: "Code completion is less studied than general chat. Many completions happen in rapid succession during active coding sessions, so cumulative use over a day of coding is more meaningful than per-completion figures. No published study has specifically measured GitHub Copilot, Cursor, or similar tools."
  },
  {
    id: "app-building-session",
    name: "Full App Building Session (vibe coding, 1–2 hours)",
    category: "code",
    description: "A full session of AI-assisted application development, like building an app with Replit Agent, Cursor, or similar tools. Includes many back-and-forth exchanges, code generation, debugging, and iteration.",
    energyWh: {
      low: 10,
      mid: 50,
      high: 200,
      unit: "Wh",
      dataExists: true,
      notes: "Rough estimate based on aggregating many individual AI exchanges (code generation, chat, code completion) over a typical development session. Assumes 50–500 AI interactions. No study has specifically measured 'vibe coding' sessions. This is extrapolated from per-query estimates in Luccioni et al. 2023 and is highly uncertain. A session like building this very dashboard would include hundreds of AI calls."
    },
    waterMl: {
      low: 500,
      mid: 2500,
      high: 10000,
      unit: "mL",
      dataExists: true,
      notes: "Extrapolated from Li et al. 2023 per-conversation estimate scaled to a multi-hour session with hundreds of interactions. Extremely rough estimate. No published study exists for this use case."
    },
    co2Grams: {
      low: 4,
      mid: 20,
      high: 80,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate × avg grid intensity. Very rough."
    },
    equivalents: [
      { activity: "Netflix streaming (HD)", duration: "30 min to 4 hours", icon: "📺" },
      { activity: "Driving a car", duration: "0.05–0.4 miles", icon: "🚗" },
      { activity: "Washing hands", duration: "equivalent to 1–10 washes", icon: "🤲" },
      { activity: "Charging a laptop", duration: "15%–100% of one charge", icon: "💻" }
    ],
    sourceIds: ["luccioni2023", "li2023", "iea2024"],
    dataConfidence: "low",
    notes: "This specific use case (agentic coding sessions) is not documented in any published study. The estimates here are derived by aggregating per-query estimates and are subject to enormous uncertainty. The actual resource use of this dashboard's creation would require direct measurement. Agentic AI (where the model takes many sequential actions) likely uses significantly more resources than simple query-response interactions."
  },
  {
    id: "image-recognition",
    name: "Image Recognition / Classification",
    category: "image",
    description: "Analyzing or classifying an image using AI, like object detection or content moderation.",
    energyWh: {
      low: 0.0001,
      mid: 0.0005,
      high: 0.002,
      unit: "Wh",
      dataExists: true,
      notes: "Luccioni et al. 2023 directly measured discriminative image tasks (classification) and found them substantially less energy-intensive than generative tasks. Image classification averages around 0.0001 kWh per 1,000 inferences, making single queries a fraction of a Wh."
    },
    waterMl: {
      low: 0.1,
      mid: 0.5,
      high: 2,
      unit: "mL",
      dataExists: true,
      notes: "Extrapolated from Li et al. 2023 methodology at this low energy level."
    },
    co2Grams: {
      low: 0.00004,
      mid: 0.0002,
      high: 0.0008,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate × avg grid intensity."
    },
    equivalents: [
      { activity: "LED bulb on", duration: "less than 1 second", icon: "💡" }
    ],
    sourceIds: ["luccioni2023"],
    dataConfidence: "high",
    notes: "Image classification/recognition is one of the better-studied inference tasks. These 'discriminative' tasks use dramatically less energy than generative tasks."
  },
  {
    id: "training-large-llm",
    name: "Training a Large Language Model (GPT-3 scale)",
    category: "training",
    description: "The one-time process of training a large language model from scratch, like GPT-3 (175B parameters). This is done by AI companies, not end users.",
    energyWh: {
      low: 500000000,
      mid: 1287000000,
      high: 5000000000,
      unit: "Wh",
      dataExists: true,
      notes: "Patterson et al. 2022 (Google) estimated GPT-3 training at ~1,287 MWh (1.287 TWh = 1,287,000,000 Wh), accounting for Google TPU efficiency. Li et al. 2023 estimated GPT-3 training used ~1,000 MWh. Strubell et al. 2019 methodology applied to GPT-3 scale would suggest higher figures. Note: these are estimates for training GPT-3 specifically; GPT-4 and newer models have not had training costs disclosed."
    },
    waterMl: {
      low: 100000000,
      mid: 700000000,
      high: 2000000000,
      unit: "mL",
      dataExists: true,
      notes: "Li et al. 2023 estimated GPT-3 training consumed approximately 700,000 liters (700,000,000 mL) of fresh water for cooling. This estimate is based on modeling assumptions; Microsoft/OpenAI have not confirmed this figure."
    },
    co2Grams: {
      low: 100000000,
      mid: 552000000,
      high: 2000000000,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Patterson et al. 2022 estimated 552 tonnes CO2eq for GPT-3 training using Google's infrastructure. Higher estimates come from applying US-average grid intensity. The actual figure depends heavily on energy mix of the data center used."
    },
    equivalents: [
      { activity: "Trans-American flights", duration: "~120–500 round trips", icon: "✈️" },
      { activity: "American cars (lifetime)", duration: "~5 cars' entire lifetime emissions", icon: "🚗" },
      { activity: "Fresh water for a person", duration: "~1,900 years of drinking water", icon: "💧" },
      { activity: "US household electricity", duration: "~45–180 years of use", icon: "🏠" }
    ],
    sourceIds: ["patterson2022", "li2023", "strubell2019"],
    dataConfidence: "medium",
    notes: "Training costs are only known for GPT-3 and a handful of other models with partial disclosures. GPT-4, Claude, Gemini, and other current frontier models have not had training costs disclosed. Training is a one-time cost amortized over all users and queries made to the model."
  },
  {
    id: "audio-transcription",
    name: "Audio Transcription (1 minute of audio)",
    category: "audio",
    description: "Converting speech to text using AI like Whisper, Google Speech-to-Text, or similar models.",
    energyWh: {
      low: 0.0001,
      mid: 0.002,
      high: 0.01,
      unit: "Wh",
      dataExists: true,
      notes: "Luccioni et al. 2023 included automatic speech recognition (ASR) in their measurements and found discriminative audio tasks are in a similar range to text tasks. Specific per-minute estimates extrapolated from their batch measurements of audio models."
    },
    waterMl: {
      low: 0.1,
      mid: 2,
      high: 10,
      unit: "mL",
      dataExists: true,
      notes: "Extrapolated from energy estimate using Li et al. 2023 methodology. Low confidence."
    },
    co2Grams: {
      low: 0.00004,
      mid: 0.0008,
      high: 0.004,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate × avg grid intensity."
    },
    equivalents: [
      { activity: "LED bulb on", duration: "less than 5 seconds", icon: "💡" }
    ],
    sourceIds: ["luccioni2023"],
    dataConfidence: "low",
    notes: "Limited specific data on audio transcription AI energy use. Luccioni et al. 2023 included some ASR tasks but not broken out by audio duration."
  },
  {
    id: "web-search-ai",
    name: "AI-Powered Web Search (single query)",
    category: "search",
    description: "A web search query that uses AI for results synthesis, like Google's AI Overviews, Bing Copilot, or Perplexity.",
    energyWh: {
      low: 0.001,
      mid: 0.01,
      high: 0.03,
      unit: "Wh",
      dataExists: true,
      notes: "Goldman Sachs 2024 report estimated ChatGPT uses ~10x more electricity per query than Google Search. Google's own 2009 estimate was ~0.0003 kWh (0.3 Wh) per search; AI-augmented search is estimated to be higher. IEA 2024 noted AI search as a growing electricity demand. These are analyst estimates, not direct measurements. Traditional Google search estimated at 0.3 Wh (Wissner-Gross, 2009 — now outdated but frequently cited)."
    },
    waterMl: {
      low: 0.5,
      mid: 5,
      high: 20,
      unit: "mL",
      dataExists: true,
      notes: "Extrapolated from energy estimates and Li et al. 2023 methodology. No specific study has measured water use for AI-augmented web search."
    },
    co2Grams: {
      low: 0.0004,
      mid: 0.004,
      high: 0.012,
      unit: "g CO2eq",
      dataExists: true,
      notes: "Derived from energy estimate × avg grid intensity."
    },
    equivalents: [
      { activity: "LED bulb on", duration: "~2–20 seconds", icon: "💡" },
      { activity: "Smartphone screen on (bright)", duration: "~5–50 seconds", icon: "📱" }
    ],
    sourceIds: ["iea2024", "luccioni2023"],
    dataConfidence: "low",
    notes: "AI-augmented search is a rapidly evolving space with minimal published measurement data. Traditional search energy is well-studied; the additional cost of AI components is not clearly isolated in published research."
  }
];

router.get("/tasks", (_req, res) => {
  res.json(AI_TASKS);
});

export default router;
