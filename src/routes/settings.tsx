import { createFileRoute } from "@tanstack/react-router";
import { Settings as Cog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · AgriShield AP" }, { name: "description", content: "Platform configuration, notifications and integrations." }] }),
  component: () => (
    <div>
      <PageHeader icon={<Cog className="h-6 w-6 text-muted-foreground" />} eyebrow="Configuration" title="Settings" description="Notification preferences, language and integrations." />
      <div className="px-6 lg:px-10 py-6 grid lg:grid-cols-2 gap-5 max-w-5xl">
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Notifications</h3>
          {[
            ["Critical outbreak alerts", true],
            ["Daily intelligence digest", true],
            ["Weather anomaly warnings", true],
            ["Scheme disbursement updates", false],
          ].map(([l, v]) => (
            <div key={String(l)} className="flex items-center justify-between">
              <Label className="text-sm">{l}</Label>
              <Switch defaultChecked={v as boolean} />
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Integrations</h3>
          {[
            ["APRTGS sync", true],
            ["IMD weather feed", true],
            ["NRSC satellite ingest", true],
            ["PMFBY insurance API", false],
          ].map(([l, v]) => (
            <div key={String(l)} className="flex items-center justify-between">
              <Label className="text-sm">{l}</Label>
              <Switch defaultChecked={v as boolean} />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
});
