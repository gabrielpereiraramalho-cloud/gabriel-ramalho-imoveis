-- =============================================================================
-- Órulo — marcação de DISTRIBUIÇÃO (fundação para publicação automática segura)
-- Aditivo. Não publica nada. Não apaga histórico.
--
-- `in_distribution` = o empreendimento faz parte da distribuição DESTA aplicação
-- (o que a Órulo retorna em /api/v2/buildings/ids/active para as nossas
-- credenciais). É um dos gates de canAutoPublish (junto com elegibilidade e
-- removed_at IS NULL). A reconciliação periódica (a ser criada) é a fonte de
-- verdade contínua desta coluna.
-- =============================================================================

alter table public.orulo_buildings
  add column if not exists in_distribution boolean not null default false;

create index if not exists orulo_buildings_in_distribution_idx
  on public.orulo_buildings (in_distribution);

-- ---------------------------------------------------------------------------
-- Backfill (validado contra ids/active em 08/09/2026):
--   • ids/active (397) == praça real PB → João Pessoa + Cabedelo (e demais
--     cidades da PB, se houver). Estes ENTRAM na distribuição.
--   • FORA de ids/active (42) == homologação antiga (São Paulo 41 + Rio 1).
--     Estes são ARQUIVADOS (soft delete: removed_at) e ficam fora da
--     distribuição — nunca publicados. Nada é apagado.
-- A regra é expressa positivamente (tudo que NÃO é a homologação SP/RJ conhecida
-- entra na distribuição), de modo que qualquer outra cidade da PB seja incluída.
-- ---------------------------------------------------------------------------

-- Entra na distribuição: ativos que não são a homologação antiga.
update public.orulo_buildings
  set in_distribution = true
  where removed_at is null
    and lower(coalesce(city, '')) not in (
      'são paulo', 'sao paulo', 'rio de janeiro'
    );

-- Arquiva a homologação antiga (SP/RJ): fora da distribuição + soft delete.
-- Preserva o primeiro carimbo de removed_at, se já existir. Não toca published
-- (hoje todos estão published=false).
update public.orulo_buildings
  set in_distribution = false,
      removed_at = coalesce(removed_at, now())
  where lower(coalesce(city, '')) in (
    'são paulo', 'sao paulo', 'rio de janeiro'
  );
