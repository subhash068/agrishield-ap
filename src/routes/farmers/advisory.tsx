import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Megaphone, Leaf, ShieldCheck, Droplets, FlaskConical } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

import { getFarmerSession } from "@/lib/farmer-auth";
import { useQuery } from "@tanstack/react-query";
import { getFertilizerRecommendation } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppShell } from "@/components/app-shell-store";

export const Route = createFileRoute("/farmers/advisory")({
  head: () => ({
    meta: [{ title: "Advisory · Farmer App" }],
  }),
  component: FarmerAdvisoryPage,
});

const TRANSLATIONS = {
  en: {
    eyebrow: "Advisory Center",
    title: "Actionable advisory",
    description: "Practical pest/disease/irrigation guidance generated for your parcel.",
    parcel: "Parcel",
    forThisWeek: "For this week",
    cropReminder: "Your crop reminder",
    cropReminderDetail: "Crop: {crop}. Follow the advisory steps and update field observations in Reports.",
    aiFertPlan: "AI Fertilizer Plan",
    recommended: "Recommended",
    dosage: "Dosage",
    timingMethod: "Timing & Method",
    scientificBasis: "Scientific Basis",
    loginPrompt: "Please login to continue.",
    login: "Login",
    disease: "Disease",
    weather: "Weather",
    pest: "Pest",
    diseasePrevTitle: "Disease prevention (next 48 hours)",
    diseasePrevDetail: "Inspect leaves daily and apply recommended fungicide only in affected patches.",
    weatherIrrigTitle: "Weather-based irrigation",
    weatherIrrigDetail: "If rain is expected, avoid unnecessary irrigation and ensure drainage to prevent water stress.",
    pestMonitorTitle: "Pest monitoring",
    pestMonitorDetail: "Use pheromone traps / scouting for early detection and avoid broad-spectrum spraying.",
  },
  te: {
    eyebrow: "సలహా కేంద్రం",
    title: "ఆచరణాత్మక సలహా",
    description: "మీ పొలం కోసం ప్రత్యేకంగా రూపొందించిన తెగులు/వ్యాధి/నీటి యాజమాన్య సూచనలు.",
    parcel: "పొలం",
    forThisWeek: "ఈ వారం కొరకు",
    cropReminder: "మీ పంట రిమైండర్",
    cropReminderDetail: "పంట: {crop}. సలహా దశలను అనుసరించండి మరియు నివేదికలలో పొలంలో గమనించిన వివరాలను నవీకరించండి.",
    aiFertPlan: "AI ఎరువుల ప్రణాళిక",
    recommended: "సిఫార్సు చేయబడినది",
    dosage: "మోతాదు",
    timingMethod: "సమయం & విధానం",
    scientificBasis: "శాస్త్రీయ ఆధారం",
    loginPrompt: "దయచేసి లాగిన్ అవ్వండి.",
    login: "లాగిన్",
    disease: "తెగులు",
    weather: "వాతావరణం",
    pest: "పురుగు",
    diseasePrevTitle: "తెగులు నివారణ (తదుపరి 48 గంటలు)",
    diseasePrevDetail: "ప్రతిరోజూ ఆకులను పరిశీలించండి మరియు సోకిన ప్రాంతాలలో మాత్రమే సిఫార్సు చేసిన తెగులు మందును వాడండి.",
    weatherIrrigTitle: "వాతావరణ ఆధారిత నీటి పారుదల",
    weatherIrrigDetail: "వర్షం పడే అవకాశం ఉంటే, అనవసరంగా నీరు పెట్టడం నివారించండి మరియు నీరు నిలవకుండా డ్రైనేజీ చూసుకోండి.",
    pestMonitorTitle: "పురుగుల పర్యవేక్షణ",
    pestMonitorDetail: "ముందస్తు గుర్తింపు కోసం ఫెరోమోన్ ట్రాప్స్ / నిరంతర నిఘా ఉపయోగించండి మరియు సాధారణ మందుల పిచికారీని నివారించండి.",
  }
};

