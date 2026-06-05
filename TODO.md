# TODO - AgriShield AP Hackathon Demo (ICRISAT-driven)

## Step 1: Build ICRISAT-backed yield prediction backend
- [ ] Add an in-memory loader for `data/ICRISAT-District Level Data.csv` (cached).
- [ ] Implement forecasting/risk logic:
  - Use historical yield for (district, crop)
  - Combine user rainfall signal with historical pattern to produce:
    - predicted yield (kg/ha)
    - predicted production (1000 tons)
    - risk level (Low/Medium/High/Critical)
- [ ] Expose endpoints:
  - [ ] `GET /yield/history?district=&crop=` -> time-series
  - [ ] `POST /yield/predict` -> prediction with risk

## Step 2: Add ICRISAT early warning endpoints
- [ ] Implement yield-reduction risk:
  - Compare predicted yield vs historical moving average / previous year
  - Output % reduction and risk level.
- [ ] Expose endpoint:
  - [ ] `POST /yield/alerts` -> reduction % + risk + short explanation

## Step 3: Frontend “AI Crop Yield Prediction Dashboard” UI
- [ ] Add new route/page (or extend existing `/predictions`) for interactive form:
  - District, Crop, Year, Rainfall
- [ ] Show:
  - predicted yield + production + risk badge
  - yield history line chart
  - AI insight cards

## Step 4: Frontend “Yield reduction early warning” UI
- [ ] Add section/page to show:
  - district + crop selection
  - yield reduction % and risk
  - recommended advisory line(s)

## Step 5: Demo polish & testing
- [ ] Run backend + frontend locally
- [ ] Validate API responses with sample inputs (West Godavari + Rice)
- [ ] Ensure UI loads without needing external services

