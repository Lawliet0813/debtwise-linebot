# Database Setup (Supabase)

This project stores its structured data in Supabase Postgres. The repository includes SQL scripts for creating the schema and loading demo data so that you can bootstrap a new project quickly.

## Files

- [`db/schema.sql`](../db/schema.sql) – creates the database tables, indexes, and triggers required by the bot.
- [`db/seed.sql`](../db/seed.sql) – inserts a demo LINE user and two example debts.

## Apply the schema in Supabase

1. Sign in to the [Supabase dashboard](https://app.supabase.com/), open your project, and go to **SQL Editor**.
2. Click **New query**, then press **Upload file** or paste the contents of `db/schema.sql` into the editor.
3. Ensure the SQL editor is pointed at the `public` schema, then click **Run**. Supabase will create the tables, indexes, and trigger defined in the script. You should see a success notification.

> **Tip:** If you run the schema more than once it is safe—the script uses `if not exists` to avoid duplicate objects.

## Load the demo data

1. With the schema applied, open another **New query** tab in the SQL Editor.
2. Paste the contents of `db/seed.sql` (or upload the file) into the editor.
3. Click **Run**. The script upserts a demo user (`UDEMO1234567890`) and inserts two debts linked to that user.

You can now explore the structure and sample records in Supabase's **Table editor** or connect the LINE bot using the demo data.
