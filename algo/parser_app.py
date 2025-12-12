# app_demo.py
"""
Demo server for StudentDataParser + SQLite demo.db.

- /                   -> serves frontend/index.html (upload UI)
- /api/upload         -> parse file, return preview (no DB write)
- /api/commit-upload  -> write previewed batch to demo.db (uploads + students tables)
- /api/students       -> list stored students (optionally filtered, grouped by upload)
"""

import json
import sqlite3
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from student_parser import StudentDataParser, ParseResult

app = Flask(__name__, static_folder="../frontend", static_url_path="/")
CORS(app)

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "demo.db"

parser = StudentDataParser()
PREVIEWS_DIR = BASE_DIR / "previews"
PREVIEWS_DIR.mkdir(exist_ok=True)


# ----------------------------------------------------------------------
# DB bootstrap + light migration
# ----------------------------------------------------------------------
def ensure_demo_db() -> None:
    """
    Initialize / migrate demo.db with:
      - uploads: one row per committed file/batch (logical upload)
      - students: rows linked to uploads via upload_id

    If students table already exists without upload_id, we ALTER it to add that
    column instead of asking you to delete the DB.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # uploads table: each commit from /api/commit-upload creates one row here
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT UNIQUE,
            batch_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # students table: try to create new-style table if it doesn't exist
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER,
            batch_id TEXT NOT NULL,
            batch_name TEXT,
            enrollment TEXT NOT NULL,
            name TEXT,
            meta TEXT,
            inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (upload_id) REFERENCES uploads(id)
        );
        """
    )
    conn.commit()

    # --- light migration: ensure upload_id + meta columns exist ---
    cur.execute("PRAGMA table_info(students);")
    cols = [r[1] for r in cur.fetchall()]

    if "upload_id" not in cols:
        # old schema: add upload_id so new code can use it
        cur.execute("ALTER TABLE students ADD COLUMN upload_id INTEGER;")
        conn.commit()

    if "meta" not in cols:
        cur.execute("ALTER TABLE students ADD COLUMN meta TEXT;")
        conn.commit()

    # rooms & allocations kept as you had them (for future use)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT UNIQUE,
            name TEXT,
            layout_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT,
            batch_id TEXT,
            enrollment TEXT,
            room_id TEXT,
            seat_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    conn.close()


