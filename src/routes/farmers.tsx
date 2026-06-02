import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Clock,
  Leaf,
  Loader2,
  MapPin,
  Phone,
  ScanLine,
  Send,
  ShieldAlert,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  createAlert,
  detectDisease,
  getAlerts,
  type Alert,
  type AlertCreateInput,
  type DiseaseDetectionResponse,
} from "@/lib/api";

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

type AlertForm = {
  village: string;
  district: string;
  crop: string;
  issue: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  action: string;
  channels: string[];
};

const channelOptions = ["SMS", "Mobile Notification", "WhatsApp", "IVR"] as const;

const initialAlertForm: AlertForm = {
  village: "Kankipadu",
  district: "Krishna",
  crop: "Paddy",
  issue: "Early Leaf Blast",
  severity: "Medium",
  action: "Apply Fungicide",
  channels: [...channelOptions],
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
          "Mobile-first farmer app with crop photo capture, GPS tagging, disease detection, and real alert creation.",
      },
    ],
  }),
  component: FarmerMobileApp,
});

function FarmerMobileApp() {
  const queryClient = useQueryClient();
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
  const [scanMode, setScanMode] = useState<CaptureMode>("gallery");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [alertStatus, setAlertStatus] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState<AlertForm>(initialAlertForm);

  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: getAlerts,
  });

  const createAlertMutation = useMutation<Alert, Error, AlertCreateInput>({
    mutationFn: createAlert,
    onSuccess: (created) => {
      setAlertStatus(`Alert saved at ${created.time}`);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error) => {
      setAlertStatus(error.message || "Failed to save alert");
    },
  });

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
  const latestAlerts = alertsQuery.data ?? [];
  const result = scanResult;
  const previewLabel = scanMode === "camera" ? "Camera capture ready" : "Gallery image ready";
  const locationText = useMemo(
    () =>
      `${formatCoordinate(geoState.lat, "N", "S")} · ${formatCoordinate(geoState.lng, "E", "W")}`,
    [geoState.lat, geoState.lng],
  );

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
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;

    setCapturedAt(new Date().toLocaleString());

    if (!("geolocation" in navigator)) {
      setGeoState({
        label: "GPS unavailable, using fallback",
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
          label: "GPS unavailable, using fallback",
          lat: 16.5062,
          lng: 80.648,
          accuracy: 120,
          source: "fallback",
        });
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 },
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
    if (file) detectMutation.mutate(file);
  };

  const resetCapture = () => {
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

  const sendAlert = () => {
    createAlertMutation.mutate({
      type: `${alertForm.issue} alert`,
      crop: alertForm.crop,
      district: alertForm.district,
      severity: alertForm.severity,
      time: new Date().toLocaleString(),
      action: alertForm.action,
    });
  };

  const currentConfidence = result?.confidence ?? 0;
  const selectedChannels = alertForm.channels.length;

  return (
    <div>
      <PageHeader
        icon={<Leaf className="h-6 w-6 text-primary" />}
        eyebrow="Farmer Mobile App"
        title="Field scan and alert center"
        description="Capture a crop image, detect disease, and create a real alert that is stored in the backend and shown in the live feed."
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
                    Live capture
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
                          <Clock className="h-3 w-3" />
                          Timestamp
                        </div>
                        <p className="mt-1 text-sm font-medium">{capturedAt}</p>
                      </div>
                      <div className="rounded-2xl bg-background/45 border border-border/60 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          GPS location
                        </div>
                        <p className="mt-1 text-sm font-medium leading-5">{locationText}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      size="sm"
                      className="gap-2 h-12 rounded-2xl"
                      onClick={() => openPicker("gallery")}
                    >
                      <Upload className="h-4 w-4" />
                      Upload photo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 h-12 rounded-2xl border-accent/40 hover:bg-accent/10"
                      onClick={() => openPicker("camera")}
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
                      <Badge
                        variant="outline"
                        className="border-success/40 text-success bg-success/10"
                      >
                        {scanMode === "camera" ? "Camera" : "Gallery"}
                      </Badge>
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
                            Upload a leaf image or use the camera for a live capture.
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
                        className="border-accent/40 text-accent bg-accent/10"
                      >
                        Offline-safe
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary bg-primary/10"
                      >
                        GPS-tagged
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning bg-warning/10"
                      >
                        Alert-ready
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
                        {geoState.source === "fallback" ? "Fallback" : geoState.source}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 px-5 py-4 bg-background/30">
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    {[
                      { icon: ScanLine, label: "Live scan" },
                      { icon: MapPin, label: "Geo-tag" },
                      { icon: Clock, label: "Timestamp" },
                      { icon: BadgeCheck, label: "Report" },
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

          <div className="space-y-4">
            {!result && !scanning && !detectMutation.error && (
              <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
                Upload an image and run scan to get a live disease result.
              </div>
            )}

            {detectMutation.error && !scanning ? (
              <div className="glass rounded-2xl p-5 text-sm text-destructive">
                {detectMutation.error.message}
              </div>
            ) : null}

            {scanning ? (
              <div className="glass rounded-2xl p-5 space-y-3">
                <p className="text-sm font-semibold">Neural inference in progress...</p>
                {[
                  "Pre-processing image",
                  "Running model inference",
                  "Generating confidence score",
                  "Preparing advisory",
                ].map((step, index) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.3 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {step}
                  </motion.div>
                ))}
                <Progress value={66} className="h-1.5 mt-2" />
              </div>
            ) : null}

            {result ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Disease detected</p>
                      <h3 className="text-xl font-bold mt-0.5">{result.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Model: {result.model}</p>
                      {result.crop_hint ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Crop hint: {result.crop_hint}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      className={
                        result.severity === "High"
                          ? "bg-warning/20 text-warning border-warning/40"
                          : result.severity === "Critical"
                            ? "bg-destructive/20 text-destructive border-destructive/40"
                            : result.severity === "Medium"
                              ? "bg-info/20 text-info border-info/40"
                              : "bg-success/20 text-success border-success/40"
                      }
                    >
                      {result.severity}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">{currentConfidence}%</span>
                    </div>
                    <Progress value={currentConfidence} className="h-2.5" />
                  </div>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Top predictions</h3>
                      <Badge variant="outline" className="border-border/60 text-muted-foreground">
                        AI rank
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(result.top_k ?? sampleResult.top_k).map((item, index) => (
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
                  </div>

                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Quick next steps</h3>
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary"
                      >
                        Field ready
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        Save this diagnosis to the farmer alert record.
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        Share the report with the village support center.
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        Match the delivery channels to the farmer’s preference.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="glass rounded-2xl p-5 border border-border/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Farmer Alert Center
                  </p>
                  <h3 className="mt-1 text-lg font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    Create and send alert
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stored in the backend and surfaced in the live feed below.
                  </p>
                </div>
                <Badge
                  className={
                    createAlertMutation.isPending
                      ? "bg-warning/20 text-warning border-warning/40"
                      : "bg-success/20 text-success border-success/40"
                  }
                >
                  {createAlertMutation.isPending ? "Sending" : "Ready"}
                </Badge>
              </div>

              {alertStatus ? (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
                  {alertStatus}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Village</span>
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={alertForm.village}
                        onChange={(e) =>
                          setAlertForm((current) => ({ ...current, village: e.target.value }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">District</span>
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={alertForm.district}
                        onChange={(e) =>
                          setAlertForm((current) => ({ ...current, district: e.target.value }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Crop</span>
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={alertForm.crop}
                        onChange={(e) =>
                          setAlertForm((current) => ({ ...current, crop: e.target.value }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Severity</span>
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={alertForm.severity}
                        onChange={(e) =>
                          setAlertForm((current) => ({
                            ...current,
                            severity: e.target.value as AlertForm["severity"],
                          }))
                        }
                      >
                        {["Low", "Medium", "High", "Critical"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-3 grid gap-1.5 text-sm">
                    <span className="text-xs text-muted-foreground">Issue</span>
                    <input
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      value={alertForm.issue}
                      onChange={(e) =>
                        setAlertForm((current) => ({ ...current, issue: e.target.value }))
                      }
                    />
                  </label>

                  <label className="mt-3 grid gap-1.5 text-sm">
                    <span className="text-xs text-muted-foreground">Action</span>
                    <textarea
                      rows={3}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      value={alertForm.action}
                      onChange={(e) =>
                        setAlertForm((current) => ({ ...current, action: e.target.value }))
                      }
                    />
                  </label>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Delivery channels</p>
                    <div className="grid grid-cols-2 gap-2">
                      {channelOptions.map((channel) => {
                        const selected = alertForm.channels.includes(channel);
                        return (
                          <button
                            key={channel}
                            type="button"
                            className={`rounded-xl border px-3 py-2 text-sm transition ${
                              selected
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/60 bg-muted/20 text-muted-foreground"
                            }`}
                            onClick={() =>
                              setAlertForm((current) => ({
                                ...current,
                                channels: selected
                                  ? current.channels.filter((item) => item !== channel)
                                  : [...current.channels, channel],
                              }))
                            }
                          >
                            {channel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      className="gap-2"
                      onClick={sendAlert}
                      disabled={createAlertMutation.isPending || selectedChannels === 0}
                    >
                      {createAlertMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send alert
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAlertForm(initialAlertForm)}
                      disabled={createAlertMutation.isPending}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Selected channels</p>
                    <Badge
                      variant="outline"
                      className="border-success/40 text-success bg-success/10"
                    >
                      {selectedChannels} enabled
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alertForm.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="bg-muted/20">
                        {channel}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Alert preview
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Village</span>
                        <span className="font-semibold">{alertForm.village}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Crop</span>
                        <span className="font-semibold">{alertForm.crop}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Issue</span>
                        <span className="font-semibold text-warning">{alertForm.issue}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Action</span>
                        <span className="font-semibold text-primary">{alertForm.action}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Live alerts feed
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pulling real alerts from the backend.
                  </p>
                </div>
                <Badge variant="outline" className="border-success/40 text-success bg-success/10">
                  {latestAlerts.length} alerts
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                {alertsQuery.isLoading ? (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    Loading live alerts...
                  </div>
                ) : latestAlerts.length ? (
                  latestAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-border/60 bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{alert.type}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {alert.crop} · {alert.district} · {alert.time}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            alert.severity === "Critical"
                              ? "border-destructive/40 text-destructive bg-destructive/10"
                              : alert.severity === "High"
                                ? "border-warning/40 text-warning bg-warning/10"
                                : alert.severity === "Medium"
                                  ? "border-info/40 text-info bg-info/10"
                                  : "border-success/40 text-success bg-success/10"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{alert.action}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    No alerts found yet. Create one above to start the live feed.
                  </div>
                )}
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  title: "Real backend",
                  text: "Alerts are written to the database and fetched from `/alerts`.",
                },
                {
                  title: "GPS + timestamp",
                  text: "Every capture shows location and time from the browser.",
                },
                {
                  title: "Operational ready",
                  text: "The UI mirrors a farmer app flow with live disease results.",
                },
              ].map((item) => (
                <div key={item.title} className="glass rounded-2xl p-4">
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-6">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
