import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, Upload, Camera, MapPin, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { detectDisease, type DiseaseDetectionResponse } from "@/lib/api";

export const Route = createFileRoute("/disease")({
  head: () => ({
    meta: [
      { title: "AI Disease Detection · AgriShield AP" },
      { name: "description", content: "Upload a field image to identify crop disease, estimate severity, and connect the farmer with the nearest support center." },
    ],
  }),
  component: DiseasePage,
});

function DiseasePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectMutation = useMutation<DiseaseDetectionResponse, Error, File>({
    mutationFn: detectDisease,
  });

  const scanning = detectMutation.isPending;
  const result = detectMutation.data ?? null;
  const errorMessage = detectMutation.error?.message ?? null;

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const runScan = () => {
    if (!selectedFile) return;
    detectMutation.mutate(selectedFile);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <PageHeader
        icon={<ScanLine className="h-6 w-6 text-primary" />}
        eyebrow="AI Diagnostics"
        title="AI Crop Disease Detection"
        description="Upload a field image to identify crop disease, estimate severity, and connect the farmer with the nearest support center."
      />

      <div className="px-6 lg:px-10 py-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="glass rounded-xl p-6">
          <div
            className={`relative aspect-[4/3] rounded-xl border-2 border-dashed transition overflow-hidden ${
              scanning ? "border-primary glow-primary scanline" : "border-border/60 hover:border-primary/50"
            } bg-gradient-to-br from-muted/30 to-background grid place-items-center`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Crop upload preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}

            <div className="relative z-10 text-center px-6 bg-background/60 rounded-lg p-4 backdrop-blur-sm">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 grid place-items-center mb-3">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Upload crop image to analyze</p>
              <p className="text-xs text-muted-foreground mt-1">PNG / JPG · Max 10MB · GPS-tagged preferred</p>
              {selectedFile ? (
                <p className="mt-2 text-xs text-primary font-medium">Selected: {selectedFile.name}</p>
              ) : null}
              <div className="mt-4 flex justify-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    detectMutation.reset();
                  }}
                />
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openFilePicker}>
                  <Camera className="h-3.5 w-3.5" /> Choose Image
                </Button>
                <Button size="sm" className="gap-1.5" onClick={runScan} disabled={scanning || !selectedFile}>
                  <Sparkles className="h-3.5 w-3.5" /> {scanning ? "Analysing..." : "Run AI Scan"}
                </Button>
              </div>
            </div>

            {scanning && (
              <>
                <div className="absolute inset-4 border border-primary/40 rounded-lg" />
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute h-4 w-4 border-2 border-primary"
                    style={{
                      top: i < 2 ? 12 : "auto",
                      bottom: i >= 2 ? 12 : "auto",
                      left: i % 2 === 0 ? 12 : "auto",
                      right: i % 2 === 1 ? 12 : "auto",
                      borderRight: i % 2 === 0 ? "none" : undefined,
                      borderLeft: i % 2 === 1 ? "none" : undefined,
                      borderBottom: i < 2 ? "none" : undefined,
                      borderTop: i >= 2 ? "none" : undefined,
                    }}
                  />
                ))}
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="glass rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" /> Geo-tag
              </div>
              <div className="mt-1 font-medium">16.5062° N · 80.6480° E</div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" /> Timestamp
              </div>
              <div className="mt-1 font-medium">{new Date().toLocaleTimeString()}</div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" /> Model
              </div>
              <div className="mt-1 font-medium">HF Plant Classifier</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!result && !scanning && !errorMessage && (
            <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">
              Upload an image and run scan to get real model predictions.
            </div>
          )}

          {errorMessage && !scanning && (
            <div className="glass rounded-xl p-6 text-sm text-destructive">{errorMessage}</div>
          )}

          {scanning && (
            <div className="glass rounded-xl p-6 space-y-3">
              <p className="text-sm font-semibold">Neural inference in progress...</p>
              {["Pre-processing image", "Running model inference", "Generating confidence score", "Preparing advisory"].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-2 text-xs"
                >
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
                    <h3 className="text-xl font-bold mt-0.5">{result.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Model: {result.model}</p>
                  </div>
                  <Badge
                    className={
                      result.severity === "High"
                        ? "bg-warning/20 text-warning border-warning/40"
                        : result.severity === "Low"
                          ? "bg-success/20 text-success border-success/40"
                          : "bg-info/20 text-info border-info/40"
                    }
                  >
                    {result.severity}
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">{result.confidence}%</span>
                    </div>
                    <Progress value={result.confidence} className="h-2" />
                  </div>
                </div>
              </motion.div>

              <div className="glass rounded-xl p-5">
                <h4 className="font-semibold text-sm">Top predictions</h4>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  {result.top_k.map((p) => (
                    <li key={p.label}>
                      {p.label} - {(p.score * 100).toFixed(2)}%
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass rounded-xl p-5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent" /> Nearest support center
                </h4>
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
