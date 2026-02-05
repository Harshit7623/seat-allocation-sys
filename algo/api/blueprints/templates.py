# Template download endpoints.
# Serves sample CSV templates for file upload format guidance.
import os
from flask import Blueprint, send_from_directory, jsonify, Response, current_app

templates_bp = Blueprint('templates', __name__, url_prefix='/api/templates')

# Path to the templates directory - Calculate from algo root
def get_templates_dir():
    """Get absolute path to templates directory"""
    # Start from this file's location: algo/api/blueprints/templates.py
    # Go up to algo/, then to static/templates
    this_dir = os.path.dirname(os.path.abspath(__file__))
    algo_dir = os.path.dirname(os.path.dirname(this_dir))  # Go up twice to algo/
    templates_dir = os.path.join(algo_dir, 'static', 'templates')
    return templates_dir

TEMPLATES_DIR = get_templates_dir()


@templates_bp.route('', methods=['GET'])
def list_templates():
    """List all available templates"""
    try:
        templates = []
        templates_dir = get_templates_dir()
        print(f"📁 Templates directory: {templates_dir}")
        print(f"📁 Exists: {os.path.exists(templates_dir)}")
        
        if os.path.exists(templates_dir):
            for filename in os.listdir(templates_dir):
                if filename.endswith(('.csv', '.xlsx')):
                    # Determine mode from filename
                    mode = '1' if 'mode1' in filename else '2' if 'mode2' in filename else 'unknown'
                    templates.append({
                        'filename': filename,
                        'mode': mode,
                        'description': 'Enrollment only' if mode == '1' else 'Name + Enrollment + Department',
                        'download_url': f'/api/templates/download/{filename}'
                    })
        return jsonify({
            'success': True,
            'templates': templates,
            'templates_dir': templates_dir
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@templates_bp.route('/download/<filename>', methods=['GET'])
def download_template(filename):
    """Download a specific template file"""
    try:
        # Security: only allow specific filenames
        allowed_files = ['students_mode1.csv', 'students_mode2.csv', 'CSE_Batch_10.csv']
        if filename not in allowed_files:
            return jsonify({'error': 'Template not found', 'allowed': allowed_files}), 404
        
        templates_dir = get_templates_dir()
        file_path = os.path.join(templates_dir, filename)
        print(f"📥 Templates dir: {templates_dir}")
        print(f"📥 Downloading: {file_path}")
        print(f"📥 Exists: {os.path.exists(file_path)}")
        print(f"📥 Dir contents: {os.listdir(templates_dir) if os.path.exists(templates_dir) else 'DIR NOT FOUND'}")
            
        if not os.path.exists(file_path):
            return jsonify({
                'error': f'Template file not found',
                'path': file_path,
                'dir_exists': os.path.exists(templates_dir),
                'dir_contents': os.listdir(templates_dir) if os.path.exists(templates_dir) else []
            }), 404
            
        return send_from_directory(
            templates_dir, 
            filename, 
            as_attachment=True,
            mimetype='text/csv'
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/preview/<filename>', methods=['GET'])
def preview_template(filename):
    """Preview a template file content"""
    try:
        allowed_files = ['students_mode1.csv', 'students_mode2.csv', 'CSE_Batch_10.csv']
        if filename not in allowed_files:
            return jsonify({'error': 'Template not found'}), 404
        
        templates_dir = get_templates_dir()
        file_path = os.path.join(templates_dir, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'Template file not found'}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.strip().split('\n')
            headers = lines[0].split(',') if lines else []
            rows = [line.split(',') for line in lines[1:]] if len(lines) > 1 else []
        
        return jsonify({
            'success': True,
            'filename': filename,
            'content': content,
            'headers': headers,
            'rows': rows[:10],  # First 10 rows for preview
            'total_rows': len(rows)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/format-info', methods=['GET'])
def get_format_info():
    """Return detailed format specification for uploads"""
    return jsonify({
        'success': True,
        'formats': {
            'mode1': {
                'name': 'Enrollment Only',
                'description': 'Simple list with just enrollment/roll numbers',
                'required_columns': ['Enrollment'],
                'accepted_headers': [
                    'enrollment', 'enrollmentno', 'enroll', 'enrollno', 
                    'roll', 'rollno', 'regno', 'registrationno', 
                    'studentid', 'id', 'matricno'
                ],
                'example': [
                    {'Enrollment': '21BCE1001'},
                    {'Enrollment': '21BCE1002'},
                    {'Enrollment': '22ECE2001'}
                ]
            },
            'mode2': {
                'name': 'Full Details',
                'description': 'Complete student info with name, enrollment, and department',
                'required_columns': ['Name', 'Enrollment'],
                'optional_columns': ['Department'],
                'accepted_name_headers': [
                    'name', 'studentname', 'fullname', 'candidate', 
                    'firstname', 'fname', 'student'
                ],
                'accepted_enrollment_headers': [
                    'enrollment', 'enrollmentno', 'enroll', 'enrollno',
                    'roll', 'rollno', 'regno', 'registrationno',
                    'studentid', 'id', 'matricno'
                ],
                'accepted_department_headers': [
                    'department', 'dept', 'branch', 'course', 
                    'program', 'stream', 'discipline'
                ],
                'example': [
                    {'Name': 'Rahul Sharma', 'Enrollment': '21BCE1001', 'Department': 'Computer Science'},
                    {'Name': 'Priya Patel', 'Enrollment': '21BCE1002', 'Department': 'Computer Science'}
                ]
            }
        },
        'file_requirements': {
            'allowed_extensions': ['csv', 'xlsx', 'xls'],
            'max_file_size_mb': 10,
            'encoding': 'UTF-8 (auto-detected)',
            'notes': [
                'First row must contain column headers',
                'Duplicate enrollments will be skipped',
                'Empty rows will be ignored',
                'Column names are case-insensitive'
            ]
        }
    }), 200
