# TODO

## Field Advisory Screen (AP-001245)
- [ ] Create helper for normalized “field advisory payload” using existing mock data
- [ ] Add new route `/field-advisory/$fieldId` that composes the full workflow (satellite → AI → risks → weather alert → recommendations)
- [ ] Add Farmer Action Tracking UI (local state) + upload validation image control
- [ ] Wire navigation button from `src/routes/satellite.tsx` parcel detail to the field advisory route
- [ ] Run `bun run lint` and `bun run build`
- [ ] Manually verify in dev server: open advisory from a parcel and ensure AP-001245 shows the provided content structure

