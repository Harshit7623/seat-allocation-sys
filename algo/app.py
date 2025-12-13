# # app.py — FULL, CONTRACT-SAFE, MERGED SERVER

# import os
# import sys
# import json
# import time
# import sqlite3
# from pathlib import Path
# from functools import wraps
# from typing import Dict, List, Tuple

# from flask import Flask, request, jsonify, render_template_string, send_file
# from flask_cors import CORS
# app = Flask(__name__)
# CORS(app, supports_credentials=True)


# # ---------------- PATH SETUP ---------------- #

# BASE_DIR = Path(__file__).parent.resolve()
# DB_PATH = BASE_DIR / "demo.db"
# INDEX_HTML = BASE_DIR / "index.html"

# sys.path.insert(0, str(BASE_DIR))

# # ---------------- IMPORTS ---------------- #

# from student_parser import StudentDataParser
# from algo import SeatingAlgorithm

# try:
#     sys.path.insert(0, str(BASE_DIR.parent / "Backend"))
#     from auth_service import signup as auth_signup, login as auth_login, verify_token, get_user_by_token, update_user_profile
# except Exception:
#     auth_signup = auth_login = verify_token = get_user_by_token = update_user_profile = None

# # ---------------- APP ---------------- #

# app = Flask(__name__)
# CORS(app, resources={r"/api/*": {"origins": "*"}})

# MAX_FILE_SIZE = 50 * 1024 * 1024
# CACHE_TTL_SECONDS = 3600

# # ---------------- DB BOOTSTRAP ---------------- #

# def ensure_demo_db():
#     conn = sqlite3.connect(DB_PATH)
#     cur = conn.cursor()

#     cur.execute("""
#         CREATE TABLE IF NOT EXISTS uploads (
#             id INTEGER PRIMARY KEY AUTOINCREMENT,
#             batch_id TEXT UNIQUE,
#             batch_name TEXT,
#             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
#         )
#     """)

#     cur.execute("""
#         CREATE TABLE IF NOT EXISTS students (
#             id INTEGER PRIMARY KEY AUTOINCREMENT,
#             upload_id INTEGER,
#             batch_id TEXT,
#             batch_name TEXT,
#             enrollment TEXT NOT NULL,
#             name TEXT,
#             inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
#             UNIQUE(upload_id, enrollment)
#         )
#     """)

#     cur.execute("""
#         CREATE TABLE IF NOT EXISTS allocations (
#             id INTEGER PRIMARY KEY AUTOINCREMENT,
#             job_id TEXT,
#             upload_id INTEGER,
#             enrollment TEXT,
#             room_id TEXT,
#             seat_id TEXT,
#             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
#         )
#     """)

#     conn.commit()
#     conn.close()

# ensure_demo_db()

# # ---------------- AUTH DECORATOR ---------------- #

# def token_required(f):
#     @wraps(f)
#     def wrapper(*args, **kwargs):
#         if verify_token is None:
#             return jsonify({"error": "Auth not configured"}), 501

#         header = request.headers.get("Authorization", "")
#         if not header.startswith("Bearer "):
#             return jsonify({"error": "Missing token"}), 401

#         token = header.split(" ", 1)[1]
#         payload = verify_token(token)
#         if not payload:
#             return jsonify({"error": "Invalid token"}), 401

#         request.user_id = payload.get("user_id")
#         return f(*args, **kwargs)
#     return wrapper

# # ---------------- CACHE ---------------- #

# def cleanup_cache():
#     if not hasattr(app, "upload_cache"):
#         app.upload_cache = {}
#     now = time.time()
#     app.upload_cache = {
#         k: v for k, v in app.upload_cache.items()
#         if now - v["timestamp"] < CACHE_TTL_SECONDS
#     }

# # ---------------- HELPERS ---------------- #

# def parse_int_dict(val):
#     if isinstance(val, dict):
#         return {int(k): int(v) for k, v in val.items()}
#     if isinstance(val, str):
#         out = {}
#         for p in val.split(","):
#             if ":" in p:
#                 try:
#                     k, v = p.split(":", 1)
#                     out[int(k.strip())] = int(v.strip())
#                 except:
#                     pass
#         return out
#     return {}

# def parse_str_dict(val):
#     if isinstance(val, dict):
#         return {int(k): str(v) for k, v in val.items()}
#     if isinstance(val, str):
#         out = {}
#         for p in val.split(","):
#             if ":" in p:
#                 try:
#                     k, v = p.split(":", 1)
#                     out[int(k.strip())] = v.strip()
#                 except:
#                     pass
#         return out
#     return {}

# # ---------------- AUTH ROUTES ---------------- #

