-- Phase 4: introduce Project hierarchy and named layout variants.
--
-- Per PRD §15 ("Existing prod data wiped during v1 migration"), rows in
-- public.layouts and public.rooms are wiped before adding the NOT NULL FK
-- on rooms.project_id. The pre-v1 git ref is the only rollback path.

truncate table public.layouts cascade;
truncate table public.rooms   cascade;

-- ── projects ────────────────────────────────────────────────────────────────
create table public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 80),
    default_style text,
    default_palette jsonb,
    created_at timestamptz not null default now()
);
create index projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "projects self read"   on public.projects for select using (auth.uid() = user_id);
create policy "projects self write"  on public.projects for insert with check (auth.uid() = user_id);
create policy "projects self update" on public.projects for update using (auth.uid() = user_id);
create policy "projects self delete" on public.projects for delete using (auth.uid() = user_id);

-- ── rooms.project_id ────────────────────────────────────────────────────────
alter table public.rooms
    add column project_id uuid not null references public.projects(id) on delete cascade;
create index rooms_project_id_idx on public.rooms (project_id);

-- ── layouts: variant fields ─────────────────────────────────────────────────
alter table public.layouts
    add column name text not null default 'Untitled',
    add column is_primary boolean not null default false,
    add column catalog_version text;

-- At most one primary layout per room.
create unique index layouts_one_primary_per_room
    on public.layouts (room_id)
    where is_primary;
