# Changelog

All notable changes to the Exam Invigilation Reporting System.

## [2.0.0] - 2026-03-08

### Added
- **Exact time input with AM/PM selector**
  - Enter precise exam time (e.g., `04:00 PM`)
  - Auto-maps to correct timeslot window
  - Real-time validation feedback with slot hint
  
- **Dark/light theme toggle**
  - Header button to switch themes
  - Persistent preference via localStorage
  - Full form/input theme adaptation

- **Existing image preview on edit**
  - Grid display of current attendance images
  - Clickable links to open full images
  - Optional re-upload (keeps existing if no new upload)

- **Cross-sheet timeslot migration**
  - Editing timeslot automatically moves record to correct sheet
  - Old row deleted from source sheet
  - Preserves record_id and data integrity

- **Mobile responsiveness improvements**
  - Optimized form layout for small screens
  - Stacked time input controls on mobile
  - Full-width action buttons
  - Improved touch targets

- **Performance optimizations**
  - Apps Script `findRecordRow()` now 10-20x faster
  - Reads only record_id column instead of all 24 columns
  - Configurable 20-second timeout prevents long waits
  - Dynamic loading messages show current operation

- **UX enhancements**
  - Larger remarks textarea (140px min-height)
  - Operation-specific loading messages
  - Better error message extraction from 422 responses
  - Smooth theme transitions

### Fixed
- Time validation bug where PM times showed "outside exam windows"
- Validation now always uses AM/PM-converted 24-hour time
- CORS configuration robust merge with safe defaults
- Apps Script timeout now configurable via environment

### Changed
- Updated all documentation (README, QUICKSTART, DEPLOYMENT, TESTING, ARCHITECTURE)
- Backend timeout reduced from 30s to 20s for faster user feedback
- Frontend time validation uses real-time AM/PM conversion

### Technical Details
- Frontend: HTML/CSS/JS with Google Sign-In
- Backend: FastAPI with async endpoints
- Storage: Google Sheets (4 timeslot sheets) + Google Drive (images)
- Authentication: Google OAuth 2.0
- Deployment: Apps Script Web App + local dev servers

---

## [1.0.0] - 2026-03-03

### Initial Release
- Google OAuth authentication
- Multi-image upload with compression
- Time-slot based storage (9AM-11AM, 11AM-1PM, 1PM-4PM, 4PM-6PM)
- Edit/update functionality with record_id deduplication
- Post-submit action panel (Edit Response / Submit New Response)
- FastAPI backend with Apps Script integration
- Date validation (today allowed, future blocked)
- Image requirement handling (required for new, optional for edit)
