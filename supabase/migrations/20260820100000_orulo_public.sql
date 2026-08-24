-- =============================================================================
-- Órulo — preparação para exibição pública (carteira de empreendimentos)
-- Aditivo. Mantém isolamento total de `properties`. Nada é publicado aqui:
-- os 40 de homologação (SP) permanecem published = false (default).
-- =============================================================================

alter table public.orulo_buildings
  add column if not exists published      boolean not null default false,
  add column if not exists published_at   timestamptz,
  add column if not exists slug           text,
  add column if not exists max_bedrooms   integer,
  add column if not exists max_area       numeric(10,2),
  add column if not exists cover_image_id text,
  add column if not exists typologies     jsonb;

-- Backfill a partir do `raw` já armazenado (não requer re-sincronização).
-- Slug estável incluindo external_id; translate() remove acentos comuns PT
-- (equivalente ao slugify da aplicação para estes nomes).
update public.orulo_buildings set
  slug = trim(both '-' from regexp_replace(
           lower(translate(
             coalesce(raw->>'name', 'empreendimento'),
             'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
             'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
           '[^a-z0-9]+', '-', 'g')) || '-' || external_id,
  max_bedrooms   = nullif(raw->>'max_bedrooms', '')::int,
  max_area       = nullif(raw->>'max_area', '')::numeric,
  cover_image_id = raw->'default_image'->>'id',
  typologies     = raw->'typologies'
where slug is null;

create unique index if not exists orulo_buildings_slug_unique
  on public.orulo_buildings (slug)
  where slug is not null;

create index if not exists orulo_buildings_published_idx
  on public.orulo_buildings (published);

-- Leitura pública SOMENTE de empreendimentos publicados.
create policy "orulo_buildings_public_select"
  on public.orulo_buildings for select
  to anon, authenticated
  using (published = true);

-- Endurecimento: o público (anon) nunca lê a coluna crua completa `raw`
-- (as páginas públicas usam apenas colunas seguras). Admin (authenticated)
-- continua com acesso total via is_admin().
revoke select (raw) on public.orulo_buildings from anon;
