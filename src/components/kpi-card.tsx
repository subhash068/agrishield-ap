import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  trend?: number;
  confidence?: number;
  index?: number;
}

export function KpiCard({ label, value, unit = "", trend = 0, confidence, index = 0 }: KpiCardProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const isPct = unit === "%";
  const formatted = isPct
    ? display.toFixed(1)
    : value >= 1000 ? Math.floor(display).toLocaleString("en-IN") : display.toFixed(1);

  const up = trend >= 0;
  const r = 22, c = 2 * Math.PI * r;
  const offset = confidence !== undefined ? c - (confidence / 100) * c : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl glass p-4 hover:border-primary/40 transition-all hover:glow-primary"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{formatted}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          <div className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-medium",
            up ? "text-success" : "text-destructive")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% · 30d
          </div>
        </div>

        {confidence !== undefined && (
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 50 50" className="h-full w-full -rotate-90">
              <circle cx="25" cy="25" r={r} className="fill-none stroke-muted/40" strokeWidth="3" />
              <circle
                cx="25" cy="25" r={r}
                className="fill-none stroke-primary transition-all duration-1000"
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                style={{ filter: "drop-shadow(0 0 4px oklch(0.78 0.19 145 / 0.6))" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold tabular-nums">
              {confidence}%
            </div>
          </div>
        )}
      </div>

      {/* sparkline */}
      <svg viewBox="0 0 100 24" className="mt-2 h-6 w-full">
        <defs>
          <linearGradient id={`spark-${index}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.19 145)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.78 0.19 145)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={(() => {
            const pts = Array.from({ length: 18 }, (_, i) =>
              `${(i / 17) * 100},${12 + Math.sin(i * 0.7 + index) * 6 + Math.cos(i * 0.4) * 3}`
            );
            return `M${pts.join(" L")} L100,24 L0,24 Z`;
          })()}
          fill={`url(#spark-${index})`}
          stroke="oklch(0.78 0.19 145)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}
