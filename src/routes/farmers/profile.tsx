import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { User, Phone, MapPin, Leaf, Settings2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

import { clearFarmerSession, getFarmerSession, type FarmerProfile, setFarmerSession } from "@/lib/farmer-auth";

export const Route = createFileRoute("/farmers/profile")({
  head: () => ({
    meta: [{ title: "Profile · Farmer App" }],
  }),
  component: FarmerProfilePage,
});

function FarmerProfilePage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();

  const session = getFarmerSession();
  const profile = session?.profile ?? null;

  const [draft, setDraft] = useState<FarmerProfile | null>(() => profile);

  const canSave = useMemo(() => !!draft, [draft]);

  if (!profile || !draft) {
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
        icon={<Settings2 className="h-6 w-6 text-primary" />}
        eyebrow="Profile"
        title="Farmer details"
        description="Manage your farmer & parcel information."
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <div className="font-semibold">{profile.farmerName}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Farmer ID: <span className="font-semibold text-primary">{profile.farmerId}</span></div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Local</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2"><Phone className="h-3.5 w-3.5"/> Mobile</div>
              <Input value={draft.phoneNumber} onChange={(e) => setDraft({ ...draft, phoneNumber: e.target.value })} />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2"><MapPin className="h-3.5 w-3.5"/> District</div>
              <Input value={draft.district} onChange={(e) => setDraft({ ...draft, district: e.target.value })} />
            </label>

            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Mandal</div>
              <Input value={draft.mandal} onChange={(e) => setDraft({ ...draft, mandal: e.target.value })} />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Village</div>
              <Input value={draft.village} onChange={(e) => setDraft({ ...draft, village: e.target.value })} />
            </label>

            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Survey Number</div>
              <Input value={draft.surveyNumber} onChange={(e) => setDraft({ ...draft, surveyNumber: e.target.value })} />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2"><Leaf className="h-3.5 w-3.5"/> Crop Type</div>
              <Input value={draft.cropType} onChange={(e) => setDraft({ ...draft, cropType: e.target.value })} />
            </label>
          </div>

          <div className="mt-4">
            <Button
              className="w-full rounded-xl"
              disabled={!canSave}
              onClick={() => {
                if (!draft || !session) return;
                setFarmerSession({ ...session, profile: draft });
              }}
            >
              Save profile
            </Button>
          </div>

          <div className="mt-3">
            <Button
              variant="outline"
              className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                clearFarmerSession();
                navigate({ to: "/farmers" as any, replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}




