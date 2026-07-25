-- Make Me A Sandwich
-- Source-controlled Supabase/PostgreSQL schema snapshot.
--
-- Notes:
-- - Assumes a Supabase project where `auth.users` already exists.
-- - Assumes `gen_random_uuid()` is available.
-- - This file captures the current database structure in version control.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ingredients_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  source_url text,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_instructions_is_array CHECK (jsonb_typeof(instructions) = 'array'::text),
  CONSTRAINT recipes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  ingredient_id uuid,
  raw_text text NOT NULL,
  quantity numeric,
  unit text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE,
  CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.pantry_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ingredient_id uuid NOT NULL,
  quantity numeric,
  unit text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pantry_items_pkey PRIMARY KEY (id),
  CONSTRAINT pantry_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT pantry_items_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE
);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'username'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE private.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS recipes_created_by_idx ON public.recipes (created_by);
CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_id_idx ON public.recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS pantry_items_user_id_idx ON public.pantry_items (user_id);

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.ingredients FROM anon, authenticated;
REVOKE ALL ON TABLE public.recipes FROM anon, authenticated;
REVOKE ALL ON TABLE public.recipe_ingredients FROM anon, authenticated;
REVOKE ALL ON TABLE public.pantry_items FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipes TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.recipe_ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pantry_items TO authenticated;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY ingredients_select_authenticated ON public.ingredients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ingredients_insert_authenticated ON public.ingredients
  FOR INSERT TO authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 120
    AND name = lower(btrim(name))
    AND name ~ '^[a-z0-9]+( [a-z0-9]+)*$'
  );

CREATE POLICY recipes_select_own ON public.recipes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = created_by);

CREATE POLICY recipes_insert_own ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY recipes_update_own ON public.recipes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY recipes_delete_own ON public.recipes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

CREATE POLICY recipe_ingredients_select_own_recipe ON public.recipe_ingredients
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.created_by = (SELECT auth.uid())
  ));

CREATE POLICY recipe_ingredients_insert_own_recipe ON public.recipe_ingredients
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.created_by = (SELECT auth.uid())
  ));

CREATE POLICY recipe_ingredients_delete_own_recipe ON public.recipe_ingredients
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.created_by = (SELECT auth.uid())
  ));

CREATE POLICY pantry_items_select_own ON public.pantry_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY pantry_items_insert_own ON public.pantry_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY pantry_items_update_own ON public.pantry_items
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY pantry_items_delete_own ON public.pantry_items
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
