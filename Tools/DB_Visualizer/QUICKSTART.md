# DB Visualizer - Quick Start Guide

## Prerequisites
- Python 3.9+
- Node.js 16+

## Quick Start

### 1. Backend Setup (First Terminal)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs on `http://localhost:8000`

### 2. Frontend Setup (Second Terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### 3. Use the Application

1. Open browser to `http://localhost:3000`
2. Click "Upload Database" button
3. Select your `.db`, `.sqlite`, or `.sql` file
4. View the ER diagram
5. Click any table to browse data

## Testing

### Sample Database

Create a test database:

```bash
sqlite3 test.db << EOF
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (name, email) VALUES 
('John Doe', 'john@example.com'),
('Jane Smith', 'jane@example.com');

INSERT INTO posts (user_id, title, content) VALUES 
(1, 'First Post', 'Content here'),
(1, 'Second Post', 'More content'),
(2, 'Jane Post', 'Another post');
EOF
```

Then upload `test.db` via the UI.

## API Documentation

See `backend/README.md` for detailed API docs

## Troubleshooting

### Port Already in Use
```bash
# Change frontend port in vite.config.js
# Change backend port: python main.py --port 8001
```

### Module Not Found
```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend
npm install --force
```

### CORS Errors
Backend CORS is configured for `*` - should work with any frontend origin.

## Architecture

```
[React Frontend]
      |
      | HTTP/Axios
      |
   [FastAPI Backend]
      |
      | SQLAlchemy
      |
  [SQLite Database]
```

## Key Features Demo

- **Upload** any SQLite database
- **Visualize** all tables and relationships
- **Browse** table data with pagination
- **Inspect** schema details (columns, types, keys)
- **Export** capability (future enhancement)

## Production Deployment

See main README.md for production setup instructions.

---

**Ready to visualize your database?** 🚀
