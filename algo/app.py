import sys
import os
from datetime import datetime
import time
import io
import json
import sqlite3
from pathlib import Path
from functools import wraps
from typing import Dict, List, Tuple

from flask import Flask, jsonify, request, send_file, render_template_string, session, render_template
from flask_cors import CORS
from leftover_calculator import LeftoverCalculator

from pdf_gen.pdf_generation import get_or_create_seating_pdf
from pdf_gen.template_manager import template_manager

from cache_manager import CacheManager
from attendence_gen.attend_gen import create_attendance_pdf
cache_manager = CacheManager()
import uuid

# Attendence generation module import 
try:
    from attendence_gen.attend_gen import generate_attendance_pdf
    print("✅ Attendance PDF module loaded")
except ImportError:
    generate_attendance_pdf = None

# --------------------------------------------------
# FIXED: Auth Module Import
# --------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "Backend")

if os.path.exists(BACKEND_DIR):
    sys.path.insert(0, BACKEND_DIR)
    print(f"✅ Added to path: {BACKEND_DIR}")

auth_signup = None
auth_login = None
verify_token = None
get_user_by_token = None
update_user_profile = None
google_auth_handler = None

try:
    from auth_service import (
        signup as auth_signup,
        login as auth_login,
        verify_token,
        get_user_by_token,
        update_user_profile,
        google_auth_handler
    )
    print("✅ Auth service imported successfully")
except ImportError as e:
    try:
        from algo.auth_service import (
            signup as auth_signup,
            login as auth_login,
            verify_token,
            get_user_by_token,
            update_user_profile,
            google_auth_handler
        )
        print("✅ Auth service imported successfully (from Backend package)")
    except ImportError as e2:
        print("\n" + "!" * 70)
        print("⚠️  WARNING: Auth module could not be imported")
        print(f"Error: {e2}")
        print("!" * 70 + "\n")

# --------------------------------------------------
# Optional PDF Module
# --------------------------------------------------
try:
    from pdf_gen import create_seating_pdf
    print("✅ PDF generation module loaded")
except ImportError:
    print("⚠️  PDF generation module not found")
    create_seating_pdf = None

# --------------------------------------------------
# Local Modules
# --------------------------------------------------
try:
    from student_parser import StudentDataParser
    from algo import SeatingAlgorithm
    print("✅ Student parser and algorithm modules loaded")
except ImportError as e:
    print(f"⚠️  Warning: Could not import local modules: {e}")
    StudentDataParser = None
    SeatingAlgorithm = None

# --------------------------------------------------
# App setup
# --------------------------------------------------
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "demo.db"

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-prod')
app.config['FEEDBACK_FOLDER'] = BASE_DIR / "feedback_files"
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

