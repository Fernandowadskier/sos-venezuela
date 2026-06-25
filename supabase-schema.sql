-- ============================================================
-- VENEZUELA CRISIS APP — Supabase Schema
-- Ejecutar esto en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Habilitar extensión PostGIS (para consultas geoespaciales)
create extension if not exists postgis;

-- 2. Tabla de edificaciones afectadas
create table if not exists buildings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  lat         double precision not null,
  lng         double precision not null,
  damage_type text not null check (damage_type in (
    'structural',
    'collapse',
    'fire',
    'flood',
    'landslide',
    'other'
  )),
  description text,
  photos      text[],
  created_at  timestamptz default now()
);

-- 3. Tabla de personas desaparecidas
create table if not exists missing_persons (
  id                    uuid primary key default gen_random_uuid(),
  building_id           uuid references buildings(id) on delete set null,
  full_name             text not null,
  age                   int,
  gender                text check (gender in ('M', 'F', 'otro')),
  last_seen_date        date,
  last_seen_description text,
  photos                text[],
  contact_name          text,
  contact_phone         text,
  contact_email         text,
  status                text default 'desaparecido' check (status in (
    'desaparecido',
    'encontrado',
    'fallecido'
  )),
  created_at            timestamptz default now()
);

-- 4. Índices
create index if not exists buildings_location_idx on buildings (lat, lng);
create index if not exists missing_persons_building_idx on missing_persons (building_id);
create index if not exists missing_persons_status_idx on missing_persons (status);

-- 5. RLS — acceso público (modo crisis)
alter table buildings enable row level security;
alter table missing_persons enable row level security;

create policy "Public read buildings"
  on buildings for select using (true);

create policy "Public insert buildings"
  on buildings for insert with check (true);

create policy "Public read missing_persons"
  on missing_persons for select using (true);

create policy "Public insert missing_persons"
  on missing_persons for insert with check (true);

-- ============================================================
-- STORAGE: Crear manualmente en Supabase Dashboard
-- Storage > New Bucket > Nombre: "crisis-photos" > Public: ON
-- ============================================================
