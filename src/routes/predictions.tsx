import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getPredictions } from "@/lib/api";

export const Route = createFileRoute("/predictions")({
  head: () => ({ meta: [{ title: "AI Predictions · AgriShield AP" }, { name: "description", content: "Forward-looking AI forecasts for pests, drought, yield and irrigation." }] }),
  component: () => {
    const { data: predictions = [] } = useQuery({ queryKey: ["predictions"], queryFn: getPredictions });
    return (
    <div>
      <PageHeader icon={<Sparkles className="h-6 w-6 text-primary" />} eyebrow="Predictive AI" title="AI Predictions & Forecasts"
        description="Neural ensemble forecasts across 14–30 day horizons." />
      <div className="px-6 lg:px-10 py-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((p, i) => (
          <div key={p.label} className="glass rounded-xl p-5 relative overflow-hidden hover:glow-primary transition">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{p.crop}</p>
                <Badge variant="outline" className={
                  p.severity === "Critical" ? "border-destructive/40 text-destructive bg-destructive/10" :
                  p.severity === "High" ? "border-warning/40 text-warning bg-warning/10" :
                  p.severity === "Medium" ? "border-info/40 text-info bg-info/10" :
                  "border-success/40 text-success bg-success/10"
                }>{p.severity}</Badge>
              </div>
              <h3 className="mt-2 font-semibold">{p.label}</h3>
              <div className="mt-4 flex items-end gap-3">
                <div className="text-4xl font-bold gradient-text tabular-nums">{p.probability}%</div>
                <div className="text-[10px] text-muted-foreground mb-1.5">probability<br />next 14 days</div>
              </div>
              <Progress value={p.probability} className="mt-3 h-1.5" />
              <p className="mt-3 text-xs text-muted-foreground">
                Ensemble: CropVision-v4 · WeatherFusion · HistoricSpread-LSTM. Confidence band ±4.2%.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )},
});
