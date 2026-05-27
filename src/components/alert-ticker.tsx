import { AlertTriangle } from "lucide-react";

type AlertTickerProps = {
  items: string[];
};

export function AlertTicker({ items: tickerItems }: AlertTickerProps) {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-gradient-to-r from-destructive/10 via-warning/10 to-destructive/10">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-destructive/80 text-destructive-foreground text-[11px] font-bold uppercase tracking-wider shrink-0">
          <AlertTriangle className="h-3.5 w-3.5" />
          Live Alerts
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-ticker whitespace-nowrap gap-12 py-2 text-xs text-foreground/90">
            {items.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
