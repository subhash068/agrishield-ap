function hashShort(input: string) {
  // simple stable hash (non-crypto) for deterministic IDs in this demo
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
}

function sanitize(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export function generateFarmerId(profile: {
  district: string;
  mandal: string;
  village: string;
  phoneNumber: string;
  farmerName: string;
}): string {
  const year = new Date().getFullYear();
  const payload = [profile.phoneNumber, profile.farmerName, profile.district, profile.mandal, profile.village].map(sanitize).join("|");
  const short = hashShort(payload);
  return `AP-FR-${year}-${short}`;
}

function getAbbr(s: string) {
  if (!s) return "XXX";
  const letters = s.replace(/[^a-zA-Z]/g, "");
  return letters.substring(0, 3).toUpperCase().padEnd(3, "X");
}

export function generateParcelId(profile: {
  district: string;
  mandal: string;
  village: string;
  surveyNumber: string;
  cropType: string;
}): string {
  const payload = [
    profile.district,
    profile.mandal,
    profile.village,
    profile.surveyNumber,
    profile.cropType,
  ].map(sanitize).join("|");
  const short = hashShort(payload);
  
  const distAbbr = getAbbr(profile.district);
  const manAbbr = getAbbr(profile.mandal);
  const cropAbbr = getAbbr(profile.cropType);

  return `AP-${distAbbr}-${manAbbr}-${cropAbbr}-${short}`;
}
