import { ReceiptCard } from "@/components/ui/receipt-card";
import { HelpCircle, Lock, CloudRain, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function Gaps() {
  const gaps = [
    {
      icon: Lock,
      title: "Proprietary Training Data",
      description: "Major AI companies rarely disclose the full MW usage or hardware hours required to train their foundation models. The energy required for training is typically orders of magnitude higher than inference, but we only have solid estimates for open-source models like BLOOM or Llama.",
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      icon: CloudRain,
      title: "Evaporative Cooling Variability",
      description: "Water usage estimates are highly dependent on the physical location of the datacenter. A server in Ireland might use free air cooling most of the year (0 mL water), while the same query routed to a datacenter in Arizona might use extensive evaporative cooling.",
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      icon: Cpu,
      title: "Hardware Lifecycle Footprint",
      description: "Current estimates focus heavily on operational energy use (Scope 2). They rarely factor in the embodied carbon (Scope 3) of manufacturing the GPUs, networking equipment, and the concrete for the datacenters themselves.",
      color: "text-slate-500",
      bg: "bg-slate-50"
    }
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-10">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Knowledge Gaps</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Honesty means acknowledging what we don't know. The field of AI sustainability is new, and many numbers are hidden behind corporate NDAs. Here is where our data falls short.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {gaps.map((gap, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <ReceiptCard className="flex gap-6 items-start">
              <div className={`p-4 rounded-2xl shrink-0 ${gap.bg} ${gap.color} border border-border/50`}>
                <gap.icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{gap.title}</h3>
                <p className="text-foreground/80 leading-relaxed font-medium">
                  {gap.description}
                </p>
              </div>
            </ReceiptCard>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 bg-primary/10 rounded-3xl p-8 border border-primary/20 text-center">
        <HelpCircle className="w-10 h-10 text-primary mx-auto mb-4" />
        <h3 className="font-display font-bold text-2xl text-primary mb-2">Want to contribute?</h3>
        <p className="text-primary/80 mb-6 font-medium">
          If you're a researcher or have access to credible infrastructure data, you can help fill these gaps.
        </p>
        <button className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          Submit a Study
        </button>
      </div>
    </div>
  );
}
