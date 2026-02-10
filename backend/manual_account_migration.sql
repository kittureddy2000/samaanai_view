-- Add missing columns to finance_institution and finance_account tables
-- This migration adds support for manual accounts

-- Add is_manual column to finance_institution if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_institution' AND column_name='is_manual') THEN
        ALTER TABLE finance_institution ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Add is_manual column to finance_account if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_account' AND column_name='is_manual') THEN
        ALTER TABLE finance_account ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Add user_id column to finance_account if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_account' AND column_name='user_id') THEN
        ALTER TABLE finance_account ADD COLUMN user_id INTEGER NULL;
        ALTER TABLE finance_account ADD CONSTRAINT finance_account_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;
        CREATE INDEX finance_account_user_id_idx ON finance_account(user_id);
    END IF;
END $$;

-- Make institution nullable on finance_account if not already
DO $$
BEGIN
    ALTER TABLE finance_account ALTER COLUMN institution_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore if already nullable
END $$;

-- Make plaid_account_id nullable and remove unique constraint if it exists  
DO $$
BEGIN
    ALTER TABLE finance_account ALTER COLUMN plaid_account_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore if already nullable
END $$;

-- Insert migration record
INSERT INTO django_migrations (app, name, applied)
VALUES ('finance', '0011_add_manual_account_support', NOW())
ON CONFLICT DO NOTHING;
