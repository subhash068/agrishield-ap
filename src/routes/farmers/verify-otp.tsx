import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, ShieldCheck, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getOtpChallenge,
  getFarmerSession,
  setFarmerSession,
  clearOtpChallenge,
} from "@/lib/farmer-auth";
import { generateFarmerId, generateParcelId } from "@/lib/farmer-id";

export const Route = createFileRoute("/farmers/verify-otp")({
  head: () => ({
    meta: [
      { title: "Verify OTP · AgriShield AP" },
      { name: "description", content: "Verify farmer OTP (mock)." },
    ],
  }),
  component: VerifyOtpPage,
});

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function VerifyOtpPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const challenge = getOtpChallenge();
  const phoneNumber = challenge?.phoneNumber ?? "";

  const canVerify = useMemo(() => {
    return !!challenge && onlyDigits(code).length === 6;
  }, [challenge, code]);

  const verify = async () => {
    if (!challenge) return;
    setVerifying(true);

    const ok = onlyDigits(code) === onlyDigits(challenge.code);

    setTimeout(() => {
      if (!ok) {
        setVerifying(false);
        return;
      }

      // We don’t have backend OTP yet. For now, create a demo profile.
      const district = "Krishna";
      const mandal = "Kankipadu";
      const village = "Kankipadu";
      const farmerName = "Demo Farmer";
      const surveyNumber = "123/4";
      const cropType = "Paddy";
      const landAreaAcres = 1.5;

      const farmerId = generateFarmerId({
        district,
        mandal,
        village,
        phoneNumber,
        farmerName,
      });

      const parcelId = generateParcelId({
        district,
        mandal,
        village,
        surveyNumber,
        cropType,
      });

      setFarmerSession({
        createdAt: Date.now(),
        profile: {
          farmerId,
          parcelId,
          farmerName,
          phoneNumber,
          district,
          mandal,
          village,
          surveyNumber,
          cropType,
          landAreaAcres,
        },
      });

      clearOtpChallenge();
      setVerifying(false);
      navigate({ to: "/farmers" as any, replace: true });
    }, 600);
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Verify OTP</h1>
          <p className="text-xs text-muted-foreground mt-1">Phone: {phoneNumber || "—"}</p>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Mock
        </Badge>
      </div>

      <Card className="p-5 rounded-2xl">
        <div className="space-y-4">
          {!challenge ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              No active OTP challenge. Go back and request OTP again.
            </div>
          ) : null}

          <label className="block">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> OTP Code
            </div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="6-digit"
              className="mt-2"
            />
            {challenge ? (
              <div className="mt-2 text-[11px] text-muted-foreground">
                Demo OTP (for you):{" "}
                <span className="font-semibold text-primary">{challenge.code}</span>
              </div>
            ) : null}
          </label>

          <Button
            className="w-full rounded-xl"
            disabled={!canVerify || verifying || !challenge}
            onClick={verify}
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            <span className="ml-2">Verify & Continue</span>
          </Button>

          <div className="text-xs text-muted-foreground">OTP expires in 5 minutes.</div>
        </div>
      </Card>
    </div>
  );
}

