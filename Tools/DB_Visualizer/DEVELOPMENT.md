# Development Guide - DB Visualizer

## Project Overview

DB Visualizer is a full-stack application for visualizing database schemas as interactive ER diagrams.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ├── Navbar Component (File Upload)                     │
│  ├── DiagramCanvas (React Flow)                         │
│  ├── TableNode (Table Cards)                            │
│  └── TableModal (Data Viewer)                           │
└──────────────┬──────────────────────────────────────────┘
               │ Axios HTTP Calls
               ▼
┌─────────────────────────────────────────────────────────┐
│               Backend (FastAPI)                          │
│  ├── POST /upload-db                                   │
│  ├── GET /schema                                        │
│  ├── GET /table/{name}                                 │
│  └── GET /tables                                        │
└──────────────┬──────────────────────────────────────────┘
               │ SQLAlchemy
               ▼
        ┌─────────────────┐
        │  SQLite DB      │
        └─────────────────┘
```

## Development Workflow

### 1. Backend Development

**File Structure:**
```
backend/
├── main.py           # FastAPI app, endpoints
├── schema_parser.py  # SQLAlchemy inspection
├── db_loader.py      # File handling
└── requirements.txt  # Dependencies
```

**Adding New Endpoints:**

```python
# In main.py
@app.get("/new-endpoint")
async def new_endpoint():
    """Your endpoint description"""
    return {"data": "response"}
```

**Key Classes:**

- `SchemaParser`: Handles database schema inspection
  ```python
  parser = SchemaParser(db_path)
  schema = parser.get_complete_schema()  # Full schema
  rows, total = parser.get_table_data(table_name, limit, offset)
  ```

- `DatabaseLoader`: Handles file uploads
  ```python
  db_path, db_type = DatabaseLoader.save_upload(file, filename)
  DatabaseLoader.cleanup_file(db_path)
  ```

### 2. Frontend Development

**Component Structure:**

1. **App.jsx** - Main container
   - State management for schema and selected table
   - Renders all subcomponents

2. **Navbar.jsx** - Upload interface
   - Drag-and-drop file upload
   - Calls POST /upload-db
   - Loading states

3. **DiagramCanvas.jsx** - Main visualization
   - React Flow wrapper
   - Converts schema to nodes/edges
   - Auto-layout with Dagre
   - Click handlers for table nodes

4. **TableNode.jsx** - Table cards in diagram
   - Shows columns with types
   - Primary key indicators
   - Connection handles for React Flow

5. **TableModal.jsx** - Data browser
   - Paginated table view
   - Sticky headers
   - Pagination controls
   - Calls GET /table/{name}

**Adding New Components:**

```jsx
// components/NewComponent.jsx
import React from 'react';

function NewComponent({ data, onAction }) {
  return (
    <div className="...">
      {/* Your JSX */}
    </div>
  );
}

export default NewComponent;

// Import in App.jsx
import NewComponent from './components/NewComponent';

// Use in App
<NewComponent data={data} onAction={handler} />
```

### 3. Styling with Tailwind

**Convention:**
- Use Tailwind utility classes directly
- Follow existing color scheme (blue/gray)
- Responsive design with breakpoints

```jsx
<div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Content
</div>
```

**Key Colors Used:**
- Blue: `blue-500`, `blue-600`, `blue-700`
- Gray: `gray-100` to `gray-900`
- Status: `yellow-500` (primary key), `red-500` (error)

## API Integration

### Axios Setup

All API calls use axios with base URL:
```javascript
const API_BASE = 'http://localhost:8000';
const response = await axios.get(`${API_BASE}/endpoint`);
```

### Error Handling

```javascript
try {
  const response = await axios.post(`${API_BASE}/upload-db`, formData);
  if (response.data.success) {
    // Handle success
  }
} catch (error) {
  const message = error.response?.data?.detail || error.message;
  alert(`Error: ${message}`);
}
```

## Running Locally

### Terminal 1 - Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Access API docs: http://localhost:8000/docs

### Terminal 2 - Frontend

```bash
cd frontend
npm install
npm run dev
```

Open browser: http://localhost:3000

## Testing

### Manual Testing Checklist

- [ ] Upload SQLite database
- [ ] View ER diagram renders correctly
- [ ] Click table shows data modal
- [ ] Pagination works
- [ ] Different limit options work
- [ ] Drag canvas
- [ ] Zoom controls
- [ ] Responsive on mobile
- [ ] Error handling for invalid files
- [ ] Loading states appear

### Creating Test Database

```bash
sqlite3 test.db << EOF
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    age INTEGER
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users VALUES (1, 'John', 'john@example.com', 30);
INSERT INTO users VALUES (2, 'Jane', 'jane@example.com', 25);
INSERT INTO posts VALUES (1, 1, 'Post 1', 'Content');
INSERT INTO posts VALUES (2, 2, 'Post 2', 'More content');
EOF
```

## Debugging

### Backend Debugging

```python
# Add print statements (or use debugger)
import logging
logging.basicConfig(level=logging.DEBUG)

# Or use FastAPI debug mode (enabled by default)
```

Check API docs: http://localhost:8000/docs

### Frontend Debugging

Use browser DevTools:
- Console for errors
- Network tab to inspect API calls
- React DevTools extension for component state

## Building for Production

### Backend

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app

# Or with environment variables
export DATABASE_URL=your_prod_db
gunicorn -w 4 main:app
```

### Frontend

```bash
# Build static files
npm run build

# Deploy dist/ folder to static hosting
# (Vercel, Netlify, S3, GitHub Pages, etc.)
```

## Code Style

### Python
- Follow PEP 8
- Use type hints
- Descriptive variable names
- Comments for complex logic

### JavaScript/JSX
- Use functional components
- Hooks for state management
- Clear variable names
- Comments for non-obvious code
- No console errors

## Common Issues

### "Port already in use"
```bash
# Backend
python main.py --port 8001

# Frontend (edit vite.config.js)
server: { port: 3001 }
```

### "Module not found"
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install --force
```

### CORS Errors
Backend has CORS enabled for all origins. For production, restrict in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
)
```

### Blank Diagram
- Check browser console for errors
- Verify database has tables
- Check API response: http://localhost:8000/docs

## Performance Tips

1. **Frontend:**
   - Lazy load components if many tables
   - Virtualize large table lists
   - Debounce zoom/pan operations

2. **Backend:**
   - Cache schema inspection results
   - Use connection pooling
   - Implement request rate limiting

3. **Database:**
   - Index large tables
   - Paginate by default
   - Consider query optimization

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Export diagram as PNG/SVG
- [ ] Search/filter tables
- [ ] Column search in modal
- [ ] Save diagram layouts
- [ ] SQL preview
- [ ] Database statistics
- [ ] Index information display
- [ ] Query builder
- [ ] Export as documentation

## Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [React Flow Docs](https://reactflow.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [SQLAlchemy Inspector](https://docs.sqlalchemy.org/en/20/core/inspection.html)

## Contributing

1. Create a feature branch
2. Make changes with clear commits
3. Test locally
4. Submit pull request

---

Happy developing! 🚀
