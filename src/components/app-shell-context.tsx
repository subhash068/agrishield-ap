import { useEffect, useMemo, useState } from "react";

import {
  AppShellContext,
  STORAGE_KEYS,
  type AppShellContextValue,
  type Locale,
} from "@/components/app-shell-store";

function readStoredValue(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStoredValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [selectedDistrict, setSelectedDistrictState] = useState(
    () => readStoredValue(STORAGE_KEYS.district) ?? "all",
  );
  const [searchTerm, setSearchTermState] = useState(
    () => readStoredValue(STORAGE_KEYS.search) ?? "",
  );
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = readStoredValue(STORAGE_KEYS.locale);
    return stored === "te" ? "te" : "en";
  });

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.district, selectedDistrict);
  }, [selectedDistrict]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.search, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.locale, locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<AppShellContextValue>(
    () => ({
      selectedDistrict,
      setSelectedDistrict: setSelectedDistrictState,
      searchTerm,
      setSearchTerm: setSearchTermState,
      locale,
      toggleLocale: () => setLocale((current) => (current === "en" ? "te" : "en")),
    }),
    [locale, searchTerm, selectedDistrict],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}
