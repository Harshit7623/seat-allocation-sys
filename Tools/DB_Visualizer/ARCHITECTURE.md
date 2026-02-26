# 🏗️ Project Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (Port 3000)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React Application (App.jsx)                 │   │
│  │                                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  Navbar.jsx  │  │  DiagramCanvas │  │  TableModal │   │   │
│  │  │  (Upload)    │  │  (ER Diagram)  │  │  (Data)     │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                          ↓                                 │   │
│  │                    ┌────────────┐                          │   │
│  │                    │ TableNode  │                          │   │
│  │                    │(Cards)     │                          │   │
│  │                    └────────────┘                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓ HTTP (Axios)                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ REST API Calls
                          │
┌─────────────────────────────────────────────────────────────────┐
│                FastAPI Backend (Port 8000)                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    main.py (Endpoints)                    │   │
│  │                                                            │   │
│  │  POST   /upload-db   ←─────────────────────────────┐     │   │
│  │  GET    /schema                                     │     │   │
│  │  GET    /table/{name}                              │     │   │
│  │  GET    /tables                                    │     │   │
│  │  DELETE /database                                  │     │   │
│  │  GET    /health                                    │     │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                          ↓                                     │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │         DatabaseLoader (db_loader.py)               │   │   │
│  │  • File upload handling                              │   │   │
│  │  • Database type detection                           │   │   │
│  │  • File validation                                   │   │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                          ↓                                     │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │       SchemaParser (schema_parser.py)                │   │   │
│  │  • Get all tables                                    │   │   │
│  │  • Get columns & types                               │   │   │
│  │  • Extract PKs & FKs                                 │   │   │
│  │  • Get paginated data                                │   │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                          ↓ SQLAlchemy Inspector               │   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Query
                          │
┌─────────────────────────────────────────────────────────────────┐
│                 SQLite Database (File)                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   users      │  │   posts      │  │   comments   │          │
│  │   (table)    │  │   (table)    │  │   (table)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↑               ↑ (FK)             ↑ (FK)              │
│         └───────────────┴─────────────────┘ (Relationships)   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. File Upload Flow

```
User Selects File
    ↓
Drag-Drop or File Input (Navbar.jsx)
    ↓
FormData Created
    ↓
POST /upload-db
    ↓
DatabaseLoader.save_upload()
    ├─ Validate file type
    ├─ Save to uploads/
    └─ Detect DB type
    ↓
SchemaParser.get_complete_schema()
    ├─ Get all tables
    ├─ Get columns for each table
    ├─ Get primary keys
    └─ Get foreign keys
    ↓
Return schema to Frontend
    ↓
DiagramCanvas receives schema
    ↓
Convert to React Flow nodes & edges
    ↓
Auto-layout with Dagre
    ↓
Render ER Diagram
```

### 2. Table Click Flow

```
User Clicks Table Node
    ↓
TableNode onClick handler triggered
    ↓
App.setState({ selectedTable, showModal: true })
    ↓
TableModal opens
    ↓
TableModal calls GET /table/{table_name}?page=1&limit=25
    ↓
SchemaParser.get_table_data()
    ├─ Count total rows
    ├─ Get paginated data
    └─ Return with pagination info
    ↓
Display data in modal
    ├─ Sticky header
    ├─ Scrollable body
    └─ Pagination controls
```

### 3. Pagination Flow

```
User clicks Next Page
    ↓
setCurrentPage(page + 1)
    ↓
fetchTableData(newPage)
    ↓
GET /table/{name}?page=newPage&limit=current
    ↓
Calculate offset = (page - 1) * limit
    ↓
Execute: SELECT * FROM table LIMIT limit OFFSET offset
    ↓
Return rows and pagination info
    ↓
Update modal with new data
```

---

## Component Hierarchy

```
App (Main Container)
├── Navbar
│   ├── File Input
│   └── Upload Button
│
├── DiagramCanvas (React Flow)
│   ├── Background
│   ├── Controls
│   └── Nodes/Edges
│       ├── TableNode (multiple)
│       │   ├── Header
│       │   ├── Column List
│       │   └── Handles
│       └── Edges (Relationships)
│
└── TableModal
    ├── Header
    ├── Error Alert
    ├── Table
    │   ├── Head (Sticky)
    │   └── Body (Scrollable)
    └── Footer (Pagination)
```

---

## State Management

### App State

```javascript
{
  schema: {
    tables: [
      {
        id: "users",
        name: "users",
        columns: [
          { name: "id", type: "INTEGER", nullable: false },
          { name: "name", type: "TEXT", nullable: true }
        ],
        primaryKeys: ["id"]
      }
    ],
    relationships: [
      {
        source_table: "posts",
        source_columns: ["user_id"],
        target_table: "users",
        target_columns: ["id"]
      }
    ]
  },
  selectedTable: {...},
  showModal: true,
  isLoading: false
}
```

### DiagramCanvas State

