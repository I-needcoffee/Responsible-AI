export function useSources() {
  const mockSources = [
    {
      id: "google-2025",
      title: "Measuring the environmental impact of AI inference at Google",
      authors: ["Google Cloud"],
      institution: "Google",
      year: 2025,
      url: "https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference/",
      keyFindings: "Comprehensive measurement of a median Gemini App text-generation prompt: 0.24 Wh energy, 0.03 g CO2, 0.26 mL water. Covers active AI chips (TPU/GPU), host CPU & DRAM, cooling overhead, and idle machine provisioning.",
      limitations: "Specific to Google's highly optimized, custom TPU infrastructure and renewable energy matching. May not generalize to older GPU deployments.",
      category: "industry"
    },
    {
      id: "luccioni-2023",
      title: "Power Hungry Processing: Watts Driving the Cost of AI Deployment?",
      authors: ["Alexandra Sasha Luccioni", "Sylvain Viguier", "Anne-Laure Ligozat"],
      institution: "Hugging Face & Inria",
      year: 2023,
      url: "https://arxiv.org/abs/2311.16863",
      keyFindings: "Measured energy for specific tasks on open-source hardware. Text generation ranges from 0.001 - 0.06 Wh depending on model size. Image generation averages 2.9 Wh.",
      limitations: "Measured on single GPU basis, lacking full datacenter overhead (PUE) and idle provisioning costs.",
      category: "academic"
    },
    {
      id: "li-2023",
      title: "Making AI Less Thirsty",
      authors: ["Pengfei Li", "Jianyi Yang", "Mohammad A. Islam", "Shaolei Ren"],
      institution: "UC Riverside",
      year: 2023,
      url: "https://arxiv.org/abs/2304.03271",
      keyFindings: "Estimated ChatGPT consumes ~500ml of water for every 10-50 conversations. Introduced methodology for converting energy estimates to water footprint based on location-specific WUE.",
      limitations: "Uses modelled estimates rather than direct OpenAI measurements, as OpenAI does not publish per-prompt water metrics.",
      category: "academic"
    },
    {
      id: "epri-2024",
      title: "Powering Intelligence: Analyzing Artificial Intelligence and Data Center Energy Consumption",
      authors: ["EPRI"],
      institution: "Electric Power Research Institute",
      year: 2024,
      url: "https://www.epri.com/research/products/000000003002028905",
      keyFindings: "Estimates a standard ChatGPT query requires 2.9 Wh of electricity, compared to 0.3 Wh for a standard Google search.",
      limitations: "Industry average model; does not account for latest optimizations (e.g. GPT-4o architecture changes).",
      category: "industry"
    },
    {
      id: "mit-tech-review-2025",
      title: "We did the math on AI's energy footprint. Here's the story you haven't heard.",
      authors: ["James O'Donnell", "Casey Crownhart"],
      institution: "MIT Technology Review",
      year: 2025,
      url: "https://www.technologyreview.com/2025/05/20/1116327/ai-energy-usage-climate-footprint-big-tech/",
      keyFindings: "Comprehensive analysis using UMich ML.Energy leaderboard measurements. Llama 3.1 8B: ~0.032 Wh per response; Llama 3.1 405B: ~1.86 Wh. Video generation (CogVideoX, 5s clip): ~944 Wh. Reasoning models use ~43× more energy. Data center carbon intensity is 48% higher than US average. By 2028, AI alone could consume electricity equivalent to 22% of US households.",
      limitations: "Measurements are on open-source models only; closed-source models (GPT-4, Claude, Gemini) remain unverifiable. Full data center overhead estimated via 2× GPU multiplier.",
      category: "journalism"
    },
    {
      id: "reasoning-multiplier-2025",
      title: "Reasoning models compute at 30x to 50x the energy of a standard prompt",
      authors: ["Dauner et al.", "URI AI Lab"],
      institution: "Various",
      year: 2025,
      url: "#",
      keyFindings: "Models like OpenAI o1, o3, and DeepSeek R1 generate thousands of invisible 'thinking tokens' via chain-of-thought loops before outputting an answer. This pushes energy consumption to an average of 10 Wh to 40 Wh per query, roughly 30x to 50x the energy of a standard text prompt.",
      limitations: "Focuses exclusively on text-based chain-of-thought generation.",
      category: "academic"
    },
    {
      id: "embodied-carbon-2022",
      title: "Measuring the Carbon Intensity of AI in Cloud Instances",
      authors: ["Jesse Dodge et al."],
      institution: "Allen Institute for AI (AI2)",
      year: 2022,
      url: "https://arxiv.org/abs/2206.05229",
      keyFindings: "Operational energy footprint (kWh) does not account for 'embodied carbon'—the significant environmental cost of manufacturing and disposing of the GPUs themselves. Embodied carbon can represent a substantial portion of the total lifecycle emissions for hardware.",
      limitations: "Evaluates standard cloud GPU lifecycles, which may not perfectly align with specialized TPU pipelines.",
      category: "academic"
    }
  ];

  return { data: mockSources, isLoading: false };
}
