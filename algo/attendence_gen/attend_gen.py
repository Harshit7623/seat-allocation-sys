import io
import os
import json
import hashlib
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# Define a cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

def get_data_hash(seating_data, batch_name):
    """Creates a unique MD5 hash for the input data."""
    # We sort keys to ensure the same data always produces the same hash
    data_str = json.dumps(seating_data, sort_keys=True) + batch_name
    return hashlib.md5(data_str.encode('utf-8')).hexdigest()

def generate_attendance_pdf(seating_data, batch_name="General"):
    # 1. Hashing Check
    data_hash = get_data_hash(seating_data, batch_name)
    cache_path = os.path.join(CACHE_DIR, f"{data_hash}.pdf")

    # If file exists in cache, return the path (or bytes)
    if os.path.exists(cache_path):
        print(f"♻️ Using cached PDF for: {batch_name}")
        with open(cache_path, 'rb') as f:
            return io.BytesIO(f.read())

    # 2. PDF Generation Logic
    print(f"🔄 Generating new PDF for: {batch_name}")
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []
    styles = getSampleStyleSheet()

    # Header
    title = Paragraph(f"<b>Attendance Sheet: {batch_name}</b>", styles['Title'])
    elements.append(title)
    
    date_str = datetime.now().strftime("%d-%m-%Y %H:%M")
    sub_title = Paragraph(f"Generated on: {date_str}", styles['Normal'])
    elements.append(sub_title)
    elements.append(Spacer(1, 20))

    data = [["S.No", "Enrollment No.", "Student Name", "Signature / Mark"]]
    
    # FIX: Robust Flattening Logic
    student_list = []
    for row in seating_data:
        # Check if row is a list (grid format) or if seating_data is already a list of students
        current_row = row if isinstance(row, list) else [row]
        for cell in current_row:
            if isinstance(cell, dict) and cell.get('roll_number'):
                student_list.append(cell)

    # Sort students
    student_list.sort(key=lambda x: str(x.get('roll_number', '')))

    for idx, student in enumerate(student_list, 1):
        data.append([idx,
            student.get('roll_number', 'N/A'),
            student.get('name', '___________'),
            "" 
        ])

    # Styling
    t = Table(data, colWidths=[40, 100, 230, 120])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWHEIGHT', (0, 1), (-1, -1), 25),
    ]))
    
    elements.append(t)
    doc.build(elements)
    
    # 3. Save to Cache before returning
    pdf_bytes = buffer.getvalue()
    with open(cache_path, 'wb') as f:
        f.write(pdf_bytes)
        
    buffer.seek(0)
    return buffer