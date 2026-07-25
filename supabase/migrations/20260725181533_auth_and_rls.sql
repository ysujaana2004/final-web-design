-- Create one application profile for every Supabase Auth user.
-- The username comes from user metadata only as display data; it is never used
-- for authorization decisions.
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'username'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- RLS is required on every application table exposed through the Data API.
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.pantry_items enable row level security;

-- Index ownership and join columns used by application queries and RLS checks.
create index if not exists recipes_created_by_idx on public.recipes (created_by);
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index if not exists pantry_items_user_id_idx on public.pantry_items (user_id);

-- Remove the project's broad default Data API table privileges.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.ingredients from anon, authenticated;
revoke all on table public.recipes from anon, authenticated;
revoke all on table public.recipe_ingredients from anon, authenticated;
revoke all on table public.pantry_items from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert on table public.ingredients to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, delete on table public.recipe_ingredients to authenticated;
grant select, insert, update, delete on table public.pantry_items to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy ingredients_select_authenticated
  on public.ingredients
  for select
  to authenticated
  using (true);

create policy ingredients_insert_authenticated
  on public.ingredients
  for insert
  to authenticated
  with check (true);

create policy recipes_select_own
  on public.recipes
  for select
  to authenticated
  using ((select auth.uid()) = created_by);

create policy recipes_insert_own
  on public.recipes
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy recipes_update_own
  on public.recipes
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy recipes_delete_own
  on public.recipes
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

create policy recipe_ingredients_select_own_recipe
  on public.recipe_ingredients
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.created_by = (select auth.uid())
    )
  );

create policy recipe_ingredients_insert_own_recipe
  on public.recipe_ingredients
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.created_by = (select auth.uid())
    )
  );

create policy recipe_ingredients_delete_own_recipe
  on public.recipe_ingredients
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.created_by = (select auth.uid())
    )
  );

create policy pantry_items_select_own
  on public.pantry_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy pantry_items_insert_own
  on public.pantry_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy pantry_items_update_own
  on public.pantry_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy pantry_items_delete_own
  on public.pantry_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
