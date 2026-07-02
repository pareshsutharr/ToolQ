-- Profile row per auth user, tracking plan (free/premium) so the app has
-- somewhere real to check entitlements once billing exists.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- RLS alone can't stop an owner from writing a new value into an allowed
-- column, so a signed-in user's own client could otherwise PATCH plan to
-- 'premium' directly. This trigger silently reverts plan changes made by
-- ordinary authenticated sessions; service-role/back-office writes (e.g. a
-- future billing webhook, or the SQL editor) are unaffected.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan and auth.role() = 'authenticated' then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_plan_before_update on public.profiles;
create trigger protect_profile_plan_before_update
  before update on public.profiles
  for each row execute procedure public.protect_profile_plan();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for any users that already existed before this migration.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
