import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareWarning, Send, Smartphone, Phone, Radio, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAlerts } from "@/lib/api";

export const Route = createFileRoute("/advisory")({
  head: () => ({
    meta: [
      { title: "Advisory System · AgriShield AP" },
      { name: "description", content: "Automated multilingual farmer advisories via SMS, mobile app and IVR." },
    ],
  }),
  component: AdvisoryPage,
});

function AdvisoryPage() {
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  return (
    <div>
      <PageHeader
        icon={<MessageSquareWarning className="h-6 w-6 text-warning" />}
        eyebrow="Advisory Engine"
        title="Automated Farmer Advisory System"
        description="Multilingual SMS · App push · IVR broadcasts — synced with AI alerts and weather intelligence."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        {/* delivery stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Advisories Sent (24h)", value: "84,210", channel: "Multi-channel" },
            { label: "SMS Delivered", value: "62,140", channel: "Telugu / English" },
            { label: "App Push", value: "18,440", channel: "AgriShield app" },
            { label: "IVR Calls", value: "3,630", channel: "Voice advisory" },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.channel}</p>
            </div>
          ))}
        </div>

        {/* alerts + simulated channels */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Recent Advisories</h3>
            <div className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{a.type}</span>
                        <Badge variant="outline" className={
                          a.severity === "Critical" ? "border-destructive/40 text-destructive bg-destructive/10" :
                          a.severity === "High" ? "border-warning/40 text-warning bg-warning/10" :
                          "border-info/40 text-info bg-info/10"
                        }>{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.crop} · {a.district} · {a.time}</p>
                      <p className="text-sm mt-2">{a.action}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 shrink-0"><Send className="h-3 w-3" /> Resend</Button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1 text-muted-foreground"><Smartphone className="h-3 w-3" /> SMS</span><span className="text-success flex items-center gap-0.5"><CheckCheck className="h-3 w-3" /> 98%</span></div>
                      <Progress value={98} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1 text-muted-foreground"><Radio className="h-3 w-3" /> App</span><span className="text-accent">74%</span></div>
                      <Progress value={74} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> IVR</span><span className="text-warning">52%</span></div>
                      <Progress value={52} className="h-1 mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* simulated phone */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-3">SMS preview · Telugu</h4>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 max-w-[280px] mx-auto">
                <div className="text-[10px] text-muted-foreground">AGRI-AP · Now</div>
                <p className="mt-1 text-sm leading-snug">
                  ⚠️ పత్తి పంటకు హాని: గుంటూరు జిల్లాలో పత్తి కాయతొలుచు పురుగు ఉధృతం. వెంటనే
                  Imamectin benzoate స్ప్రే చేయండి. వివరాలకు 1907.
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-4 text-xs">
              <h4 className="font-semibold text-sm mb-2">Channel mix</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• SMS — primary, all 4.2M farmers</li>
                <li>• AgriShield mobile app — 1.6M MAU</li>
                <li>• IVR voice broadcast — low-literacy regions</li>
                <li>• RSK noticeboards — village-level escalation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
