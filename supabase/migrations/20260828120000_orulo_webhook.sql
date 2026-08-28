-- =============================================================================
-- Órulo — Webhook de atualizações (BUILDING_UPDATE)
-- Aditivo. Mantém isolamento total de `properties`. Não altera a estratégia de
-- publicação atual: os eventos active/added_to_distribution apenas
-- (re)sincronizam o empreendimento; NUNCA publicam automaticamente (os 40 de
-- homologação de SP permanecem published = false).
--
-- Eventos removed / excluded_from_distribution fazem SOFT DELETE (marcam
-- removed_at e despublicam) — preservando o histórico em orulo_buildings.
-- =============================================================================

-- Marcações internas de remoção/inatividade e rastreio do último evento.
alter table public.orulo_buildings
  add column if not exists removed_at        timestamptz,
  add column if not exists last_event_at     timestamptz,
  add column if not exists last_event_status text;

create index if not exists orulo_buildings_removed_at_idx
  on public.orulo_buildings (removed_at);

-- Log durável e seguro dos webhooks recebidos (sem payload sensível).
create table if not exists public.orulo_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  received_at  timestamptz not null default now(),
  event_name   text,
  building_id  text,
  status       text,
  -- client_id da integração (UID da aplicação OAuth). NÃO é segredo
  -- (o segredo é ORULO_CLIENT_SECRET, que jamais é armazenado/logado).
  client_id    text,
  outcome      text not null,          -- processed | ignored | noop | error
  detail       text,                   -- mensagem curta, sem secrets
  created_at   timestamptz not null default now()
);

create index if not exists orulo_webhook_events_received_at_idx
  on public.orulo_webhook_events (received_at desc);
create index if not exists orulo_webhook_events_building_id_idx
  on public.orulo_webhook_events (building_id);

-- RLS admin-only para leitura no admin. As gravações do webhook usam a chave
-- secreta do Supabase (service role), que ignora RLS por definição.
alter table public.orulo_webhook_events enable row level security;

create policy "orulo_webhook_events_admin_all"
  on public.orulo_webhook_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
