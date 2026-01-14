# Administrative and authentication endpoints.
# Handles user login/signup and provides utilities for bulk database table operations.
from flask import Blueprint, jsonify, request, send_file
from algo.database.db import get_db_connection
from algo.auth_service import token_required, login as auth_login, signup as auth_signup, google_auth_handler, get_user_by_token, get_user_by_id
import sqlite3

# Combined Auth and Admin for simplicity as per legacy app structure usually mostly admin
# But creating separate Blueprints is cleaner

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
admin_bp = Blueprint('admin', __name__, url_prefix='/api')

# --- AUTH STUBS (Legacy had auth but MVP was single user) ---

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    success, user_data, token = auth_login(email, password)
    if success:
        return jsonify({"status": "success", "token": token, "user": user_data})
    return jsonify({"status": "error", "message": user_data or "Invalid email or password"}), 401

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'STUDENT')
    
    success, user_data, token = auth_signup(username, email, password, role)
    if success:
        return jsonify({"status": "success", "token": token, "user": user_data})
    return jsonify({"status": "error", "message": user_data}), 400

@auth_bp.route('/profile', methods=['GET'])
@token_required
def profile():
    """Retrieve current user profile using JWT context"""
    try:
        user_id = getattr(request, 'user_id', None)
        if not user_id:
             return jsonify({
                "status": "error", 
                "message": "Auth context missing"
            }), 401

        user = get_user_by_id(user_id)
        
        if not user:
            return jsonify({
                "status": "error", 
                "message": "User profile not found"
            }), 404
            
        return jsonify({
            "status": "success", 
            "user": user
        })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Profile retrieval failed: {str(e)}"
        }), 500

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    
    success, user_data, auth_token = google_auth_handler(token)
    if success:
        return jsonify({"status": "success", "token": auth_token, "user": user_data})
    return jsonify({"status": "error", "message": user_data}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint (stateless)"""
    return jsonify({"status": "success", "message": "Logged out successfully"})

# --- CONSTANTS ---
ALLOWED_TABLES = ['students', 'classrooms', 'uploads', 'allocations', 'feedback', 'user_activity', 'allocation_sessions']

TABLE_CONFIG = {
    'students': {
        'searchable': ['name', 'enrollment', 'email'],
        'editable': ['name', 'email']
    },
    'classrooms': {
        'searchable': ['name'],
        'editable': ['name', 'rows', 'cols']
    },
    'uploads': {
        'searchable': ['filename', 'batch_name'],
        'editable': []
    },
    'allocations': {
        'searchable': ['student_id', 'room_id'],
        'editable': []
    },
    'allocation_sessions': {
        'searchable': ['plan_id', 'status'],
        'editable': ['status']
    }
}

# --- ADMIN / SYSTEM ROUTES ---

@admin_bp.route('/database/table/<table_name>', methods=['GET'])
@token_required
def get_table_data(table_name):
    if table_name not in ALLOWED_TABLES:
        return jsonify({"success": False, "error": "Table not allowed"}), 403
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(100, max(1, int(request.args.get('per_page', 50))))
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'id').strip()
        sort_order = 'DESC' if request.args.get('sort_order', 'DESC').upper() == 'DESC' else 'ASC'
        
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Get columns
        cur.execute(f"PRAGMA table_info({table_name})")
        columns = [{'name': c[1], 'type': c[2], 'nullable': not c[3], 'primary_key': bool(c[5])} for c in cur.fetchall()]
        col_names = [c['name'] for c in columns]
        
        # Validate sort_by
        if sort_by not in col_names:
            sort_by = col_names[0] if col_names else 'id'
            
        # Build query
        searchable = TABLE_CONFIG.get(table_name, {}).get('searchable', col_names[:3])
        base_query = f"SELECT * FROM {table_name}"
        count_query = f"SELECT COUNT(*) FROM {table_name}"
        params = []
        
        if search and searchable:
            conditions = [f"{c} LIKE ?" for c in searchable if c in col_names]
            if conditions:
                where = " OR ".join(conditions)
                base_query += f" WHERE ({where})"
                count_query += f" WHERE ({where})"
                params = [f"%{search}%" for _ in conditions]
        
        # Get total
        cur.execute(count_query, params)
        total = cur.fetchone()[0]
        
        # Get data
        base_query += f" ORDER BY {sort_by} {sort_order} LIMIT ? OFFSET ?"
        params.extend([per_page, (page - 1) * per_page])
        
        cur.execute(base_query, params)
        data = [dict(r) for r in cur.fetchall()]
        conn.close()
        
        return jsonify({
            "success": True, 
            "columns": columns, 
            "data": data,
            "pagination": {
                "page": page, 
                "per_page": per_page, 
                "total": total, 
                "pages": (total + per_page - 1) // per_page if per_page > 0 else 1
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@admin_bp.route('/database/table/<table_name>/<int:record_id>', methods=['PUT', 'DELETE'])
@token_required
def modify_record(table_name, record_id):
    if table_name not in ALLOWED_TABLES:
        return jsonify({"success": False, "error": "Table not allowed"}), 403
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if request.method == 'PUT':
            data = request.get_json()
            editable = TABLE_CONFIG.get(table_name, {}).get('editable', [])
            update_data = {k: v for k, v in data.items() if k in editable}
            
            if not update_data:
                return jsonify({"success": False, "error": "No editable fields"}), 400
            
            set_clause = ", ".join([f"{k} = ?" for k in update_data])
            cur.execute(f"UPDATE {table_name} SET {set_clause} WHERE id = ?", list(update_data.values()) + [record_id])
            
            if cur.rowcount == 0:
                conn.close()
                return jsonify({"success": False, "error": "Not found"}), 404
            
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Updated"})
            
        elif request.method == 'DELETE':
            cur.execute(f"DELETE FROM {table_name} WHERE id = ?", (record_id,))
            if cur.rowcount == 0:
                conn.close()
                return jsonify({"success": False, "error": "Not found"}), 404
            
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Deleted"})
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/database/table/<table_name>/bulk-delete', methods=['POST'])
@token_required
def bulk_delete(table_name):
    if table_name not in ALLOWED_TABLES:
        return jsonify({"success": False, "error": "Table not allowed"}), 403
        
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        if not ids:
            return jsonify({"success": False, "error": "No IDs provided"}), 400
            
        conn = get_db_connection()
        cur = conn.cursor()
        
        placeholders = ','.join(['?'] * len(ids))
        cur.execute(f"DELETE FROM {table_name} WHERE id IN ({placeholders})", ids)
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": f"Deleted {cur.rowcount} records"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/database/table/<table_name>/export', methods=['GET'])
@token_required
def export_table(table_name):
    if table_name not in ALLOWED_TABLES:
        return jsonify({"success": False, "error": "Table not allowed"}), 403
        
    try:
        import csv
        import io
        from flask import make_response
        
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute(f"SELECT * FROM {table_name}")
        rows = cur.fetchall()
        
        if not rows:
             return jsonify({"success": False, "error": "No data"}), 404
             
        keys = rows[0].keys()
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow(dict(row))
            
        output.seek(0)
        conn.close()
        
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename={table_name}.csv"
        response.headers["Content-type"] = "text/csv"
        return response
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@admin_bp.route('/reset-data', methods=['POST'])
@token_required
def reset_data():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Order matters for FK
        tables = ['allocations', 'students', 'uploads', 'allocation_sessions', 'allocation_history', 'feedback']
        for t in tables:
            cur.execute(f"DELETE FROM {t}")
            cur.execute(f"DELETE FROM sqlite_sequence WHERE name='{t}'")
            
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "All data cleared"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@admin_bp.route('/database/overview', methods=['GET'])
@token_required
def db_overview():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        tables = ['students', 'classrooms', 'uploads', 'allocations', 'feedback']
        counts = {}
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            counts[t] = cur.fetchone()[0]
        conn.close()
        return jsonify({"success": True, "overview": {"tables": counts}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/database/hierarchy', methods=['GET'])
@token_required
def get_db_hierarchy():
    """Get database hierarchy data - LEGACY COMPATIBLE"""
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Main hierarchy query
        cur.execute("""
            SELECT s.session_id, s.plan_id, s.total_students, s.allocated_count, s.status, s.created_at,
                   u.batch_name, u.batch_color, u.batch_id, u.id as upload_id, COUNT(st.id) as batch_student_count
            FROM allocation_sessions s
            LEFT JOIN uploads u ON s.session_id = u.session_id
            LEFT JOIN students st ON u.id = st.upload_id
            GROUP BY s.session_id, u.batch_id
            ORDER BY s.created_at DESC, u.batch_name
        """)
        rows = cur.fetchall()
        
        hierarchy = {}
        for row in rows:
            sid = row['session_id']
            if sid not in hierarchy:
                hierarchy[sid] = {
                    'session_id': sid, 
                    'plan_id': row['plan_id'], 
                    'total_students': row['total_students'],
                    'allocated_count': row['allocated_count'], 
                    'status': row['status'], 
                    'created_at': row['created_at'], 
                    'batches': {}
                }
            
            if row['batch_name']:
                hierarchy[sid]['batches'][row['batch_name']] = {
                    'batch_name': row['batch_name'], 
                    'batch_id': row['batch_id'], 
                    'upload_id': row['upload_id'],
                    'batch_color': row['batch_color'], 
                    'student_count': row['batch_student_count'] or 0
                }
        
        # Populate students for each batch
        for sid in hierarchy:
            for bn in hierarchy[sid]['batches']:
                bid = hierarchy[sid]['batches'][bn]['batch_id']
                # Get students for this batch
                cur.execute("""
                    SELECT id, enrollment, name, department, batch_color 
                    FROM students 
                    WHERE batch_id = ? 
                    ORDER BY enrollment
                """, (bid,))
                hierarchy[sid]['batches'][bn]['students'] = [dict(r) for r in cur.fetchall()]
        
        conn.close()
        return jsonify({"success": True, "hierarchy": list(hierarchy.values())})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
