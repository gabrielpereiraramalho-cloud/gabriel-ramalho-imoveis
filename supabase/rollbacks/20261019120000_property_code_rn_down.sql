-- =============================================================================
-- REVERSÃO MANUAL (não é aplicada automaticamente — fica fora de migrations/).
-- Desfaz 20261019120000_property_code_rn.sql:
--   - remove a geração automática de código;
--   - devolve RN-001…RN-004 para GR-01…GR-04 (os 4 imóveis migrados);
--   - remove a função e a sequence.
-- Imóveis criados depois (RN-005+) mantêm o código RN e passam a exigir código
-- manual novamente — revise-os antes de reverter.
-- =============================================================================

alter table public.properties alter column code drop default;

update public.properties
set code = 'GR-' || lpad(substring(code from '^RN-(\d+)$')::int::text, 2, '0')
where code in ('RN-001', 'RN-002', 'RN-003', 'RN-004');

drop function if exists public.next_property_code();
drop sequence if exists public.property_code_seq;
