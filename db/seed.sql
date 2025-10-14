-- Seed a demo user and debts
with upserted_user as (
    insert into public.users (line_user_id, name, email)
    values ('UDEMO1234567890', 'Demo User', 'demo@debtwise.ai')
    on conflict (line_user_id) do update
        set name = excluded.name,
            email = excluded.email
    returning id
)
insert into public.debts (user_id, name, balance, interest_rate, min_payment, due_day)
select
    u.id,
    d.debt_name,
    d.balance,
    d.interest_rate,
    d.min_payment,
    d.due_day
from upserted_user u
cross join (values
    ('信用卡卡費', 52000.00, 14.90, 1800.00, 25),
    ('學貸', 180000.00, 2.50, 3500.00, 5)
) as d(debt_name, balance, interest_rate, min_payment, due_day)
where not exists (
    select 1
    from public.debts existing
    where existing.user_id = u.id
      and existing.name = d.debt_name
);
