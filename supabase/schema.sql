create table if not exists public.app_users (
  id text primary key,
  name text not null,
  email text unique not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  github_connected boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  joined_at date not null default current_date,
  updated_at timestamptz not null default now()
);

create table if not exists public.fishing_pins (
  id text primary key,
  spot_name text not null,
  waterbody text not null,
  city text not null,
  fish_caught text not null,
  notes text not null default '',
  caught_at date not null,
  x numeric not null default 50,
  y numeric not null default 50,
  longitude double precision not null,
  latitude double precision not null,
  created_by text not null,
  ratings jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.fishing_pins enable row level security;

drop policy if exists "public app users read" on public.app_users;
drop policy if exists "public app users write" on public.app_users;
drop policy if exists "public fishing pins read" on public.fishing_pins;
drop policy if exists "public fishing pins write" on public.fishing_pins;

create policy "public app users read"
on public.app_users for select
using (true);

create policy "public app users write"
on public.app_users for all
using (true)
with check (true);

create policy "public fishing pins read"
on public.fishing_pins for select
using (true);

create policy "public fishing pins write"
on public.fishing_pins for all
using (true)
with check (true);
