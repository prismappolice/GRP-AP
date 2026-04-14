import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

DATABASE_URL = os.getenv('DATABASE_URL')

# Remove quotes if present (in case .env has them)
if DATABASE_URL and DATABASE_URL.startswith('"') and DATABASE_URL.endswith('"'):
    DATABASE_URL = DATABASE_URL[1:-1]

# Use sync driver for SQLAlchemy ORM (for scripts, not asyncpg)
if DATABASE_URL and DATABASE_URL.startswith('postgresql+asyncpg'):
    DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg', 'postgresql')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
