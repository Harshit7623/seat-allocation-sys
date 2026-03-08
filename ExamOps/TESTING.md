# Testing Guide

This guide matches the current finalized UX and API behavior.

## ✅ Pre-check

- Backend health returns 200 at `http://localhost:8010/health`
- Frontend served at `http://localhost:5500`
- Google OAuth origins configured for localhost/127.0.0.1
- Google Apps Script deployed and reachable

## 1) Core happy-path tests

### T1: New submission

1. Sign in
2. Fill required fields
3. Upload at least one image
4. Submit

Expected:

- Success panel appears
- Form hides
- Buttons visible: **Edit Response**, **Submit New Response**
- Row appears in correct timeslot sheet

### T2: Edit response update (same timeslot)

1. From success panel, click **Edit Response**
2. Form reopens with prefilled data and existing images preview
3. Change one field (e.g., `copies_used`)
4. Do NOT upload new images
5. Click **Update Report**

Expected:

- Update succeeds
- Same `record_id` updated in same sheet
- No duplicate row created
- Existing image URLs retained

### T2b: Edit response with timeslot change

1. From success panel, click **Edit Response**
2. Change time to different slot (e.g., `09:30 AM` → `04:30 PM`)
3. Verify slot hint changes from `9AM-11AM` to `4PM-6PM`
4. Click **Update Report**

Expected:

- Record moves to `4PM-6PM` sheet
- Old row removed from `9AM-11AM` sheet
- Same `record_id` preserved

### T3: Submit new response flow

1. From success panel, click **Submit New Response**

Expected:

- Fresh blank form opens
- `record_id` hidden value cleared
- File input required again

## 2) Validation tests

### T4: Exact time and AM/PM validation

- Enter `09:30` + `AM` → should show `9AM-11AM`
- Enter `04:00` + `PM` → should show `4PM-6PM`
- Enter `08:00` + `AM` → should show "outside exam windows"
- Enter `13:00` (invalid 12-hour) → should fail

### T5: Date validation

- Today's date must be accepted
- Future date must be rejected

### T6: Image behavior

- New submit without image → should fail
- Edit submit without new image but with existing URLs → should pass
- Existing images should show as preview grid during edit

### T7: Theme toggle

- Click theme button → UI switches to dark/light
- Reload page → theme preference persists

### T8: Numeric fields

- Negative values should be blocked
- Empty optional class-2/class-3 numeric fields should safely default to `0`

### T9: Mobile responsiveness

- Test on mobile device or browser dev tools device mode
- Form controls should be usable without excessive zooming
- Time input and AM/PM selector should stack vertically on small screens
- Theme toggle and sign-out buttons should be full-width on mobile

## 3) API sanity checks

### Health

```powershell
Invoke-RestMethod -Uri "http://localhost:8010/health" -Method Get
```

### CORS preflight (local)

```powershell
Invoke-WebRequest -Uri "http://localhost:8010/api/submit-report" -Method Options -UseBasicParsing -Headers @{ Origin="http://localhost:5500"; "Access-Control-Request-Method"="POST" }
```

## 4) Regression checklist

- [ ] Google sign-in works without origin 403
- [ ] Exact time input with AM/PM correctly maps to slots
- [ ] Submit report creates row and image URL(s)
- [ ] Success panel buttons appear after submit
- [ ] Edit response updates same row (no duplicate)
- [ ] Editing timeslot moves record to correct sheet
- [ ] Existing images show as preview during edit
- [ ] Submit new response resets to new-entry mode
- [ ] Today date accepted
- [ ] No 422 for `attendance_images` during edit submit
- [ ] Theme toggle works and persists
- [ ] Loading messages show operation-specific text
- [ ] Update performance is fast (2-5 seconds, not 15-20)

## 5) Known expected warnings

- `favicon.ico 404` from local static server is harmless
- Pydantic v1 validator deprecation warnings are non-blocking for runtime
