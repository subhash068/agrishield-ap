import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Camera,
  Clock,
  FileText,
  Leaf,
  MapPin,
  Phone,
  ScanLine,
  Share2,
  ShieldAlert,
  Sparkles,
  ThermometerSun,
  Upload,
  WifiOff,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { detectDisease, type DiseaseDetectionResponse } from "@/lib/api";

type CaptureMode = "gallery" | "camera";

type GeoState = {
  label: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  source: "gps" | "fallback" | "pending";
};

type ScanResult = {
  label: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  model: string;
  top_k: Array<{ label: string; score: number }>;
  crop_gate?: DiseaseDetectionResponse["crop_gate"];
  mismatch_detected?: boolean;
  mismatch_reason?: string | null;
  crop_hint?: string | null;
};

const sampleResult: ScanResult = {
  label: "Leaf Blast",
  severity: "Medium",
  confidence: 94,
  model: "AgriShield Mobile Vision v2",
  top_k: [
    { label: "Leaf Blast", score: 0.94 },
    { label: "Bacterial Blight", score: 0.04 },
    { label: "Healthy Leaf", score: 0.02 },
  ],
  crop_hint: "Paddy",
};

const recentReports = [
  { crop: "Paddy", result: "Leaf Blast", severity: "Medium", time: "12 min ago" },
  { crop: "Chilli", result: "Thrips Stress", severity: "High", time: "Yesterday" },
  { crop: "Cotton", result: "Healthy", severity: "Low", time: "2 days ago" },
];

const farmerAlert = {
  village: "Kankipadu",
  crop: "Paddy",
  issue: "Early Leaf Blast",
  action: "Apply Fungicide",
  channels: ["SMS", "Mobile Notification", "WhatsApp", "IVR"],
};

const featureCards = [
  {
    icon: Zap,
    title: "One-tap scan",
    text: "Capture a field image, get a diagnosis, and save a report instantly.",
  },
  {
    icon: MapPin,
    title: "Auto GPS tagging",
    text: "Every report includes location so the field officer sees the exact plot.",
  },
  {
    icon: Clock,
    title: "Trusted timestamp",
    text: "The scan time is recorded automatically for audit and follow-up.",
  },
  {
    icon: Share2,
    title: "Shareable report",
    text: "Share a clean summary with the farmer, officer, or support center.",
  },
];

