import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Droplets, Wind, Thermometer, CloudRain, Leaf, RefreshCcw } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";

import { getWeatherLiveSummary } from "@/lib/api";
import { useAppShell } from "@/components/app-shell-store";
import { getFarmerSession } from "@/lib/farmer-auth";

export const Route = createFileRoute("/farmers/weather")({
  head: () => ({
    meta: [{ title: "Weather · Farmer App" }],
  }),
  component: FarmerWeatherPage,
});

type Advice = { label: string; detail: string };

function weatherToAdvice(temp: number, rainfall24h: number): Advice[] {
  const out: Advice[] = [];
  if (rainfall24h >= 20) {
    out.push({ label: "Heavy rainfall expected", detail: "Avoid fertilizer application for the next 48 hours." });
    out.push({ label: "Irrigation check", detail: "Ensure drainage in low-lying plots to prevent water stress." });
  } else {
    out.push({ label: "Stable weather", detail: "Maintain current irrigation schedule and monitor leaf wetness." });
  }

  if (temp >= 36) {
    out.push({ label: "Heat stress risk", detail: "Irrigate early morning and apply mulch where possible." });
  }

  if (!out.length) out.push({ label: "General advisory", detail: "Scout fields and follow recommended pest monitoring." });
  return out.slice(0, 3);
}

function FarmerWeatherPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const { selectedDistrict, setSelectedDistrict } = useAppShell();

  const session = getFarmerSession();
  const profile = session?.profile;

  const [forceKey, setForceKey] = useState(0);

  const { data } = useQuery({
    queryKey: ["weather-live", forceKey],
    queryFn: getWeatherLiveSummary,
  });

  const advice = useMemo(() => {
    const temp = data?.temperature ?? 30;
    const rain = data?.rainfall_24h ?? 0;
    return weatherToAdvice(temp, rain);
  }, [data?.temperature, data?.rainfall_24h]);

  if (!profile) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">Please login to continue.</p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/farmers/login" as any })}>
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className={mobile ? "px-0" : "px-6"}>
      <PageHeader
        icon={<Leaf className="h-6 w-6 text-primary" />}
        eyebrow="Weather Intelligence"
        title="Live Weather"
        description="Current weather + agriculture actionable recommendations."
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Location</div>
              <div className="mt-1 font-semibold">{data?.location ?? `${selectedDistrict}`}</div>
              <div className="mt-1 text-xs text-muted-foreground">Updated: {data?.updated_at ?? "--"}</div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Live</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Thermometer className="h-3.5 w-3.5"/> Temperature</div>
              <div className="mt-1 text-sm font-semibold">{data?.temperature?.toFixed(1) ?? "--"} °C</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Droplets className="h-3.5 w-3.5"/> Humidity</div>
              <div className="mt-1 text-sm font-semibold">{data?.humidity ?? "--"}%</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><CloudRain className="h-3.5 w-3.5"/> Rainfall</div>
              <div className="mt-1 text-sm font-semibold">{data?.rainfall_24h ?? "--"} mm / 24h</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="h-3.5 w-3.5"/> Wind Speed</div>
              <div className="mt-1 text-sm font-semibold">{data?.wind_speed ?? "--"} km/h</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setForceKey((k) => k + 1)}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <h3 className="font-semibold flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" /> Agriculture Recommendations
          </h3>
          <div className="mt-3 space-y-2">
            {advice.map((a) => (
              <div key={a.label} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{a.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

