"""
DB Visualizer Backend - FastAPI server for database schema and data access
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Optional

from schema_parser import SchemaParser
from db_loader import DatabaseLoader

app = FastAPI(title="DB Visualizer API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state - in production, use a proper session management
current_db_path = None
current_parser = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/upload-db")
async def upload_database(file: UploadFile = File(...)):
    """
    Upload and analyze database file
    Accepts: .db, .sqlite, .sqlite3, .sql files
    """
    global current_db_path, current_parser
    
    try:
        # Read file contents
        contents = await file.read()
        
        # Create a temporary file-like object
        import io
        file_obj = io.BytesIO(contents)
        
        # Create a mock uploaded file object
        class MockUploadedFile:
            def __init__(self, content, filename):
                self.file = io.BytesIO(content)
                self.filename = filename
        
        mock_file = MockUploadedFile(contents, file.filename)
        
        # Save the uploaded file
        db_path, db_type = DatabaseLoader.save_upload(mock_file, file.filename)
        
        # Initialize schema parser
        current_db_path = db_path
        current_parser = SchemaParser(db_path)
        
        # Get schema information
        schema = current_parser.get_complete_schema()
        
        return {
            "success": True,
            "db_type": db_type,
            "message": f"Database uploaded successfully",
            "schema": schema
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_msg = f"Error processing database: {str(e)}"
        print(traceback.format_exc())  # Log the full traceback
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/schema")
async def get_schema():
    """
    Get the currently loaded database schema
    Returns all tables, columns, primary keys, and foreign keys
    """
    global current_parser
    
    if not current_parser:
        raise HTTPException(status_code=400, detail="No database loaded. Upload a database first.")
    
    try:
        schema = current_parser.get_complete_schema()
        return {
            "success": True,
            "schema": schema
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving schema: {str(e)}")


@app.get("/table/{table_name}")
async def get_table_data(
    table_name: str,
    page: int = 1,
    limit: int = 50
):
    """
    Get paginated data from a specific table
    Query params:
    - page: Page number (1-indexed)
    - limit: Number of rows per page (default: 50, max: 500)
    """
    global current_parser
    
    if not current_parser:
        raise HTTPException(status_code=400, detail="No database loaded. Upload a database first.")
    
    # Validate inputs
    if page < 1:
        page = 1
    if limit < 1 or limit > 500:
        limit = 50
    
    try:
        # Get table structure
        schema = current_parser.get_complete_schema()
        table_info = next((t for t in schema["tables"] if t["id"] == table_name), None)
        
        if not table_info:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get data
        rows, total = current_parser.get_table_data(table_name, limit=limit, offset=offset)
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit
        
        return {
            "success": True,
            "table_name": table_name,
            "columns": table_info["columns"],
            "data": rows,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving table data: {str(e)}")


@app.get("/tables")
async def list_tables():
    """Get list of all tables in the database"""
    global current_parser
    
    if not current_parser:
        raise HTTPException(status_code=400, detail="No database loaded. Upload a database first.")
    
    try:
        tables = current_parser.get_all_tables()
        return {
            "success": True,
            "tables": tables,
            "count": len(tables)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing tables: {str(e)}")


@app.delete("/database")
async def unload_database():
    """Unload the current database and cleanup"""
    global current_db_path, current_parser
    
    if current_db_path:
        DatabaseLoader.cleanup_file(current_db_path)
    
    current_db_path = None
    current_parser = None
    
    return {
        "success": True,
        "message": "Database unloaded and cleaned up"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
