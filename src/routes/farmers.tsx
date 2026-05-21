import { createFileRoute } from "@tanstack/react-router";
import { Users, BadgeCheck, ShieldCheck, Tractor, Camera, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/farmers")({
  head: () => ({ meta: [{ title: "Farmer Services · AgriShield AP" }, { name: "description", content: "Telugu-first farmer portal: scheme eligibility, subsidies, insurance and AI diagnostics." }] }),
  component: () => (
    <div>
      <PageHeader icon={<Users className="h-6 w-6 text-primary" />} eyebrow="Farmer Portal · రైతు సేవలు" title="Farmer Services"
        description="Mobile-first, multilingual services for every registered farmer." />
      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-3">Check eligibility · అర్హత తనిఖీ</h3>
          <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <Input placeholder="Aadhaar / Farmer ID" className="bg-muted/40" />
            <Button>Check</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: BadgeCheck, title: "YSR Rythu Bharosa", status: "Eligible", sub: "₹13,500 / yr" },
            { icon: ShieldCheck, title: "Crop Insurance (PMFBY)", status: "Enrolled", sub: "Coverage active" },
            { icon: Tractor, title: "Micro Irrigation Subsidy", status: "Apply", sub: "90% subsidy" },
            { icon: Camera, title: "AI Crop Diagnostics", status: "Use", sub: "Upload field photo" },
          ].map(s => (
            <div key={s.title} className="glass rounded-xl p-5 hover:glow-primary transition">
              <s.icon className="h-6 w-6 text-primary" />
              <h4 className="mt-3 font-semibold">{s.title}</h4>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
              <Badge variant="outline" className="mt-3 border-success/40 text-success bg-success/10">{s.status}</Badge>
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4 text-accent" /> Upload field photo · పంట ఫోటో అప్‌లోడ్</h3>
          <div className="rounded-xl border-2 border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Drop photo here or tap to capture — AI will analyse within seconds.
          </div>
        </div>
      </div>
    </div>
  ),
});
