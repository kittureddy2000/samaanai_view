#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'samaanai.settings')
django.setup()

from django.db import connection

sql_commands = [
    "ALTER TABLE finance_institution ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE finance_account ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE finance_account ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='finance_account_user_id_fkey') THEN ALTER TABLE finance_account ADD CONSTRAINT finance_account_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE; END IF; END $$;",
    "CREATE INDEX IF NOT EXISTS finance_account_user_id_idx ON finance_account(user_id);",
    "ALTER TABLE finance_account ALTER COLUMN institution_id DROP NOT NULL;",
    "ALTER TABLE finance_account ALTER COLUMN plaid_account_id DROP NOT NULL;",
    "INSERT INTO django_migrations (app, name, applied) VALUES ('finance', '0011_add_manual_account_support', NOW()) ON CONFLICT DO NOTHING;",
]

with connection.cursor() as cursor:
    for sql in sql_commands:
        try:
            print(f"Executing: {sql}")
            cursor.execute(sql)
            print("  ✓ Success")
        except Exception as e:
            print(f"  ✗ Error: {e}")
            
print("\n✓ Migration complete!")
