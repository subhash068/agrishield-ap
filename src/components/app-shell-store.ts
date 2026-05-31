import { createContext, useContext } from "react";

export type Locale = "en" | "te";

export type AppShellContextValue = {
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  locale: Locale;
  toggleLocale: () => void;
};

export const STORAGE_KEYS = {
  district: "agrishield.selectedDistrict",
  search: "agrishield.searchTerm",
  locale: "agrishield.locale",
} as const;

export const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }

  return context;
}
