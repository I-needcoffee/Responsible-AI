import React, { useState } from "react";
import { X, ExternalLink, Coffee, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useSources } from "@/hooks/use-sources";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ACTION_TIPS, ENERGY_OFFSETS, WATER_OFFSETS, TRUSTED_LINKS, TIER_META, WUE_META, WUE_VALUES, Scenario, fmtOffset } from "./Home";
import type { ModelTier, WueTier } from "./Home";

interface DetailsProps {
  onClose: () => void;
  scenario?: Scenario | null;
  tier: ModelTier;
  wueTier: WueTier;
  energyWh: number;
  waterMl: number;
}

export function Details({ onClose, scenario, tier, wueTier, energyWh, waterMl }: DetailsProps) {
  const { data: sources, isLoading } = useSources();
  const [eOff, setEOff] = useState(ENERGY_OFFSETS[0].id);
  const [wOff, setWOff] = useState(WATER_OFFSETS[0].id);
  
  const ea = ENERGY_OFFSETS.find((a: any) => a.id === eOff) ?? ENERGY_OFFSETS[0];
  const wa = WATER_OFFSETS.find((a: any) => a.id === wOff) ?? WATER_OFFSETS[0];

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-[#0a0a0a] overflow-y-auto text-gray-900 dark:text-gray-100 font-sans">
      <div className="max-w-3xl mx-auto min-h-screen px-4 py-8 md:py-12 flex flex-col gap-8">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors self-start underline-offset-4 hover:underline"
        >
          <ChevronLeft size={16} />
          Back to Calculator
        </button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Methodology, Offsets & Support</h1>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
            Explore practical habits to reduce your AI impact, learn how these numbers are calculated from peer‑reviewed research, and help keep this tool alive.
          </p>
        </div>

        {scenario && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-2">
            <h2 className="text-base font-semibold mb-2">Current Context</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              {scenario.clarifying}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 font-light mt-3">
              Note: These calculations measure operational energy. They do not include 'embodied carbon'—the significant environmental cost of manufacturing and disposing of AI hardware.
            </p>
          </div>
        )}

        <Accordion type="multiple" defaultValue={["offsets", "methodology"]} className="w-full border-t border-gray-200 dark:border-gray-800">
          
          {/* SEC 1: OFFSETS & HABITS */}
          <AccordionItem value="offsets" className="border-gray-200 dark:border-gray-800 border-b">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline hover:text-blue-600 transition-colors">
              How do we fix this? (Offsets & Habits)
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 flex flex-col gap-6">
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-6 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-semibold mb-4">⚡ To balance out the power usage...</p>
                  <select value={eOff} onChange={e => setEOff(e.target.value)}
                    className="w-full text-sm rounded-xl px-4 py-3 mb-4 outline-none cursor-pointer bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
                    {ENERGY_OFFSETS.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <p className="text-3xl font-light"><strong className="font-semibold">{fmtOffset(energyWh / ea.whPerUnit, ea.unitLabel)}</strong></p>
                </div>
                <div className="rounded-2xl p-6 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-semibold mb-4">💧 To conserve the water usage...</p>
                  <select value={wOff} onChange={e => setWOff(e.target.value)}
                    className="w-full text-sm rounded-xl px-4 py-3 mb-4 outline-none cursor-pointer bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
                    {WATER_OFFSETS.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <p className="text-3xl font-light"><strong className="font-semibold">{fmtOffset(waterMl / wa.mlPerUnit, wa.unitLabel)}</strong></p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 mt-4 text-gray-500 uppercase tracking-widest">Simple Habits</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ACTION_TIPS.map((tip: any, i: number) => (
                    <div key={i} className="rounded-xl p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-3 inline-block tracking-widest uppercase"
                        style={{ border: `1px solid ${tip.color}30`, color: tip.color, background: tip.color + '10' }}>
                        {tip.impact} impact
                      </span>
                      <h4 className="font-bold text-sm mb-1.5">{tip.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{tip.body}</p>
                    </div>
                  ))}
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* SEC 2: METHODOLOGY & SOURCES */}
          <AccordionItem value="methodology" className="border-gray-200 dark:border-gray-800 border-b">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline hover:text-blue-600 transition-colors">
              Sources & Methodology
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 flex flex-col gap-6">
              
              <div className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
                <p><strong>Energy and water are controlled separately</strong> because they depend on different factors. Energy depends on which AI model and infrastructure you use. Water depends on where the data center is located and what cooling system it uses — independently of the AI model.</p>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs space-y-4 border border-gray-200 dark:border-gray-800">
                  <div>
                    <strong className="text-gray-900 dark:text-gray-100">Energy Estimates:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1.5">
                      <li><strong>Light:</strong> Directly measured on open-source GPU hardware. (Luccioni et al. 2023)</li>
                      <li><strong>Standard:</strong> Comprehensive measurement of Gemini text prompt covering active chips, CPU, cooling, and idle provisioning. (Google Cloud Aug 2025)</li>
                      <li><strong>Intensive:</strong> Estimated for ChatGPT-class models on older Azure infrastructure before modern optimizations. (EPRI 2024 / Jegham et al. 2025)</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-gray-100">Water Use Effectiveness (WUE):</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1.5">
                      <li><strong>Efficient (1.1 mL/Wh):</strong> Google TPU data centers. Cooler climate, renewable energy.</li>
                      <li><strong>Typical (3.45 mL/Wh):</strong> Calibrated from Microsoft Azure avg US commercial infrastructure (Li et al. 2023).</li>
                      <li><strong>Intensive (6.0 mL/Wh):</strong> Upper range for hot-climate evaporative cooling (IEA 2024).</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 mt-4 text-gray-500 uppercase tracking-widest">Literature & Data Sources</h3>
                <div className="flex flex-col gap-4">
                  {isLoading && <p className="text-xs italic text-gray-500">Loading sources…</p>}
                  {((sources || []) as any[]).map((s: any) => (
                    <div key={s.id} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="font-semibold text-sm">{s.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{Array.isArray(s.authors) ? s.authors.join(", ") : s.authors} · {s.institution} · {s.year}</p>
                        </div>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black dark:hover:text-white shrink-0 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      {s.keyFindings && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"><strong className="font-medium text-gray-800 dark:text-gray-200">Findings:</strong> {s.keyFindings}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 mt-4 text-gray-500 uppercase tracking-widest">Knowledge Gaps & Limitations</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Only Google has published per-prompt measurements", body: "ChatGPT, Claude, and Midjourney have not published per-query figures. Non-Google estimates are modelled." },
                  { title: "Reasoning models use dramatically more energy", body: "Chain-of-thought models (o3, DeepSeek R1) can use up to 43× more energy than standard chat." },
                  { title: "Video generation is unverified", body: "No peer-reviewed study has directly measured energy for commercial video AI. The 944 Wh estimate is derived physically." },
                  { title: "Hardware lifecycle excluded", body: "All estimates cover operational energy only. Manufacturing and end-of-life disposal are excluded." },
                ].map((g, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="font-semibold text-xs mb-1.5">{g.title}</p>
                    <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">{g.body}</p>
                  </div>
                ))}
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* SEC 3: SUPPORT & FEEDBACK */}
          <AccordionItem value="support" className="border-gray-200 dark:border-gray-800 border-b">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline hover:text-blue-600 transition-colors">
              Support & Feedback
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 flex flex-col gap-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Feedback & Collaboration</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Notice a bug, have better data, or want to suggest a feature? This project is open source. Help improve the data.
                  </p>
                  <a href="https://github.com/I-needcoffee/Responsible-AI" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium px-5 py-2.5 rounded-full hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-500 transition-all self-start text-sm">
                    <ExternalLink size={14} className="text-gray-500" />
                    GitHub Issues
                  </a>
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Support the Project</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    If you found this tool helpful and want to support future updates, you can buy me a coffee.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="https://account.venmo.com/u/Tim_Meyers" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#008CFF] text-white font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-[#007AE6] transition-all text-sm">
                      <Coffee size={14} /> Venmo
                    </a>
                    <a href="https://paypal.me/coffee4tim" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#003087] text-white font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-[#001C4F] transition-all text-sm">
                      <Coffee size={14} /> PayPal
                    </a>
                  </div>
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