# @app.route("/api/auth/signup", methods=["POST"])
# def signup():
#     data = request.get_json(force=True)
#     ok, msg = auth_signup(
#         data.get("username"),
#         data.get("email"),
#         data.get("password"),
#         data.get("role", "STUDENT"),
#     )
#     return jsonify({"success": ok, "message": msg}), 201 if ok else 400

# @app.route("/api/auth/login", methods=["POST"])
# def login():
#     data = request.get_json(force=True)
#     ok, user, token = auth_login(data.get("email"), data.get("password"))
#     if not ok:
#         return jsonify({"error": token}), 401
#     return jsonify({"token": token, "user": user})

# # ---------------- PARSER ROUTES (RESTORED) ---------------- #

# @app.route("/api/upload", methods=["POST"])
# @token_required
# def api_upload():
#     cleanup_cache()

#     if "file" not in request.files:
#         return jsonify({"error": "No file"}), 400

#     f = request.files["file"]
#     file_bytes = f.read()

#     if len(file_bytes) > MAX_FILE_SIZE:
#         return jsonify({"error": "File too large"}), 413

#     mode = int(request.form.get("mode", 2))
#     batch_name = request.form.get("batch_name", "BATCH1")

#     parser = StudentDataParser()
#     pr = parser.parse_file(file_bytes, mode=mode, batch_name=batch_name)

#     if not hasattr(app, "upload_cache"):
#         app.upload_cache = {}

#     app.upload_cache[pr.batch_id] = {
#         "timestamp": time.time(),
#         "batch_name": pr.batch_name,
#         "data": pr.data[pr.batch_name],
#     }

#     return jsonify({
#         "batch_id": pr.batch_id,
#         "batch_name": pr.batch_name,
#         "rows_total": pr.rows_total,
#         "rows_extracted": pr.rows_extracted,
#         "warnings": pr.warnings,
#         "errors": pr.errors,
#         "sample": pr.data[pr.batch_name][:5],
#     })

# @app.route("/api/commit-upload", methods=["POST"])
# @token_required
# def api_commit_upload():
#     body = request.get_json(force=True)
#     batch_id = body.get("batch_id")

#     cleanup_cache()
#     if batch_id not in getattr(app, "upload_cache", {}):
#         return jsonify({"error": "Preview expired"}), 400

#     cache = app.upload_cache[batch_id]
#     rows = cache["data"]
#     batch_name = cache["batch_name"]

#     conn = sqlite3.connect(DB_PATH)
#     cur = conn.cursor()

#     cur.execute("INSERT OR IGNORE INTO uploads (batch_id, batch_name) VALUES (?,?)", (batch_id, batch_name))
#     conn.commit()
#     cur.execute("SELECT id FROM uploads WHERE batch_id=?", (batch_id,))
#     upload_id = cur.fetchone()[0]

#     inserted, skipped = 0, 0
#     for r in rows:
#         if isinstance(r, dict):
#             enrollment = r.get("enrollmentNo")
#             name = r.get("name")
#         else:
#             enrollment = str(r)
#             name = None

#         if not enrollment:
#             skipped += 1
#             continue

#         try:
#             cur.execute(
#                 "INSERT INTO students (upload_id, batch_id, batch_name, enrollment, name) VALUES (?,?,?,?,?)",
#                 (upload_id, batch_id, batch_name, enrollment, name),
#             )
#             inserted += 1
#         except sqlite3.IntegrityError:
#             skipped += 1

#     conn.commit()
#     conn.close()
#     del app.upload_cache[batch_id]

#     return jsonify({"inserted": inserted, "skipped": skipped})

# @app.route("/api/students", methods=["GET"])
# def api_students():
#     conn = sqlite3.connect(DB_PATH)
#     conn.row_factory = sqlite3.Row
#     cur = conn.cursor()
#     cur.execute("SELECT * FROM students ORDER BY id DESC LIMIT 1000")
#     rows = [dict(r) for r in cur.fetchall()]
#     conn.close()
#     return jsonify(rows)

# # ---------------- ALLOCATION ---------------- #

# @app.route("/api/generate-seating", methods=["POST", "OPTIONS"])
# @app.route("/api/generate-seating/", methods=["POST", "OPTIONS"])


# def generate_seating():
#     data = request.get_json(force=True)
#     # ---------------- HARDEN INPUT TYPES ----------------
#     start_rolls = data.get("start_rolls", {})
#     if isinstance(start_rolls, str):
#         # frontend accidentally sent CSV string instead of object
#         start_rolls = {}

#     batch_student_counts_raw = data.get("batch_student_counts", {})
#     if isinstance(batch_student_counts_raw, str):
#         # handled later via CSV parsing or ignored when use_demo_db=True
#         pass
# # ---------------------------------------------------

