import { useState } from "react";
import { useSources } from "@/hooks/use-sources";
import { SourceCard } from "@/components/SourceCard";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function Sources() {
  const { data: sources, isLoading } = useSources();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const safeSources = sources || [];

  const filtered = safeSources.filter((s: any) => {
    const matchesCat = category === "all" || s.category === category;
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.institution.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center max-w-2xl mx-auto mb-4">
        <h1 className="text-4xl font-display font-bold mb-4">Source Library</h1>
        <p className="text-lg text-muted-foreground">
          We believe in showing our work. Review the methodologies, key findings, and limitations of the studies powering this dashboard.
        </p>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center sticky top-20 z-40">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by title or institution..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary transition-colors font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="w-full md:w-48 py-2.5 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary font-medium cursor-pointer"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="academic">Academic</option>
          <option value="industry">Industry</option>
          <option value="government">Government</option>
          <option value="journalism">Journalism</option>
        </select>
      </div>

      <div className="flex flex-col gap-6">
        {filtered.length > 0 ? (
          filtered.map((source: any, i: number) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <SourceCard source={source} />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl font-display font-bold text-foreground">No sources found</p>
            <p>Try adjusting your search filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
