import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Megaphone, Leaf, ShieldCheck, Droplets } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

import { getFarmerSession } from "@/lib/farmer-auth";

export const Route = createFileRoute("/farmers/advisory")({
  head: () => ({
    meta: [{ title: "Advisory · Farmer App" }],
  }),
  component: FarmerAdvisoryPage,
});

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

  const items = useMemo<AdvisoryItem[]>(() => {
    if (!profile) return [];

    // MVP: convert alert heuristics to actionable advisories.
    return [
      {
        title: "Disease prevention (next 48 hours)",
        tone: "primary",
        icon: <ShieldCheck className="h-4 w-4" />,
        detail: "Inspect leaves daily and apply recommended fungicide only in affected patches.",
      },
      {
        title: "Weather-based irrigation",
        tone: "info",
        icon: <Droplets className="h-4 w-4" />,
        detail: "If rain is expected, avoid unnecessary irrigation and ensure drainage to prevent water stress.",
      },
      {
        title: "Pest monitoring",
        tone: "warning",
        icon: <Megaphone className="h-4 w-4" />,
        detail: "Use pheromone traps / scouting for early detection and avoid broad-spectrum spraying.",
      },
    ];
  }, [profile]);

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
        icon={<Megaphone className="h-6 w-6 text-warning" />}
        eyebrow="Advisory Center"
        title="Actionable advisory"
        description="Practical pest/disease/irrigation guidance generated for your parcel."
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Parcel</div>
              <div className="mt-1 font-semibold">{profile.parcelId}</div>
              <div className="text-xs text-muted-foreground mt-1">{profile.village} · Survey {profile.surveyNumber}</div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">For this week</Badge>
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
                    {it.tone === "primary" ? "Disease" : it.tone === "info" ? "Weather" : "Pest"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            <div className="font-semibold">Your crop reminder</div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground leading-6">
            Crop: <span className="font-semibold text-foreground">{profile.cropType}</span>. Follow the advisory steps and update field observations in Reports.
          </div>
        </Card>
      </div>
    </div>
  );
}

