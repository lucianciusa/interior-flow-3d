-- Phase 4: share tokens for read-only public links.
--
-- Tokens in the URL are HMAC-signed by the backend. Only the SHA-256 hash
-- of the raw token is persisted, so a DB leak does not yield valid links.
-- Public reads go through public.get_shared_layout, a security-definer
-- function scoped to a single layout id.

create table public.share_tokens (
    token_hash text primary key,
    layout_id uuid not null references public.layouts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);
create index share_tokens_layout_id_idx on public.share_tokens (layout_id);
create index share_tokens_user_id_idx   on public.share_tokens (user_id);

alter table public.share_tokens enable row level security;

-- Owners can manage their own tokens (so revoke flows under user JWT work).
-- The public read path NEVER hits this table directly; it goes through the
-- security-definer function below.
create policy "share_tokens self read"   on public.share_tokens for select using (auth.uid() = user_id);
create policy "share_tokens self write"  on public.share_tokens for insert with check (auth.uid() = user_id);
create policy "share_tokens self update" on public.share_tokens for update using (auth.uid() = user_id);
create policy "share_tokens self delete" on public.share_tokens for delete using (auth.uid() = user_id);

-- ── public.get_shared_layout ────────────────────────────────────────────────
-- security definer + locked search_path so the public route can resolve a
-- single layout by token hash without lifting RLS for any other path.
create or replace function public.get_shared_layout(p_token_hash text)
returns table (
    id uuid,
    user_id uuid,
    room_id uuid,
    style text,
    seed bigint,
    thumbnail_url text,
    created_at timestamptz,
    layout jsonb,
    name text,
    is_primary boolean,
    catalog_version text,
    width_m numeric,
    length_m numeric,
    height_m numeric
)
language sql
security definer
set search_path = public
as $$
    select
        l.id,
        l.user_id,
        l.room_id,
        l.style,
        l.seed,
        l.thumbnail_url,
        l.created_at,
        l.layout,
        l.name,
        l.is_primary,
        l.catalog_version,
        r.width_m,
        r.length_m,
        r.height_m
    from public.share_tokens t
    join public.layouts l on l.id = t.layout_id
    join public.rooms   r on r.id = l.room_id
    where t.token_hash = p_token_hash
      and t.revoked_at is null
      and now() < t.expires_at
    limit 1
$$;

revoke execute on function public.get_shared_layout(text) from public;
revoke execute on function public.get_shared_layout(text) from anon;
revoke execute on function public.get_shared_layout(text) from authenticated;
grant  execute on function public.get_shared_layout(text) to service_role;
