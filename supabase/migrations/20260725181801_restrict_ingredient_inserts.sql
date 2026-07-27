-- Ingredients are shared reference data. Authenticated users may add only
-- names produced by the application's normalization routine.
drop policy ingredients_insert_authenticated on public.ingredients;

create policy ingredients_insert_authenticated
  on public.ingredients
  for insert
  to authenticated
  with check (
    char_length(name) between 1 and 120
    and name = lower(btrim(name))
    and name ~ '^[a-z0-9]+( [a-z0-9]+)*$'
  );
