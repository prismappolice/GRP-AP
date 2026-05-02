import sys
sys.path.insert(0, 'D:/Desktop/Projects/GRP')
from backend.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    r = conn.execute(text("UPDATE irp SET email = 'grpnellorecircle@gmail.com' WHERE name = 'IRP Nellore Circle'"))
    conn.commit()
    print('OK' if r.rowcount else 'NOT FOUND')