# --------------------------------------------------
# DB bootstrap
# --------------------------------------------------
def ensure_demo_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Classroom Registry
    cur.execute("""
        CREATE TABLE IF NOT EXISTS classrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            rows INTEGER NOT NULL,
            cols INTEGER NOT NULL,
            broken_seats TEXT,
            block_width INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

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

    cur.execute("""
        CREATE TABLE IF NOT EXISTS allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT,
            upload_id INTEGER,
            enrollment TEXT,
            room_id TEXT,
            seat_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            issue_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            description TEXT NOT NULL,
            feature_suggestion TEXT,
            additional_info TEXT,
            file_path TEXT,
            file_name TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            admin_response TEXT
        );
    """)

    conn.commit()
    conn.close()
    print(f"✅ Database initialized at: {DB_PATH}")

ensure_demo_db()

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def parse_int_dict(val):
    if isinstance(val, dict): 
        return {int(k): int(v) for k, v in val.items()}
    if isinstance(val, str) and val:
        try: 
            return json.loads(val)
        except: 
            pass
    return {}

def parse_str_dict(val):
    if isinstance(val, dict): 
        return {int(k): str(v) for k, v in val.items()}
    if isinstance(val, str) and val:
        try: 
            return json.loads(val)
        except: 
            pass
    return {}

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
    # 1. Fetch all three necessary columns
    cur.execute("SELECT batch_name, enrollment, name FROM students ORDER BY id")
    rows = cur.fetchall()
    conn.close()
    
    groups = {}
    # 2. Correctly unpack all three values from the row
    for batch_name, enr, name in rows:
        # 3. Store as a dictionary so algo.py can access both roll and name
        groups.setdefault(batch_name, []).append({
            "roll": enr,
            "name": name if name else ""  # Handle empty names safely
        })
        
        
    # 4. Return the integer-mapped dictionary required by the Algorithm
    return {i + 1: groups[k] for i, k in enumerate(sorted(groups))}
# --------------------------------------------------
# Auth Decorator
# --------------------------------------------------
def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if verify_token is None: 
            return jsonify({"error": "Auth module not available"}), 501
        
        auth = request.headers.get("Authorization")
        if not auth: 
            return jsonify({"error": "Token missing"}), 401
        
        try:
            token = auth.split(" ")[1]
        except IndexError:
            return jsonify({"error": "Invalid authorization header"}), 401
            
        payload = verify_token(token)
        if not payload: 
            return jsonify({"error": "Invalid or expired token"}), 401
        
        request.user_id = payload.get("user_id")
        return fn(*args, **kwargs)
    return wrapper
# FEEDBACK ROUTES
# --------------------------------------------------

@app.route("/api/feedback", methods=["POST"])
@token_required
def submit_feedback():
    """Submit new feedback"""
    try:
        issue_type = request.form.get('issueType')
        priority = request.form.get('priority')
        description = request.form.get('description')
        feature_suggestion = request.form.get('featureSuggestion', '')
        additional_info = request.form.get('additionalInfo', '')
        
        if not all([issue_type, priority, description]):
            return jsonify({"error": "Missing required fields"}), 400
        
        file_path = None
        file_name = None
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                try:
                    app.config['FEEDBACK_FOLDER'].mkdir(exist_ok=True, parents=True)
                    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                    safe_filename = f"{timestamp}_{file.filename}"
                    file_path = app.config['FEEDBACK_FOLDER'] / safe_filename
                    file.save(str(file_path))
                    file_name = file.filename
                    print(f"✅ Feedback file saved: {file_path}")
                except Exception as file_error:
                    print(f"⚠️  File upload error: {file_error}")
                    file_path = None
                    file_name = None
        
        # Ensure user_id is available
        user_id = getattr(request, 'user_id', None)
        if not user_id:
            print("⚠️  Warning: user_id not set by token_required decorator")
            user_id = 1  # Default for testing
        
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO feedback (
                user_id, issue_type, priority, description, 
                feature_suggestion, additional_info, file_path, file_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, issue_type, priority, description,
            feature_suggestion, additional_info,
            str(file_path) if file_path else None, file_name
        ))
        feedback_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        print(f"✅ Feedback submitted successfully: ID={feedback_id}, User={user_id}")
        
        return jsonify({
            "success": True, 
            "message": "Feedback submitted successfully",
            "feedback_id": feedback_id
        }), 201
        
    except Exception as e:
        print(f"❌ Error in submit_feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/feedback", methods=["GET"])
@token_required
def get_user_feedback():
    """Get all feedback submitted by the current user"""
    try:
        user_id = getattr(request, 'user_id', None)
        if not user_id:
            return jsonify({"error": "User not authenticated"}), 401
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, issue_type, priority, description, 
                   feature_suggestion, additional_info, file_name,
                   status, created_at, resolved_at, admin_response
            FROM feedback 
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
        
        feedback_list = [dict(row) for row in cur.fetchall()]
        conn.close()
        
        print(f"✅ Retrieved {len(feedback_list)} feedback records for user {user_id}")
        
        return jsonify({
            "success": True,
            "feedback": feedback_list
        })
        
    except Exception as e:
        print(f"❌ Error in get_user_feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/feedback/<int:feedback_id>", methods=["GET"])
@token_required
def get_feedback_detail(feedback_id):
    """Get detailed feedback by ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute("""
            SELECT * FROM feedback 
            WHERE id = ? AND user_id = ?
        """, (feedback_id, request.user_id))
        
        row = cur.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"error": "Feedback not found"}), 404
        
        return jsonify({
            "success": True,
            "feedback": dict(row)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/feedback/<int:feedback_id>/file", methods=["GET"])
@token_required
def download_feedback_file(feedback_id):
    """Download attached file from feedback"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute("""
            SELECT file_path, file_name FROM feedback 
            WHERE id = ? AND user_id = ?
        """, (feedback_id, request.user_id))
        
        row = cur.fetchone()
        conn.close()
        
        if not row or not row['file_path']:
            return jsonify({"error": "File not found"}), 404
        
        file_path = Path(row['file_path'])
        if not file_path.exists():
            return jsonify({"error": "File no longer exists"}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=row['file_name']
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------------------------------------
# ADMIN ROUTES
# --------------------------------------------------

@app.route("/api/admin/feedback", methods=["GET"])
@token_required
def get_all_feedback():
    """Get all feedback (admin only)"""
    try:
        status = request.args.get('status', None)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        if status:
            cur.execute("""
                SELECT f.*, u.username, u.email 
                FROM feedback f
                LEFT JOIN users u ON f.user_id = u.id
                WHERE f.status = ?
                ORDER BY f.created_at DESC
            """, (status,))
        else:
            cur.execute("""
                SELECT f.*, u.username, u.email 
                FROM feedback f
                LEFT JOIN users u ON f.user_id = u.id
                ORDER BY f.created_at DESC
            """)
        
        feedback_list = [dict(row) for row in cur.fetchall()]
        conn.close()
        
        return jsonify({
            "success": True,
            "feedback": feedback_list
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/feedback/<int:feedback_id>/resolve", methods=["PUT"])
@token_required
def resolve_feedback(feedback_id):
    """Mark feedback as resolved (admin only)"""
    try:
        data = request.get_json()
        admin_response = data.get('adminResponse', '')
        
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE feedback 
            SET status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP,
                admin_response = ?
            WHERE id = ?
        """, (admin_response, feedback_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Feedback marked as resolved"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/feedback/<int:feedback_id>", methods=["DELETE"])
@token_required
def delete_feedback(feedback_id):
    """Delete feedback (admin only)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        cur.execute("SELECT file_path FROM feedback WHERE id = ?", (feedback_id,))
        row = cur.fetchone()
        
        if row and row[0]:
            file_path = Path(row[0])
            if file_path.exists():
                file_path.unlink()
        
        cur.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Feedback deleted successfully"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------------------------------------
# 7. API ROUTES: CLASSROOMS
# --------------------------------------------------
@app.route("/api/classrooms", methods=["GET"])
def get_classrooms():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM classrooms ORDER BY name ASC")
    rooms = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify(rooms)

@app.route("/api/classrooms", methods=["POST"])
def save_classroom():
    data = request.get_json()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT OR REPLACE INTO classrooms (id, name, rows, cols, broken_seats, block_width)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (data.get('id'), data['name'], data['rows'], data['cols'], 
              data.get('broken_seats', ''), data.get('block_width', 1)))
        conn.commit()
        return jsonify({"success": True, "message": "Classroom saved"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

@app.route("/api/classrooms/<int:room_id>", methods=["DELETE"])
def delete_classroom(room_id):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM classrooms WHERE id = ?", (room_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# --------------------------------------------------
# AUTH ROUTES
# --------------------------------------------------
@app.route("/api/auth/signup", methods=["POST"])
def signup_route():
    if auth_signup is None: 
        return jsonify({"error": "Auth module not available"}), 501
    
    data = request.get_json(force=True)
    ok, msg = auth_signup(
        data.get("username"),
        data.get("email"),
        data.get("password"),
        data.get("role", "STUDENT"),
    )
    return jsonify({"success": ok, "message": msg}), 201 if ok else 400

@app.route("/api/auth/login", methods=["POST"])
def login_route():
    if auth_login is None: 
        return jsonify({"error": "Auth module not available"}), 501
    
    data = request.get_json(force=True)
    ok, user, token = auth_login(data.get("email"), data.get("password"))
    if not ok:
        return jsonify({"error": token}), 401
    return jsonify({"token": token, "user": user})

# ============================================================================
# GOOGLE AUTH ROUTE (NEW)
# ============================================================================
@app.route("/api/auth/google", methods=["POST"])
def google_auth_route():
    """Handle Google OAuth token and create/update user"""
    if google_auth_handler is None:
        return jsonify({"error": "Google auth not available"}), 501
    
    data = request.get_json(force=True)
    token = data.get("token")
    
    if not token:
        return jsonify({"error": "No token provided"}), 400
    
    ok, user, auth_token = google_auth_handler(token)
    if not ok:
        return jsonify({"error": user}), 401
    
    return jsonify({"token": auth_token, "user": user})

@app.route("/api/auth/profile", methods=["GET"])
@token_required
def get_profile_route():
    if get_user_by_token is None: 
        return jsonify({"error": "Auth module not available"}), 501
    
    auth_header = request.headers.get("Authorization")
    if not auth_header: 
        return jsonify({"error": "Missing token"}), 401
    
    try:
        token = auth_header.split(" ")[1]
        user = get_user_by_token(token)
        
        if not user:
            return jsonify({"error": "User not found or token invalid"}), 404
            
        return jsonify({"success": True, "user": user})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/profile", methods=["PUT"])
@token_required
def update_profile_route():
    if update_user_profile is None: 
        return jsonify({"error": "Auth module not available"}), 501
    
    data = request.get_json(force=True)
    username = data.get("username")
    email = data.get("email")
    
    ok, msg = update_user_profile(request.user_id, username, email)
    
    if ok:
        user = get_user_by_token(request.headers.get("Authorization").split(" ")[1])
        return jsonify({"success": True, "message": msg, "user": user})
    else:
        return jsonify({"success": False, "error": msg}), 400

@app.route("/api/auth/logout", methods=["POST"])
def logout_route():
    return jsonify({"success": True, "message": "Logged out successfully"})

# --------------------------------------------------
# Upload Routes
# --------------------------------------------------
@app.route("/api/upload-preview", methods=["POST"])
def api_upload_preview():
    try:
        if "file" not in request.files: 
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files["file"]
        if file.filename == '': 
            return jsonify({"error": "No file selected"}), 400
        
        if StudentDataParser is None:
            return jsonify({"error": "Parser module not available"}), 500
        
        file_content = file.read()
        parser = StudentDataParser()
        preview_data = parser.preview(io.BytesIO(file_content), max_rows=10)
        
        return jsonify({"success": True, **preview_data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/upload", methods=["POST"])
def api_upload():
    try:
        if "file" not in request.files: 
            return jsonify({"error": "No file"}), 400
        
        if StudentDataParser is None:
            return jsonify({"error": "Parser module not available"}), 500
        
        file = request.files["file"]
        mode = int(request.form.get("mode", 2))
        batch_name = request.form.get("batch_name", "BATCH1")
        name_col = request.form.get("nameColumn", None)
        enrollment_col = request.form.get("enrollmentColumn", None)
        
        file_content = file.read()
        parser = StudentDataParser()
        pr = parser.parse_file(
            io.BytesIO(file_content),
            mode=mode, 
            batch_name=batch_name,
            name_col=name_col, 
            enrollment_col=enrollment_col
        )
        
        if not hasattr(app, 'config'): 
            app.config = {}
        if 'UPLOAD_CACHE' not in app.config: 
            app.config['UPLOAD_CACHE'] = {}
        
        app.config['UPLOAD_CACHE'][pr.batch_id] = pr
        
        return jsonify({
            "success": True,
            "batch_id": pr.batch_id,
            "batch_name": pr.batch_name,
            "rows_extracted": pr.rows_extracted,
            "sample": pr.data[pr.batch_name][:10],
            "preview": {
                "columns": list(pr.data[pr.batch_name][0].keys()) if pr.mode == 2 and pr.data[pr.batch_name] else [],
                "totalRows": pr.rows_total,
                "extractedRows": pr.rows_extracted
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/commit-upload", methods=["POST"])
def commit_upload():
    try:
        body = request.get_json(force=True)
        batch_id = body.get("batch_id")
        cache = app.config.get("UPLOAD_CACHE", {})
        pr = cache.get(batch_id)
        
        if not pr: 
            return jsonify({"error": "Preview expired or not found"}), 400
        
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO uploads (batch_id, batch_name) VALUES (?, ?)", 
            (pr.batch_id, pr.batch_name)
        )
        upload_id = cur.lastrowid
        
        inserted, skipped = 0, 0
        for row in pr.data[pr.batch_name]:
            enr = row.get("enrollmentNo") if isinstance(row, dict) else str(row)
            name = row.get("name") if isinstance(row, dict) else None
            
            if not enr: 
                skipped += 1
                continue
            
            try:
                cur.execute(
                    "INSERT INTO students (upload_id, batch_id, batch_name, enrollment, name) VALUES (?, ?, ?, ?, ?)", 
                    (upload_id, pr.batch_id, pr.batch_name, enr, name)
                )
                inserted += 1
            except sqlite3.IntegrityError:
                skipped += 1
        
        conn.commit()
        conn.close()
        
        if batch_id in app.config['UPLOAD_CACHE']: 
            del app.config['UPLOAD_CACHE'][batch_id]
        
        return jsonify({"success": True, "inserted": inserted, "skipped": skipped})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------------------------------------
# Data Access
# --------------------------------------------------
@app.route("/api/students", methods=["GET"])
def api_students():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM students ORDER BY id DESC LIMIT 1000")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify(rows)

# --------------------------------------------------
# Allocation Routes (Permanent ID Logic)
# --------------------------------------------------

@app.route("/api/generate-seating", methods=["POST"])
def generate_seating():
    if SeatingAlgorithm is None:
        return jsonify({"error": "SeatingAlgorithm module not available"}), 500
    
    data = request.get_json(force=True)
    
    # --- PERMANENT ID LOGIC ---
    # 1. Determine the Plan ID
    plan_id = data.get("plan_id")
    is_new_plan = False

    if not plan_id:
        # Generate a fresh ID only if one wasn't provided
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        is_new_plan = True
    
    # 2. Extract settings for the Algorithm
    use_db = bool(data.get("use_demo_db", True))
    if use_db:
        counts, labels = get_batch_counts_and_labels_from_db()
        rolls = get_batch_roll_numbers_from_db()
        num_batches = len(counts)
    else:
        counts = parse_int_dict(data.get("batch_student_counts"))
        labels = parse_str_dict(data.get("batch_labels"))
        rolls = data.get("batch_roll_numbers") or {}
        num_batches = int(data.get("num_batches", 3))

    # Parse broken seats
    broken_str = data.get("broken_seats", "")
    broken_seats = []
    if isinstance(broken_str, str) and "-" in broken_str:
        broken_seats = [(int(r)-1, int(c)-1) for r, c in (p.split("-") for p in broken_str.split(",") if "-" in p)]
    elif isinstance(broken_str, list):
        broken_seats = broken_str 

    # 3. Run the Algorithm
    # We pass all configuration data to the algorithm
    algo = SeatingAlgorithm(
        rows=int(data.get("rows", 10)),
        cols=int(data.get("cols", 6)),
        num_batches=num_batches,
        block_width=int(data.get("block_width", 2)),
        batch_by_column=bool(data.get("batch_by_column", True)),
        enforce_no_adjacent_batches=bool(data.get("enforce_no_adjacent_batches", False)),
        broken_seats=broken_seats,
        batch_student_counts=counts,
        batch_roll_numbers=rolls,
        batch_labels=labels,
        start_rolls=parse_str_dict(data.get("start_rolls")),
        batch_colors=parse_str_dict(data.get("batch_colors")),
        serial_mode=data.get("serial_mode", "per_batch"),
        serial_width=int(data.get("serial_width", 0))
    )

    algo.generate_seating()
    web = algo.to_web_format()
    
    # 4. Finalize response object
    web.setdefault("metadata", {})
    # Crucial: Send the ID back so the Frontend can include it in the next request
    web["plan_id"] = plan_id  
    
    ok, errors = algo.validate_constraints()
    web["validation"] = {"is_valid": ok, "errors": errors}
    
    # 5. OVERWRITE CACHE: This ensures we update the SAME file
    # Using save_or_update prevents duplication in the /cache folder
    cache_manager.save_or_update(plan_id, data, web)
    
    action_type = "Created" if is_new_plan else "Updated"
    print(f"💾 {action_type} plan: {plan_id} (Cache Overwritten)")

    return jsonify(web)

@app.route("/api/constraints-status", methods=["POST"])
def constraints_status():
    """Remains dynamic for real-time UI feedback (not cached)"""
    if SeatingAlgorithm is None: 
        return jsonify({"error": "Algorithm module not available"}), 500
    
    data = request.get_json(force=True)
    algo = SeatingAlgorithm(
        rows=int(data.get("rows", 10)),
        cols=int(data.get("cols", 6)),
        num_batches=int(data.get("num_batches", 3)),
        block_width=int(data.get("block_width", 2)),
        batch_by_column=bool(data.get("batch_by_column", True)),
        enforce_no_adjacent_batches=bool(data.get("enforce_no_adjacent_batches", False))
    )
    algo.generate_seating()
    return jsonify(algo.get_constraints_status())
# ============================================================================
# PDF GENERATION
# ============================================================================
@app.route('/template-editor')
def template_editor():
    """Serve the template editor interface"""
    return render_template('template_editor.html')
    # Since we changed Flask configuration, if 'template_editor.html'
    # is still a separate file, you should ensure it is in the 'templates' folder
    # or handle it as part of the React build. 
    # If the TemplateEditor is a React component, this route should also use render_template('index.html')
    # and let React Router handle the /template-editor path.

@app.route('/api/template-config', methods=['GET', 'POST'])
def manage_template():
    user_id = 'test_user'
    template_name = request.args.get('template_name', 'default')
    
    if request.method == 'GET':
        try:
            template = template_manager.get_user_template(user_id, template_name)
            return jsonify({
                'success': True,
                'template': template,
                'user_id': user_id
            })
        except Exception as e:
            return jsonify({'error': f'Failed to load template: {str(e)}'}), 500
    
    elif request.method == 'POST':
        try:
            template_data = request.form.to_dict()
            
            if 'bannerImage' in request.files:
                file = request.files['bannerImage']
                if file and file.filename:
                    image_path = template_manager.save_user_banner(user_id, file, template_name)
                    if image_path:
                        template_data['banner_image_path'] = image_path
            
            template_manager.save_user_template(user_id, template_data, template_name)
            
            return jsonify({
                'success': True,
                'message': 'Template updated successfully',
                'template': template_manager.get_user_template(user_id, template_name)
            })
            
        except Exception as e:
            return jsonify({'error': f'Failed to update template: {str(e)}'}), 500
# ============================================================================
# FIXED PDF GENERATION (Snapshot-Aware)
# ============================================================================

@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # 1. Try to load from Central Cache if a snapshot_id is provided
        # This ensures the PDF exactly matches what was generated by the algo
        snapshot_id = data.get('snapshot_id')
        
        if snapshot_id:
            snapshot = cache_manager.load_snapshot(snapshot_id)
            if snapshot:
                seating_payload = snapshot['seating_data']
                print(f"📄 Generating PDF from Snapshot: {snapshot_id}")
            else:
                return jsonify({"error": "Cached snapshot not found. Please regenerate seating."}), 404
        else:
            # Fallback for direct data sends (like from your frontend preview)
            if 'seating' not in data:
                return jsonify({"error": "Invalid seating data"}), 400
            seating_payload = data
            print("📄 Generating PDF from raw request data")

        user_id = 'test_user'
        template_name = request.args.get('template_name', 'default')
        
        # 2. Call the generator with the validated payload
        pdf_path = get_or_create_seating_pdf(
            seating_payload, 
            user_id=user_id, 
            template_name=template_name
        )
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"seating_plan_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        )
    except Exception as e:
        print(f"❌ PDF Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-pdf', methods=['GET'])
def test_pdf():
    """Generates a sample PDF to verify the generator and template system work."""
    user_id = 'test_user'
    template_name = request.args.get('template_name', 'default')
    
    sample_data = {
        'seating': [
            [
                {'roll_number': '2021001', 'paper_set': 'A', 'color': '#e3f2fd'},
                {'roll_number': '2021002', 'paper_set': 'B', 'color': '#f3e5f5'},
                {'roll_number': '2021003', 'paper_set': 'A', 'color': '#e8f5e8'}
            ],
            [
                {'roll_number': '2021004', 'paper_set': 'B', 'color': '#fff3e0'},
                {'is_broken': True, 'display': 'BROKEN', 'color': '#ffebee'},
                {'roll_number': '2021005', 'paper_set': 'A', 'color': '#e3f2fd'}
            ]
        ],
        'metadata': {'rows': 2, 'cols': 3, 'blocks': 1, 'block_width': 3}
    }
    
    try:
        # Note: We don't cache test PDFs to avoid cluttering the system
        pdf_path = get_or_create_seating_pdf(sample_data, user_id=user_id, template_name=template_name)
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"test_seating_plan.pdf"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ============================================================================
# ATTENDANCE GENERATION & ALLOCATIONS
# ============================================================================

@app.route('/api/allocations', methods=['GET'])
def get_all_allocations():
    """Fetches list of previous uploads/plans for the frontend to select from"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT batch_id, batch_name, created_at FROM uploads")
        rows = cur.fetchall()
        conn.close()
        return jsonify([{"id": r[0], "batch_name": r[1], "date": r[2]} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/plan-batches/<plan_id>', methods=['GET'])
def get_plan_batches(plan_id):
    """
    NEW: This route helps the frontend 'Attendance Page' know 
    which batches exist in a plan so it can render the forms.
    """
    cache_data = cache_manager.load_snapshot(plan_id)
    if not cache_data:
        return jsonify({"error": "Plan not found"}), 404
    
    # Return just the batch names and their pre-parsed info
    batch_list = {}
    for label, data in cache_data.get('batches', {}).items():
        batch_list[label] = data.get('info', {})
        
    return jsonify({
        "plan_id": plan_id,
        "batches": batch_list,
        "room_no": cache_data.get('inputs', {}).get('room_id', 'N/A')
    })

@app.route('/api/export-attendance', methods=['POST'])
def export_attendance():
    """
    FIXED: The main route to generate a PDF for a SPECIFIC batch 
    using the structured cache data.
    """
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        batch_name = data.get('batch_name')
        frontend_metadata = data.get('metadata', {}) 

        # 1. Load the structured cache created by CacheManager
        cache_data = cache_manager.load_snapshot(plan_id)
        if not cache_data:
            return jsonify({"error": "Seating plan cache not found"}), 404

        # 2. Get the specific batch data organized by CacheManager
        batch_data = cache_data.get('batches', {}).get(batch_name)
        if not batch_data:
            return jsonify({"error": f"Batch '{batch_name}' not found in this plan"}), 404

        # 3. Path for temporary PDF generation
        temp_filename = f"temp_{plan_id}_{batch_name.replace(' ', '_')}.pdf"
        
        # 4. Generate PDF using the pre-structured data
        # student_list = batch_data['students']
        # extracted_info = batch_data['info']
        create_attendance_pdf(
            temp_filename, 
            batch_data['students'], 
            batch_name, 
            frontend_metadata, 
            batch_data['info']
        )

        # 5. Read PDF into memory and return to user
        return_data = io.BytesIO()
        with open(temp_filename, 'rb') as f:
            return_data.write(f.read())
        return_data.seek(0)
        
        # 6. Cleanup the temp file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

        return send_file(
            return_data,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"Attendance_{batch_name}_{frontend_metadata.get('course_code', '')}.pdf"
        )

    except Exception as e:
        print(f"Export Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
# --------------------------------------------------
# Admin/Maintenance Routes
# --------------------------------------------------
@app.route("/api/reset-data", methods=["POST"])
@token_required
def reset_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        cur.execute("DELETE FROM students")
        cur.execute("DELETE FROM uploads")
        cur.execute("DELETE FROM allocations")
        
        cur.execute("DELETE FROM sqlite_sequence WHERE name='students'")
        cur.execute("DELETE FROM sqlite_sequence WHERE name='uploads'")
        cur.execute("DELETE FROM sqlite_sequence WHERE name='allocations'")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True, 
            "message": "All data has been cleared."
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------------------------------------
# Health Check
# --------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "modules": {
            "auth": auth_signup is not None,
            "google_auth": google_auth_handler is not None,
            "pdf": create_seating_pdf is not None,
            "parser": StudentDataParser is not None,
            "algorithm": SeatingAlgorithm is not None
        }
    })

if __name__ == "__main__":
    print("=" * 70)
    print("🚀 Starting Flask Server on http://localhost:5000")
    print("=" * 70)
    app.run(debug=True, port=5000)