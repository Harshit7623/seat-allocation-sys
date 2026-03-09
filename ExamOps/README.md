# Exam Invigilation Reporting System

Web system for exam invigilation reporting with Google Sign-In, FastAPI, Google Apps Script, Google Sheets, and Google Drive.

## 🚀 Features

### Core functionality
- Google OAuth login
- Time-slot based storage (`9AM-11AM`, `11AM-1PM`, `1PM-4PM`, `4PM-6PM`)
- Multi-image upload with client-side compression
- Deterministic `record_id` to prevent duplicate rows
- Post-submit action panel:
   - **Edit Response**
   - **Submit New Response**
- Edit flow updates existing row instead of creating duplicates
- Automatic sheet migration when timeslot changes during edit

### Smart time entry
- Exact time input with AM/PM selector (e.g., `04:00 PM`)
- Auto-maps to correct timeslot window
- Real-time slot validation feedback

### User experience
- Dark/light theme toggle with persistent preference
- Existing image preview when editing (no forced re-upload)
- Mobile-optimized responsive design
- Dynamic loading messages ("Submitting report...", "Updating report...")
- Larger remarks textarea for better input

### Performance
- Optimized Apps Script queries (10-20x faster sheet searches)
- Configurable 20-second timeout for quick failure feedback
- Efficient record lookup using indexed column reads

## 📁 Project structure

```
ExamOps/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
├── google-apps-script/
│   └── Code.gs
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── QUICKSTART.md
└── TESTING.md
```

## 🔑 Core logic

`record_id = SHA256(user_email + exam_date + exam_time)`

For each submission:

- if `record_id` exists in the timeslot sheet → **UPDATE row**
- else → **INSERT row**

So for one user/date/timeslot, only the latest edited version is retained.

## 🛠️ Run locally

### 1) Backend

```powershell
cd backend
pip install -r requirements.txt
python main.py
```

Health check: `http://localhost:8010/health`

### 2) Frontend

```powershell
cd frontend
python -m http.server 5500
```

Open: `http://localhost:5500`

## 🔐 OAuth and CORS (local)

Google OAuth client must allow both origins:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

Backend CORS must include frontend origin (configured via `backend/.env` `CORS_ORIGINS`).

## 📝 API endpoints

- `POST /api/submit-report`
- `GET /api/get-report?record_id=...`
- `POST /api/update-report`
- `GET /health`

## ✅ Current UX behavior

After successful submit/update:

- Form hides
- Success panel shows two buttons:
   - **Edit Response** (reopens form in edit mode)
   - **Submit New Response** (opens clean new form)

Time slot behavior:

- Enter exact exam time (e.g., `04:00`) + select AM/PM
- System auto-maps to exam window (`4PM-6PM`)
- Slot hint displays in real-time
- When editing timeslot, record automatically moves to correct sheet

Date behavior:

- Today's date is valid (local-time safe comparison)
- Future dates are blocked

Image behavior:

- New submit: image required
- Edit submit: image optional when existing image URLs exist
- Existing images display as preview grid during edit

Theme behavior:

- Toggle between dark/light via header button
- Preference persists across sessions
- All inputs/forms adapt to chosen theme

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [TESTING.md](TESTING.md)
