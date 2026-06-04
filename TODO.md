# TODO - Farmer Mobile App (Mock-first)

## Plan overview
Implement a mobile-style Farmer App under `/farmers` with mock login/OTP and mock Farmer/Parcel ID generation (frontend only), while wiring Scan/Weather/Alerts to existing backend endpoints.

## Steps
- [ ] Step 1: Replace `src/routes/farmers.tsx` with a Farmer App shell (login-gated + bottom tab navigation).
- [ ] Step 2: Add farmer auth mock module (`src/lib/farmer-auth.ts`) storing session + localStorage persistence.
- [ ] Step 3: Add farmer ID/parcel ID generator (`src/lib/farmer-id.ts`).
- [ ] Step 4: Add new farmer routes (under `src/routes/farmers/`):
  - [ ] `/farmers/login`
  - [ ] `/farmers/register`
  - [ ] `/farmers/verify-otp`
  - [ ] `/farmers/dashboard`
  - [ ] `/farmers/scan`
  - [ ] `/farmers/weather`
  - [ ] `/farmers/alerts`
  - [ ] `/farmers/advisory`
  - [ ] `/farmers/reports`
  - [ ] `/farmers/profile`
- [ ] Step 5: Reuse existing scan logic (camera/gallery upload + `detectDisease`) in `/farmers/scan`.
- [ ] Step 6: Weather tab shows live summary using `getWeatherLiveSummary()` (`/weather/live`).
- [ ] Step 7: Alerts tab shows backend alerts using `getAlerts()` + allow creating new alerts using `createAlert()`.
- [ ] Step 8: Offline mode (basic): queue create-alert + report submissions to localStorage when fetch fails, and retry when online.
- [ ] Step 9: Basic farmer dashboard + crop health score UI derived from backend parcels (`/parcels`) matched to farmer parcel id (until mapping exists, show closest parcel list item).
- [ ] Step 10: Run `bun run dev` and manually test the flow end-to-end.

