-- Academia de Béisbol — "Mi Aplicación" prompt portal + superadmin access gate.
-- Run after 0002_users.sql.

-- Prompt queue. The local bridge worker (service role) processes 'pendiente'
-- rows, records the git commit before/after, and marks the outcome.
create table if not exists public.app_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'prompt' check (kind in ('prompt', 'revert')),
  prompt text not null,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_progreso', 'completado', 'error', 'revertido')),
  revert_of uuid references public.app_requests (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  base_sha text,        -- commit before the work (the rollback target)
  result_sha text,      -- commit produced by the work
  deploy_url text,
  result_summary text,
  error text,
  seen boolean not null default false  -- admin has viewed the finished result
);

-- Superadmin-controlled access window. Only we (via SQL / service role) change
-- this row; admins can read it to see the countdown. The 30-day free window is
-- `access_until`; when it passes (or enabled=false) prompts are blocked.
create table if not exists public.app_portal (
  id text primary key default 'portal',
  enabled boolean not null default true,
  access_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.app_portal (id, enabled, access_until)
values ('portal', true, now() + interval '30 days')
on conflict (id) do nothing;

alter table public.app_requests enable row level security;
alter table public.app_portal enable row level security;

-- Only admins use the portal (create prompts, read their queue).
create policy app_requests_admin on public.app_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Everyone signed in can READ the gate; nobody can write it from the client
-- (no write policy = writes denied). The superadmin changes it via SQL.
create policy app_portal_select on public.app_portal
  for select to authenticated using (true);
