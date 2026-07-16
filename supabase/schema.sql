-- MedCabinet AI initial schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  home_currency text not null default 'THB',
  country_code text not null default 'TH',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Home',
  home_currency text not null default 'THB',
  country_code text not null default 'TH',
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  parent_id uuid references public.storage_locations(id) on delete cascade,
  name text not null,
  location_type text not null default 'cabinet' check (location_type in ('home','cabinet','shelf','drawer','basket','bag','car','office','other')),
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  brand_name text not null,
  generic_name text,
  strength text,
  dosage_form text,
  category text,
  barcode text,
  manufacturer text,
  prescription_required boolean not null default false,
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medicines_household_idx on public.medicines(household_id);
create index if not exists medicines_barcode_idx on public.medicines(barcode);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  location_id uuid references public.storage_locations(id) on delete set null,
  assigned_member_id uuid references public.household_members(id) on delete set null,
  batch_number text,
  expiry_date date,
  quantity numeric(12,2) not null default 1 check (quantity >= 0),
  unit text not null default 'item',
  package_size numeric(12,2),
  opened_at date,
  discard_after_opening date,
  status text not null default 'active' check (status in ('active','finished','expired','disposed','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_household_idx on public.inventory_items(household_id);
create index if not exists inventory_expiry_idx on public.inventory_items(expiry_date);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  medicine_id uuid references public.medicines(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  pharmacy_name text,
  pharmacy_address text,
  purchased_at date not null default current_date,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'THB',
  quantity_purchased numeric(12,2) not null default 1,
  unit_price numeric(12,4),
  receipt_url text