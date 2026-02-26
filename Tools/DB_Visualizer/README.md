# DB Visualizer 📊

A production-ready, open-source web application for visualizing database schemas as interactive ER diagrams. Upload a database file and instantly get a visual representation of all tables and relationships with the ability to browse data.

## 🎯 Features

✨ **Interactive ER Diagrams**
- Visual representation of all tables and relationships
- Drag-and-drop canvas with auto-layout
- Curved edges with directional arrows
- Real-time schema parsing

📊 **Data Browsing**
- Click any table to view ALL rows
- Paginated data display (10/25/50/100 rows per page)
- Sticky headers and scrollable content
- NULL value highlighting

🚀 **Production Ready**
- Clean, minimal UI inspired by ChartDB
- Fast database detection and loading
- Secure file handling in sandboxed environment
- Error handling and loading states
- Responsive design with Tailwind CSS

## 📁 Project Structure

```
DB_Visualizer/
├── backend/              # FastAPI server
│   ├── main.py          # Main application entry
│   ├── db_loader.py     # Database file handling
│   ├── schema_parser.py # SQLAlchemy schema inspection
│   └── requirements.txt # Python dependencies
├── frontend/            # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Upload and navigation
│   │   │   ├── DiagramCanvas.jsx  # React Flow diagram
│   │   │   ├── TableNode.jsx    # Table nodes in diagram
│   │   │   └── TableModal.jsx   # Data viewing modal
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # React DOM entry
│   ├── index.html       # HTML template
│   ├── package.json     # Dependencies
│   ├── vite.config.js   # Vite configuration
│   ├── tailwind.config.js
│   └── README.md
├── uploads/            # Uploaded database files (temp storage)
└── README.md          # This file
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM for schema inspection
- **Python 3.9+** - Runtime

### Frontend
- **React 18** - UI library
- **React Flow** - Diagram visualization
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Vite** - Build tool

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start server:
```bash
python main.py
```

Server runs on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Application opens at `http://localhost:3000`

## 📥 Supported Database Formats

- SQLite (`.db`, `.sqlite`, `.sqlite3`)
- SQL scripts (`.sql`)

## 🎨 UI Components

### Navbar
- Drag-and-drop file upload
- Database status indicator
- Responsive design

### DiagramCanvas
- React Flow-based visualization
- Auto-layout with Dagre
- Zoomable and draggable
- Relationship arrows with labels

### TableNode
- Column list with types
- Primary key indicators
- Click to open details

### TableModal
- Full table data display
- Paginated rows
- Sortable columns
- Sticky headers

## 📊 API Endpoints

### POST `/upload-db`
Upload and analyze a database file
```bash
curl -F "file=@database.db" http://localhost:8000/upload-db
```

### GET `/schema`
Get complete schema information
```bash
curl http://localhost:8000/schema
```

### GET `/table/{table_name}`
Get paginated table data
```bash
curl "http://localhost:8000/table/users?page=1&limit=50"
```

### GET `/tables`
List all tables
```bash
curl http://localhost:8000/tables
```

### DELETE `/database`
Unload database and cleanup
```bash
curl -X DELETE http://localhost:8000/database
```

## 🔒 Security Features

- Sandboxed file uploads to `/uploads` directory
- No SQL execution beyond schema inspection
- Type validation for uploaded files
- CORS configuration for safe cross-origin requests
- Temporary file cleanup

## 🎯 Usage Example

1. Open `http://localhost:3000` in your browser
2. Click "Upload Database" button
3. Select a `.db`, `.sqlite`, or `.sql` file
4. View interactive ER diagram
5. Click any table to browse data
6. Paginate through large datasets

## 🧪 Production Deployment

### Backend
```bash
# Install production dependencies
pip install -r requirements.txt
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Frontend
```bash
# Build for production
npm run build

# Deploy dist/ folder to static hosting
```

## 📝 Code Quality

- Clear, descriptive comments
- Production-ready error handling
- Proper type hints in Python
- Responsive and accessible UI
- No console warnings or errors

## 🤝 Contributing

This is an open-source project. Feel free to:
- Fork and create feature branches
- Submit pull requests
- Report issues
- Improve documentation

## 📄 License

MIT License - feel free to use in commercial projects

## 🙏 Credits

Inspired by [ChartDB](https://chartdb.io/) - a modern database design tool

## 📧 Support

For issues, questions, or suggestions, please open an issue on the repository.

---

**Built with ❤️ for database engineers**
