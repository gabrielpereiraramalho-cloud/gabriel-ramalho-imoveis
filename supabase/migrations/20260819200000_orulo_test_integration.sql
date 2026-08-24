-- =============================================================================
-- Órulo — integração de teste (carga inicial da praça de teste)
-- Tabelas SEPARADAS dos imóveis manuais (properties permanece intocada).
-- Dados NÃO públicos: RLS restringe tudo a admin autenticado (is_admin()).
-- external_id = ID Órulo imutável (fonte de verdade, idempotência).
-- =============================================================================

create table if not exists public.orulo_buildings (
  external_id         text primary key,
  name                text,
  developer           text,
  city                text,
  neighborhood        text,
  address             text,
  description         text,
  min_price           numeric(14,2),
  bedrooms            integer,
  bathrooms           integer,
  suites              integer,
  parking             integer,
  private_area        numeric(10,2),
  status              text,
  external_updated_at timestamptz,
  raw                 jsonb not null,
  images              jsonb,
  floor_plans         jsonb,
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create table if not exists public.orulo_sync_runs (
  id                  uuid primary key default gen_random_uuid(),
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  status              text not null,
  pages_traversed     integer,
  buildings_found     integer,
  created_count       integer,
  updated_count       integer,
  images_fetched      integer,
  floor_plans_fetched integer,
  error_summary       text,
  created_at          timestamptz not null default now()
);

create index if not exists orulo_sync_runs_started_at_idx
  on public.orulo_sync_runs (started_at desc);

-- RLS: somente admin (dados da Órulo não expostos publicamente).
alter table public.orulo_buildings enable row level security;
alter table public.orulo_sync_runs enable row level security;

create policy "orulo_buildings_admin_all"
  on public.orulo_buildings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orulo_sync_runs_admin_all"
  on public.orulo_sync_runs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
