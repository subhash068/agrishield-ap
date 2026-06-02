import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  Upload,
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { detectDisease, type DiseaseDetectionResponse } from "@/lib/api";

const diseaseRecommendations: Array<{
  match: (label: string) => boolean;
  title: string;
  actions: string[];
  note: string;
}> = [
  {
    match: (label) => label.includes("paddy") && label.includes("blast"),
    title: "Recommended Action",
    actions: ["Apply Tricyclazole", "Avoid excess irrigation", "Monitor field after 5 days"],
    note: "Best suited for early-stage paddy blast detected through smartphone photo analytics.",
  },
  {
    match: (label) => label.includes("leaf curl"),
    title: "Recommended Action",
    actions: [
      "Remove heavily infected plants",
      "Control whitefly vectors",
      "Use reflective mulch where feasible",
    ],
    note: "Leaf curl pressure usually increases when vector populations rise in warm, dry weather.",
  },
  {
    match: (label) => label.includes("bollworm"),
    title: "Recommended Action",
    actions: [
      "Scout the crop for fresh larvae",
      "Use recommended bio-control or selective spray",
      "Repeat field monitoring in 3 days",
    ],
    note: "Early intervention helps keep bollworm populations below economic threshold.",
  },
  {
    match: (label) => label.includes("armyworm"),
    title: "Recommended Action",
    actions: [
      "Inspect whorls and leaf surfaces",
      "Apply an approved larvicide if infestation is spreading",
      "Keep irrigation balanced to reduce crop stress",
    ],
    note: "Armyworm outbreaks can expand quickly, so the next 48 hours matter most.",
  },
  {
    match: (label) => label.includes("wilt"),
    title: "Recommended Action",
    actions: [
      "Improve drainage",
      "Remove affected crop residues",
      "Rotate with a non-host crop in the next season",
    ],
    note: "Wilt symptoms often intensify when moisture management is poor or soil-borne pressure is high.",
  },
];

function getRecommendation(label: string) {
  const normalized = label.toLowerCase();
  return (
    diseaseRecommendations.find((entry) => entry.match(normalized)) ?? {
      title: "Recommended Action",
      actions: [
        "Consult the local agriculture officer",
        "Remove severely affected leaves or plants",
        "Recheck the crop after 3 to 5 days",
      ],
      note: "The model detected a crop issue, but the safest response is to combine the result with field scouting.",
    }
  );
}

export const Route = createFileRoute("/disease")({
  head: () => ({
    meta: [
      { title: "AI Disease Detection · AgriShield AP" },
      {
        name: "description",
        content:
          "Upload a field image to identify crop disease, estimate severity, and connect the farmer with the nearest support center.",
      },
    ],
  }),
  component: DiseasePage,
});

function DiseasePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("--:--");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectMutation = useMutation<DiseaseDetectionResponse, Error, File>({
    mutationFn: detectDisease,
  });

  const scanning = detectMutation.isPending;
  const result = detectMutation.data ?? null;
  const errorMessage = detectMutation.error?.message ?? null;
  const topPredictions = result?.top_k.slice(0, 3) ?? [];
  const mismatchDetected = Boolean(result?.mismatch_detected);
  const cropGate = result?.crop_gate ?? null;
  const recommendation = result ? getRecommendation(result.label) : null;

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
  }, []);

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
        description="Upload a smartphone photo to identify crop disease, estimate severity, surface confidence scores, and connect the farmer with practical field advice."
      />

      <div className="px-6 lg:px-10 py-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="glass rounded-xl p-6">
          <div
            className={`relative aspect-[4/3] rounded-xl border-2 border-dashed transition overflow-hidden ${
              scanning
                ? "border-primary glow-primary scanline"
                : "border-border/60 hover:border-primary/50"
            } bg-gradient-to-br from-muted/30 to-background grid place-items-center`}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Crop upload preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            <div className="relative z-10 text-center px-6 bg-background/60 rounded-lg p-4 backdrop-blur-sm">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 grid place-items-center mb-3">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Upload crop image to analyze</p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG / JPG · Max 10MB · Smartphone photo analytics enabled
              </p>
              {selectedFile ? (
                <p className="mt-2 text-xs text-primary font-medium">
                  Selected: {selectedFile.name}
                </p>
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
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={runScan}
                  disabled={scanning || !selectedFile}
                >
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
              <div className="mt-1 font-medium">{currentTime}</div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" /> Model
              </div>
              <div className="mt-1 font-medium truncate">Hugging Face disease model</div>
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
              {[
                "Pre-processing image",
                "Running model inference",
                "Generating confidence score",
                "Preparing advisory",
              ].map((s, i) => (
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
              {mismatchDetected ? (
                <div className="glass rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 text-warning shrink-0" />
                    <div>
                      <p className="font-semibold text-warning">Possible mismatch detected</p>
                      <p className="mt-1 text-muted-foreground">
                        {result.mismatch_reason ??
                          "The uploaded image filename and the model prediction do not look consistent."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Treat this as a low-trust result and verify with a clearer image or expert
                        review.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Detection Result
                    </p>
                    <h3 className="text-2xl font-bold mt-1">{result.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Model: {result.model}</p>
                    {result.crop_hint ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Hinted crop: {result.crop_hint}
                      </p>
                    ) : null}
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
                    Severity: {result.severity}
                  </Badge>
                </div>

                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Disease name
                    </p>
                    <p className="mt-1 text-base font-semibold">{result.label}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Confidence score
                    </p>
                    <p className="mt-1 text-base font-semibold">{result.confidence}%</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold">{result.confidence}%</span>
                  </div>
                  <Progress value={result.confidence} className="h-2" />
                </div>
              </motion.div>

              {cropGate ? (
                <div className="glass rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
                  <p className="font-semibold text-primary">Crop gate</p>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                    <p>
                      Crop family:{" "}
                      <span className="text-foreground font-medium">{cropGate.crop}</span>
                    </p>
                    <p>
                      Gate source:{" "}
                      <span className="text-foreground font-medium">{cropGate.source}</span>
                    </p>
                    <p>
                      Gate confidence:{" "}
                      <span className="text-foreground font-medium">{cropGate.confidence}%</span>
                    </p>
                    {cropGate.selected_label ? (
                      <p>
                        Selected label:{" "}
                        <span className="text-foreground font-medium">
                          {cropGate.selected_label}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {recommendation ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="glass rounded-xl p-5 border border-primary/20 bg-gradient-to-br from-primary/10 to-background"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Agronomic Recommendation
                      </p>
                      <h4 className="mt-1 text-lg font-semibold">{recommendation.title}</h4>
                    </div>
                    <Badge variant="outline" className="border-accent/40 text-accent">
                      Field action plan
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{recommendation.note}</p>
                  <ol className="mt-4 space-y-2">
                    {recommendation.actions.map((action, index) => (
                      <li
                        key={action}
                        className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                          {index + 1}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              ) : null}

              <div className="glass rounded-xl p-5">
                <h4 className="font-semibold text-sm">Top 3 predictions</h4>
                <div className="mt-3 space-y-2">
                  {topPredictions.map((p, index) => (
                    <div
                      key={p.label}
                      className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Rank {index + 1}</p>
                        <p className="text-sm font-medium truncate">{p.label}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {(p.score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent" /> Nearest support center
                </h4>
                <p className="mt-1.5 text-sm">RSK Vijayawada-3 · 4.2 km away</p>
                <p className="text-xs text-muted-foreground">
                  Open · Officer: P. Subba Rao · +91 99xx xxxx
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
