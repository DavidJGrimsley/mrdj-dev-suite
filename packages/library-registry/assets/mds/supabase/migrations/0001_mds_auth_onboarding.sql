create table if not exists public.user_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  flow_id text not null default 'mds/onboarding',
  status text not null default 'not_started',
  current_step text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding_state enable row level security;

drop policy if exists "Users can read their onboarding state" on public.user_onboarding_state;
create policy "Users can read their onboarding state"
on public.user_onboarding_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert their onboarding state" on public.user_onboarding_state;
create policy "Users can upsert their onboarding state"
on public.user_onboarding_state
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  acceptance_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, document_id, acceptance_version)
);

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
