import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Leaf, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { generateFarmerId } from "@/lib/farmer-id";
import { generateParcelId } from "@/lib/farmer-id";
import { registerFarmer } from "@/lib/api";

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
          <h1 className="text-xl font-bold">Farmer Registration</h1>
          <p className="text-xs text-muted-foreground mt-1">Auto-generate IDs after entering land details.</p>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          <UserPlus className="h-3.5 w-3.5" /> Mock
        </Badge>
      </div>

      <Card className="p-5 rounded-2xl">
        <div className="space-y-4">
          <label className="block">
            <div className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Farmer Name
            </div>
            <Input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} className="mt-2" />
          </label>

          <label className="block">
            <div className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-primary/20 text-primary grid place-items-center">☎</span>
              Mobile Number
            </div>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              inputMode="tel"
              placeholder="10-digit mobile"
              className="mt-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-muted-foreground">District</div>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1" />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground">Mandal</div>
              <Input value={mandal} onChange={(e) => setMandal(e.target.value)} className="mt-1" />
            </label>
          </div>

          <label className="block">
            <div className="text-xs text-muted-foreground">Village</div>
            <Input value={village} onChange={(e) => setVillage(e.target.value)} className="mt-1" />
          </label>

          <label className="block">
            <div className="text-xs text-muted-foreground">Survey Number</div>
            <Input value={surveyNumber} onChange={(e) => setSurveyNumber(e.target.value)} className="mt-1" />
          </label>

          <label className="block">
            <div className="text-xs text-muted-foreground">Crop Type</div>
            <Select value={cropType} onValueChange={(v) => setCropType(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select crop" />
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
            <div className="text-xs text-muted-foreground">Land Area (Acres)</div>
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
                <span>Farmer ID</span>
                <span className="font-semibold text-primary">{previewIds.farmerId}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <span>Parcel ID</span>
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
            Continue to Login
          </Button>

          <div className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/farmers/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

