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
    }
  ];

  return { data: mockSources, isLoading: false };
}
