from sqlalchemy import Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()
# ADMIN  Table (  admin )
class AdminORM(Base):
    __tablename__ = 'admin'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

# DGP  Table (  DGP, ADGP, IGP, DIG  )
class DgpORM(Base):
    __tablename__ = 'dgp'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) 
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    # SRP  Table (  SRP )
class SrpORM(Base):
    __tablename__ = 'srp'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) 
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

# DSRP  Table (  DSRP  )
class DsrpORM(Base):
    __tablename__ = 'dsrp'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) 
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

# IRP  Table ( IRP  )
class IrpORM(Base):
    __tablename__ = 'irp'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

# STATIONS  Table (  SIRP, HC  )
class StationORM(Base):
    __tablename__ = 'stations'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

# Public user ORM for public_users table
class PublicUserORM(Base):
    __tablename__ = 'public_users'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
