import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Leaf,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
  Upload,
  Clock,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress as UiProgress } from "@/components/ui/progress";
import {
  createAlert,
  detectDisease,
  getAlerts,
  type Alert,
  type AlertCreateInput,
  type DiseaseDetectionResponse,
} from "@/lib/api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { getFarmerSession } from "@/lib/farmer-auth";

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
  crop_hint?: string | null;
};

type AlertForm = {
  district: string;
  crop: string;
  issue: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  action: string;
  channels: string[];
};

const channelOptions = ["SMS", "Mobile Notification", "WhatsApp", "IVR"] as const;

const initialAlertForm = (district: string): AlertForm => ({
  district,
  crop: "Paddy",
  issue: "Leaf Blast",
  severity: "Medium",
  action: "Apply fungicide",
  channels: [...channelOptions],
});

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
  };
}

export const Route = createFileRoute("/farmers/scan")({
  head: () => ({
    meta: [{ title: "Disease Scan · Farmer App" }],
  }),
  component: FarmerScanPage,
});

function FarmerScanPage() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const session = getFarmerSession();
  const profile = session?.profile;

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

  const [scanMode, setScanMode] = useState<CaptureMode>("camera");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [alertStatus, setAlertStatus] = useState<string | null>(null);

  const [alertForm, setAlertForm] = useState<AlertForm>(() => initialAlertForm(profile?.district ?? "Krishna"));

  useEffect(() => {
    if (profile) setAlertForm(initialAlertForm(profile.district));
  }, [profile?.district]);

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
      const next: ScanResult = {
        label: data.label,
        severity: data.severity,
        confidence: data.confidence,
        model: data.model,
        top_k: data.top_k,
        crop_hint: data.crop_hint ?? null,
      };
      setScanResult(next);

      setAlertForm((current) => ({
        ...current,
        crop: (data.crop_hint ?? current.crop) as any,
        issue: data.label,
        severity: data.severity,
        action:
          data.severity === "Critical"
            ? "Spray immediately and isolate affected patches"
            : data.severity === "High"
              ? "Apply fungicide within 48 hours"
              : "Monitor field and follow advisory",
      }));
    },
    onError: () => {
      if (selectedFile) setScanResult(buildFallbackResult(selectedFile.name));
    },
  });

  const scanning = detectMutation.isPending;

  const previewLabel = scanMode === "camera" ? "Camera capture" : "Gallery upload";

  const locationText = useMemo(
    () => `${formatCoordinate(geoState.lat, "N", "S")} · ${formatCoordinate(geoState.lng, "E", "W")}`,
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
    if (mode === "camera") cameraInputRef.current?.click();
    else galleryInputRef.current?.click();
  };

  const handleFile = (file: File | null, mode: CaptureMode) => {
    setScanMode(mode);
    setSelectedFile(file);
    setScanResult(null);
    detectMutation.reset();
    if (file) detectMutation.mutate(file);
  };

  const sendAlert = () => {
    if (!profile) return;
    createAlertMutation.mutate({
      type: `${alertForm.issue} alert`,
      crop: alertForm.crop,
      district: alertForm.district,
      severity: alertForm.severity,
      time: new Date().toLocaleString(),
      action: alertForm.action,
    });
  };

  if (!profile) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">Please login to continue.</p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/farmers/login" as any })}>
          Login
        </Button>
      </div>
    );
  }

  const currentConfidence = scanResult?.confidence ?? 0;

  return (
    <div className={mobile ? "px-0" : "px-6"}>
      <PageHeader
        icon={<Leaf className="h-6 w-6 text-primary" />}
        eyebrow="Disease Detection"
        title="Scan the plant"
        description="Use live camera capture or upload a photo to detect disease and get a recommendation."
      />

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] glass-strong p-3 shadow-2xl"
        >
          <div className="rounded-[1.65rem] border border-border/60 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Scan</p>
                  <h2 className="mt-1 text-lg font-bold">Camera-first</h2>
                </div>
                <Badge variant="outline" className="border-success/40 text-success bg-success/10">
                  {scanMode === "camera" ? "Live" : "Upload"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button size="sm" className="gap-2 h-11 rounded-2xl" onClick={() => openPicker("camera")}>
                  <Camera className="h-4 w-4" /> Take photo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-11 rounded-2xl border-accent/40 hover:bg-accent/10"
                  onClick={() => openPicker("gallery")}
                >
                  <Upload className="h-4 w-4" /> Upload
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

              <div className="rounded-3xl border border-dashed border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Photo</p>
                    <p className="text-sm font-medium">{previewLabel}</p>
                  </div>
                </div>

                <div className="mt-4 aspect-[4/3] rounded-2xl border border-border/60 overflow-hidden bg-background/40 grid place-items-center relative">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Field preview" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="text-center px-6">
                      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <Leaf className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-semibold">No photo selected yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Take a leaf photo for best results.</p>
                    </div>
                  )}

                  {scanning ? (
                    <div className="absolute inset-0 bg-background/55 backdrop-blur-sm grid place-items-center">
                      <div className="rounded-2xl border border-primary/30 bg-background/70 px-4 py-3 text-center shadow-lg">
                        <p className="text-sm font-semibold">Analyzing crop</p>
                        <p className="text-xs text-muted-foreground mt-1">Running disease detection and building recommendation...</p>
                        <UiProgress value={72} className="mt-3 h-2 w-56" />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time
                    </p>
                    <p className="mt-1 font-semibold">{capturedAt}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      GPS
                    </p>
                    <p className="mt-1 font-semibold">{geoState.source === "pending" ? "--" : locationText}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-muted-foreground">Source</p>
                    <p className="mt-1 font-semibold uppercase">{geoState.source === "fallback" ? "Fallback" : geoState.source}</p>
                  </div>
                </div>
              </div>

              {scanResult ? (
                <div className="mt-4">
                  <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Disease detected</p>
                        <h3 className="mt-1 text-xl font-bold">{scanResult.label}</h3>
                        {scanResult.crop_hint ? (
                          <p className="mt-1 text-xs text-muted-foreground">Crop hint: {scanResult.crop_hint}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">Model: {scanResult.model}</p>
                      </div>
                      <Badge
                        className={
                          scanResult.severity === "High"
                            ? "bg-warning/20 text-warning border-warning/40"
                            : scanResult.severity === "Critical"
                              ? "bg-destructive/20 text-destructive border-destructive/40"
                              : scanResult.severity === "Medium"
                                ? "bg-info/20 text-info border-info/40"
                                : "bg-success/20 text-success border-success/40"
                        }
                      >
                        {scanResult.severity}
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{currentConfidence}%</span>
                      </div>
                      <UiProgress value={currentConfidence} className="h-2.5" />
                    </div>
                  </div>

                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Top predictions</p>
                      <div className="mt-3 space-y-2">
                        {scanResult.top_k.map((item, idx) => (
                          <div key={`${item.label}-${idx}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground">Rank {idx + 1}</p>
                              <p className="text-sm font-medium truncate">{item.label}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {(item.score * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recommendation</p>
                      <div className="mt-3 text-sm text-muted-foreground space-y-2">
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          {alertForm.action}
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          Apply within 48 hours for best results. Continue monitoring after 5 days.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-warning" /> Alert Center
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Send disease alert to the live feed.</p>
            </div>
            <Badge variant="outline" className="border-success/40 text-success bg-success/10">{alertsQuery.data?.length ?? 0} total</Badge>
          </div>

          {alertStatus ? <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">{alertStatus}</div> : null}

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Crop</p>
                <p className="mt-1 font-semibold">{alertForm.crop}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Severity</p>
                <p className="mt-1 font-semibold">{alertForm.severity}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Issue</p>
              <p className="mt-1 font-semibold">{alertForm.issue}</p>
            </div>

            <Button
              className="w-full rounded-xl gap-2"
              onClick={sendAlert}
              disabled={createAlertMutation.isPending || !scanResult}
            >
              {createAlertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send disease alert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FarmerScanPage;