function formatCoordinate(value: number | null, positive: string, negative: string) {
  if (value === null) return "--";
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}° ${direction}`;
}

function buildFallbackResult(fileName: string): ScanResult {
  const seed = fileName.toLowerCase();
  const isRice = seed.includes("paddy") || seed.includes("rice") || seed.includes("leaf");

  return {
    label: isRice ? "Leaf Blast" : "Bacterial Leaf Spot",
    severity: isRice ? "Medium" : "High",
    confidence: isRice ? 94 : 88,
    model: "AgriShield Mobile Vision v2",
    top_k: isRice
      ? [
          { label: "Leaf Blast", score: 0.94 },
          { label: "Bacterial Blight", score: 0.04 },
          { label: "Healthy Leaf", score: 0.02 },
        ]
      : [
          { label: "Bacterial Leaf Spot", score: 0.88 },
          { label: "Nutrient Deficiency", score: 0.08 },
          { label: "Healthy Leaf", score: 0.04 },
        ],
    crop_hint: isRice ? "Paddy" : "Unknown",
    mismatch_detected: false,
    mismatch_reason: null,
  };
}

export const Route = createFileRoute("/farmers")({
  head: () => ({
    meta: [
      { title: "Farmer Mobile App · AgriShield AP" },
      {
        name: "description",
        content:
          "Mobile-first farmer app demo with photo upload, camera capture, GPS tagging, timestamping, and AI crop disease detection.",
      },
    ],
  }),
  component: FarmerMobileApp,
});

function FarmerMobileApp() {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string>("--");
  const [geoState, setGeoState] = useState<GeoState>({
    label: "Awaiting location",
    lat: null,
    lng: null,
    accuracy: null,
    source: "pending",
  });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanMode, setScanMode] = useState<CaptureMode>("gallery");

  const detectMutation = useMutation<DiseaseDetectionResponse, Error, File>({
    mutationFn: detectDisease,
    onSuccess: (data) => {
      setScanResult({
        label: data.label,
        severity: data.severity,
        confidence: data.confidence,
        model: data.model,
        top_k: data.top_k,
        crop_gate: data.crop_gate ?? undefined,
        mismatch_detected: data.mismatch_detected,
        mismatch_reason: data.mismatch_reason ?? null,
        crop_hint: data.crop_hint ?? null,
      });
    },
    onError: () => {
      if (selectedFile) {
        setScanResult(buildFallbackResult(selectedFile.name));
      }
    },
  });

  const scanning = detectMutation.isPending;
  const result = scanResult;

  const previewLabel = scanMode === "camera" ? "Camera capture ready" : "Gallery image ready";
  const confidenceProgress = result?.confidence ?? 0;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      return;
    }

    const nextUrl = URL.createObjectURL(selectedFile);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;

    const timestamp = new Date();
    setCapturedAt(timestamp.toLocaleString());

    if (!("geolocation" in navigator)) {
      setGeoState({
        label: "GPS unavailable, using demo location",
        lat: 16.5062,
        lng: 80.648,
        accuracy: 120,
        source: "fallback",
      });
      return;
    }

    setGeoState((current) => ({ ...current, label: "Getting GPS fix..." }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoState({
          label: "GPS locked",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps",
        });
      },
      () => {
        setGeoState({
          label: "GPS unavailable, using demo location",
          lat: 16.5062,
          lng: 80.648,
          accuracy: 120,
          source: "fallback",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 0,
      },
    );
  }, [selectedFile]);

  const openPicker = (mode: CaptureMode) => {
    setScanMode(mode);
    if (mode === "camera") {
      cameraInputRef.current?.click();
      return;
    }
    galleryInputRef.current?.click();
  };

  const handleFile = (file: File | null, mode: CaptureMode) => {
    setScanMode(mode);
    setSelectedFile(file);
    setScanResult(null);
    detectMutation.reset();

    if (file) {
      detectMutation.mutate(file);
    }
  };

  const resetFlow = () => {
    setSelectedFile(null);
    setScanResult(null);
    setCapturedAt("--");
    setGeoState({
      label: "Awaiting location",
      lat: null,
      lng: null,
      accuracy: null,
      source: "pending",
    });
    detectMutation.reset();
  };

  const canShare = Boolean(scanResult && selectedFile);

  const locationText = useMemo(() => {
    return `${formatCoordinate(geoState.lat, "N", "S")} · ${formatCoordinate(geoState.lng, "E", "W")}`;
  }, [geoState.lat, geoState.lng]);

  return (
    <div>
      <PageHeader
        icon={<Leaf className="h-6 w-6 text-primary" />}
        eyebrow="Farmer Mobile App"
        title="Field scan demo"
        description="Upload or capture a leaf image, tag it with GPS and timestamp, and show a clean AI diagnosis for the demo."
      />

      <div className="px-6 lg:px-10 py-6">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-[420px]"
          >
            <div className="glass-strong rounded-[2rem] p-3 shadow-2xl">
              <div className="rounded-[1.65rem] border border-border/60 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-success pulse-ring" />
                    AgriShield AP
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    Demo mode
                  </Badge>
                </div>

                <div className="px-5 pb-4">
                  <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-background to-accent/15 p-4 border border-border/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Scan status
                        </p>
                        <h2 className="mt-1 text-xl font-bold">Farmer mobile app</h2>
                      </div>
                      <div className="rounded-2xl bg-background/60 border border-border/60 p-3">
                        <ScanLine className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-background/45 border border-border/60 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Timestamp
                        </div>
                        <p className="mt-2 text-sm font-semibold">{capturedAt}</p>
                      </div>
                      <div className="rounded-2xl bg-background/45 border border-border/60 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          GPS location
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-5">{locationText}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => openPicker("gallery")}
                      className="gap-2 h-12 rounded-2xl"
                    >
                      <Upload className="h-4 w-4" />
                      Upload photo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openPicker("camera")}
                      className="gap-2 h-12 rounded-2xl border-accent/40 hover:bg-accent/10"
                    >
                      <Camera className="h-4 w-4" />
                      Take photo
                    </Button>
                  </div>

                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null, "gallery")}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null, "camera")}
                  />

                  <div className="mt-4 rounded-3xl border border-dashed border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Upload image
                        </p>
                        <p className="text-sm font-medium">{previewLabel}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-success/40 text-success bg-success/10"
                        >
                          {scanMode === "camera" ? "Camera" : "Gallery"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 aspect-[4/3] rounded-2xl border border-border/60 overflow-hidden bg-background/40 grid place-items-center relative">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Field preview"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center px-6">
                          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Leaf className="h-7 w-7" />
                          </div>
                          <p className="text-sm font-semibold">No photo selected yet</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Upload a leaf image or use the camera for a live demo.
                          </p>
                        </div>
                      )}

                      {scanning ? (
                        <div className="absolute inset-0 bg-background/55 backdrop-blur-sm grid place-items-center">
                          <div className="rounded-2xl border border-primary/30 bg-background/70 px-4 py-3 text-center shadow-lg">
                            <p className="text-sm font-semibold">Analyzing crop image</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Running disease detection and building the report...
                            </p>
                            <Progress value={72} className="mt-3 h-2 w-52" />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="border-accent/40 text-accent bg-accent/10 gap-1.5"
                      >
                        <WifiOff className="h-3 w-3" />
                        Offline-safe demo
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary bg-primary/10 gap-1.5"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        Officer ready
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning bg-warning/10 gap-1.5"
                      >
                        <ThermometerSun className="h-3 w-3" />
                        Weather linked
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Location</p>
                      <p className="mt-1 font-semibold">{geoState.label}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Accuracy</p>
                      <p className="mt-1 font-semibold">
                        {geoState.accuracy ? `${Math.round(geoState.accuracy)} m` : "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Source</p>
                      <p className="mt-1 font-semibold uppercase">
                        {geoState.source === "fallback" ? "Demo" : geoState.source}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      className="flex-1 gap-2 rounded-2xl glow-primary"
                      onClick={() => selectedFile && detectMutation.mutate(selectedFile)}
                      disabled={!selectedFile || scanning}
                    >
                      <Sparkles className="h-4 w-4" />
                      {scanning ? "Scanning..." : "Run AI scan"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={resetFlow}
                      disabled={scanning && !selectedFile}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border/60 px-5 py-4 bg-background/30">
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    {[
                      { icon: Activity, label: "Live scan" },
                      { icon: MapPin, label: "Geo-tag" },
                      { icon: Clock, label: "Time stamp" },
                      { icon: Share2, label: "Share" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-border/60 bg-muted/20 p-2"
                      >
                        <item.icon className="mx-auto h-4 w-4 text-primary" />
                        <p className="mt-1 text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    After upload
                  </p>
                  <h3 className="mt-1 text-xl font-bold">Disease detected</h3>
                </div>
                <Badge
                  className={
                    result?.severity === "High"
                      ? "bg-warning/20 text-warning border-warning/40"
                      : result?.severity === "Critical"
                        ? "bg-destructive/20 text-destructive border-destructive/40"
                        : result?.severity === "Medium"
                          ? "bg-info/20 text-info border-info/40"
                          : "bg-success/20 text-success border-success/40"
                  }
                >
                  {result?.severity ?? "Waiting"}
                </Badge>
              </div>

              <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Primary diagnosis</p>
                    <h4 className="mt-1 text-2xl font-bold">{result?.label ?? "Leaf Blast"}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {result?.model ?? sampleResult.model}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                    <Leaf className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold">{result?.confidence ?? 94}%</span>
                  </div>
                  <Progress value={confidenceProgress} className="h-2.5" />
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-accent" />
                    GPS location
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{locationText}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-accent" />
                    Timestamp
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{capturedAt}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid sm:grid-cols-2 gap-4"
            >
              {featureCards.map((card) => (
                <div key={card.title} className="glass rounded-2xl p-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 font-semibold">{card.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground leading-6">{card.text}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Recommended action
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">What the farmer should do next</h3>
                </div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  24 hour plan
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  "Isolate the affected plot and avoid overhead irrigation for 24 hours.",
                  "Apply the advised fungicide only after field officer confirmation.",
                  "Share the report with the nearest agri officer for follow-up.",
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl bg-muted/20 p-3">
                    <div className="mt-0.5 h-6 w-6 rounded-full bg-success/15 text-success grid place-items-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground/90 leading-6">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Call expert
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Save report
                </Button>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Top predictions</h3>
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    AI rank
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {(result?.top_k ?? sampleResult.top_k).map((item, index) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Rank {index + 1}</p>
                        <p className="text-sm font-medium truncate">{item.label}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {(item.score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Recent reports</h3>
                  <Badge variant="outline" className="border-success/40 text-success bg-success/10">
                    Synced
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {recentReports.map((item) => (
                    <div
                      key={`${item.crop}-${item.time}`}
                      className="rounded-xl border border-border/60 bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{item.result}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.crop} · {item.time}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="glass rounded-2xl p-5 border border-primary/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Farmer Alert Center
                  </p>
                  <h3 className="mt-1 text-lg font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    Alert generated automatically
                  </h3>
                </div>
                <Badge className="bg-warning/20 text-warning border-warning/40">Live dispatch</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.1fr]">
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Village</span>
                      <span className="font-semibold">{farmerAlert.village}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Crop</span>
                      <span className="font-semibold">{farmerAlert.crop}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Issue</span>
                      <span className="font-semibold text-warning">{farmerAlert.issue}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Action</span>
                      <span className="font-semibold text-primary">{farmerAlert.action}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Delivery channels</p>
                    <Badge variant="outline" className="border-success/40 text-success bg-success/10">
                      4 paths
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {farmerAlert.channels.map((channel) => (
                      <div
                        key={channel}
                        className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium"
                      >
                        {channel}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground leading-6">
                    Alert generated from the latest field diagnosis and pushed to the farmer and
                    support team without manual intervention.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Demo extras</h3>
              </div>
              <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-muted/20 border border-border/60 p-3">
                  Multilingual farmer advisory
                </div>
                <div className="rounded-xl bg-muted/20 border border-border/60 p-3">
                  Nearest officer and helpdesk
                </div>
                <div className="rounded-xl bg-muted/20 border border-border/60 p-3">
                  Weather-aware recommendations
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
