-- Academia de Béisbol — initial schema
-- Run this in the Supabase SQL editor of your new project.

-- ============================================================
-- Profiles (one per auth user) + role
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'coach' check (role in ('admin', 'coach')),
  created_at timestamptz not null default now()
);

-- Helper: is the current user an admin? SECURITY DEFINER avoids recursive RLS
-- when a policy on profiles needs to check the caller's role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- On signup: create the profile. The very first user becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
begin
  select count(*) = 0 into first_user from public.profiles;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when first_user then 'admin' else 'coach' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Domain tables
-- ============================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null default 0,
  category text not null,
  parent text default '',
  phone text default '',
  fee numeric not null default 0,
  status text not null default 'activo' check (status in ('activo', 'inactivo')),
  joined date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  start text not null,
  "end" text not null,
  category text not null,
  coach text default '',
  field text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  year int not null,
  month int not null check (month between 0 and 11),
  status text not null default 'pendiente' check (status in ('pagado', 'pendiente', 'atrasado')),
  paid_date date,
  created_at timestamptz not null default now(),
  unique (student_id, year, month)
);

create table if not exists public.settings (
  id text primary key default 'academy',
  academy_name text not null default 'DIAMANTE FC',
  logo_url text,
  updated_at timestamptz not null default now()
);

insert into public.settings (id, academy_name)
values ('academy', 'DIAMANTE FC')
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.schedules enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;

-- Profiles: see your own row; admins see all. Update own row or (admin) any.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Shared academy data: any authenticated coach/admin has full CRUD.
create policy students_all on public.students
  for all to authenticated using (true) with check (true);

create policy schedules_all on public.schedules
  for all to authenticated using (true) with check (true);

create policy payments_all on public.payments
  for all to authenticated using (true) with check (true);

-- Settings: everyone signed in can read; only admins can change.
create policy settings_select on public.settings
  for select to authenticated using (true);

create policy settings_write on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
