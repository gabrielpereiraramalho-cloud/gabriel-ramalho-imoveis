-- =============================================================================
-- Gabriel Ramalho Imóveis — Migration inicial
-- Estrutura completa do banco: tabelas, enums, índices, triggers, RLS e storage.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensões
-- -----------------------------------------------------------------------------
-- gen_random_uuid() já está disponível no PostgreSQL do Supabase.
-- pgcrypto é garantido por segurança.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.property_purpose as enum ('sale', 'rent');

create type public.property_status as enum (
  'available',
  'reserved',
  'sold',
  'rented',
  'hidden'
);

create type public.solar_position as enum (
  'nascente',
  'sul',
  'norte',
  'poente',
  'nascente_sul',
  'other'
);

-- -----------------------------------------------------------------------------
-- Função reutilizável: atualização automática de updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabela: cities
-- -----------------------------------------------------------------------------
create table public.cities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  state      text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabela: neighborhoods
-- -----------------------------------------------------------------------------
create table public.neighborhoods (
  id         uuid primary key default gen_random_uuid(),
  city_id    uuid not null references public.cities (id) on delete cascade,
  name       text not null,
  slug       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint neighborhoods_city_slug_unique unique (city_id, slug)
);

create index neighborhoods_city_id_idx on public.neighborhoods (city_id);

