-- =============================================================================
-- Gabriel Ramalho Imóveis — Seed básico (idempotente)
-- Cidades, bairros e características. Slugs consistentes e sem acentos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Cities
-- -----------------------------------------------------------------------------
insert into public.cities (name, slug, state) values
  ('João Pessoa', 'joao-pessoa', 'PB'),
  ('Cabedelo',    'cabedelo',    'PB'),
  ('Conde',       'conde',       'PB')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Neighborhoods de João Pessoa
-- -----------------------------------------------------------------------------
insert into public.neighborhoods (city_id, name, slug)
select c.id, n.name, n.slug
from public.cities c
cross join (values
  ('Bessa',          'bessa'),
  ('Jardim Oceania', 'jardim-oceania'),
  ('Manaíra',        'manaira'),
  ('Cabo Branco',    'cabo-branco'),
  ('Tambaú',         'tambau'),
  ('Altiplano',      'altiplano'),
  ('Aeroclube',      'aeroclube'),
  ('Brisamar',       'brisamar')
) as n(name, slug)
where c.slug = 'joao-pessoa'
on conflict (city_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Neighborhoods de Cabedelo
-- -----------------------------------------------------------------------------
insert into public.neighborhoods (city_id, name, slug)
select c.id, n.name, n.slug
from public.cities c
cross join (values
  ('Intermares',       'intermares'),
  ('Ponta de Campina', 'ponta-de-campina')
) as n(name, slug)
where c.slug = 'cabedelo'
on conflict (city_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Features
-- -----------------------------------------------------------------------------
insert into public.features (name, slug, category) values
  ('Piscina',           'piscina',          'condominium'),
  ('Academia',          'academia',         'condominium'),
  ('Elevador',          'elevador',         'condominium'),
  ('Área gourmet',      'area-gourmet',     'condominium'),
  ('Salão de festas',   'salao-de-festas',  'condominium'),
  ('Playground',        'playground',       'condominium'),
  ('Portaria',          'portaria',         'condominium'),
  ('Varanda',           'varanda',          'property'),
  ('Varanda gourmet',   'varanda-gourmet',  'property'),
  ('Área privativa',    'area-privativa',   'property'),
  ('Vista para o mar',  'vista-para-o-mar', 'location'),
  ('Beira-mar',         'beira-mar',        'location'),
  ('Nascente',          'nascente',         'property'),
  ('Mobiliado',         'mobiliado',        'property'),
  ('Móveis projetados', 'moveis-projetados','property'),
  ('Pet friendly',      'pet-friendly',     'condominium'),
  ('Coworking',         'coworking',        'condominium'),
  ('Sauna',             'sauna',            'condominium'),
  ('Quadra',            'quadra',           'condominium'),
  ('Churrasqueira',     'churrasqueira',    'condominium')
on conflict (slug) do nothing;
