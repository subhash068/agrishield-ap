import { createFileRoute } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";

export const Route = createFileRoute("/government")({
  head: () => ({ meta: [{ title: "Government Dashboard · AgriShield AP" }, { name: "description", content: "Executive view for the Department of Agriculture, Government of Andhra Pradesh." }] }),
  component: () => (
    <div>
      <PageHeader icon={<Landmark className="h-6 w-6 text-accent" />} eyebrow="Department of Agriculture" title="Executive Government Dashboard"
        description="Hon'ble Minister view · Commissioner view · cross-department KPIs." />
      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Annual Outlay (Cr)" value={12_450} unit="" trend={4.1} confidence={98} index={0} />
          <KpiCard label="Farmers Benefitted" value={3_904_212} unit="" trend={2.6} confidence={96} index={1} />
          <KpiCard label="Crop Loss Averted (Cr)" value={1_864} unit="" trend={9.1} confidence={92} index={2} />
          <KpiCard label="Schemes Active" value={47} unit="" trend={1.0} confidence={100} index={3} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Commissioner's brief</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Statewide crop health improved 1.8% MoM. Bollworm outbreak in Guntur contained through
              rapid bio-control deployment. Rayalaseema drought watch escalated to amber.
              Recommend supplementary irrigation allocation of ₹220 Cr.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Cross-department sync</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>APRTGS</span><span className="text-success">Synced</span></li>
              <li className="flex justify-between"><span>Revenue Dept · Land records</span><span className="text-success">Synced</span></li>
              <li className="flex justify-between"><span>IMD weather feed</span><span className="text-success">Live</span></li>
              <li className="flex justify-between"><span>NRSC satellite ingest</span><span className="text-success">99.2%</span></li>
              <li className="flex justify-between"><span>PMFBY insurance API</span><span className="text-warning">Degraded</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
});