```javascript
{
  nodes: [
    {
      id: "users",
      data: { label: "users", columns: [...] },
      position: { x: 0, y: 0 },
      type: "table"
    }
  ],
  edges: [
    {
      id: "posts-users",
      source: "posts",
      target: "users",
      animated: true
    }
  ]
}
```

### TableModal State

```javascript
{
  data: [{...}, {...}],  // Table rows
  loading: false,
  error: null,
  currentPage: 1,
  pagination: {
    page: 1,
    limit: 25,
    total: 1000,
    total_pages: 40,
    has_next: true,
    has_previous: false
  }
}
```

---

## File Upload Security

```
User Selects File
    ↓
Browser validates extension (.db, .sqlite, .sql)
    ↓
File sent to backend
    ↓
Backend validates file type
    ├─ Check extension
    ├─ Check magic bytes
    └─ Detect type
    ↓
File saved with hash-based name
    ├─ Prevents collisions
    └─ Original name not exposed
    ↓
Isolated in /uploads directory
    ├─ Not in public web root
    └─ Cleaned up after session
    ↓
Only schema inspected (no SQL execution)
    ↓
Temporary database cleaned up
```

---

## API Request/Response Examples

### Upload Request

```javascript
POST /upload-db
Content-Type: multipart/form-data

Form Data:
  file: <binary file data>
  filename: "mydb.db"
```

### Upload Response

```json
{
  "success": true,
  "db_type": "sqlite",
  "message": "Database uploaded successfully",
  "schema": {
    "tables": [
      {
        "id": "users",
        "name": "users",
        "columns": [
          {"name": "id", "type": "INTEGER", "nullable": false},
          {"name": "email", "type": "TEXT", "nullable": true}
        ],
        "primaryKeys": ["id"]
      }
    ],
    "relationships": [
      {
        "source_table": "posts",
        "source_columns": ["user_id"],
        "target_table": "users",
        "target_columns": ["id"]
      }
    ]
  }
}
```

### Table Data Request

```javascript
GET /table/users?page=1&limit=50
```

### Table Data Response

```json
{
  "success": true,
  "table_name": "users",
  "columns": [
    {"name": "id", "type": "INTEGER", "nullable": false},
    {"name": "email", "type": "TEXT", "nullable": true}
  ],
  "data": [
    {"id": 1, "email": "john@example.com"},
    {"id": 2, "email": "jane@example.com"}
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Technology Integration Points

### Frontend ↔ Backend

```
┌─────────────────────────┐
│  React Components       │
│                         │
│  useState/useEffect     │
│  (Component state)      │
└────────────┬────────────┘
             │
             │ Axios
             │
┌────────────┴────────────┐
│  FastAPI Endpoints      │
│                         │
│  Request validation     │
│  Response formatting    │
└────────────┬────────────┘
             │
             │ SQLAlchemy
             │
┌────────────┴────────────┐
│  Database Queries       │
│                         │
│  Schema inspection      │
│  Data retrieval         │
└─────────────────────────┘
```

### Build Pipeline

```
Frontend:
  JSX → Vite → Bundled JS → Minified → Served on 3000

Backend:
  Python → FastAPI → Uvicorn → Running on 8000
```

---

## Error Handling Flow

```
Error Occurs
    ↓
Exception Caught (try-catch / try-except)
    ↓
Is it validation error?
├─ Yes → Return 400 Bad Request
│
Is it not found?
├─ Yes → Return 404 Not Found
│
Is it server error?
└─ Yes → Return 500 Internal Server Error
    ↓
Error message returned to Frontend
    ↓
Frontend displays error alert/toast
    ↓
User sees clear error message
```

---

## Performance Optimization Points

### Frontend
- Component memoization
- Lazy loading
- Virtualization for large lists
- CSS minimization
- Bundle optimization

### Backend
- Schema caching
- Query optimization
- Connection pooling
- Response compression
- Pagination by default

### Network
- Gzip compression
- HTTP caching headers
- Minimal payload size
- Efficient queries

---

## Deployment Architecture

```
┌─────────────────────────────────────┐
│        Production Environment        │
├─────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Nginx (Reverse Proxy)       │   │
│  │  Port 80/443 (HTTPS)         │   │
│  └────┬─────────────────────┬───┘   │
│       │                     │        │
│  ┌────┴──────────┐    ┌─────┴─────┐ │
│  │ Frontend      │    │ Backend    │ │
│  │ (Static)      │    │ (Gunicorn) │ │
│  │ Port 3000     │    │ Port 8000  │ │
│  └───────────────┘    └─────┬─────┘ │
│                             │        │
│                        ┌────┴─────┐  │
│                        │ Database  │  │
│                        │ SQLite    │  │
│                        └───────────┘  │
│                                      │
└─────────────────────────────────────┘
```

---

This document visualizes the complete architecture of DB Visualizer.
For implementation details, see the code and DEVELOPMENT.md.
