-- Required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Users linked to LINE accounts
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    line_user_id text unique not null,
    name text,
    created_at timestamptz not null default now()
);

-- Debts tracked per user
create table if not exists public.debts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    name text not null,
    balance numeric(14,2) not null check (balance >= 0),
    interest_rate numeric(6,3) not null check (interest_rate >= 0),
    min_payment numeric(14,2) not null default 0 check (min_payment >= 0),
    due_day int not null check (due_day between 1 and 31),
    created_at timestamptz not null default now(),
    unique (user_id, name)
);

-- Payments applied to debts
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    debt_id uuid not null references public.debts(id) on delete cascade,
    amount numeric(14,2) not null check (amount > 0),
    date date not null default current_date,
    note text
);

-- Repayment plans per user
create table if not exists public.plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    method text not null check (method in ('avalanche','snowball')),
    monthly_budget numeric(14,2) not null check (monthly_budget > 0),
    generated_plan jsonb not null,
    created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_debts_user on public.debts(user_id);
create index if not exists idx_payments_debt on public.payments(debt_id);
create index if not exists idx_plans_user on public.plans(user_id);

-- View for quick due overview
create or replace view public.v_due_overview as
select
    d.user_id,
    d.id as debt_id,
    d.name,
    d.balance,
    d.interest_rate,
    d.min_payment,
    d.due_day
from public.debts d;
