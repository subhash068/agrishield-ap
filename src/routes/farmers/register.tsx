import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Leaf, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppShell } from "@/components/app-shell-store";

import { generateFarmerId } from "@/lib/farmer-id";
import { generateParcelId } from "@/lib/farmer-id";
import { registerFarmer } from "@/lib/api";

const TRANSLATIONS = {
  en: {
    title: "Farmer Registration",
    eyebrow: "Auto-generate IDs after entering land details.",
    mock: "Mock",
    farmerName: "Farmer Name",
    mobileNumber: "Mobile Number",
    placeholderMobile: "10-digit mobile",
    district: "District",
    mandal: "Mandal",
    village: "Village",
    surveyNumber: "Survey Number",
    cropType: "Crop Type",
    selectCrop: "Select crop",
    landArea: "Land Area (Acres)",
    farmerId: "Farmer ID",
    parcelId: "Parcel ID",
    continueToLogin: "Continue to Login",
    alreadyAccount: "Already have an account?",
    login: "Login",
  },
  te: {
    title: "రైతు నమోదు",
    eyebrow: "భూమి వివరాలను నమోదు చేసిన తర్వాత ఐడీలు స్వయంచాలకంగా ఉత్పత్తి చేయబడతాయి.",
    mock: "మాక్",
    farmerName: "రైతు పేరు",
    mobileNumber: "మొబైల్ సంఖ్య",
    placeholderMobile: "10-అంకెల మొబైల్",
    district: "జిల్లా",
    mandal: "మండలం",
    village: "గ్రామం",
    surveyNumber: "సర్వే సంఖ్య",
    cropType: "పంట రకం",
    selectCrop: "పంటను ఎంచుకోండి",
    landArea: "భూమి విస్తీర్ణం (ఎకరాలు)",
    farmerId: "రైతు ఐడీ",
    parcelId: "పొలం ఐడీ",
    continueToLogin: "లాగిన్‌కు కొనసాగండి",
    alreadyAccount: "ఇప్పటికే ఖాతా ఉందా?",
    login: "లాగిన్",
  }
};

export const Route = createFileRoute("/farmers/register")({
  head: () => ({
    meta: [
      { title: "Farmer Register · AgriShield AP" },
      { name: "description", content: "Register farmer profile and land details." },
    ],
  }),
  component: RegisterPage,
});

const crops = ["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const { locale } = useAppShell();
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const [farmerName, setFarmerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [district, setDistrict] = useState("Krishna");
  const [mandal, setMandal] = useState("Kankipadu");
  const [village, setVillage] = useState("Kankipadu");

  const [surveyNumber, setSurveyNumber] = useState("123/4");
  const [cropType, setCropType] = useState<(typeof crops)[number]>("Paddy");
  const [landAreaAcres, setLandAreaAcres] = useState<number>(1.5);

  const canGenerate = useMemo(() => farmerName.trim().length >= 2 && phoneNumber.trim().length >= 10, [farmerName, phoneNumber]);

  const previewIds = useMemo(() => {
    if (!canGenerate) return null;
    const farmerId = generateFarmerId({
      district,
      mandal,
      village,
      phoneNumber: phoneNumber.replace(/\D/g, "").slice(-10),
      farmerName,
    });
    const parcelId = generateParcelId({
      district,
      mandal,
      village,
      surveyNumber,
      cropType,
    });
    return { farmerId, parcelId };
  }, [canGenerate, district, mandal, village, phoneNumber, farmerName, surveyNumber, cropType]);

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t.eyebrow}</p>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          <UserPlus className="h-3.5 w-3.5" /> {t.mock}
        </Badge>
      </div>

      <Card className="p-5 rounded-2xl">
        <div className="space-y-4">
          <label className="block">
            <div className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> {t.farmerName}
            </div>
            <Input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} className="mt-2" />
          </label>

          <label className="block">
            <div className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-primary/20 text-primary grid place-items-center">☎</span>
              {t.mobileNumber}
            </div>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              inputMode="tel"
              placeholder={t.placeholderMobile}
              className="mt-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-muted-foreground">{t.district}</div>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1" />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground">{t.mandal}</div>
              <Input value={mandal} onChange={(e) => setMandal(e.target.value)} className="mt-1" />
            </label>
          </div>

          <label className="block">
            <div className="text-xs text-muted-foreground">{t.village}</div>
            <Input value={village} onChange={(e) => setVillage(e.target.value)} className="mt-1" />
          </label>

          <label className="block">
            <div className="text-xs text-muted-foreground">{t.surveyNumber}</div>
            <Input value={surveyNumber} onChange={(e) => setSurveyNumber(e.target.value)} className="mt-1" />
          </label>

          <label className="block">
            <div className="text-xs text-muted-foreground">{t.cropType}</div>
            <Select value={cropType} onValueChange={(v) => setCropType(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t.selectCrop} />
              </SelectTrigger>
              <SelectContent>
                {crops.map((c) => (
                  <SelectItem value={c} key={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block">
            <div className="text-xs text-muted-foreground">{t.landArea}</div>
            <Input
              value={landAreaAcres}
              onChange={(e) => setLandAreaAcres(Number(e.target.value))}
              type="number"
              step="0.1"
              className="mt-1"
            />
          </label>

          {previewIds ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>{t.farmerId}</span>
                <span className="font-semibold text-primary">{previewIds.farmerId}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <span>{t.parcelId}</span>
                <span className="font-semibold text-primary">{previewIds.parcelId}</span>
              </div>
            </div>
          ) : null}

          <Button
            className="w-full rounded-xl"
            disabled={!canGenerate}
            onClick={async () => {
              if (previewIds) {
                try {
                  await registerFarmer({
                    farmer_name: farmerName,
                    phone_number: phoneNumber,
                    district,
                    mandal,
                    village,
                    survey_number: surveyNumber,
                    crop_type: cropType,
                    land_area_acres: landAreaAcres,
                    parcel_id: previewIds.parcelId,
                  });
                } catch (e) {
                  console.error("Failed to register farmer", e);
                }
              }
              navigate({ to: "/farmers" as any });
            }}
          >
            {t.continueToLogin}
          </Button>

          <div className="text-xs text-muted-foreground">
            {t.alreadyAccount}{" "}
            <Link to="/farmers/login" className="text-primary hover:underline">
              {t.login}
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