#     algorithm = SeatingAlgorithm(
#         rows=int(data.get("rows", 8)),
#         cols=int(data.get("cols", 10)),
#         num_batches=int(data.get("num_batches", 3)),
#         block_width=int(data.get("block_width", 3)),
#         batch_by_column=bool(data.get("batch_by_column", True)),
#         enforce_no_adjacent_batches=bool(data.get("enforce_no_adjacent_batches", False)),
#         broken_seats=[
#             (int(r)-1, int(c)-1)
#             for r,c in (p.split("-") for p in data.get("broken_seats","").split(",") if "-" in p)
#         ],
#         batch_student_counts=parse_int_dict(data.get("batch_student_counts")),
#         batch_colors=parse_str_dict(data.get("batch_colors")),
#         batch_labels=parse_str_dict(data.get("batch_labels")),
#         start_rolls=parse_str_dict(data.get("start_rolls")),
#         batch_roll_numbers=data.get("batch_roll_numbers") or {},
#         serial_mode=data.get("serial_mode","per_batch"),
#         serial_width=int(data.get("serial_width",0)),
#     )

#     algorithm.generate_seating()
#     ok, errs = algorithm.validate_constraints()
#     web = algorithm.to_web_format()
#     web["validation"] = {"is_valid": ok, "errors": errs}
#     web["constraints_status"] = algorithm.get_constraints_status()
#     return jsonify(web)

# @app.route("/api/constraints-status", methods=["POST"])
# def constraints_status():
#     data = request.get_json(force=True)
#     algo = SeatingAlgorithm(
#         rows=int(data.get("rows",8)),
#         cols=int(data.get("cols",10)),
#         num_batches=int(data.get("num_batches",3)),
#         block_width=int(data.get("block_width",3)),
#     )
#     algo.generate_seating()
#     return jsonify(algo.get_constraints_status())

# # ---------------- INDEX ---------------- #

# @app.route("/")
# def index():
#     if INDEX_HTML.exists():
#         return render_template_string(INDEX_HTML.read_text())
#     return "<h1>Seat Allocation API</h1>"

# # ---------------- RUN ---------------- #

# if __name__ == "__main__":
#     print("Server running on http://127.0.0.1:5000")
#     app.run(debug=True)


# app.py — FINAL STABLE VERSION (NO ROUTE LOSS)

import sys
import os
import time
import json
import sqlite3
from pathlib import Path
from functools import wraps
from typing import Dict, List, Tuple
from pdf_gen import create_seating_pdf


from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# --------------------------------------------------
# Imports
# --------------------------------------------------
from student_parser import StudentDataParser
from algo import SeatingAlgorithm

# auth (optional but supported)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Backend"))
try:
    from auth_service import signup, login, verify_token, get_user_by_token, update_user_profile
except Exception:
    signup = login = verify_token = get_user_by_token = update_user_profile = None

# --------------------------------------------------
# App setup
# --------------------------------------------------
app = Flask(__name__)
CORS(app, supports_credentials=True)

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "demo.db"

