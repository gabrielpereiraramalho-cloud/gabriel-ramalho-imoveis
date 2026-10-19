-- =============================================================================
-- Códigos de imóveis manuais: GR-xx → RN-xxx gerados pelo BANCO.
-- - Sequence atômica (nextval) → sem duplicidade mesmo em cadastros simultâneos
--   (nunca max()+1). Lacunas são possíveis (falha após nextval); repetição, não.
-- - Renumera APENAS os códigos legados GR-xx, por ordem de criação.
-- - Sequence inicializada no maior RN existente → próximo = RN-005.
-- - Afeta só public.properties.code (Órulo vive em orulo_buildings; slugs/URLs
--   não mudam). Reversão: supabase/rollbacks/20261019120000_property_code_rn_down.sql
-- =============================================================================

create sequence if not exists public.property_code_seq
  as integer start with 1 increment by 1 minvalue 1;

create or replace function public.next_property_code()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select 'RN-' || lpad(nextval('public.property_code_seq')::text, 3, '0');
$$;

-- Renumeração dos legados (GR-xx), em ordem de criação, a partir do próximo RN livre.
with base as (
  select coalesce(max(substring(code from '^RN-(\d+)$')::int), 0) as start
  from public.properties
),
ordered as (
  select p.id, row_number() over (order by p.created_at, p.code) as n
  from public.properties p
  where p.code ~ '^GR-'
)
update public.properties p
set code = 'RN-' || lpad((b.start + o.n)::text, 3, '0')
from ordered o, base b
where p.id = o.id;

-- Sequence = maior número RN existente (próximo nextval = +1).
select case
  when m > 0 then setval('public.property_code_seq', m, true)
  else setval('public.property_code_seq', 1, false)
end
from (
  select coalesce(max(substring(code from '^RN-(\d+)$')::int), 0) as m
  from public.properties
) s;

-- O banco passa a gerar o código no INSERT.
alter table public.properties
  alter column code set default public.next_property_code();

grant usage, select on sequence public.property_code_seq to authenticated, service_role;
grant execute on function public.next_property_code() to authenticated, service_role;
