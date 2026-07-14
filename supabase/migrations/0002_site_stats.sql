-- Site-wide counters (currently just the visitor count shown in the homepage
-- hero). A single key/value table keeps it simple and lets us add more stats
-- later without new tables.
create table if not exists public.site_stats (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Seed the visit counter. Change this starting value if you want the counter
-- to reflect historical traffic rather than starting from zero.
insert into public.site_stats (key, value)
values ('visits', 0)
on conflict (key) do nothing;

alter table public.site_stats enable row level security;

-- Anyone (including anonymous visitors) may read the counters to display them.
create policy "site_stats are publicly readable"
  on public.site_stats for select
  using (true);

-- Atomic increment via a SECURITY DEFINER function: anonymous clients can bump
-- the counter through this function without being granted direct UPDATE access
-- to the table (so they can't set it to an arbitrary value). Returns the new
-- total for the caller to display.
create or replace function public.increment_visits()
returns bigint
language sql
security definer set search_path = public
as $$
  update public.site_stats
     set value = value + 1, updated_at = now()
   where key = 'visits'
  returning value;
$$;

grant execute on function public.increment_visits() to anon, authenticated;
