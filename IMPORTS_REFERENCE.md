# Module Import Quick Reference

## Quick Start

```python
# Core App
from algo.main import app, create_app

# Configuration
from algo.config.settings import Config

# Database
from algo.database import ensure_demo_db, get_db, close_db
from algo.database.db import get_db_connection_standalone
from algo.database.queries.session_queries import SessionQueries
from algo.database.queries.student_queries import StudentQueries
from algo.database.queries.allocation_queries import AllocationQueries
from algo.database.queries.user_queries import UserQueries

# Services (Business Logic)
from algo.services.session_service import SessionService
from algo.services.student_service import StudentService
from algo.services.allocation_service import AllocationService

# Core Algorithm & Caching
from algo.core.algorithm.seating import SeatingAlgorithm
from algo.core.cache.cache_manager import CacheManager

# PDF Generation
from algo.pdf_gen.pdf_generation import get_or_create_seating_pdf
from algo.pdf_gen.template_manager import template_manager

# API Blueprints (Internal - used by Flask)
from algo.api.blueprints.sessions import session_bp
from algo.api.blueprints.students import student_bp
from algo.api.blueprints.allocations import allocation_bp
from algo.api.blueprints.pdf import pdf_bp
from algo.api.blueprints.classrooms import classrooms_bp
from algo.api.blueprints.dashboard import dashboard_bp
from algo.api.blueprints.auth import auth_bp, admin_bp
from algo.api.blueprints.plans import plans_bp
```

## Service Usage Examples

### Session Management
```python
from algo.services.session_service import SessionService

# Create session
session = SessionService.create_session("My Session", user_id=1)

# Get session
session_data = SessionService.get_session(session_id=123)

# Get user sessions
sessions = SessionService.get_user_sessions(user_id=1)

# Finalize session
SessionService.finalize_session(session_id=123)
```

### Student Management
```python
from algo.services.student_service import StudentService

# Add students from batch
StudentService.add_students_from_batch(batch_id="batch_001", session_id=123)

# Get pending students
pending = StudentService.get_pending_students(session_id=123)

# Allocate student
StudentService.allocate_student(student_id=456, room_id=789, seat_id=1)
```

### Allocation Service
```python
from algo.services.allocation_service import AllocationService

# Allocate classroom
result = AllocationService.allocate_classroom(
    session_id=123,
    classroom={"rows": 10, "cols": 10, "broken_seats": []},
    student_distribution={"CSE": 50, "ECE": 40}
)
```

## Database Query Usage

### Session Queries
```python
from algo.database.queries.session_queries import SessionQueries

# Get session by ID
session = SessionQueries.get_session_by_id(123)

# Get active sessions for user
sessions = SessionQueries.get_active_sessions(user_id=1)

# Create new session
session_id = SessionQueries.create_session(plan_id="uuid", user_id=1)

# Mark session completed
SessionQueries.mark_session_completed(session_id=123)
```

### Student Queries
```python
from algo.database.queries.student_queries import StudentQueries

# Get students in batch
students = StudentQueries.get_batch_students(batch_id="batch_001")

# Get batch counts
counts = StudentQueries.get_batch_counts(session_id=123)
```

## Configuration

```python
from algo.config.settings import Config

# Access configuration
db_path = Config.DB_PATH
feedback_folder = Config.FEEDBACK_FOLDER
max_file_size = Config.MAX_CONTENT_LENGTH
```

## Key Patterns

### With Application Context (for CLI/scripts)
```python
from algo.main import create_app
from algo.services.session_service import SessionService

app = create_app()

with app.app_context():
    session = SessionService.create_session("CLI Session", user_id=1)
    print(f"Created session: {session['session_id']}")
```

### Adding Blueprint Routes (in blueprints/*.py)
```python
from flask import Blueprint, request, jsonify
from algo.services.session_service import SessionService

session_bp = Blueprint('sessions', __name__, url_prefix='/api/sessions')

@session_bp.route('/start', methods=['POST'])
def create_session():
    data = request.json
    session = SessionService.create_session(data.get('name'), user_id=1)
    return jsonify({"status": "success", "session_id": session['session_id']}), 201
```

## File Organization Notes

- **config/** → Settings and configuration
- **database/** → Database connections, schema, and queries
- **core/** → Algorithm, models, and caching logic
- **services/** → Business logic layer between API and database
- **api/blueprints/** → Flask routes grouped by feature
- **pdf_gen/** → PDF generation and template management
- **old_files/** → Legacy code for reference

## Common Gotchas

⚠️ **Database Operations Need App Context**: Always use `with app.app_context():` when accessing database outside Flask request handlers

⚠️ **Circular Imports**: Services import from database queries; queries import database connection - this is correct and should not be changed

⚠️ **Cache Manager**: Use `CacheManager()` instance consistently - it's a singleton pattern

✅ **No Direct app.py Access**: Use the `main.py` factory to create app instances

---
*For more details, see RESTRUCTURING_COMPLETE.md*
