# TODO - Fertilizer recommendation not updating with photo

## Step 1: Confirm root cause
- [x] Verified frontend fertilizer page (`src/routes/fertilizer.tsx`) uses manual form state.
- [x] Verified backend PoC fertilizer heuristic defaults when satellite inputs are missing.
- [x] Found backend `/disease/detect` sets fertilizer inputs with `satellite_* = None`.

## Step 2: Implement fix
- [ ] Update backend `/fusion/fuse` to compute `fertilizer_recommendation` using:
  - crop (from disease detection / crop gate)
  - satellite CHSS metrics already computed in fusion (`unified_health_index`, `abiotic_stress_score`, `soil_moisture`)
  - disease/pest risk derived from photo + satellite proxies
- [ ] Update `DiseaseDetectionResponseOut` so that `fertilizer_recommendation` is not generated there (or keep but mark as “photo-only default”)
  - minimal: stop showing default fertilizer card from `/disease/detect`
- [ ] Update frontend `/farmers/scan.tsx` to render fertilizer recommendation from fusion output (instead of from `scanResult.fertilizer_recommendation`)

## Step 3: Testing
- [ ] Run backend + frontend and upload multiple photos.
- [ ] Verify fertilizer output changes with photo severity/crop.

