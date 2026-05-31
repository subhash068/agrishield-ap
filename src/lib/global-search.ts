const SEARCH_RULES = [
  {
    to: "/weather",
    keywords: [
      "weather",
      "rain",
      "drought",
      "heatwave",
      "cyclone",
      "monsoon",
      "temperature",
      "humidity",
    ],
  },
  {
    to: "/predictions",
    keywords: ["forecast", "prediction", "predict", "risk", "yield", "outlook"],
  },
  {
    to: "/government",
    keywords: [
      "scheme",
      "subsidy",
      "subsidies",
      "insurance",
      "benefit",
      "disbursement",
      "rythu",
      "pmfby",
    ],
  },
  {
    to: "/disease",
    keywords: ["disease", "pest", "blast", "blight", "fungus", "bollworm", "infect"],
  },
  { to: "/mandal", keywords: ["mandal", "rsk", "surveillance", "outbreak", "monitoring"] },
  { to: "/farmers", keywords: ["farmer", "aadhaar", "portal", "eligibility", "services"] },
  {
    to: "/settings",
    keywords: ["settings", "preference", "language", "notification", "integration"],
  },
  { to: "/reports", keywords: ["report", "summary", "brief", "analytics"] },
  { to: "/parcels", keywords: ["parcel", "field", "crop", "satellite", "ndvi", "evi", "farm"] },
] as const;

export type SearchIntent = {
  to: string;
  district?: string;
  message: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveGlobalSearch(query: string, districts: string[]): SearchIntent {
  const trimmed = query.trim();
  const normalized = normalize(trimmed);

  const matchedDistrict = districts.find((district) => {
    const normalizedDistrict = normalize(district);
    return (
      normalizedDistrict === normalized ||
      normalized.includes(normalizedDistrict) ||
      normalizedDistrict.includes(normalized)
    );
  });

  if (matchedDistrict) {
    return {
      to: "/mandal",
      district: matchedDistrict,
      message: `Opened ${matchedDistrict} district view`,
    };
  }

  const matchedRule = SEARCH_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );

  if (matchedRule) {
    return {
      to: matchedRule.to,
      message: `Opened ${matchedRule.to.slice(1)} for "${trimmed}"`,
    };
  }

  return {
    to: "/parcels",
    message: `Searching parcels for "${trimmed}"`,
  };
}

export function getAssistantSuggestions() {
  return [
    { title: "Parcel search", query: "find cotton parcels in Guntur" },
    { title: "Weather watch", query: "show drought risk" },
    { title: "Scheme check", query: "open subsidy schemes" },
    { title: "Disease triage", query: "inspect pest alerts" },
  ];
}
