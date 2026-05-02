from backend.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Get columns
    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='srp' ORDER BY ordinal_position"))
    print("=== SRP Table Columns ===")
    for c in cols:
        print(c[0])

    # Get all rows
    rows = conn.execute(text("SELECT * FROM srp"))
    print("\n=== SRP Table Data ===")
    for r in rows:
        print(dict(r._mapping))
