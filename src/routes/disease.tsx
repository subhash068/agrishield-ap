import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, Upload, Camera, MapPin, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DISEASES } from "@/lib/mock-data";

export const Route = createFileRoute("/disease")({
  head: () => ({
    meta: [
      { title: "AI Disease Detection · AgriShield AP" },
      { name: "description", content: "Upload crop images for AI-powered disease classification, severity analysis and treatment recommendations." },
    ],
  }),
  component: DiseasePage,
});

function DiseasePage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<typeof DISEASES[number] & { confidence: number } | null>(null);

  const runScan = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      const d = DISEASES[Math.floor(Math.random() * DISEASES.length)];
      setResult({ ...d, confidence: 88 + Math.floor(Math.random() * 11) });
      setScanning(false);
    }, 2400);
  };

  return (
    <div>
      <PageHeader
        icon={<ScanLine className="h-6 w-6 text-primary" />}
        eyebrow="AI Diagnostics"
        title="AI Crop Disease Detection"
        description="Drop a field image — our vision model classifies disease, scores severity and routes the farmer to the nearest support center."
      />

      <div className="px-6 lg:px-10 py-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* upload + preview */}
        <div className="glass rounded-xl p-6">
          <div
            className={`relative aspect-[4/3] rounded-xl border-2 border-dashed transition overflow-hidden ${
              scanning ? "border-primary glow-primary scanline" : "border-border/60 hover:border-primary/50"
            } bg-gradient-to-br from-muted/30 to-background grid place-items-center`}
          >
            <div className="text-center px-6">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 grid place-items-center mb-3">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Drop crop image to analyse</p>
              <p className="text-xs text-muted-foreground mt-1">PNG / JPG · Max 10MB · GPS-tagged preferred</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" className="gap-1.5" onClick={runScan} disabled={scanning}>
                  <Sparkles className="h-3.5 w-3.5" /> {scanning ? "Analysing…" : "Run AI Scan (demo)"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"><Camera className="h-3.5 w-3.5" /> Use Camera</Button>
              </div>
            </div>

            {scanning && (
              <>
                <div className="absolute inset-4 border border-primary/40 rounded-lg" />
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="absolute h-4 w-4 border-2 border-primary"
                    style={{
                      top: i < 2 ? 12 : "auto", bottom: i >= 2 ? 12 : "auto",
                      left: i % 2 === 0 ? 12 : "auto", right: i % 2 === 1 ? 12 : "auto",
                      borderRight: i % 2 === 0 ? "none" : undefined,
                      borderLeft: i % 2 === 1 ? "none" : undefined,
                      borderBottom: i < 2 ? "none" : undefined,
                      borderTop: i >= 2 ? "none" : undefined,
                    }} />
                ))}
              </>
            )}
          </div>

          {/* meta */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="glass rounded-lg p-3"><div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3 w-3" /> Geo-tag</div><div className="mt-1 font-medium">16.5062° N · 80.6480° E</div></div>
            <div className="glass rounded-lg p-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3 w-3" /> Timestamp</div><div className="mt-1 font-medium">Valid · 2 min ago</div></div>
            <div className="glass rounded-lg p-3"><div className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="h-3 w-3" /> Model</div><div className="mt-1 font-medium">CropVision-v4</div></div>
          </div>
        </div>

        {/* result panel */}
        <div className="space-y-4">
          {!result && !scanning && (
            <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">
              Run a scan to see disease classification, severity analysis and treatment recommendations.
            </div>
          )}

          {scanning && (
            <div className="glass rounded-xl p-6 space-y-3">
              <p className="text-sm font-semibold">Neural inference in progress…</p>
              {["Pre-processing image", "Running CropVision-v4 inference", "Cross-checking 5,800 known patterns", "Geo-validating sample"].map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> {s}
                </motion.div>
              ))}
              <Progress value={66} className="h-1.5 mt-2" />
            </div>
          )}

          {result && (
            <>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Disease detected</p>
                    <h3 className="text-xl font-bold mt-0.5">{result.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Crop: {result.crop}</p>
                  </div>
                  <Badge className={
                    result.severity === "Critical" ? "bg-destructive/20 text-destructive border-destructive/40" :
                    result.severity === "High" ? "bg-warning/20 text-warning border-warning/40" :
                    "bg-info/20 text-info border-info/40"
                  }>{result.severity}</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Confidence</span><span className="font-semibold">{result.confidence}%</span></div>
                    <Progress value={result.confidence} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Severity index</span><span className="font-semibold">72/100</span></div>
                    <Progress value={72} className="h-2" />
                  </div>
                </div>
              </motion.div>

              <div className="glass rounded-xl p-5">
                <h4 className="font-semibold text-sm">Recommended treatment</h4>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li>• Apply Tricyclazole 75% WP @ 0.6 g/L within 48 hrs</li>
                  <li>• Drain standing water from affected plots</li>
                  <li>• Schedule follow-up inspection in 7 days</li>
                </ul>
              </div>

              <div className="glass rounded-xl p-5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-accent" /> Nearest support center</h4>
                <p className="mt-1.5 text-sm">RSK Vijayawada-3 · 4.2 km away</p>
                <p className="text-xs text-muted-foreground">Open · Officer: P. Subba Rao · +91 99xx xxxx</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
