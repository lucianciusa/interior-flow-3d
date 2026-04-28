-- profiles: 1:1 with auth.users
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now()
);

create table public.rooms (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    room_type text not null,
    width_m numeric(4,2) not null check (width_m between 2 and 12),
    length_m numeric(4,2) not null check (length_m between 2 and 12),
    height_m numeric(4,2) not null check (height_m between 2.2 and 4),
    created_at timestamptz not null default now()
);
create index rooms_user_id_idx on public.rooms (user_id);

create table public.layouts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    room_id uuid not null references public.rooms(id) on delete cascade,
    style text not null,
    layout jsonb not null,
    seed bigint,
    thumbnail_url text,
    created_at timestamptz not null default now()
);
create index layouts_user_id_idx on public.layouts (user_id);
create index layouts_room_id_idx on public.layouts (room_id);

alter table public.profiles enable row level security;
alter table public.rooms    enable row level security;
alter table public.layouts  enable row level security;

create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles self write"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

create policy "rooms self read"   on public.rooms for select using (auth.uid() = user_id);
create policy "rooms self write"  on public.rooms for insert with check (auth.uid() = user_id);
create policy "rooms self update" on public.rooms for update using (auth.uid() = user_id);
create policy "rooms self delete" on public.rooms for delete using (auth.uid() = user_id);

create policy "layouts self read"   on public.layouts for select using (auth.uid() = user_id);
create policy "layouts self write"  on public.layouts for insert with check (auth.uid() = user_id);
create policy "layouts self update" on public.layouts for update using (auth.uid() = user_id);
create policy "layouts self delete" on public.layouts for delete using (auth.uid() = user_id);
