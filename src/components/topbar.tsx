import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, CloudSun, Languages, Search, Sparkles, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAppShell } from "@/components/app-shell-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAlerts, getDistricts } from "@/lib/api";
import { getAssistantSuggestions, resolveGlobalSearch } from "@/lib/global-search";

export function TopBar() {
  const navigate = useNavigate();
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  const { selectedDistrict, setSelectedDistrict, searchTerm, setSearchTerm, locale, toggleLocale } =
    useAppShell();

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredAlerts = useMemo(
    () => (selectedDistrict === "all" ? alerts : alerts.filter((alert) => alert.district === selectedDistrict)),
    [alerts, selectedDistrict],
  );

  const assistantSuggestions = useMemo(() => getAssistantSuggestions(), []);

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      toast("Type a parcel, farmer, district, or scheme to search.");
      return;
    }

    const intent = resolveGlobalSearch(trimmed, districts);
    setSearchTerm(trimmed);
    if (intent.district) {
      setSelectedDistrict(intent.district);
    }
    setAssistantOpen(false);
    setAlertsOpen(false);
    navigate({ to: intent.to });
    toast.success(intent.message);
  }

  function runAssistantPrompt() {
    runSearch(assistantPrompt);
  }

  function handleNotificationAction(alertType: string) {
    setAlertsOpen(false);
    const normalized = alertType.toLowerCase();
    if (normalized.includes("weather") || normalized.includes("rain") || normalized.includes("drought")) {
      navigate({ to: "/weather" });
      toast("Opened weather intelligence.");
      return;
    }

    if (normalized.includes("scheme") || normalized.includes("benefit") || normalized.includes("subsidy")) {
      navigate({ to: "/government" });
      toast("Opened government dashboard.");
      return;
    }

    navigate({ to: "/disease" });
    toast("Opened crop disease triage.");
  }

  function toggleLanguage() {
    toggleLocale();
    toast.success(locale === "en" ? "Switched to Telugu mode." : "Switched to English mode.");
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 glass-strong px-3">
        <div className="relative ml-0 hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSearch(searchTerm);
              }
            }}
            placeholder={
              isMounted && locale === "te"
                ? "పార్సెల్లు, రైతులు, మండలాలు, పథకాలు..."
                : "Search parcels, farmers, mandals, schemes..."
            }
            className="h-9 w-[340px] pl-8 bg-muted/40 border-border/60"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={selectedDistrict}
            onValueChange={(district) => {
              setSelectedDistrict(district);
              toast.success(district === "all" ? "Showing all districts." : `Focused on ${district}.`);
            }}
          >
            <SelectTrigger className="h-9 w-[140px] bg-muted/40 border-border/60 hidden sm:flex">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 hidden lg:flex">
            <Link to="/weather">
              <CloudSun className="h-4 w-4 text-accent" />
              <span className="text-xs">31 C · Vijayawada</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => setAlertsOpen(true)}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-destructive text-destructive-foreground">
              {filteredAlerts.length}
            </Badge>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-primary/30 bg-primary/10 hover:bg-primary/20"
            onClick={() => setAssistantOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs hidden sm:inline">AI Assistant</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Language"
            onClick={toggleLanguage}
          >
            <Languages className="h-4 w-4" />
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full p-0"
            title="Settings"
          >
            <Link to="/settings">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center border border-border/60">
                <User className="h-4 w-4" />
              </div>
            </Link>
          </Button>
        </div>
      </header>

      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Assistant</DialogTitle>
            <DialogDescription>
              Ask for a crop, district, weather, scheme, or alert view and I&apos;ll jump straight there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={assistantPrompt}
              onChange={(event) => setAssistantPrompt(event.target.value)}
              placeholder="e.g. show drought risk in Anantapur"
              className="min-h-24 bg-muted/40"
            />

            <div className="grid grid-cols-2 gap-2">
              {assistantSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.title}
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setAssistantPrompt(suggestion.query);
                    runSearch(suggestion.query);
                  }}
                >
                  {suggestion.title}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAssistantOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={runAssistantPrompt}>
              Run assistant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Live Alerts</DialogTitle>
            <DialogDescription>
              {selectedDistrict === "all" ? "All districts" : selectedDistrict} · {filteredAlerts.length} active alert
              {filteredAlerts.length === 1 ? "" : "s"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => handleNotificationAction(alert.type)}
                className="w-full rounded-lg border border-border/60 bg-muted/20 p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{alert.type}</span>
                  <Badge
                    variant="outline"
                    className={
                      alert.severity === "Critical"
                        ? "border-destructive/50 text-destructive bg-destructive/10"
                        : alert.severity === "High"
                          ? "border-warning/50 text-warning bg-warning/10"
                          : "border-info/50 text-info bg-info/10"
                    }
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.crop} · {alert.district} · {alert.time}
                </p>
                <p className="mt-1.5 text-xs">{alert.action}</p>
              </button>
            ))}
            {!filteredAlerts.length ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No alerts match the current district filter.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAlertsOpen(false);
                navigate({ to: "/surveillance" });
              }}
            >
              Open surveillance
            </Button>
            <Button type="button" onClick={() => setAlertsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
