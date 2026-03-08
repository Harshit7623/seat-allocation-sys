# Deployment Guide

This guide reflects the current finalized app behavior and field model.

## 1) Prerequisites

- Google account
- Python 3.10+
- Existing project clone (`ExamOps`)

## 2) Google setup

### 2.1 Google Sheet + Drive

In `google-apps-script/Code.gs`, set:

- `SPREADSHEET_ID`
- `DRIVE_FOLDER_ID`
- `API_KEY`

### 2.2 Deploy Apps Script Web App

- Deploy as **Web app**
- Execute as **Me**
- Access: **Anyone**
- Copy deployed URL

## 3) Backend configuration

Create/update `backend/.env`:

```env
DEBUG=True
HOST=0.0.0.0
PORT=8010

GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
GOOGLE_APPS_SCRIPT_API_KEY=<same-key-as-Code.gs>
APPS_SCRIPT_TIMEOUT_SECONDS=20

CORS_ORIGINS=["http://localhost:5500","http://127.0.0.1:5500","http://localhost:3000","http://127.0.0.1:3000","http://localhost:8010","http://127.0.0.1:8010"]
```

**Key settings:**
- `APPS_SCRIPT_TIMEOUT_SECONDS`: Prevents long waits when Apps Script is slow (default 20 seconds)

## 4) OAuth configuration

For your OAuth Web client, set Authorized JavaScript origins:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

## 5) Run locally

### Backend

```powershell
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend

```powershell
cd frontend
python -m http.server 5500
```

## 6) Smoke test

1. Open `http://localhost:5500`
2. Sign in with Google
3. Enter exact time (e.g., `09:30 AM`) and verify auto-slot shows `9AM-11AM`
4. Submit report with image
5. Verify sheet row and drive image
6. On success panel, click **Edit Response**
7. Change timeslot (e.g., to `01:00 PM` → slot changes to `1PM-4PM`)
8. Update without uploading new images (existing images preview shown)
9. Click **Update Report**
10. Verify:
    - Row moved to new timeslot sheet (`1PM-4PM`)
    - Old row removed from `9AM-11AM` sheet
    - Existing images retained
11. Click **Submit New Response** and verify fresh form opens
12. Toggle theme button and verify dark/light switch works

## 7) Production notes

- Keep API keys only in server-side/config files
- Allow only production frontend origins in CORS
- Enable HTTPS everywhere
- Re-deploy Apps Script when script logic changes

## 8) Troubleshooting

### Google Sign-In 403 origin error

- Verify OAuth origins include localhost/127.0.0.1 entries
- Wait a few minutes for propagation
- Hard refresh / test in incognito

### Backend 422 during edit/update

- Restart backend after updates
- Hard refresh frontend
- Ensure required fields are present

### `No module named fastapi`

- Install backend requirements with `pip install -r backend/requirements.txt`

### CORS errors

- Verify `CORS_ORIGINS` includes frontend origin
- Restart backend after `.env` changes

### Slow performance during update

- Ensure latest optimized `Code.gs` is deployed
- Check `APPS_SCRIPT_TIMEOUT_SECONDS` is set (default 20)
- Verify Apps Script uses column-only reads in `findRecordRow()`

### Timeslot validation failing

- Ensure time is in 12-hour format (not 24-hour)
- Check AM/PM selector value matches entered time
- Valid windows: 9AM-11AM, 11AM-1PM, 1PM-4PM, 4PM-6PM
