-- Alembic migration script to add missing enum values to userrole
-- Run this in your PostgreSQL database (as superuser or with sufficient privileges)

DO $$
BEGIN
    -- Add 'dgp' if not present
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'userrole' AND e.enumlabel = 'dgp') THEN
        ALTER TYPE userrole ADD VALUE 'dgp';
    END IF;
    -- Add 'srp' if not present
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'userrole' AND e.enumlabel = 'srp') THEN
        ALTER TYPE userrole ADD VALUE 'srp';
    END IF;
    -- Add 'dsrp' if not present
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'userrole' AND e.enumlabel = 'dsrp') THEN
        ALTER TYPE userrole ADD VALUE 'dsrp';
    END IF;
    -- Add 'irp' if not present
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'userrole' AND e.enumlabel = 'irp') THEN
        ALTER TYPE userrole ADD VALUE 'irp';
    END IF;
    -- Add 'station' if not present
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'userrole' AND e.enumlabel = 'station') THEN
        ALTER TYPE userrole ADD VALUE 'station';
    END IF;
END$$;
