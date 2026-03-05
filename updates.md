# Changes & Modifications

## Bug Fixes
- **`db_loader.py`** — Fixed column name extraction (`col[0]` → `list(result.keys())`), was silently extracting first character of column name
- **`schema.py`** — Fixed broken FK references pointing to dead table `users_old_backup`, auto-repair migration added for 3 affected tables
- **`requirements.txt`** — Upgraded `sqlalchemy` `2.0.23` → `2.0.36` (Python 3.13 crash fix), removed wrong `cors==1.0.1` package

## New Features
- **`clean_old_data.py`** — Rewrote as automated server-side daemon cleanup job
  - Cleans `user_activity_log` > **2 days** old
  - Cleans expired/completed sessions + all cascade children > **20 days** old
  - Cleans orphaned rows (allocations, uploads, students)
  - Cleans resolved feedback > **20 days** old
  - Cleans stale `cache/*.json` with no matching DB session
  - Cleans `temp_uploads/` > **20 days** old
  - Runs `VACUUM` post-cleanup to reclaim disk space
  - Repeats automatically every **20 days** via daemon thread
- **`main.py`** — Hooked `start_scheduler()` into server startup

## Removed
- **Windows artifacts** — `setup.bat`, `start.ps1` (×2), `backend/act/` (Windows venv)
- **Runtime artifacts** — `__pycache__/` dirs, leftover `demo.db` upload, stale `.python-version`
- **Doc bloat** — 9 redundant AI-generated `.md` files (`ARCHITECTURE.md`, `CHECKLIST.md`, `DEPLOYMENT.md`, `DEVELOPMENT.md`, `INDEX.md`, `MANIFEST.md`, `PROJECT_SUMMARY.md`, `QUICKSTART.md`, `START_HERE.md`)
---

## exam-seat-locator — Updates (March 2026)

### Architecture Overhaul
- **`core/`** — New package replacing monolithic `seat_service.py`
  - **`lru_cache.py`** — Thread-safe LRU (`OrderedDict` + `threading.Lock`, `maxsize=5`)
  - **`cache.py`** — `AppCache` singleton: `_index` (summary dict, never evicted) + `_lru` (`_PlanEntry` objects)
  - **`plan_index.py`** — Builds/loads `summary_index.json`; roll → filename(s) map, O(1) lookup, hit-count tracking
  - **`extractor.py`** — Raw PLAN dict → list of normalised room sessions
  - **`indexer.py`** — Builds `student_index` (`(roll, date, start, end)` → seat) and `session_index`
  - **`loader.py`** — Reads `PLAN-*.json` from disk, parses `%m-%d-%Y` dates
  - **`matrix.py`** — Builds 2-D seat grid; added `position` field (e.g. `B5`) to every cell dict

### Bug Fixes
- **Date parsing** — Fixed `%d/%m/%Y` → `%m-%d-%Y` to match actual PLAN file format
- **Column label alignment** — Moved `A,B,C…` axis row inside `.seat-grid` (guaranteed CSS grid alignment)
- **Info card CSS vars** — Fixed `var(--card-bg)` → `var(--surface)`, `var(--card-border)` → `var(--border)`, `var(--text-primary)` → `var(--text)`; removed empty `--sic-color` guard
- **Logging** — Set `werkzeug` logger to WARNING to suppress per-request noise; app logger visible at INFO

### New Features
- **Multi-file support** — Loads all `PLAN-*.json` files; top-3 most-hit pre-warmed into LRU on startup
- **`summary_index.json`** — Auto-generated index (~200 KB) for O(1) per-search without reading plan files
- **Seat info card** — Click `.seat-mine` tile → modal showing name, roll, room, batch, date, time, row/col, grid ref (B5)
- **Dynamic dropdowns** — Exam date and time slot on `/` now `<select>` populated from `cache.unique_dates` / `cache.unique_times`
- **`POST /reload`** — Rebuilds index + clears LRU; returns stats JSON (no server restart needed after adding files)
- **`POST /upload`** — Upload new `PLAN-*.json` directly from UI; index rebuilds automatically

### UI / Style
- **Column labels** — Renamed `C1,C2…` → `A,B,C…` (standard classroom convention)
- **Empty seats** — "Empty" consolidated into "Unallocated"; redundant legend entry removed
- **Theme transition** — `.theme-transitioning` CSS class applied for 250 ms on toggle, co-transitions `background-color + color + border-color`
- **Light mode contrast** — `.seat-occupied .seat-label` forced to `#0f172a`; `.sic-label` darkened to `#334155`
- **Jinja style attrs** — Replaced `{% if %}` blocks in `style=` attributes with inline ternary; eliminates 17 VS Code CSS linter errors
- **Mobile fix** — `.grid-scroller` + `align-items: stretch` prevents first-column clipping on small screens