type AdvisoryItem = {
  title: string;
  tone: "warning" | "info" | "primary";
  icon: React.ReactNode;
  detail: string;
};

function FarmerAdvisoryPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const session = getFarmerSession();
  const profile = session?.profile;
  const { locale } = useAppShell();

  const t = TRANSLATIONS[locale as "en" | "te"] || TRANSLATIONS.en;

  const { data: fertReco, isLoading } = useQuery({
    queryKey: ["fertilizer-reco", profile?.cropType],
    queryFn: () => getFertilizerRecommendation({
      crop: profile?.cropType,
      soil_health: "Moderate",
      growth_stage: "Vegetative",
      weather_rainfall_mm: 50,
      satellite_unified_health_index_pct: 65,
      satellite_abiotic_stress_score_pct: 40,
      satellite_soil_moisture_score_pct: 55,
      disease_risk: "High",
      pest_risk: "Medium",
    }),
    enabled: !!profile,
  });

  const items = useMemo<AdvisoryItem[]>(() => {
    if (!profile) return [];

    return [
      {
        title: t.diseasePrevTitle,
        tone: "primary",
        icon: <ShieldCheck className="h-4 w-4" />,
        detail: t.diseasePrevDetail,
      },
      {
        title: t.weatherIrrigTitle,
        tone: "info",
        icon: <Droplets className="h-4 w-4" />,
        detail: t.weatherIrrigDetail,
      },
      {
        title: t.pestMonitorTitle,
        tone: "warning",
        icon: <Megaphone className="h-4 w-4" />,
        detail: t.pestMonitorDetail,
      },
    ];
  }, [profile, t]);

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
        icon={<Megaphone className="h-6 w-6 text-warning" />}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t.parcel}</div>
              <div className="mt-1 font-semibold">{profile.parcelId}</div>
              <div className="text-xs text-muted-foreground mt-1">{profile.village} · Survey {profile.surveyNumber}</div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{t.forThisWeek}</Badge>
          </div>

          <div className="mt-3 grid gap-3">
            {items.map((it) => (
              <div key={it.title} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{it.icon}</div>
                    <div>
                      <div className="text-sm font-semibold">{it.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground leading-5">{it.detail}</div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      it.tone === "warning"
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : it.tone === "info"
                          ? "border-info/40 bg-info/10 text-info"
                          : "border-primary/30 bg-primary/10 text-primary"
                    }
                  >
                    {it.tone === "primary" ? t.disease : it.tone === "info" ? t.weather : t.pest}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            <div className="font-semibold">{t.cropReminder}</div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground leading-6">
            {t.cropReminderDetail.replace("{crop}", profile.cropType)}
          </div>
        </Card>

        {isLoading && (
          <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
             <Skeleton className="h-6 w-1/2 mb-3" />
             <Skeleton className="h-4 w-full mb-2" />
             <Skeleton className="h-4 w-3/4" />
          </Card>
        )}

        {fertReco && (
          <Card className="p-4 rounded-2xl bg-background/50 border-border/60 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FlaskConical className="w-24 h-24" />
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="font-semibold text-base">{t.aiFertPlan}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-border/60 bg-background p-3">
                 <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{t.recommended}</div>
                 <div className="font-medium text-sm text-foreground">{fertReco.fertilizer_name}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background p-3">
                 <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{t.dosage}</div>
                 <div className="font-semibold text-sm text-primary">{fertReco.dosage_kg_per_acre} kg/acre</div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background p-3 mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{t.timingMethod}</div>
                <div className="font-medium text-xs text-foreground">{fertReco.timing}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{fertReco.application_method}</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground leading-5 bg-muted/30 p-3 rounded-xl border border-border/40">
              <span className="font-medium text-foreground">{t.scientificBasis}:</span> {fertReco.reason}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

