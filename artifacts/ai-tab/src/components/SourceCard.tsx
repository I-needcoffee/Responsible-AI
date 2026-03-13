import { Source } from "@workspace/api-client-react";
import { ReceiptCard } from "./ui/receipt-card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Star } from "lucide-react";
import { useState } from "react";
import { useSubmitRating } from "@/hooks/use-ratings";
import { cn } from "@/lib/utils";

export function SourceCard({ source }: { source: Source }) {
  const [isRatingMode, setIsRatingMode] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  
  const { mutate, isPending } = useSubmitRating();

  const handleRate = () => {
    if (!selectedRating) return;
    mutate(
      { data: { sourceId: source.id, rating: selectedRating, comment: comment || undefined } },
      {
        onSuccess: () => {
          setIsRatingMode(false);
          setSelectedRating(0);
          setComment("");
        }
      }
    );
  };

  return (
    <ReceiptCard>
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <Badge className="uppercase tracking-wider">{source.category}</Badge>
            <span className="text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
              {source.year}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Data: {source.dataAvailability}
            </span>
          </div>
          
          <h3 className="font-display text-xl md:text-2xl font-bold mb-2 text-foreground">
            {source.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground mb-4">
            {source.authors.join(", ")} • <span className="text-foreground/80">{source.institution}</span>
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-sm bg-secondary/5 p-4 rounded-xl border border-secondary/20">
              <span className="font-bold text-secondary block mb-1 uppercase text-xs tracking-wider">Key Finding</span>
              <p className="text-foreground/80">{source.keyFindings}</p>
            </div>
            <div className="text-sm bg-destructive/5 p-4 rounded-xl border border-destructive/20">
              <span className="font-bold text-destructive block mb-1 uppercase text-xs tracking-wider">Limitations</span>
              <p className="text-foreground/80">{source.limitations}</p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 shrink-0">
          <div className="bg-background rounded-2xl p-5 border border-border shadow-sm text-center">
            {isRatingMode ? (
              <div className="flex flex-col gap-3 animate-in fade-in zoom-in duration-200">
                <span className="font-bold text-sm">Rate Trustworthiness</span>
                <div className="flex justify-center gap-1">
                  {[1,2,3,4,5].map(star => (
                    <Star
                      key={star}
                      className={cn(
                        "w-7 h-7 cursor-pointer transition-all hover:scale-110", 
                        star <= selectedRating ? "fill-amber-400 text-amber-400" : "text-border"
                      )}
                      onClick={() => setSelectedRating(star)}
                    />
                  ))}
                </div>
                <textarea
                  placeholder="Why this rating? (Optional)"
                  className="w-full text-sm p-3 rounded-xl border border-border focus:outline-none focus:border-primary bg-card resize-none h-20"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => setIsRatingMode(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1" disabled={!selectedRating || isPending} onClick={handleRate}>
                    {isPending ? "Saving..." : "Submit"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in duration-200">
                <span className="block text-4xl font-display font-bold text-amber-500 mb-2">
                  {source.avgTrustRating ? source.avgTrustRating.toFixed(1) : "N/A"}
                </span>
                <div className="flex justify-center mb-2">
                  {[1,2,3,4,5].map(star => (
                    <Star
                      key={star}
                      className={cn(
                        "w-4 h-4", 
                        star <= Math.round(source.avgTrustRating || 0) ? "fill-amber-400 text-amber-400" : "text-border"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {source.totalRatings} community ratings
                </span>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setIsRatingMode(true)}>
                  Rate Source
                </Button>
                <a href={source.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline mt-4">
                  View Original Paper →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </ReceiptCard>
  );
}
