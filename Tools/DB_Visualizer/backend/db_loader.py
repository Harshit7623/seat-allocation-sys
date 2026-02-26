"""
Database Loader - Handles database file uploads and detection
"""
import os
import shutil
from pathlib import Path
from typing import Tuple, Optional


class DatabaseLoader:
    """Handle database file uploads and type detection"""
    
    SUPPORTED_EXTENSIONS = {".db", ".sqlite", ".sqlite3"}
    UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
    
    @staticmethod
    def detect_db_type(file_path: str) -> Optional[str]:
        """
        Detect database type from file extension and content
        Returns: 'sqlite' or None if not supported
        """
        ext = Path(file_path).suffix.lower()
        
        # Check extension
        if ext in DatabaseLoader.SUPPORTED_EXTENSIONS or ext == ".sql":
            # For SQL files, we'll treat as sqlite import
            if ext == ".sql":
                return "sqlite"
            return "sqlite"
        
        # Check file magic bytes for SQLite
        try:
            with open(file_path, "rb") as f:
                header = f.read(16)
                if header.startswith(b"SQLite format 3"):
                    return "sqlite"
        except:
            pass
        
        return None
    
    @staticmethod
    def save_upload(uploaded_file, original_filename: str) -> Tuple[str, str]:
        """
        Save uploaded file to uploads directory
        Returns: (file_path, db_type)
        Raises: ValueError if file type not supported
        """
        # Ensure uploads directory exists
        DatabaseLoader.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Generate safe filename
        file_ext = Path(original_filename).suffix.lower()
        safe_filename = f"upload_{hash(original_filename)}_{Path(original_filename).stem}{file_ext}"
        file_path = DatabaseLoader.UPLOADS_DIR / safe_filename
        
        # For .sql files, create temporary SQLite DB
        if file_ext == ".sql":
            # We'll handle SQL import in a separate function
            file_path = DatabaseLoader.UPLOADS_DIR / f"upload_{hash(original_filename)}.sqlite"
        
        # Save file - assume uploaded_file.file is already a BytesIO object
        with open(file_path, "wb") as f:
            f.write(uploaded_file.file.read())
        
        # Detect type
        db_type = DatabaseLoader.detect_db_type(str(file_path))
        if not db_type:
            file_path.unlink()  # Delete file
            raise ValueError(f"Unsupported database file type: {file_ext}")
        
        return str(file_path), db_type
    
    @staticmethod
    def cleanup_file(file_path: str) -> bool:
        """Delete uploaded file"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
            return True
        except:
            return False
    
    @staticmethod
    def import_sql_file(sql_file_path: str, output_db_path: str) -> None:
        """
        Import SQL file into a SQLite database
        """
        import sqlite3
        
        conn = sqlite3.connect(output_db_path)
        cursor = conn.cursor()
        
        try:
            with open(sql_file_path, "r") as f:
                sql_script = f.read()
                # Split by ; and execute statements
                statements = sql_script.split(";")
                for statement in statements:
                    statement = statement.strip()
                    if statement:
                        cursor.execute(statement)
            conn.commit()
        finally:
            conn.close()
