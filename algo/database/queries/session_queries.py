import sqlite3
import datetime
from typing import Optional, Dict, List, Any
from algo.database.db import get_db

class SessionQueries:
    @staticmethod
    def get_session_by_id(session_id: int) -> Optional[Dict]:
        db = get_db()
        cursor = db.execute("SELECT * FROM allocation_sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def get_session_by_plan_id(plan_id: str) -> Optional[Dict]:
        db = get_db()
        cursor = db.execute("SELECT * FROM allocation_sessions WHERE plan_id = ?", (plan_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def create_session(plan_id: str, user_id: int = 1, name: str = None) -> int:
        db = get_db()
        cursor = db.execute(
            """
            INSERT INTO allocation_sessions (plan_id, user_id, name, status, created_at)
            VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
            """,
            (plan_id, user_id, name)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def update_session_stats(session_id: int, total: int, allocated: int):
        db = get_db()
        db.execute(
            """
            UPDATE allocation_sessions 
            SET total_students = ?, allocated_count = ?, last_activity = CURRENT_TIMESTAMP
            WHERE session_id = ?
            """,
            (total, allocated, session_id)
        )
        db.commit()

    @staticmethod
    def mark_session_completed(session_id: int):
        db = get_db()
        db.execute(
            """
            UPDATE allocation_sessions 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
            WHERE session_id = ?
            """,
            (session_id,)
        )
        db.commit()

    @staticmethod
    def expire_session(session_id: int, hard_delete: bool = False):
        """
        Expire or permanently delete a session.
        
        Args:
            session_id: ID of session
            hard_delete: If True, CASCADE delete all related data
        """
        db = get_db()
        if hard_delete:
            # Delete in order respecting foreign keys
            # 1. Delete allocations
            db.execute("DELETE FROM allocations WHERE session_id = ?", (session_id,))
            
            # 2. Delete allocation history (if exists)
            try:
                db.execute("DELETE FROM allocation_history WHERE session_id = ?", (session_id,))
            except Exception:
                pass  # Table might not exist
            
            # 3. Delete students via uploads
            db.execute("""
                DELETE FROM students WHERE upload_id IN (
                    SELECT id FROM uploads WHERE session_id = ?
                )
            """, (session_id,))
            
            # 4. Delete uploads
            db.execute("DELETE FROM uploads WHERE session_id = ?", (session_id,))
            
            # 5. Delete session
            db.execute("DELETE FROM allocation_sessions WHERE session_id = ?", (session_id,))
        else:
            # Soft delete - just expire
            db.execute(
                """UPDATE allocation_sessions 
                   SET status = 'expired', last_activity = CURRENT_TIMESTAMP 
                   WHERE session_id = ?""",
                (session_id,)
            )
        db.commit()
    
    @staticmethod
    def get_active_sessions(user_id: Optional[int] = None) -> List[Dict]:
        db = get_db()
        query = "SELECT * FROM allocation_sessions WHERE status IN ('active', 'completed')"
        params = []
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        query += " ORDER BY created_at DESC"
        cursor = db.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def check_empty_session(session_id: int) -> bool:
        db = get_db()
        cursor = db.execute("""
            SELECT 
                (SELECT COUNT(*) FROM uploads WHERE session_id = ?) as upload_count,
                (SELECT COUNT(*) FROM allocations WHERE session_id = ?) as allocation_count
        """, (session_id, session_id))
        row = cursor.fetchone()
        if not row:
            return True # Treat non-existent as empty/deletable
        return row['upload_count'] == 0 and row['allocation_count'] == 0

    @staticmethod
    def get_active_session_for_user(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the most recent active session for a user.
        Prioritizes user's own sessions, then falls back to user_id=1 (orphaned).
        
        Args:
            user_id: The user ID to find active session for
            
        Returns:
            Session dict with allocated_rooms count included, or None
        """
        db = get_db()
        
        # First try user's own active session
        cursor = db.execute("""
            SELECT s.*, 
                   (SELECT COUNT(DISTINCT classroom_id) FROM allocations WHERE session_id = s.session_id) as allocated_rooms
            FROM allocation_sessions s 
            WHERE s.user_id = ? AND s.status = 'active'
            ORDER BY s.last_activity DESC
            LIMIT 1
        """, (user_id,))
        session = cursor.fetchone()
        
        if session:
            return dict(session)
        
        # Fallback: check for orphaned sessions (user_id = 1)
        cursor = db.execute("""
            SELECT s.*,
                   (SELECT COUNT(DISTINCT classroom_id) FROM allocations WHERE session_id = s.session_id) as allocated_rooms
            FROM allocation_sessions s 
            WHERE s.user_id = 1 AND s.status = 'active'
            ORDER BY s.last_activity DESC
            LIMIT 1
        """)
        session = cursor.fetchone()
        
        return dict(session) if session else None

    @staticmethod
    def expire_all_active_sessions(user_id: int = None) -> int:
        """
        Expire all active sessions, optionally filtering by user.
        
        Args:
            user_id: Optional user ID to filter by (None = expire all)
            
        Returns:
            Number of sessions expired
        """
        db = get_db()
        if user_id:
            cursor = db.execute("""
                UPDATE allocation_sessions 
                SET status = 'expired', last_activity = CURRENT_TIMESTAMP
                WHERE user_id = ? AND status = 'active'
            """, (user_id,))
        else:
            cursor = db.execute("""
                UPDATE allocation_sessions 
                SET status = 'expired', last_activity = CURRENT_TIMESTAMP
                WHERE status = 'active'
            """)
        db.commit()
        return cursor.rowcount

    @staticmethod
    def claim_orphaned_sessions(user_id: int) -> int:
        """
        Claim all orphaned sessions (user_id=1) for the specified user.
        
        Args:
            user_id: The user ID to claim sessions for
            
        Returns:
            Number of sessions claimed
        """
        db = get_db()
        cursor = db.execute("""
            UPDATE allocation_sessions 
            SET user_id = ?, last_activity = CURRENT_TIMESTAMP
            WHERE user_id = 1 AND status = 'active'
        """, (user_id,))
        db.commit()
        return cursor.rowcount

    @staticmethod
    def get_user_sessions(user_id: int, status_filter: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all sessions for a user with optional status filter.
        
        Args:
            user_id: User ID to get sessions for
            status_filter: Optional status to filter by ('active', 'completed', 'expired')
            limit: Max number of sessions to return
            
        Returns:
            List of session dicts with pending_count calculated
        """
        db = get_db()
        
        query = """
            SELECT session_id, plan_id, total_students, allocated_count, status, created_at, last_activity
            FROM allocation_sessions
            WHERE user_id = ? OR user_id = 1 OR user_id IS NULL
        """
        params = [user_id]
        
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        
        query += " ORDER BY last_activity DESC LIMIT ?"
        params.append(limit)
        
        cursor = db.execute(query, params)
        
        sessions = []
        for row in cursor.fetchall():
            session_dict = dict(row)
            total = session_dict.get('total_students') or 0
            allocated = session_dict.get('allocated_count') or 0
            session_dict['pending_count'] = max(0, total - allocated)
            sessions.append(session_dict)
        
        return sessions

    @staticmethod
    def get_session_stats(session_id: int) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive allocation statistics for a session.
        
        Returns:
            Dict with session_id, plan_id, status, total_students, allocated_count,
            pending_count, rooms (list), batches (list), completion_rate
        """
        db = get_db()
        
        # Overall stats
        cursor = db.execute("""
            SELECT total_students, allocated_count, status, plan_id
            FROM allocation_sessions
            WHERE session_id = ?
        """, (session_id,))
        
        session_row = cursor.fetchone()
        if not session_row:
            return None
        
        session_data = dict(session_row)
        
        # Per-room stats
        cursor = db.execute("""
            SELECT
                c.name,
                c.rows * c.cols as capacity,
                COUNT(a.id) as allocated
            FROM classrooms c
            LEFT JOIN allocations a ON c.id = a.classroom_id AND a.session_id = ?
            WHERE c.id IN (SELECT DISTINCT classroom_id FROM allocations WHERE session_id = ?)
            GROUP BY c.id
        """, (session_id, session_id))
        
        room_stats = [dict(row) for row in cursor.fetchall()]
        
        # Per-batch stats
        cursor = db.execute("""
            SELECT batch_name, COUNT(*) as count
            FROM allocations
            WHERE session_id = ?
            GROUP BY batch_name
        """, (session_id,))
        
        batch_stats = [dict(row) for row in cursor.fetchall()]
        
        # Completion rate
        total = session_data.get('total_students') or 0
        allocated = session_data.get('allocated_count') or 0
        completion_rate = round((allocated / total) * 100, 2) if total > 0 else 0
        
        return {
            "session_id": session_id,
            "plan_id": session_data.get('plan_id'),
            "status": session_data.get('status'),
            "total_students": total,
            "allocated_count": allocated,
            "pending_count": max(0, total - allocated),
            "rooms": room_stats,
            "batches": batch_stats,
            "completion_rate": completion_rate
        }
