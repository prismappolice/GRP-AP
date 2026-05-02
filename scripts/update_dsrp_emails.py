import sys
sys.path.insert(0, 'D:/Desktop/Projects/GRP')

from backend.db import engine
from sqlalchemy import text

updates = [
    ('DSRP Guntakal',      'dsrpgtl@gmail.com'),
    ('DSRP Tirupati',      'dsprailwaystirupatigrpap@gmail.com'),
    ('DSRP Nellore',       'dsrpnellore9@gmail.com'),
    ('DSRP Vijayawada',    'dsrp.vja@gmail.com'),
    ('DSRP Guntur',        'gntdsrpgrpvza@gmail.com'),
    ('DSRP Rajahmundry',   'dsrpofficerjy@gmail.com'),
    ('DSRP Visakhapatnam', 'dsrp.vskp@gmail.com'),
]

with engine.connect() as conn:
    for name, email in updates:
        result = conn.execute(
            text("UPDATE dsrp SET email = :email WHERE name = :name"),
            {"email": email, "name": name}
        )
        print(f"{'✓' if result.rowcount else '✗ NOT FOUND'} {name} → {email}")
    conn.commit()
    print("\nDone.")
