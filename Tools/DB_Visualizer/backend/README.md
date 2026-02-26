# Backend - DB Visualizer

FastAPI server for database schema inspection and data retrieval.

## Installation

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running

```bash
python main.py
```

Server starts at `http://localhost:8000`

API docs available at `http://localhost:8000/docs`

## API Endpoints

### Health Check
```
GET /health
```

### Upload Database
```
POST /upload-db
Content-Type: multipart/form-data

Parameter: file (binary)
```

**Response:**
```json
{
  "success": true,
  "db_type": "sqlite",
  "message": "Database uploaded successfully",
  "schema": {
    "tables": [...],
    "relationships": [...]
  }
}
```

### Get Schema
```
GET /schema
```

Returns complete schema with all tables, columns, primary keys, and relationships.

### Get Table Data
```
GET /table/{table_name}?page=1&limit=50
```

**Parameters:**
- `page` (int): Page number, 1-indexed
- `limit` (int): Rows per page, default 50, max 500

**Response:**
```json
{
  "success": true,
  "table_name": "users",
  "columns": [...],
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "total_pages": 20,
    "has_next": true,
    "has_previous": false
  }
}
```

### List Tables
```
GET /tables
```

### Unload Database
```
DELETE /database
```

## File Structure

- `main.py` - FastAPI application and endpoints
- `schema_parser.py` - SQLAlchemy schema inspection
- `db_loader.py` - Database file handling and detection
- `requirements.txt` - Python dependencies

## Supported Databases

- SQLite (.db, .sqlite, .sqlite3)
- SQL scripts (.sql)

## Error Handling

All errors return JSON with HTTP status codes:

```json
{
  "detail": "Error message"
}
```

Common status codes:
- `400` - Bad request (invalid file type)
- `404` - Resource not found (table doesn't exist)
- `500` - Server error

## Configuration

### CORS
Enabled for all origins (`*`). Modify in main.py for production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    ...
)
```

### Upload Directory
Default: `../uploads/`
Change in `db_loader.py` if needed.

## Production Notes

1. Use Gunicorn for production:
```bash
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

2. Set environment for production:
```bash
export ENVIRONMENT=production
```

3. Use proper session management instead of global state

4. Implement authentication if needed

5. Add database connection pooling for concurrent requests

## Development

For hot-reload during development:
```bash
python main.py  # Already has reload=True
```

Watch for changes in all .py files.

---

Built with FastAPI and SQLAlchemy
