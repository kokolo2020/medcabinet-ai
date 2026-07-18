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

-- Flags whether purchase_price was AI-estimated rather than entered by hand.
alter table public.medicines add column if not exists price_estimated boolean not null default false;

-- Snapshot log of deleted medicines, kept independently so waste totals
-- survive the original row being deleted (same pattern as favorites).
create table if not exists public.deleted_medicines (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid,
  brand_name text,
  category text,
  quantity numeric(12,2),
  purchase_price numeric(12,2),
  price_estimated boolean not null default false,
  currency text,
  expiry_date date,
  was_expired boolean,
  deleted_at timestamptz not null default now()
);

create index if not exists deleted_medicines_deleted_at_idx on public.deleted_medicines(deleted_at);

alter table public.deleted_medicines enable row level security;

drop policy if exists "public read" on public.deleted_medicines;
drop policy if exists "public insert" on public.deleted_medicines;

create policy "public read" on public.deleted_medicines for select using (true);
create policy "public insert" on public.deleted_medicines for insert with check (true);

notify pgrst, 'reload schema';

-- Keep the photo and notes in the deleted-medicines archive.
alter table public.deleted_medicines add column if not exists photo_url text;
alter table public.deleted_medicines add column if not exists notes text;

notify pgrst, 'reload schema';

-- ============================================================
-- AUTH MIGRATION: per-user accounts via email OTP (6-digit code)
-- Run this whole block once. It's safe to run even with existing
-- data — old rows just become invisible (owned by nobody) until
-- claimed by the real owner in the follow-up step below.
-- ============================================================

alter table public.medicines add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.favorites add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.deleted_medicines add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.medicines alter column user_id set default auth.uid();
alter table public.favorites alter column user_id set default auth.uid();
alter table public.deleted_medicines alter column user_id set default auth.uid();

create index if not exists medicines_user_idx on public.medicines(user_id);
create index if not exists favorites_user_idx on public.favorites(user_id);
create index if not exists deleted_medicines_user_idx on public.deleted_medicines(user_id);

-- Replace the wide-open policies with owner-scoped ones.
drop policy if exists "public read" on public.medicines;
drop policy if exists "public insert" on public.medicines;
drop policy if exists "public update" on public.medicines;
drop policy if exists "public delete" on public.medicines;

create policy "owner read" on public.medicines for select using (auth.uid() = user_id);
create policy "owner insert" on public.medicines for insert with check (auth.uid() = user_id);
create policy "owner update" on public.medicines for update using (auth.uid() = user_id);
create policy "owner delete" on public.medicines for delete using (auth.uid() = user_id);

drop policy if exists "public read" on public.favorites;
drop policy if exists "public insert" on public.favorites;
drop policy if exists "public delete" on public.favorites;

create policy "owner read" on public.favorites for select using (auth.uid() = user_id);
create policy "owner insert" on public.favorites for insert with check (auth.uid() = user_id);
create policy "owner delete" on public.favorites for delete using (auth.uid() = user_id);

drop policy if exists "public read" on public.deleted_medicines;
drop policy if exists "public insert" on public.deleted_medicines;

create policy "owner read" on public.deleted_medicines for select using (auth.uid() = user_id);
create policy "owner insert" on public.deleted_medicines for insert with check (auth.uid() = user_id);

-- Photos: only signed-in users may upload; reads stay public so
-- shared PDF/QR report links keep working for anyone with the link.
drop policy if exists "public photo upload" on storage.objects;
create policy "authenticated photo upload" on storage.objects
  for insert with check (bucket_id = 'medicine-photos' and auth.role() = 'authenticated');

notify pgrst, 'reload schema';

-- ============================================================
-- RUN THIS SECOND BLOCK ONLY AFTER you've signed in once via the
-- app's new login screen with sotivear2015@gmail.com — it claims
-- all the existing un-owned rows for that account.
-- ============================================================

update public.medicines set user_id=(select id from auth.users where email='sotivear2015@gmail.com') where user_id is null;
update public.favorites set user_id=(select id from auth.users where email='sotivear2015@gmail.com') where user_id is null;
update public.deleted_medicines set user_id=(select id from auth.users where email='sotivear2015@gmail.com') where user_id is null;

-- Optional, once you've confirmed everything above claimed correctly:
-- alter table public.medicines alter column user_id set not null;
-- alter table public.favorites alter column user_id set not null;
-- alter table public.deleted_medicines alter column user_id set not null;
