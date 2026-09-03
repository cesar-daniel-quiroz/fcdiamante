-- Academia de Béisbol — attendance, configurable billing, richer students, photos.
-- Run after 0003_portal.sql.

-- 1) Billing mode (weekly | monthly), chosen by admin in Ajustes.
alter table public.settings
  add column if not exists billing_mode text not null default 'monthly'
    check (billing_mode in ('weekly', 'monthly'));

-- 2) Richer student profile.
alter table public.students
  add column if not exists birthdate date,
  add column if not exists photo_url text,
  add column if not exists emergency_contact text,
  add column if not exists emergency_phone text,
  add column if not exists notes text;

-- 3) Payments become period-based so weekly and monthly can coexist.
--    period is "YYYY-MM" (monthly) or "YYYY-Www" (ISO week, e.g. 2026-W35).
alter table public.payments
  add column if not exists mode text not null default 'monthly'
    check (mode in ('weekly', 'monthly')),
  add column if not exists period text,
  add column if not exists method text
    check (method in ('efectivo', 'transferencia', 'tarjeta') or method is null),
  add column if not exists amount numeric,
  add column if not exists from_attendance boolean not null default false;

-- Backfill period from the legacy year/month columns (month was 0-11).
update public.payments
  set period = year::text || '-' || lpad((month + 1)::text, 2, '0')
  where period is null and year is not null and month is not null;

-- Allow the new 'parcial' status.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pagado', 'pendiente', 'atrasado', 'parcial'));

-- Swap the uniqueness from (student, year, month) to (student, mode, period).
alter table public.payments drop constraint if exists payments_student_id_year_month_key;
create unique index if not exists payments_student_mode_period_idx
  on public.payments (student_id, mode, period);

-- 4) Attendance: one row per student per date.
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  category text,
  date date not null,
  present boolean not null default true,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);
alter table public.attendance enable row level security;
create policy attendance_all on public.attendance
  for all to authenticated using (true) with check (true);

-- 5) Public bucket for student photos + logos.
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

drop policy if exists student_photos_read on storage.objects;
create policy student_photos_read on storage.objects
  for select using (bucket_id = 'student-photos');

drop policy if exists student_photos_write on storage.objects;
create policy student_photos_write on storage.objects
  for all to authenticated
  using (bucket_id = 'student-photos')
  with check (bucket_id = 'student-photos');
