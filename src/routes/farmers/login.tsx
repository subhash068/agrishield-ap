import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, ShieldCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOtpChallenge, saveOtpChallenge } from "@/lib/farmer-auth";
import { useAppShell } from "@/components/app-shell-store";

const TRANSLATIONS = {
  en: {
    title: "Farmer Login",
    eyebrow: "Enter mobile number to receive OTP.",
    mockOtp: "Mock OTP",
    mobileNumber: "Mobile Number",
    placeholder: "10-digit mobile",
    requestOtp: "Request OTP",
    noAccount: "Don’t have an account?",
    register: "Register",
    challengeExists: "OTP challenge exists (expires in a few minutes). Verify it on the next screen.",
  },
  te: {
    title: "రైతు లాగిన్",
    eyebrow: "ఓటీపీ పొందడానికి మొబైల్ సంఖ్యను నమోదు చేయండి.",
    mockOtp: "మాక్ ఓటీపీ",
    mobileNumber: "మొబైల్ సంఖ్య",
    placeholder: "10-అంకెల మొబైల్",
    requestOtp: "ఓటీపీని అభ్యర్థించు",
    noAccount: "ఖాతా లేదా?",
    register: "నమోదు చేసుకోండి",
    challengeExists: "ఓటీపీ ఛాలెంజ్ ఉంది (కొన్ని నిమిషాల్లో ముగుస్తుంది). తదుపరి స్క్రీన్‌లో ధృవీకరించండి.",
  }
};

export const Route = createFileRoute("/farmers/login")({
  head: () => ({
    meta: [
      { title: "Farmer Login · AgriShield AP" },
      { name: "description", content: "Login to the Farmer App using OTP." },
    ],
  }),
  component: LoginPage,
});

function normalizePhone(p: string) {
  // keep digits only; demo expects last 10 digits
  return p.replace(/\D/g, "").slice(-10);
}

function LoginPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const { locale } = useAppShell();
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const canRequest = useMemo(() => normalizePhone(phone).length === 10, [phone]);

  const requestOtp = async () => {
    if (!canRequest) return;
    setSending(true);

    // Mock OTP: generate deterministic random-ish code from phone + time bucket.
    const normalized = normalizePhone(phone);
    const now = Date.now();
    const bucket = Math.floor(now / 30000);
    const code = ("" + ((bucket * 9301 + parseInt(normalized, 10)) % 1000000))
      .padStart(6, "0")
      .slice(0, 6);

    saveOtpChallenge({
      phoneNumber: normalized,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    setSending(false);

    navigate({
            to: "/farmers/verify-otp" as any,
      params: { phoneNumber: normalized } as any,
    });
  };


  return (
    <div className={mobile ? "px-4" : "px-10"}>
      <div className="max-w-md mx-auto py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t.eyebrow}
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {t.mockOtp}
          </Badge>
        </div>

        <Card className="p-5 rounded-2xl">
          <div className="space-y-4">
            <label className="block">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4 text-primary" /> {t.mobileNumber}
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder={t.placeholder}
                className="mt-2"
              />
            </label>

            <Button onClick={requestOtp} disabled={!canRequest || sending} className="w-full rounded-xl">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span className="ml-2">{t.requestOtp}</span>
            </Button>

            <div className="text-xs text-muted-foreground">
              {t.noAccount}{' '}
              <Link to="/farmers/register" className="text-primary hover:underline">
                {t.register}
              </Link>
            </div>

            {getOtpChallenge() ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                {t.challengeExists}
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

