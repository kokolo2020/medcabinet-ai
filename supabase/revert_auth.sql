-- Run this once in the Supabase SQL Editor to revert the login/RLS migration.
-- Restores the original permissive policies (reachable with just the publishable key),
-- matching the app now that the login screen has been removed.

drop policy if exists "owner read" on public.medicines;
drop policy if exists "owner insert" on public.medicines;
drop policy if exists "owner update" on public.medicines;
drop policy if exists "owner delete" on public.medicines;

create policy "public read" on public.medicines for select using (true);
create policy "public insert" on public.medicines for insert with check (true);
create policy "public update" on public.medicines for update using (true);
create policy "public delete" on public.medicines for delete using (true);

drop policy if exists "owner read" on public.favorites;
drop policy if exists "owner insert" on public.favorites;
drop policy if exists "owner delete" on public.favorites;

create policy "public read" on public.favorites for select using (true);
create policy "public insert" on public.favorites for insert with check (true);
create policy "public delete" on public.favorites for delete using (true);

drop policy if exists "owner read" on public.deleted_medicines;
drop policy if exists "owner insert" on public.deleted_medicines;

create policy "public read" on public.deleted_medicines for select using (true);
create policy "public insert" on public.deleted_medicines for insert with check (true);

drop policy if exists "authenticated photo upload" on storage.objects;
create policy "public photo upload" on storage.objects
  for insert with check (bucket_id = 'medicine-photos');

-- Note: existing rows already have user_id set (from the auth migration) —
-- that's harmless and left as-is. The columns and auth.uid() defaults are
-- left in place too; they're just unused now with policies open again.

notify pgrst, 'reload schema';
