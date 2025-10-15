# Database Setup (Supabase)

Use these steps to provision the DebtWise schema and demo data in Supabase.

## 1. Apply the schema

1. Sign in to the [Supabase dashboard](https://app.supabase.com/), open your project, and launch the **SQL Editor**.
2. Create a **New query**, paste the contents of [`db/schema.sql`](../db/schema.sql), then click **Run**.  
   The script creates required extensions, tables, indexes, and the `v_due_overview` view.

## 2. Load demo data

1. Open another **New query** tab.
2. Paste the contents of [`db/seed.sql`](../db/seed.sql) and click **Run**.  
   This inserts one demo LINE user plus two debts and payments.

## 3. Verify the records

Run these checks in the SQL Editor to confirm everything was created:

```sql
select * from users;
select name, balance, interest_rate, due_day from debts;
```

## Notes

- The application uses the Supabase **anon** key in production. Do **not** paste the service-role key into `.env`.
- All primary keys are UUIDs generated on the server; you do not need to supply them manually.
- `/plan` 指令會將最新的還款計畫寫入 `plans` 表的 `generated_plan` 欄位，方便之後查詢或追蹤。
