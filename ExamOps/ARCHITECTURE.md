# System Architecture Overview

## 1) High-level architecture

```
Frontend (HTML/CSS/JS)
    └── FormData (submit/update)
        └── FastAPI backend (`/api/*`)
            └── JSON request with API key query param
                └── Google Apps Script Web App
                    ├── Google Sheets (report records)
                    └── Google Drive (attendance images)
```

## 2) Core entities

Primary uniqueness key:

- `record_id = SHA256(user_email + exam_date + exam_time)[:16]`

That guarantees one logical record per user/date/time-slot.

## 3) Main workflows

### 3.1 New submit

1. User enters exact time (e.g., `04:00`) and selects AM/PM
2. Frontend auto-maps to timeslot window (e.g., `4PM-6PM`)
3. User fills form and uploads image(s)
4. Frontend compresses images and posts to `POST /api/submit-report`
5. Backend generates `record_id`
6. Apps Script writes to the correct timeslot sheet:
   - update if same `record_id` exists
   - insert otherwise

### 3.2 Edit response (same timeslot)

1. After submit, success panel shows:
   - **Edit Response**
   - **Submit New Response**
2. Edit loads record via `GET /api/get-report`
3. Form reopens prefilled in edit mode
4. Existing images display as preview grid
5. User updates values and submits to `POST /api/update-report`
6. Existing row is replaced in same sheet (same `record_id`, no duplicate)

### 3.3 Edit response (different timeslot)

1. User changes time to different slot (e.g., `09:30 AM` → `04:00 PM`)
2. Frontend remaps to new slot (`9AM-11AM` → `4PM-6PM`)
3. Apps Script:
   - Writes updated row to target timeslot sheet
   - Deletes old row from source timeslot sheet
   - Preserves same `record_id`

## 4) Frontend state model

Important state flags in `frontend/app.js`:

- `isEditMode` — tracks whether form is in edit vs new-entry mode
- `lastSubmittedRecordId` — enables "Edit Response" after submit
- `existingImageUrls` — comma-separated URLs for existing images
- Theme preference stored in `localStorage` (`preferredTheme`)

Behavior:

- New submission requires image upload
- Edit submission can skip new image upload if previous image URLs exist
- Existing images render as preview grid during edit
- Form hides after submit/update and success actions are shown
- Time input uses AM/PM selector with auto-mapping to timeslot
- Loading spinner shows operation-specific messages
- Theme toggle persists across sessions

## 5) Backend API contracts

- `POST /api/submit-report`
  - requires at least one `attendance_images`
- `POST /api/update-report`
  - accepts `attendance_images` (single or list) or `existing_image_urls`
- `GET /api/get-report?record_id=...`
  - returns saved record payload for edit prefill

## 6) Storage layout

Google Sheet is split by exam time slot:

- `9AM-11AM`
- `11AM-1PM`
- `1PM-4PM`
- `4PM-6PM`

Each row includes:

- identity fields (`record_id`, `user_email`, `exam_date`, `exam_time`)
- invigilation counts/details
- attendance image URL(s)
- `last_updated`

## 7) Performance optimizations

### Frontend
- Client-side image compression before upload
- Debounced time validation for smooth UX
- Efficient DOM updates during theme toggle
- Mobile-optimized responsive CSS

### Backend
- Configurable Apps Script timeout (20 seconds default)
- Parallel-ready FastAPI async endpoints
- Efficient CORS middleware configuration

### Apps Script
- Optimized `findRecordRow()` reads only record_id column (10-20x faster)
- Early-exit loop when record found during update search
- Indexed column access instead of full-row reads

## 8) Reliability and validation notes

- CORS configured for local/dev origins
- Local-date-safe frontend validation prevents false "today is future" issue
- Backend validates upload type/size
- Frontend surfaces FastAPI validation details for 422 errors
- AM/PM conversion ensures correct 24-hour time mapping
- Real-time slot validation feedback before submit
