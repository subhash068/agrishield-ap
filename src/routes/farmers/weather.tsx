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

const TRANSLATIONS = {
  en: {
    eyebrow: "Weather Intelligence",
    title: "Live Weather",
    description: "Current weather + agriculture actionable recommendations.",
    location: "Location",
    temperature: "Temperature",
    humidity: "Humidity",
    rainfall: "Rainfall",
    windSpeed: "Wind Speed",
    refresh: "Refresh",
    agriRec: "Agriculture Recommendations",
    loginPrompt: "Please login to continue.",
    login: "Login",
    updated: "Updated",
  },
  te: {
    eyebrow: "వాతావరణ సమాచారం",
    title: "లైవ్ వాతావరణం",
    description: "ప్రస్తుత వాతావరణం + వ్యవసాయ చర్యల సిఫార్సులు.",
    location: "ప్రదేశం",
    temperature: "ఉష్ణోగ్రత",
    humidity: "తేమ",
    rainfall: "వర్షపాతం",
    windSpeed: "గాలి వేగం",
    refresh: "రిఫ్రెష్",
    agriRec: "వ్యవసాయ సిఫార్సులు",
    loginPrompt: "దయచేసి లాగిన్ అవ్వండి.",
    login: "లాగిన్",
    updated: "నవీకరించబడింది",
  }
};

type Advice = { label: string; detail: string };

function weatherToAdvice(temp: number, rainfall24h: number, locale: "en" | "te"): Advice[] {
  const out: Advice[] = [];
  if (rainfall24h >= 20) {
    out.push({
      label: locale === "te" ? "భారీ వర్షపాతం అంచనా" : "Heavy rainfall expected",
      detail: locale === "te" ? "రాబోయే 48 గంటల పాటు ఎరువులు వేయడం నివారించండి." : "Avoid fertilizer application for the next 48 hours.",
    });
    out.push({
      label: locale === "te" ? "నీటి పారుదల తనిఖీ" : "Irrigation check",
      detail: locale === "te" ? "నీటి నిల్వను నివారించడానికి తగిన డ్రైనేజీ ఏర్పాట్లు చేయండి." : "Ensure drainage in low-lying plots to prevent water stress.",
    });
  } else {
    out.push({
      label: locale === "te" ? "స్థిరమైన వాతావరణం" : "Stable weather",
      detail: locale === "te" ? "ప్రస్తుత నీటి పారుదల ప్రణాళికను కొనసాగించండి మరియు ఆకు తేమను గమనించండి." : "Maintain current irrigation schedule and monitor leaf wetness.",
    });
  }

  if (temp >= 36) {
    out.push({
      label: locale === "te" ? "వేడి ఒత్తిడి ప్రమాదం" : "Heat stress risk",
      detail: locale === "te" ? "ఉదయాన్నే నీరు పెట్టండి మరియు వీలైన చోట మల్చింగ్ చేయండి." : "Irrigate early morning and apply mulch where possible.",
    });
  }

  if (!out.length) {
    out.push({
      label: locale === "te" ? "సాధారణ సలహా" : "General advisory",
      detail: locale === "te" ? "పొలాన్ని పరిశీలించి సిఫార్సు చేసిన పురుగుల పర్యవేక్షణను అనుసరించండి." : "Scout fields and follow recommended pest monitoring.",
    });
  }
  return out.slice(0, 3);
}

function FarmerWeatherPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const { locale } = useAppShell();

  const t = TRANSLATIONS[locale as "en" | "te"] || TRANSLATIONS.en;
  const session = getFarmerSession();
  const profile = session?.profile;

  const [forceKey, setForceKey] = useState(0);

  const { data } = useQuery({
    queryKey: ["weather-live", profile?.district, profile?.mandal, profile?.village, forceKey],
    queryFn: () => getWeatherLiveSummary(profile?.district, profile?.mandal, profile?.village),
    enabled: !!profile,
  });

  const advice = useMemo(() => {
    const temp = data?.temperature ?? 30;
    const rain = data?.rainfall_24h ?? 0;
    return weatherToAdvice(temp, rain, locale as "en" | "te");
  }, [data?.temperature, data?.rainfall_24h, locale]);

  if (!profile) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">{t.loginPrompt}</p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/farmers/login" as any })}>
          {t.login}
        </Button>
      </div>
    );
  }

  return (
    <div className={mobile ? "px-0" : "px-6"}>
      <PageHeader
        icon={<Leaf className="h-6 w-6 text-primary" />}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t.location}</div>
              <div className="mt-1 font-semibold">{profile.village}, {profile.mandal}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.updated}: {data?.updated_at ?? "--"}</div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Live</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Thermometer className="h-3.5 w-3.5"/> {t.temperature}</div>
              <div className="mt-1 text-sm font-semibold">{data?.temperature?.toFixed(1) ?? "--"} °C</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Droplets className="h-3.5 w-3.5"/> {t.humidity}</div>
              <div className="mt-1 text-sm font-semibold">{data?.humidity ?? "--"}%</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><CloudRain className="h-3.5 w-3.5"/> {t.rainfall}</div>
              <div className="mt-1 text-sm font-semibold">{data?.rainfall_24h ?? "--"} mm / 24h</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="h-3.5 w-3.5"/> {t.windSpeed}</div>
              <div className="mt-1 text-sm font-semibold">{data?.wind_speed ?? "--"} km/h</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setForceKey((k) => k + 1)}>
              <RefreshCcw className="h-4 w-4" /> {t.refresh}
            </Button>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <h3 className="font-semibold flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" /> {t.agriRec}
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

