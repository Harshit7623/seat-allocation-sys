# Quick Start Guide

## 🚀 Setup in 6 steps

### 1) Configure Google OAuth (Web client)

In Google Cloud Console → OAuth client (Web application), add **Authorized JavaScript origins**:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

Then make sure client ID is set in frontend config:

- `frontend/index.html` → `data-client_id`
- `frontend/app.js` → `CONFIG.GOOGLE_CLIENT_ID`

---

### 2) Configure Google Sheet + Drive

Set these in `google-apps-script/Code.gs`:

- `SPREADSHEET_ID`
- `DRIVE_FOLDER_ID`
- `API_KEY`

---

### 3) Deploy Google Apps Script

1. Deploy as **Web app**
2. Execute as: **Me**
3. Access: **Anyone**
4. Copy deployment URL

Set backend values in `backend/.env`:

- `GOOGLE_APPS_SCRIPT_URL=<your-web-app-url>`
- `GOOGLE_APPS_SCRIPT_API_KEY=<same-api-key-as-Code.gs>`

---

### 4) Start backend

From project root:

```powershell
cd backend
pip install -r requirements.txt
python main.py
```

Backend health: `http://localhost:8010/health`

---

### 5) Start frontend

In a new terminal:

```powershell
cd frontend
python -m http.server 5500
```

Open: `http://localhost:5500`

---

### 6) Test the final flow

1. Sign in with Google
2. Submit report with at least one image
3. Form hides and success panel shows two actions:
   - **Edit Response**
   - **Submit New Response**
4. Click **Edit Response**, modify values, click **Update Report**
5. Verify same row is updated in Google Sheet (no duplicate row)

---

## ✅ Expected behavior (latest)

**Time entry:**
- Enter exact time (e.g., `11:30`) and choose AM/PM
- System auto-maps to slot (`11AM-1PM`)
- Real-time validation shows slot or error

**Date validation:**
- Today's date is allowed (local-time safe validation)
- Future dates are blocked

**Image handling:**
- On first submit, image is required
- On edit submit, image re-upload is optional if existing images already exist
- Existing images show as preview grid when editing

**Record management:**
- Only one final row is kept per `(user_email, exam_date, exam_time)`
- When editing timeslot, record moves to new timeslot sheet automatically

**Theme & UX:**
- Toggle dark/light theme via header button
- Larger remarks box for comfortable typing
- Mobile-friendly responsive layout
- Loading messages show current operation ("Submitting...", "Updating...")

---

## 🆘 Quick fixes

- **Google 403 origin not allowed**: verify OAuth origins include both localhost and 127.0.0.1
- **CORS error**: ensure `backend/.env` includes `http://localhost:5500`
- **`No module named fastapi`**: run `pip install -r backend/requirements.txt`
- **422 during update**: hard refresh frontend and restart backend after latest updates
- **"Auto slot: outside exam windows" error**: ensure time is in 12-hour format (01:00-12:59) and AM/PM is selected correctly
- **Slow update/submit**: redeploy Apps Script with latest optimized `Code.gs`
- **Theme not persisting**: check browser localStorage is enabled

---

For full details, see:

- [README.md](README.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [TESTING.md](TESTING.md)