-- MedCabinet AI schema
-- Run this once in the Supabase SQL Editor.
--
-- NOTE: the app has no login flow yet, so this is intentionally a single-tenant
-- table reachable with the publishable key. The policies below are permissive
-- (anyone with the key can read/write). Once auth + households are added,
-- replace these with policies scoped to auth.uid() / household_id.

create extension if not exists pgcrypto;

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  generic_name text,
  strength text,
  dosage_form text,
  category text,
  barcode text,
  manufacturer text,
  quantity numeric(12,2) not null default 1 check (quantity >= 0),
  expiry_date date,
  purchase_price numeric(12,2),
  currency text not null default 'THB',
  purchase_store text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medicines_expiry_idx on public.medicines(expiry_date);
create index if not exists medicines_barcode_idx on public.medicines(barcode);

alter table public.medicines enable row level security;

drop policy if exists "public read" on public.medicines;
drop policy if exists "public insert" on public.medicines;
drop policy if exists "public update" on public.medicines;
drop policy if exists "public delete" on public.medicines;

create policy "public read" on public.medicines for select using (true);
create policy "public insert" on public.medicines for insert with check (true);
create policy "public update" on public.medicines for update using (true);
create policy "public delete" on public.medicines for delete using (true);

-- Storage bucket for medicine photos (public read so <img src> works directly).
insert into storage.buckets (id, name, public)
values ('medicine-photos', 'medicine-photos', true)
on conflict (id) do nothing;

drop policy if exists "public photo read" on storage.objects;
drop policy if exists "public photo upload" on storage.objects;

create policy "public photo read" on storage.objects
  for select using (bucket_id = 'medicine-photos');

create policy "public photo upload" on storage.objects
  for insert with check (bucket_id = 'medicine-photos');

-- Favorites: intentionally NOT a foreign key to medicines(id) — a snapshot of
-- the medicine's details at the time it was favorited, so it survives the
-- original medicine being deleted.
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid,
  brand_name text not null,
  manufacturer text,
  strength text,
  dosage_form text,
  category text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists favorites_medicine_idx on public.favorites(medicine_id);

alter table public.favorites enable row level security;

drop policy if exists "public read" on public.favorites;
drop policy if exists "public insert" on public.favorites;
drop policy if exists "public delete" on public.favorites;

create policy "public read" on public.favorites for select using (true);
create policy "public insert" on public.favorites for insert with check (true);
create policy "public delete" on public.favorites for delete using (true);

notify pgrst, 'reload schema';

-- Dosage tracking, used to estimate a run-out date (quantity / daily rate).
alter table public.medicines add column if not exists is_storage_only boolean not null default false;
alter table public.medicines add column if not exists dosage_amount numeric(12,2);
alter table public.medicines add column if not exists dosage_frequency text check (dosage_frequency in ('day','week','month'));

notify pgrst, 'reload schema';