-- -----------------------------------------------------------------------------
-- Tabela: partners (interna — nunca pública)
-- -----------------------------------------------------------------------------
create table public.partners (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text,
  phone      text,
  email      text,
  notes      text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabela: properties
-- -----------------------------------------------------------------------------
create table public.properties (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  title               text not null,
  slug                text not null unique,
  description         text,
  property_type       text not null,
  purpose             public.property_purpose not null,
  status              public.property_status not null default 'available',
  featured            boolean not null default false,
  tag                 text,

  -- Valores
  sale_price          numeric(14,2),
  rent_price          numeric(14,2),
  condominium_fee     numeric(12,2),
  iptu                numeric(12,2),
  accepts_financing   boolean not null default false,

  -- Localização
  city_id             uuid references public.cities (id) on delete set null,
  neighborhood_id     uuid references public.neighborhoods (id) on delete set null,
  address             text,
  address_number      text,
  complement          text,
  postal_code         text,
  latitude            numeric(10,7),
  longitude           numeric(10,7),
  show_exact_address  boolean not null default false,

  -- Medidas
  private_area        numeric(10,2),
  total_area          numeric(10,2),
  external_area       numeric(10,2),

  -- Cômodos
  bedrooms            integer not null default 0,
  suites              integer not null default 0,
  bathrooms           integer not null default 0,
  parking_spaces      integer not null default 0,
  floor               integer,

  -- Orientação
  solar_position      public.solar_position,

  -- Vídeos
  youtube_url         text,
  instagram_url       text,
  virtual_tour_url    text,

  -- Parceiro
  partner_id          uuid references public.partners (id) on delete set null,

  -- Controle
  active              boolean not null default true,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Constraints de não-negatividade
  constraint properties_sale_price_non_negative      check (sale_price is null or sale_price >= 0),
  constraint properties_rent_price_non_negative      check (rent_price is null or rent_price >= 0),
  constraint properties_condominium_fee_non_negative check (condominium_fee is null or condominium_fee >= 0),
  constraint properties_iptu_non_negative            check (iptu is null or iptu >= 0),
  constraint properties_private_area_non_negative    check (private_area is null or private_area >= 0),
  constraint properties_total_area_non_negative      check (total_area is null or total_area >= 0),
  constraint properties_external_area_non_negative   check (external_area is null or external_area >= 0),
  constraint properties_bedrooms_non_negative        check (bedrooms >= 0),
  constraint properties_suites_non_negative          check (suites >= 0),
  constraint properties_bathrooms_non_negative       check (bathrooms >= 0),
  constraint properties_parking_spaces_non_negative  check (parking_spaces >= 0)
);

-- Índices de properties (code e slug já indexados via UNIQUE)
create index properties_city_id_idx         on public.properties (city_id);
create index properties_neighborhood_id_idx on public.properties (neighborhood_id);
create index properties_property_type_idx   on public.properties (property_type);
create index properties_purpose_idx         on public.properties (purpose);
create index properties_status_idx          on public.properties (status);
create index properties_active_idx          on public.properties (active);
create index properties_featured_idx        on public.properties (featured);
create index properties_sale_price_idx      on public.properties (sale_price);
create index properties_rent_price_idx      on public.properties (rent_price);
create index properties_bedrooms_idx        on public.properties (bedrooms);
create index properties_private_area_idx    on public.properties (private_area);
create index properties_created_at_idx      on public.properties (created_at);
-- Índice composto para o catálogo público (filtro típico de listagem)
create index properties_catalog_idx
  on public.properties (active, status, published_at);

-- -----------------------------------------------------------------------------
-- Tabela: property_images
-- -----------------------------------------------------------------------------
create table public.property_images (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null,
  alt_text    text,
  sort_order  integer not null default 0,
  is_cover    boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint property_images_sort_order_non_negative check (sort_order >= 0)
);

create index property_images_property_sort_idx
  on public.property_images (property_id, sort_order);

-- Garante no máximo uma capa (is_cover = true) por imóvel
create unique index property_images_single_cover_idx
  on public.property_images (property_id)
  where is_cover = true;

-- -----------------------------------------------------------------------------
-- Tabela: features
-- -----------------------------------------------------------------------------
create table public.features (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  category   text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabela: property_features (N:N)
-- -----------------------------------------------------------------------------
create table public.property_features (
  property_id uuid not null references public.properties (id) on delete cascade,
  feature_id  uuid not null references public.features (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (property_id, feature_id)
);

create index property_features_feature_id_idx
  on public.property_features (feature_id);

-- -----------------------------------------------------------------------------
-- Tabela: leads
-- -----------------------------------------------------------------------------
create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  phone         text not null,
  email         text,
  property_id   uuid references public.properties (id) on delete set null,
  property_code text,
  source        text,
  message       text,
  created_at    timestamptz not null default now()
);

create index leads_property_id_idx on public.leads (property_id);
create index leads_created_at_idx  on public.leads (created_at);
create index leads_phone_idx       on public.leads (phone);

-- -----------------------------------------------------------------------------
-- Tabela: profiles (vinculada ao Supabase Auth)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       text not null default 'admin',
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Função auxiliar de admin (SECURITY DEFINER — evita recursão de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.cities            enable row level security;
alter table public.neighborhoods     enable row level security;
alter table public.partners          enable row level security;
alter table public.properties        enable row level security;
alter table public.property_images   enable row level security;
alter table public.features          enable row level security;
alter table public.property_features enable row level security;
alter table public.leads             enable row level security;
alter table public.profiles          enable row level security;

-- ---- cities -----------------------------------------------------------------
create policy "cities_public_select"
  on public.cities for select
  to anon, authenticated
  using (true);

create policy "cities_admin_all"
  on public.cities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- neighborhoods ----------------------------------------------------------
create policy "neighborhoods_public_select"
  on public.neighborhoods for select
  to anon, authenticated
  using (active = true);

create policy "neighborhoods_admin_all"
  on public.neighborhoods for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- partners (somente admin) ----------------------------------------------
create policy "partners_admin_all"
  on public.partners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- properties -------------------------------------------------------------
create policy "properties_public_select"
  on public.properties for select
  to anon, authenticated
  using (
    active = true
    and status <> 'hidden'
    and published_at is not null
    and published_at <= now()
  );

create policy "properties_admin_all"
  on public.properties for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- property_images --------------------------------------------------------
create policy "property_images_public_select"
  on public.property_images for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_images.property_id
        and p.active = true
        and p.status <> 'hidden'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create policy "property_images_admin_all"
  on public.property_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- features ---------------------------------------------------------------
create policy "features_public_select"
  on public.features for select
  to anon, authenticated
  using (active = true);

create policy "features_admin_all"
  on public.features for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- property_features ------------------------------------------------------
create policy "property_features_public_select"
  on public.property_features for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_features.property_id
        and p.active = true
        and p.status <> 'hidden'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create policy "property_features_admin_all"
  on public.property_features for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- leads ------------------------------------------------------------------
-- Público/anon pode INSERIR, mas nunca SELECT/UPDATE/DELETE.
create policy "leads_public_insert"
  on public.leads for insert
  to anon, authenticated
  with check (true);

create policy "leads_admin_all"
  on public.leads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- profiles ---------------------------------------------------------------
-- Usuário autenticado pode ler o próprio perfil.
create policy "profiles_self_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Admin ativo pode ler todos os perfis.
create policy "profiles_admin_select"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Somente admin gerencia perfis (evita escalonamento de privilégio:
-- usuário comum não possui policy de UPDATE do próprio role).
create policy "profiles_admin_insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_admin_delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- STORAGE — bucket property-images
-- =============================================================================
-- Bucket público (leitura via URL pública). Escrita restrita a administradores.
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "property_images_storage_public_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'property-images');

create policy "property_images_storage_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-images' and public.is_admin());

create policy "property_images_storage_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-images' and public.is_admin())
  with check (bucket_id = 'property-images' and public.is_admin());

create policy "property_images_storage_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-images' and public.is_admin());
