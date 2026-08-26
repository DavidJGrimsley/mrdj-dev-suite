create table if not exists public.user_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  flow_id text not null default 'mds/onboarding',
  flow_version integer not null default 1,
  status text not null default 'not_started',
  current_step text,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding_state
  add column if not exists flow_id text not null default 'mds/onboarding',
  add column if not exists flow_version integer not null default 1,
  add column if not exists status text not null default 'not_started',
  add column if not exists current_step text,
  add column if not exists completed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_onboarding_state enable row level security;

drop policy if exists "Users can read their onboarding state" on public.user_onboarding_state;
create policy "Users can read their onboarding state"
on public.user_onboarding_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert their onboarding state" on public.user_onboarding_state;
drop policy if exists "Users can insert their onboarding state" on public.user_onboarding_state;
create policy "Users can insert their onboarding state"
on public.user_onboarding_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their onboarding state" on public.user_onboarding_state;
create policy "Users can update their onboarding state"
on public.user_onboarding_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  document_version text not null,
  acceptance_version text,
  flow_id text,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, document_id, document_version)
);

alter table public.user_legal_acceptances
  add column if not exists document_id text not null default 'legacy',
  add column if not exists document_version text not null default 'legacy',
  add column if not exists acceptance_version text,
  add column if not exists flow_id text,
  add column if not exists accepted_at timestamptz not null default now(),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_legal_acceptances'
      and column_name = 'acceptance_version'
  ) then
    update public.user_legal_acceptances
    set document_version = acceptance_version
    where document_version = 'legacy'
      and acceptance_version is not null;

    alter table public.user_legal_acceptances
      alter column acceptance_version drop not null;
  end if;
end $$;

create unique index if not exists user_legal_acceptances_user_document_version_idx
on public.user_legal_acceptances (user_id, document_id, document_version);

alter table public.user_legal_acceptances enable row level security;

drop policy if exists "Users can read their legal acceptances" on public.user_legal_acceptances;
create policy "Users can read their legal acceptances"
on public.user_legal_acceptances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can record their legal acceptances" on public.user_legal_acceptances;
create policy "Users can record their legal acceptances"
on public.user_legal_acceptances
for insert
to authenticated
with check (auth.uid() = user_id);

grant select, insert, update on public.user_onboarding_state to authenticated;
grant select, insert on public.user_legal_acceptances to authenticated;
