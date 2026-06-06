- [ ] Inspect `/fusion/fuse` request/response schemas in `backend/fastapi/app/main.py` and `backend/fastapi/app/schemas.py`
- [ ] Update `/fusion/fuse` to accept both request body shapes: direct `FusionFuseInput` and double-wrapped `{"input": {...}}`
- [ ] Restart backend and retry the UI scan flow to confirm 422 is resolved
- [ ] Smoke test: ensure fusion works when only `lat/lng` + `disease_detection_response` are provided