ensure_demo_db()


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.route("/")
def index():
    """Serve the simple upload UI from frontend/index.html."""
    return send_from_directory(str(BASE_DIR.parent / "frontend"), "index.html")


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """
    multipart/form-data:
        file: CSV/XLSX
        mode: 1 or 2
        batch_name: optional

    Uses StudentDataParser.parse_file(file_like, ...) which returns ParseResult.
    Saves preview JSON to disk; no DB write yet.
    """
    try:
        f = request.files.get("file")
        if f is None:
            return jsonify({"error": "No file uploaded"}), 400

        mode = int(request.form.get("mode", 2))
        batch_name = request.form.get("batch_name", "BATCH1")

        # Parse using parser (FileStorage is file-like)
        pr: ParseResult = parser.parse_file(f, mode=mode, batch_name=batch_name)

        # Save preview JSON to disk for commit step
        preview_json = parser.to_json_str(pr)
        preview_path = PREVIEWS_DIR / f"{pr.batch_id}.json"
        preview_path.write_text(preview_json, encoding="utf-8")

        sample = pr.data.get(pr.batch_name, [])[:10]

        return jsonify(
            {
                "batch_id": pr.batch_id,
                "batch_name": pr.batch_name,
                "rows_total": pr.rows_total,
                "rows_extracted": pr.rows_extracted,
                "warnings": pr.warnings,
                "errors": pr.errors,
                "sample": sample,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/commit-upload", methods=["POST"])
def api_commit_upload():
    """
    Commit a previously parsed preview to demo.db.

    JSON body: {"batch_id": "..."}

    Behavior:
      - Creates/uses a row in uploads (one per batch_id)
      - Stores all students with upload_id pointing to that upload
      - No conflict between different files: each upload has its own upload_id
    """
    try:
        body = request.get_json(force=True)
        batch_id = body.get("batch_id")
        if not batch_id:
            return jsonify({"error": "batch_id required"}), 400

        preview_path = PREVIEWS_DIR / f"{batch_id}.json"
        if not preview_path.exists():
            return jsonify({"error": "Preview not found. Re-upload file first."}), 404

        pr_dict = json.loads(preview_path.read_text(encoding="utf-8"))
        batch_name = pr_dict.get("batch_name")
        data = pr_dict.get("data", {}).get(batch_name, [])

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        # 1) Create or get upload row for this batch_id
        cur.execute(
            """
            INSERT OR IGNORE INTO uploads (batch_id, batch_name)
            VALUES (?, ?)
            """,
            (batch_id, batch_name),
        )
        conn.commit()

        cur.execute("SELECT id FROM uploads WHERE batch_id = ?", (batch_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": "Failed to create or fetch upload record"}), 500

        upload_id = row[0]

        inserted = 0
        skipped = 0
        errors = []

        for row_data in data:
            if isinstance(row_data, str):
                enrollment = str(row_data).strip()
                name = None
            else:
                enrollment = str(row_data.get("enrollmentNo", "")).strip()
                name_raw = row_data.get("name")
                name = str(name_raw).strip() if name_raw is not None else None

            if not enrollment:
                continue

            try:
                cur.execute(
                    """
                    INSERT INTO students (
                        upload_id, batch_id, batch_name, enrollment, name, meta
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (upload_id, batch_id, batch_name, enrollment, name, json.dumps({})),
                )
                inserted += 1
            except sqlite3.IntegrityError:
                # duplicate (upload_id, enrollment) -> skip
                skipped += 1
            except Exception as ex:
                errors.append(str(ex))

        conn.commit()
        conn.close()

        return jsonify(
            {
                "upload_id": upload_id,
                "batch_id": batch_id,
                "batch_name": batch_name,
                "inserted": inserted,
                "skipped": skipped,
                "errors": errors,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/students", methods=["GET"])
def api_students():
    """
    List students from demo.db.

    Optional query params:
      - batch_id=...   -> only students belonging to that batch_id
      - upload_id=...  -> only students belonging to that upload_id

    Results are ordered by latest upload first, then by student id.
    """
    batch_id = request.args.get("batch_id")
    upload_id = request.args.get("upload_id")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    base_sql = """
        SELECT
            s.id,
            s.upload_id,
            u.batch_id,
            u.batch_name,
            u.created_at AS upload_created_at,
            s.enrollment,
            s.name,
            s.inserted_at
        FROM students s
        LEFT JOIN uploads u ON s.upload_id = u.id
    """
    where_clauses = []
    params = []

    if batch_id:
        where_clauses.append("u.batch_id = ?")
        params.append(batch_id)
    if upload_id:
        where_clauses.append("s.upload_id = ?")
        params.append(upload_id)

    if where_clauses:
        base_sql += " WHERE " + " AND ".join(where_clauses)

    base_sql += " ORDER BY s.upload_id DESC, s.id ASC LIMIT 1000"

    try:
        cur.execute(base_sql, tuple(params))
    except sqlite3.OperationalError as op_err:
        # Fallback: older schema with no upload_id / no uploads table
        # This should not normally happen after ensure_demo_db, but we keep it defensive.
        simple_sql = """
            SELECT
                s.id,
                NULL AS upload_id,
                s.batch_id AS batch_id,
                s.batch_name AS batch_name,
                NULL AS upload_created_at,
                s.enrollment,
                s.name,
                s.inserted_at
            FROM students s
            ORDER BY s.id ASC LIMIT 1000
        """
        cur.execute(simple_sql)
        rows = cur.fetchall()
        conn.close()

        result = []
        for r in rows:
            result.append(
                {
                    "id": r["id"],
                    "upload_id": None,
                    "batch_id": r["batch_id"],
                    "batch_name": r["batch_name"],
                    "upload_created_at": None,
                    "enrollment": r["enrollment"],
                    "name": r["name"],
                    "inserted_at": r["inserted_at"],
                }
            )
        return jsonify(result)

    rows = cur.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append(
            {
                "id": r["id"],
                "upload_id": r["upload_id"],
                "batch_id": r["batch_id"],
                "batch_name": r["batch_name"],
                "upload_created_at": r["upload_created_at"],
                "enrollment": r["enrollment"],
                "name": r["name"],
                "inserted_at": r["inserted_at"],
            }
        )
    return jsonify(result)


if __name__ == "__main__":
    print("Parser demo server running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
