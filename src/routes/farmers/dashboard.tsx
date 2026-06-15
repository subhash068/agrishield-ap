import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Leaf, Map, ShieldCheck, LayoutGrid } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { getFarmerSession } from "@/lib/farmer-auth";
import { useAppShell } from "@/components/app-shell-store";

export const Route = createFileRoute("/farmers/dashboard")({
  head: () => ({
    meta: [{ title: "My Farm · Farmer App" }],
  }),
  component: FarmerDashboard,
});

const TRANSLATIONS = {
  en: {
    eyebrow: "My Farm",
    title: "Crop Health Dashboard",
    description: "Unified crop health score and your parcel details.",
    parcelId: "Parcel ID",
    crop: "Crop",
    area: "Area",
    acres: "acres",
    scanDisease: "Scan Disease",
    liveWeather: "Live Weather",
    loginPrompt: "Please login to continue.",
    cropHealthScore: "Crop Health Score",
  },
  te: {
    eyebrow: "నా పొలం",
    title: "పంట ఆరోగ్య డాష్‌బోర్డ్",
    description: "ఏకీకృత పంట ఆరోగ్య స్కోరు మరియు మీ పొలం వివరాలు.",
    parcelId: "పొలం ID",
    crop: "పంట",
    area: "విస్తీర్ణం",
    acres: "ఎకరాలు",
    scanDisease: "తెగులు స్కాన్",
    liveWeather: "లైవ్ వాతావరణం",
    loginPrompt: "దయచేసి లాగిన్ అవ్వండి.",
    cropHealthScore: "పంట ఆరోగ్య స్కోరు",
  }
};

function scoreToTier(score: number, locale: "en" | "te") {
  if (score >= 80) {
    return {
      label: locale === "te" ? "ఆరోగ్యకరమైనది" : "Healthy",
      color: "bg-success/15 text-success border-success/30",
      iconTone: "text-success",
    };
  }
  if (score >= 60) {
    return {
      label: locale === "te" ? "మధ్యస్థ ఒత్తిడి" : "Moderate Stress",
      color: "bg-info/15 text-info border-info/30",
      iconTone: "text-info",
    };
  }
  return {
    label: locale === "te" ? "అధిక ప్రమాదం" : "High Risk",
    color: "bg-destructive/15 text-destructive border-destructive/30",
    iconTone: "text-destructive",
  };
}

function FarmerDashboard() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const session = getFarmerSession();
  const { locale } = useAppShell();

  const t = TRANSLATIONS[locale as "en" | "te"] || TRANSLATIONS.en;
  const profile = session?.profile;

  const cropHealthScore = useMemo(() => {
    // mock score (later connect to satellite health index)
    const base = 50;
    const hash = (profile?.farmerId ?? "").length * 7 + (profile?.parcelId ?? "").length * 3;
    return Math.min(98, Math.max(38, base + (hash % 55)));
  }, [profile?.farmerId, profile?.parcelId]);

  const tier = scoreToTier(cropHealthScore, locale as "en" | "te");

  if (!profile) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">{t.loginPrompt}</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4">
      <PageHeader
        icon={<LayoutGrid className="h-6 w-6 text-primary" />}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className={mobile ? "" : "max-w-xl mx-auto"}>
        <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t.parcelId}</p>
              <p className="mt-1 font-semibold text-primary">{profile.parcelId}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {profile.village} · Survey {profile.surveyNumber}
              </p>
            </div>
            <Badge className={tier.color} variant="outline">
              {tier.label}
            </Badge>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Leaf className={`h-4 w-4 ${tier.iconTone}`} /> {t.cropHealthScore}
              </p>
              <p className="text-sm font-bold tabular-nums">{cropHealthScore}/100</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${cropHealthScore}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Map className="h-3.5 w-3.5" /> {t.crop}
              </div>
              <div className="mt-1 font-semibold">{profile.cropType}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> {t.area}
              </div>
              <div className="mt-1 font-semibold">{profile.landAreaAcres} {t.acres}</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <Button size="sm" className="rounded-xl" onClick={() => navigate({ to: "/farmers/scan" as any })}>
              {t.scanDisease}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-accent/40 hover:bg-accent/10"
              onClick={() => navigate({ to: "/farmers/weather" as any })}
            >
              {t.liveWeather}
            </Button>
          </div>
        </div>

        {/* TODO: Satellite Monitoring + Map layers can be implemented later */}
      </div>
    </div>
  );
}
