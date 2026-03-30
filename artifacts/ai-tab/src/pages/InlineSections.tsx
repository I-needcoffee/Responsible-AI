import React, { useState } from "react";
import { ExternalLink, Coffee, BookOpen, Leaf, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSources } from "@/hooks/use-sources";
import { ACTION_TIPS, ENERGY_OFFSETS, WATER_OFFSETS, fmtOffset } from "./Home";

/* ─── SLIDE HOVER ICON ──────────────────────────────────────────────────────── */
// A bare icon that, on hover, slides to reveal text. Direction controls layout.
// direction="right": icon is left, text slides out to the right (for inline icons)
// direction="left":  icon is right, text slides out to the left (for bottom-right stack)

export function SlideHoverIcon({
  icon,
  label,
  onClick,
  active = false,
  direction = "right",
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  direction?: "right" | "left";
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const show = hovered || active;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center cursor-pointer transition-colors duration-200 ${
        show ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
      } ${direction === "left" ? "flex-row-reverse" : "flex-row"} ${className}`}
      style={{ gap: 0 }}
    >
      <span className="shrink-0 flex items-center justify-center w-7 h-7">{icon}</span>
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`overflow-hidden whitespace-nowrap text-xs font-medium ${
              direction === "left" ? "pr-1.5" : "pl-1.5"
            }`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ─── OFFSETS PANEL (right 2/3) ─────────────────────────────────────────────── */
export function OffsetsPanel({ energyWh, waterMl }: { energyWh: number; waterMl: number }) {
  const [eOff, setEOff] = useState(ENERGY_OFFSETS[0].id);
  const [wOff, setWOff] = useState(WATER_OFFSETS[0].id);

  const ea = ENERGY_OFFSETS.find((a: any) => a.id === eOff) ?? ENERGY_OFFSETS[0];
  const wa = WATER_OFFSETS.find((a: any) => a.id === wOff) ?? WATER_OFFSETS[0];

  return (
    <div className="flex flex-col gap-8 h-full overflow-y-auto pr-2">
      <div>
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-gray-100">Offset My Impact</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Practical equivalences to balance the energy and water from this AI task.</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold mb-3 text-gray-500 uppercase tracking-wider">⚡ Energy offset</p>
            <select value={eOff} onChange={e => setEOff(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2.5 mb-3 outline-none cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {ENERGY_OFFSETS.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtOffset(energyWh / ea.whPerUnit, ea.unitLabel)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold mb-3 text-gray-500 uppercase tracking-wider">💧 Water offset</p>
            <select value={wOff} onChange={e => setWOff(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2.5 mb-3 outline-none cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {WATER_OFFSETS.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtOffset(waterMl / wa.mlPerUnit, wa.unitLabel)}</p>
          </div>
        </div>
      </div>

      {/* Habits — visually separated */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">General Habits</h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 italic">These are independent suggestions — not directly tied to the numbers above.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTION_TIPS.map((tip: any, i: number) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-2 inline-block tracking-widest uppercase"
                style={{ border: `1px solid ${tip.color}30`, color: tip.color, background: tip.color + '10' }}>
                {tip.impact}
              </span>
              <h4 className="font-semibold text-xs mb-1 text-gray-800 dark:text-gray-200">{tip.title}</h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── METHODOLOGY PANEL (right 2/3) ────────────────────────────────────────── */
export function MethodologyPanel({ scenario, tier, wueTier, energyWh, waterMl, onShowMath }: {
  scenario?: any; tier?: string; wueTier?: string; energyWh?: number; waterMl?: number; onShowMath?: () => void;
}) {
  const { data: sources, isLoading } = useSources();
  const tierSrc = scenario?.math?.energy?.tierSource?.[tier as string];

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">

      {/* ── This task: show me the math ── */}
      {scenario && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium mb-1">This task</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{scenario.verb} {scenario.dropdownText}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{scenario.clarifying}</p>
          </div>

          {/* Energy equation */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">⚡ Energy: {energyWh !== undefined ? (energyWh < 1 ? `${(energyWh * 1000).toFixed(0)} mWh` : energyWh >= 1000 ? `${(energyWh / 1000).toFixed(1)} kWh` : `${energyWh.toFixed(2)} Wh`) : '—'}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${scenario.confidence === 'high' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : scenario.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>{scenario.confidence} confidence</span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="bg-gray-900 dark:bg-black rounded-lg px-3 py-2"><p className="text-xs text-gray-100 font-mono leading-relaxed">{scenario.math?.energy?.equation}</p></div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{tierSrc ?? scenario.math?.energy?.derivation}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Source: {scenario.math?.energy?.sourceName}</p>
            </div>
          </div>

          {/* Water equation */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">💧 Water — depends on data center location</p>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="bg-gray-900 dark:bg-black rounded-lg px-3 py-2"><p className="text-xs text-gray-100 font-mono leading-relaxed">Energy × WUE (mL/Wh) = Water used</p></div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{scenario.math?.water?.derivation}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Source: {scenario.math?.water?.sourceName}</p>
            </div>
          </div>

          {scenario.math?.note && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
              <p className="text-[10px] text-amber-700 dark:text-amber-500 uppercase tracking-widest font-medium mb-1">Note</p>
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">{scenario.math.note}</p>
            </div>
          )}
        </div>
      )}

      {/* ── General methodology ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-bold mb-1 text-gray-400 uppercase tracking-widest">How estimates work</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Energy and water are controlled separately. Energy depends on the AI model and infrastructure. Water depends on where the data center is and what cooling it uses.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-xl">
            <strong className="text-xs block mb-2 text-gray-700 dark:text-gray-300">Energy estimate ranges</strong>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
              <li><strong>Light:</strong> Direct GPU measurement (Luccioni 2023)</li>
              <li><strong>Standard:</strong> Full-stack Gemini measurement incl. cooling (Google Cloud Aug 2025)</li>
              <li><strong>Intensive:</strong> Estimated for ChatGPT-class on Azure (EPRI 2024)</li>
            </ul>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-xl">
            <strong className="text-xs block mb-2 text-gray-700 dark:text-gray-300">Water Use Effectiveness (WUE)</strong>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
              <li><strong>Efficient (1.1 mL/Wh):</strong> Google TPU, cool climate</li>
              <li><strong>Typical (3.45 mL/Wh):</strong> Azure avg US (Li et al. 2023)</li>
              <li><strong>Intensive (6.0 mL/Wh):</strong> Hot-climate evaporative (IEA 2024)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Sources ── */}
      <div>
        <h3 className="text-xs font-bold mb-3 text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Primary Literature</h3>
        <div className="grid gap-2">
          {isLoading && <p className="text-xs italic text-gray-500">Loading sources…</p>}
          {((sources || []) as any[]).map((s: any) => (
            <div key={s.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <p className="font-medium text-xs text-gray-900 dark:text-gray-100 leading-snug">{s.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{Array.isArray(s.authors) ? s.authors.join(', ') : s.authors} · {s.year}</p>
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 shrink-0 p-1"><ExternalLink size={13} /></a>
              </div>
              {s.keyFindings && <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-1.5 mt-1.5">{s.keyFindings}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Gaps ── */}
      <div className="pb-6">
        <h3 className="text-xs font-bold mb-3 text-gray-400 uppercase tracking-widest">What we don't know yet</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { title: 'Only Google has published per-prompt measurements', body: 'ChatGPT, Claude, and Midjourney have not disclosed per-query figures.' },
            { title: 'Reasoning models are dramatically more expensive', body: 'Chain-of-thought models can use up to 43× more energy than standard chat.' },
            { title: 'Video generation is unverified', body: 'No peer-reviewed study has measured energy for commercial video AI.' },
            { title: 'Hardware lifecycle excluded', body: 'All estimates cover operational energy only — not manufacturing or disposal.' },
          ].map((g, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="font-semibold text-[11px] mb-1 text-gray-800 dark:text-gray-200">{g.title}</p>
              <p className="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">{g.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ─── SUPPORT MODAL (standalone overlay) ───────────────────────────────────── */
export function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-gray-900/40 dark:bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg z-10 p-8"
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
      >
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100"><Coffee size={20} className="text-yellow-600" /> Feedback & Support</h2>

        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Open Source Collaboration</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Notice a bug, have better data, or want to suggest a feature? This project is open source.
            </p>
            <a href="https://github.com/I-needcoffee/Responsible-AI" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs">
              <ExternalLink size={14} className="text-gray-500" /> GitHub Issues
            </a>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Buy Me a Coffee</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Support the continued development and hosting of this tool.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="https://account.venmo.com/u/Tim_Meyers" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#008CFF] text-white font-medium px-4 py-2.5 rounded-xl hover:bg-[#007AE6] transition-colors text-xs">
                <Coffee size={14} /> Venmo
              </a>
              <a href="https://paypal.me/coffee4tim" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#003087] text-white font-medium px-4 py-2.5 rounded-xl hover:bg-[#001C4F] transition-colors text-xs">
                <Coffee size={14} /> PayPal
              </a>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ✕
        </button>
      </motion.div>
    </div>
  );
}
