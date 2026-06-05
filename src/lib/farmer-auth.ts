export type FarmerProfile = {
  farmerId: string;
  parcelId: string;
  farmerName: string;
  phoneNumber: string;
  district: string;
  mandal: string;
  village: string;
  surveyNumber: string;
  cropType: string;
  landAreaAcres: number;
};

type FarmerSession = {
  profile: FarmerProfile;
  createdAt: number;
};

const STORAGE_KEY_SESSION = "farmer.session.v1";

export function getFarmerSession(): FarmerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as FarmerSession;
  } catch {
    return null;
  }
}

const FARMER_SESSION_CHANGED_EVENT = "farmer.session.changed";

export function setFarmerSession(session: FarmerSession) {
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  window.dispatchEvent(new Event(FARMER_SESSION_CHANGED_EVENT));
}

export function clearFarmerSession() {
  localStorage.removeItem(STORAGE_KEY_SESSION);
  window.dispatchEvent(new Event(FARMER_SESSION_CHANGED_EVENT));
}


export function isFarmerLoggedIn(): boolean {
  return !!getFarmerSession();
}

export type OTPChallenge = {
  phoneNumber: string;
  code: string;
  expiresAt: number; // epoch ms
};

const STORAGE_KEY_OTP = "farmer.otp.challenge.v1";

export function saveOtpChallenge(challenge: OTPChallenge) {
  localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(challenge));
}

export function getOtpChallenge(): OTPChallenge | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OTP);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OTPChallenge;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOtpChallenge() {
  localStorage.removeItem(STORAGE_KEY_OTP);
}

