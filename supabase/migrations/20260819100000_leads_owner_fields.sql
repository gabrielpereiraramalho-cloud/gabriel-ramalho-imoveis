-- =============================================================================
-- Leads — campos adicionais para captação de proprietário ("anunciar imóvel")
-- Aditivo e idempotente. Não altera colunas existentes nem as policies (a
-- policy leads_public_insert já permite INSERT público; leads_admin_all cobre
-- a gestão pelo admin).
-- =============================================================================

alter table public.leads
  add column if not exists lead_type       text,
  add column if not exists property_type   text,
  add column if not exists city            text,
  add column if not exists neighborhood    text,
  add column if not exists estimated_value numeric(14,2),
  add column if not exists bedrooms        integer,
  add column if not exists area            numeric(10,2),
  add column if not exists status          text not null default 'novo';

-- Não-negatividade dos campos numéricos.
alter table public.leads
  drop constraint if exists leads_estimated_value_non_negative;
alter table public.leads
  add constraint leads_estimated_value_non_negative
  check (estimated_value is null or estimated_value >= 0);

alter table public.leads
  drop constraint if exists leads_bedrooms_non_negative;
alter table public.leads
  add constraint leads_bedrooms_non_negative
  check (bedrooms is null or bedrooms >= 0);

alter table public.leads
  drop constraint if exists leads_area_non_negative;
alter table public.leads
  add constraint leads_area_non_negative
  check (area is null or area >= 0);

-- Índices úteis para o painel.
create index if not exists leads_lead_type_idx on public.leads (lead_type);
create index if not exists leads_status_idx    on public.leads (status);
