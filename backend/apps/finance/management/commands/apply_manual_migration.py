from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Apply manual account migration SQL directly'

    def handle(self, *args, **options):
        sql_commands = [
            "ALTER TABLE finance_institution ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE finance_account ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE finance_account ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;",
            "CREATE INDEX IF NOT EXISTS finance_account_user_id_idx ON finance_account(user_id);",
            "ALTER TABLE finance_account ALTER COLUMN institution_id DROP NOT NULL;",
            "ALTER TABLE finance_account ALTER COLUMN plaid_account_id DROP NOT NULL;",
        ]
        
        with connection.cursor() as cursor:
            for sql in sql_commands:
                try:
                    self.stdout.write(f"Executing: {sql}")
                    cursor.execute(sql)
                    self.stdout.write(self.style.SUCCESS('  ✓ Success'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Error: {e}'))
                    
        # Add foreign key constraint separately
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.table_constraints 
                            WHERE constraint_name='finance_account_user_id_fkey'
                        ) THEN 
                            ALTER TABLE finance_account 
                            ADD CONSTRAINT finance_account_user_id_fkey 
                            FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE; 
                        END IF; 
                    END $$;
                """)
                self.stdout.write(self.style.SUCCESS('✓ Foreign key constraint added'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Foreign key error: {e}'))
            
        self.stdout.write(self.style.SUCCESS('\n✓ Migration complete!'))
