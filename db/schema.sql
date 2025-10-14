-- Enable required extensions
create extension if not exists "pgcrypto";

-- Helper function to automatically update timestamps
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

-- Users table stores LINE users linked to DebtWise
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    line_user_id text not null unique,
    name text,
    email text,
    created_at timestamp with time zone not null default timezone('utc', now())
);

-- Debts associated with a user
create table if not exists public.debts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    name text not null,
    balance numeric(12,2) not null default 0,
    interest_rate numeric(5,2) not null default 0,
    min_payment numeric(12,2) not null default 0,
    due_day smallint,
    created_at timestamp with time zone not null default timezone('utc', now()),
    updated_at timestamp with time zone not null default timezone('utc', now())
);

-- Payments recorded against debts
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    debt_id uuid not null references public.debts(id) on delete cascade,
    amount numeric(12,2) not null,
    paid_at date not null default (timezone('utc', now()))::date,
    note text,
    created_at timestamp with time zone not null default timezone('utc', now())
);

-- Repayment plans for each user
create table if not exists public.plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    method text not null,
    monthly_budget numeric(12,2),
    generated_plan jsonb,
    created_at timestamp with time zone not null default timezone('utc', now())
);

-- Trigger to keep debts.updated_at fresh
do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'set_debts_updated_at'
    ) then
        create trigger set_debts_updated_at
        before update on public.debts
        for each row execute function public.set_updated_at();
    end if;
end;
$$;

-- Indexes to optimize lookups
create index if not exists idx_users_line_user_id on public.users (line_user_id);

create index if not exists idx_debts_user_id on public.debts (user_id);
create index if not exists idx_debts_due_day on public.debts (due_day);

create index if not exists idx_payments_debt_id on public.payments (debt_id);
create index if not exists idx_payments_paid_at on public.payments (paid_at);

create index if not exists idx_plans_user_id on public.plans (user_id);
create index if not exists idx_plans_method on public.plans (method);
