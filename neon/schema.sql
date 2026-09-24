-- Algo-Memory schema for Neon Data API + Managed Better Auth.
-- Apply only to the new Algo-Memory Neon project.
-- Neon Auth user IDs are text. Use auth.user_id(), not auth.uid(), for RLS.

create table if not exists public.user_state (
  user_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

grant select, insert, update, delete on public.user_state to authenticated;

drop policy if exists users_select_own_state on public.user_state;
create policy users_select_own_state
on public.user_state for select
to authenticated
using (auth.user_id() = user_id);

drop policy if exists users_insert_own_state on public.user_state;
create policy users_insert_own_state
on public.user_state for insert
to authenticated
with check (auth.user_id() = user_id);

drop policy if exists users_update_own_state on public.user_state;
create policy users_update_own_state
on public.user_state for update
to authenticated
using (auth.user_id() = user_id)
with check (auth.user_id() = user_id);

drop policy if exists users_delete_own_state on public.user_state;
create policy users_delete_own_state
on public.user_state for delete
to authenticated
using (auth.user_id() = user_id);
