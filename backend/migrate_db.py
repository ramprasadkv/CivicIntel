import sqlite3
import os
from app.config import DB_PATH

def migrate():
    print(f"Migrating SQLite DB at {DB_PATH}...")
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Get existing columns in reports table
    cursor.execute("PRAGMA table_info(reports);")
    columns = [col[1] for col in cursor.fetchall()]

    new_cols = [
        ("linked_department_id", "INTEGER"),
        ("linked_department_code", "VARCHAR(20)"),
        ("sub_category", "VARCHAR(150)")
    ]

    for col_name, col_type in new_cols:
        if col_name not in columns:
            try:
                cursor.execute(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type};")
                print(f"Added column: {col_name}")
            except Exception as e:
                print(f"Column {col_name} alter failed: {e}")

    conn.commit()
    conn.close()
    print("Database migration complete!")

if __name__ == "__main__":
    migrate()
