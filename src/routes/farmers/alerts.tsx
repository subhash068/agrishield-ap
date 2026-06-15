import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bell, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

import { getAlerts } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { getFarmerSession } from "@/lib/farmer-auth";
import { useAppShell } from "@/components/app-shell-store";

export const Route = createFileRoute("/farmers/alerts")({
  head: () => ({
    meta: [{ title: "Alerts · Farmer App" }],
  }),
  component: FarmerAlertsPage,
});

const TRANSLATIONS = {
  en: {
    eyebrow: "Alert Center",
    title: "Your latest alerts",
    description: "Satellite, disease, weather, and pest alerts delivered to your district.",
    loadingAlerts: "Loading alerts...",
    noAlerts: "No alerts yet for {district}.",
    loginPrompt: "Please login to continue.",
    login: "Login",
  },
  te: {
    eyebrow: "హెచ్చరికల కేంద్రం",
    title: "మీ తాజా హెచ్చరికలు",
    description: "మీ జిల్లాకు చేరవేయబడిన శాటిలైట్, తెగులు, వాతావరణ మరియు చీడపీడల హెచ్చరికలు.",
    loadingAlerts: "హెచ్చరికలు లోడ్ అవుతున్నాయి...",
    noAlerts: "{district} కి ఇంకా ఎలాంటి హెచ్చరికలు లేవు.",
    loginPrompt: "దయచేసి లాగిన్ అవ్వండి.",
    login: "లాగిన్",
  }
};

function severityClass(sev: string) {
  if (sev === "Critical") return "border-destructive/40 text-destructive bg-destructive/10";
  if (sev === "High") return "border-warning/40 text-warning bg-warning/10";
  if (sev === "Medium") return "border-info/40 text-info bg-info/10";
  return "border-success/40 text-success bg-success/10";
}

function FarmerAlertsPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const session = getFarmerSession();
  const profile = session?.profile;
  const { locale } = useAppShell();

  const t = TRANSLATIONS[locale as "en" | "te"] || TRANSLATIONS.en;

  const { data: alerts = [], isLoading } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });

  const filtered = useMemo(() => {
    if (!profile) return alerts;
    return alerts.filter((a) => a.district === profile.district);
  }, [alerts, profile?.district]);

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
        icon={<Bell className="h-6 w-6 text-primary" />}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            {t.loadingAlerts}
          </div>
        ) : filtered.length ? (
          <div className="space-y-2">
            {filtered.slice(0, 12).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border/60 bg-background/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-warning" />
                      <p className="text-sm font-semibold">{alert.type}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.crop} · {alert.district} · {alert.time}
                    </p>
                    <p className="mt-2 text-sm">{alert.action}</p>
                  </div>
                  <Badge variant="outline" className={severityClass(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {t.noAlerts.replace("{district}", profile.district)}
          </div>
        )}
      </div>
    </div>
  );
}




