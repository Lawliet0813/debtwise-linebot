-- Demo user
with inserted_user as (
    insert into public.users (line_user_id, name)
    values ('U_DEMO', 'Demo User')
    returning id
),

inserted_debts as (
    insert into public.debts (user_id, name, balance, interest_rate, min_payment, due_day)
    select
        inserted_user.id,
        debt_name,
        balance,
        interest_rate,
        min_payment,
        due_day
    from inserted_user
    cross join (values
        ('卡費', 50000.00, 14.900, 1500.00, 25),
        ('學貸', 120000.00, 1.680, 2000.00, 10)
    ) as debts(debt_name, balance, interest_rate, min_payment, due_day)
    returning id, name
)

insert into public.payments (debt_id, amount, date, note)
select
    d.id,
    payment.amount,
    payment.date,
    payment.note
from inserted_debts d
join (values
    (5000.00, date '2024-08-25', '第一次繳款'),
    (4500.00, date '2024-09-25', '第二次繳款')
) as payment(amount, date, note)
    on d.name = '卡費';
