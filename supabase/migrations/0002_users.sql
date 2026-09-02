-- Academia de Béisbol — user management (real accounts, username-only coaches)
-- Run after 0001_init.sql.

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists active boolean not null default true;

-- Recreate the signup handler. It NEVER trusts a client-supplied role (that
-- would let a self-signup escalate to admin). The very first user becomes admin;
-- everyone else defaults to coach. Admin-created coaches get their real role and
-- permissions written afterwards by the admin-create-user edge function using the
-- service role, and their username/full_name flow through user metadata here.
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
  insert into public.profiles (id, email, username, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when first_user then 'admin' else 'coach' end
  );
  return new;
end;
$$;

-- Admins may delete profile rows (deactivation is preferred, but allow cleanup).
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());
