import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, ShieldCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOtpChallenge, saveOtpChallenge } from "@/lib/farmer-auth";

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
            <h1 className="text-xl font-bold">Farmer Login</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Enter mobile number to receive OTP.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            Mock OTP
          </Badge>
        </div>

        <Card className="p-5 rounded-2xl">
          <div className="space-y-4">
            <label className="block">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4 text-primary" /> Mobile Number
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="10-digit mobile"
                className="mt-2"
              />
            </label>

            <Button onClick={requestOtp} disabled={!canRequest || sending} className="w-full rounded-xl">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span className="ml-2">Request OTP</span>
            </Button>

            <div className="text-xs text-muted-foreground">
              Don’t have an account?{' '}
              <Link to="/farmers/register" className="text-primary hover:underline">
                Register
              </Link>
            </div>

            {getOtpChallenge() ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                OTP challenge exists (expires in a few minutes). Verify it on the next screen.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

