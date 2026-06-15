import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { User, Phone, MapPin, Leaf, Settings2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDistricts, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";

import { clearFarmerSession, getFarmerSession, type FarmerProfile, setFarmerSession } from "@/lib/farmer-auth";
import { useAppShell } from "@/components/app-shell-store";

const TRANSLATIONS = {
  en: {
    eyebrow: "Profile",
    title: "Farmer details",
    description: "Manage your farmer & parcel information.",
    farmerId: "Farmer ID:",
    mobile: "Mobile",
    district: "District",
    selectDistrict: "Select District",
    mandal: "Mandal",
    selectMandal: "Select Mandal",
    village: "Village",
    selectVillage: "Select Village",
    surveyNumber: "Survey Number",
    cropType: "Crop Type",
    saveProfile: "Save profile",
    logout: "Logout",
    profileSaved: "Profile saved successfully!",
    pleaseLogin: "Please login to continue.",
    login: "Login",
  },
  te: {
    eyebrow: "ప్రొఫైల్",
    title: "రైతు వివరాలు",
    description: "మీ రైతు మరియు పొలం సమాచారాన్ని నిర్వహించండి.",
    farmerId: "రైతు ID:",
    mobile: "మొబైల్",
    district: "జిల్లా",
    selectDistrict: "జిల్లాను ఎంచుకోండి",
    mandal: "మండలం",
    selectMandal: "మండలాన్ని ఎంచుకోండి",
    village: "గ్రామం",
    selectVillage: "గ్రామాన్ని ఎంచుకోండి",
    surveyNumber: "సర్వే సంఖ్య",
    cropType: "పంట రకం",
    saveProfile: "ప్రొఫైల్ సేవ్ చేయి",
    logout: "లాగ్అవుట్",
    profileSaved: "ప్రొఫైల్ విజయవంతంగా సేవ్ చేయబడింది!",
    pleaseLogin: "దయచేసి కొనసాగడానికి లాగిన్ అవ్వండి.",
    login: "లాగిన్",
  }
};

export const Route = createFileRoute("/farmers/profile")({
  head: () => ({
    meta: [{ title: "Profile · Farmer App" }],
  }),
  component: FarmerProfilePage,
});

function FarmerProfilePage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const { locale } = useAppShell();
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const session = getFarmerSession();
  const profile = session?.profile ?? null;

  const [draft, setDraft] = useState<FarmerProfile | null>(() => profile);

  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  
  const { data: mandalGeoJson } = useQuery({
    queryKey: ["profile-mandals", draft?.district],
    queryFn: () =>
      fetch(`${API_BASE_URL}/api/map/mandals?district=${encodeURIComponent(draft?.district ?? "")}`).then((res) =>
        res.json(),
      ),
    enabled: !!draft?.district,
  });

  const mandals = useMemo<string[]>(() => {
    if (!mandalGeoJson?.features) return [];
    return Array.from(new Set(mandalGeoJson.features.map((f: any) => f.properties.sdtname as string))).sort() as string[];
  }, [mandalGeoJson]);

  const { data: villageGeoJson } = useQuery({
    queryKey: ["profile-villages", draft?.district, draft?.mandal],
    queryFn: () =>
      fetch(
        `${API_BASE_URL}/api/map/villages?district=${encodeURIComponent(
          draft?.district ?? "",
        )}&mandal=${encodeURIComponent(draft?.mandal ?? "")}`,
      ).then((res) => res.json()),
    enabled: !!draft?.district && !!draft?.mandal,
  });

  const villages = useMemo<string[]>(() => {
    if (!villageGeoJson?.features) return [];
    return Array.from(
      new Set(
        villageGeoJson.features
          .map((f: any) => (f.properties.vilname11 ?? f.properties.vilnam_soi) as string)
          .filter((name: any): name is string => Boolean(name)),
      ),
    ).sort() as string[];
  }, [villageGeoJson]);

  const canSave = useMemo(() => !!draft, [draft]);

  if (!profile || !draft) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">{t.pleaseLogin}</p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/farmers/login" as any })}>
          {t.login}
        </Button>
      </div>
    );
  }

  return (
    <div className={mobile ? "px-0" : "px-6"}>
      <PageHeader
        icon={<Settings2 className="h-6 w-6 text-primary" />}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 rounded-2xl bg-background/50 border-border/60">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <div className="font-semibold">{profile.farmerName}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t.farmerId} <span className="font-semibold text-primary">{profile.farmerId}</span></div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Local</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2"><Phone className="h-3.5 w-3.5"/> {t.mobile}</div>
              <Input value={draft.phoneNumber} onChange={(e) => setDraft({ ...draft, phoneNumber: e.target.value })} />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2"><MapPin className="h-3.5 w-3.5"/> {t.district}</div>
              <Select
                value={draft.district}
                onValueChange={(val) => setDraft({ ...draft, district: val, mandal: "", village: "" })}
              >
                <SelectTrigger className="w-full bg-background/50 border-border/60">
                  <SelectValue placeholder={t.selectDistrict} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">{t.mandal}</div>
              <Select
                value={draft.mandal}
                onValueChange={(val) => setDraft({ ...draft, mandal: val, village: "" })}
                disabled={!draft.district}
              >
                <SelectTrigger className="w-full bg-background/50 border-border/60">
                  <SelectValue placeholder={t.selectMandal} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {mandals.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">{t.village}</div>
              <Select
                value={draft.village}
                onValueChange={(val) => setDraft({ ...draft, village: val })}
                disabled={!draft.mandal}
              >
                <SelectTrigger className="w-full bg-background/50 border-border/60">
                  <SelectValue placeholder={t.selectVillage} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {villages.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">{t.surveyNumber}</div>
              <Input value={draft.surveyNumber} onChange={(e) => setDraft({ ...draft, surveyNumber: e.target.value })} />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2"><Leaf className="h-3.5 w-3.5"/> {t.cropType}</div>
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
                toast.success(t.profileSaved);
              }}
            >
              {t.saveProfile}
            </Button>
          </div>

          <div className="mt-3">
            <Button
              variant="outline"
              className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                clearFarmerSession();
                navigate({ to: "/farmers" as any, replace: true });
              }}
            >
              {t.logout}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}




