import sqlite3
from datetime import datetime, timedelta

# Create a demo database
db_path = 'demo.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create tables
cursor.execute('''
    CREATE TABLE IF NOT EXISTS departments (
        department_id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_name TEXT NOT NULL UNIQUE,
        location TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        department_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments (department_id)
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        project_id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        description TEXT,
        department_id INTEGER NOT NULL,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments (department_id)
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS seats (
        seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
        seat_number TEXT NOT NULL UNIQUE,
        floor INTEGER NOT NULL,
        wing TEXT NOT NULL,
        project_id INTEGER,
        is_available BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (project_id)
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS allocations (
        allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        seat_id INTEGER NOT NULL,
        allocation_date DATE NOT NULL,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id),
        FOREIGN KEY (seat_id) REFERENCES seats (seat_id)
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS allocation_history (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        allocation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        seat_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        changed_by TEXT,
        FOREIGN KEY (allocation_id) REFERENCES allocations (allocation_id),
        FOREIGN KEY (user_id) REFERENCES users (user_id),
        FOREIGN KEY (seat_id) REFERENCES seats (seat_id)
    )
''')

# Insert sample data
# Departments
departments = [
    ('Engineering', 'Building A'),
    ('Sales', 'Building B'),
    ('Marketing', 'Building A'),
    ('HR', 'Building C'),
    ('Finance', 'Building C'),
]

for name, location in departments:
    cursor.execute(
        'INSERT INTO departments (department_name, location) VALUES (?, ?)',
        (name, location)
    )

# Users
users = [
    ('john_doe', 'john@company.com', 1, 'Senior Engineer'),
    ('jane_smith', 'jane@company.com', 1, 'Engineer'),
    ('bob_johnson', 'bob@company.com', 2, 'Sales Manager'),
    ('alice_williams', 'alice@company.com', 3, 'Marketing Manager'),
    ('charlie_brown', 'charlie@company.com', 4, 'HR Specialist'),
    ('diana_prince', 'diana@company.com', 1, 'Tech Lead'),
    ('evan_davis', 'evan@company.com', 2, 'Sales Executive'),
    ('fiona_garcia', 'fiona@company.com', 5, 'Financial Analyst'),
]

for username, email, dept_id, role in users:
    cursor.execute(
        'INSERT INTO users (username, email, department_id, role) VALUES (?, ?, ?, ?)',
        (username, email, dept_id, role)
    )

# Projects
projects = [
    ('Web Platform', 'New customer portal', 1, '2024-01-15', '2024-12-31', 'active'),
    ('Mobile App', 'iOS and Android apps', 1, '2024-02-01', '2024-11-30', 'active'),
    ('Sales Dashboard', 'Real-time sales analytics', 2, '2024-03-01', '2024-09-30', 'active'),
    ('Marketing Automation', 'Email and campaign automation', 3, '2024-01-20', '2024-08-31', 'planning'),
]

for name, desc, dept_id, start, end, status in projects:
    cursor.execute(
        'INSERT INTO projects (project_name, description, department_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
        (name, desc, dept_id, start, end, status)
    )

# Seats
seats = [
    ('A-101', 1, 'Wing A', 1),
    ('A-102', 1, 'Wing A', 1),
    ('A-103', 1, 'Wing A', 1),
    ('A-201', 2, 'Wing A', 2),
    ('A-202', 2, 'Wing A', 2),
    ('B-101', 1, 'Wing B', 3),
    ('B-102', 1, 'Wing B', 3),
    ('B-201', 2, 'Wing B', 4),
    ('C-101', 1, 'Wing C', None),
    ('C-102', 1, 'Wing C', None),
]

for seat_num, floor, wing, proj_id in seats:
    cursor.execute(
        'INSERT INTO seats (seat_number, floor, wing, project_id) VALUES (?, ?, ?, ?)',
        (seat_num, floor, wing, proj_id)
    )

# Allocations
allocations = [
    (1, 1, '2024-01-15', 'active', 'Main project seat'),
    (2, 2, '2024-01-15', 'active', 'Development team'),
    (3, 6, '2024-02-01', 'active', 'Sales team seating'),
    (4, 7, '2024-02-15', 'active', 'Marketing division'),
    (6, 3, '2024-01-20', 'active', 'Project lead'),
    (7, 8, '2024-03-01', 'active', 'Sales support'),
]

for user_id, seat_id, alloc_date, status, notes in allocations:
    cursor.execute(
        'INSERT INTO allocations (user_id, seat_id, allocation_date, status, notes) VALUES (?, ?, ?, ?, ?)',
        (user_id, seat_id, alloc_date, status, notes)
    )

# Allocation history
history = [
    (1, 1, 1, 'assigned', 'john_admin'),
    (2, 2, 2, 'assigned', 'jane_admin'),
    (3, 3, 6, 'assigned', 'admin_user'),
    (4, 4, 7, 'assigned', 'admin_user'),
    (1, 1, 1, 'modified', 'admin_user'),
]

for alloc_id, user_id, seat_id, action, changed_by in history:
    cursor.execute(
        'INSERT INTO allocation_history (allocation_id, user_id, seat_id, action, changed_by) VALUES (?, ?, ?, ?, ?)',
        (alloc_id, user_id, seat_id, action, changed_by)
    )

# Commit and close
conn.commit()
conn.close()

print(f"✓ Demo database created successfully: {db_path}")
print("\nDatabase structure:")
print("- departments (5 records)")
print("- users (8 records)")
print("- projects (4 records)")
print("- seats (10 records)")
print("- allocations (6 records)")
print("- allocation_history (5 records)")
print("\nYou can now upload this file to the DB Visualizer application!")
