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

export const Route = createFileRoute("/farmers/alerts")({
  head: () => ({
    meta: [{ title: "Alerts · Farmer App" }],
  }),
  component: FarmerAlertsPage,
});

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

  const { data: alerts = [], isLoading } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });

  const filtered = useMemo(() => {
    if (!profile) return alerts;
    // Basic filter by district; later we can filter by parcel/village.
    return alerts.filter((a) => a.district === profile.district);
  }, [alerts, profile?.district]);

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
        icon={<Bell className="h-6 w-6 text-primary" />}
        eyebrow="Alert Center"
        title="Your latest alerts"
        description="Satellite, disease, weather, and pest alerts delivered to your district."
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            Loading alerts...
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
            No alerts yet for {profile.district}.
          </div>
        )}
      </div>
    </div>
  );
}