# --------------------------------------------------
# DB bootstrap
# --------------------------------------------------
def ensure_demo_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT UNIQUE,
            batch_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER,
            batch_id TEXT,
            batch_name TEXT,
            enrollment TEXT NOT NULL,
            name TEXT,
            inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(upload_id, enrollment)
        );
    """)

    conn.commit()
    conn.close()

ensure_demo_db()

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def get_batch_counts_and_labels_from_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT batch_name, COUNT(*) FROM students GROUP BY batch_name ORDER BY batch_name")
    rows = cur.fetchall()
    conn.close()

    counts, labels = {}, {}
    for i, (name, count) in enumerate(rows, start=1):
        counts[i] = count
        labels[i] = name
    return counts, labels


def get_batch_roll_numbers_from_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT batch_name, enrollment FROM students ORDER BY id")
    rows = cur.fetchall()
    conn.close()

    groups = {}
    for batch, enr in rows:
        groups.setdefault(batch, []).append(enr)

    return {i + 1: groups[k] for i, k in enumerate(sorted(groups))}

# --------------------------------------------------
# Auth decorator
# --------------------------------------------------
def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if verify_token is None:
            return fn(*args, **kwargs)

        auth = request.headers.get("Authorization")
        if not auth:
            return jsonify({"error": "Token missing"}), 401

        token = auth.split(" ")[1]
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Invalid token"}), 401

        request.user_id = payload.get("user_id")
        return fn(*args, **kwargs)

    return wrapper

# --------------------------------------------------
# Upload + Commit
# --------------------------------------------------
@app.route("/api/upload", methods=["POST"])
def api_upload():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file"}), 400

    parser = StudentDataParser()
    pr = parser.parse_file(file.read(), mode=int(request.form.get("mode", 2)),
                           batch_name=request.form.get("batch_name", "CSE"))

    app.config.setdefault("UPLOAD_CACHE", {})[pr.batch_id] = pr

    return jsonify({
        "batch_id": pr.batch_id,
        "batch_name": pr.batch_name,
        "rows_total": pr.rows_total,
        "rows_extracted": pr.rows_extracted,
        "warnings": pr.warnings,
        "sample": pr.data.get(pr.batch_name, [])[:5]
    })


@app.route("/api/commit-upload", methods=["POST"])
def commit_upload():
    batch_id = request.json.get("batch_id")
    pr = app.config.get("UPLOAD_CACHE", {}).get(batch_id)
    if not pr:
        return jsonify({"error": "Preview expired"}), 400

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("INSERT INTO uploads (batch_id, batch_name) VALUES (?, ?)",
                (pr.batch_id, pr.batch_name))
    upload_id = cur.lastrowid

    for row in pr.data[pr.batch_name]:
        enr = row["enrollmentNo"] if isinstance(row, dict) else row
        name = row.get("name") if isinstance(row, dict) else None
        cur.execute("""
            INSERT OR IGNORE INTO students
            (upload_id, batch_id, batch_name, enrollment, name)
            VALUES (?, ?, ?, ?, ?)
        """, (upload_id, pr.batch_id, pr.batch_name, enr, name))

    conn.commit()
    conn.close()

    del app.config["UPLOAD_CACHE"][batch_id]
    return jsonify({"success": True})

# --------------------------------------------------
# Helper functions
# --------------------------------------------------
def parse_int_dict(val):
    """Parse integer dict from string or dict format"""
    if isinstance(val, dict):
        return {int(k): int(v) for k, v in val.items()}
    if isinstance(val, str):
        out = {}
        for p in val.split(","):
            if ":" in p:
                try:
                    k, v = p.split(":", 1)
                    out[int(k.strip())] = int(v.strip())
                except:
                    pass
        return out
    return {}

def parse_str_dict(val):
    """Parse string dict from string or dict format"""
    if isinstance(val, dict):
        return {int(k): str(v) for k, v in val.items()}
    if isinstance(val, str):
        out = {}
        for p in val.split(","):
            if ":" in p:
                try:
                    k, v = p.split(":", 1)
                    out[int(k.strip())] = v.strip()
                except:
                    pass
        return out
    return {}

# --------------------------------------------------
# Allocation (MAIN ENDPOINT)
# --------------------------------------------------
@app.route("/api/generate-seating", methods=["POST"])
def generate_seating():
    data = request.get_json(force=True)

    use_db = bool(data.get("use_demo_db", True))

    if use_db:
        counts, labels = get_batch_counts_and_labels_from_db()
        rolls = get_batch_roll_numbers_from_db()
        num_batches = len(counts)
    else:
        counts = {}
        labels = {}
        rolls = {}
        num_batches = int(data["num_batches"])

    algo = SeatingAlgorithm(
        rows=int(data["rows"]),
        cols=int(data["cols"]),
        num_batches=num_batches,
        block_width=int(data["block_width"]),
        batch_by_column=bool(data.get("batch_by_column", True)),
        enforce_no_adjacent_batches=bool(data.get("enforce_no_adjacent_batches", False)),
        broken_seats=[],
        batch_student_counts=counts,
        batch_roll_numbers=rolls,
        batch_labels=labels
    )

    algo.generate_seating()
    web = algo.to_web_format()
    web.setdefault("metadata", {})

    ok, errors = algo.validate_constraints()

    web["validation"] = {"is_valid": ok, "errors": errors}
    return jsonify(web)

# --------------------------------------------------
# Constraints
# --------------------------------------------------
@app.route("/api/constraints-status", methods=["POST"])
def constraints_status():
    data = request.get_json(force=True)
    algo = SeatingAlgorithm(
        rows=int(data["rows"]),
        cols=int(data["cols"]),
        num_batches=int(data["num_batches"]),
        block_width=int(data["block_width"]),
        batch_by_column=bool(data.get("batch_by_column", True)),
        enforce_no_adjacent_batches=bool(data.get("enforce_no_adjacent_batches", False)),
    )
    algo.generate_seating()
    return jsonify(algo.get_constraints_status())

# --------------------------------------------------
# PDF
# --------------------------------------------------
@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    """
    Accepts seating JSON (same as /api/generate-seating output)
    Returns generated PDF file
    """
    try:
        data = request.get_json(force=True)
        if not data or "seating" not in data:
            return jsonify({"error": "Invalid seating data"}), 400

        output_dir = BASE_DIR / "seat_plan_generated"
        output_dir.mkdir(exist_ok=True)

        filename = output_dir / f"seating_{int(time.time())}.pdf"

        pdf_path = create_seating_pdf(
            filename=str(filename),
            data=data
        )

        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=filename.name,
            mimetype="application/pdf"
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------------------------------------
# IMPORTANT: NO index.html SERVED HERE
# --------------------------------------------------

if __name__ == "__main__":
    print("✔ Allocation API running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
