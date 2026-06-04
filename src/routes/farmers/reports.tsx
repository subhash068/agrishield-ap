import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Send, Leaf } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

import { getFarmerSession } from "@/lib/farmer-auth";

export const Route = createFileRoute("/farmers/reports")({
  head: () => ({
    meta: [{ title: "Reports · Farmer App" }],
  }),
  component: FarmerReportsPage,
});

function FarmerReportsPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const session = getFarmerSession();
  const profile = session?.profile;

  const [pestSeen, setPestSeen] = useState(false);
  const [diseaseSeen, setDiseaseSeen] = useState(false);
  const [notes, setNotes] = useState("");

  const canSubmit = useMemo(() => {
    return !!profile && (pestSeen || diseaseSeen || notes.trim().length > 0);
  }, [profile, pestSeen, diseaseSeen, notes]);

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
        icon={<FileText className="h-6 w-6 text-primary" />}
        eyebrow="Government Reporting"
        title="Field observation"
        description="Submit ground-truth observations to improve the models. (MVP: local only)"
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Parcel</div>
              <div className="mt-1 font-semibold">{profile.parcelId}</div>
              <div className="text-xs text-muted-foreground mt-1">{profile.village} · {profile.cropType}</div>
            </div>
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">MVP</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPestSeen((v) => !v)}
              className={
                pestSeen
                  ? "rounded-xl border border-success/50 bg-success/10 px-3 py-3 text-left"
                  : "rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-left"
              }
            >
              <div className="font-semibold text-sm">Pest seen</div>
              <div className="text-xs text-muted-foreground">Toggle</div>
            </button>

            <button
              type="button"
              onClick={() => setDiseaseSeen((v) => !v)}
              className={
                diseaseSeen
                  ? "rounded-xl border border-warning/50 bg-warning/10 px-3 py-3 text-left"
                  : "rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-left"
              }
            >
              <div className="font-semibold text-sm">Disease seen</div>
              <div className="text-xs text-muted-foreground">Toggle</div>
            </button>
          </div>

          <label className="mt-3 block">
            <div className="text-xs text-muted-foreground mb-1">Notes (optional)</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </label>

          <div className="mt-4">
            <Button disabled={!canSubmit} className="w-full gap-2 rounded-xl" onClick={() => {
              // MVP: no backend endpoint yet; store in localStorage could be added later.
              setNotes("");
              setPestSeen(false);
              setDiseaseSeen(false);
            }}>
              <Send className="h-4 w-4" /> Submit observation
            </Button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5" />
            Submission will sync when backend + offline queue are enabled.
          </div>
        </Card>
      </div>
    </div>
  );
}

export default FarmerReportsPage;


