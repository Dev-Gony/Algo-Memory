-- NEW Neon target only, after enabling Neon Auth and the Data API.
-- Never execute against the source Supabase project.
BEGIN;
DO $prerequisites$
BEGIN
  IF to_regprocedure('auth.user_id()') IS NULL
     OR NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anonymous') THEN
    RAISE EXCEPTION 'Enable Neon Auth and Data API before applying this schema';
  END IF;
END $prerequisites$;

-- Fail if a table already exists instead of silently trusting its old policies.
CREATE TABLE public.user_state (
  user_id text PRIMARY KEY DEFAULT auth.user_id(),
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_size_limit CHECK (octet_length(state::text) <= 2097152)
);
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_state FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_state FROM PUBLIC, anonymous, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_state TO authenticated;

CREATE POLICY user_state_select ON public.user_state FOR SELECT TO authenticated
  USING ((SELECT auth.user_id()) = user_id);
CREATE POLICY user_state_insert ON public.user_state FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.user_id()) = user_id);
CREATE POLICY user_state_update ON public.user_state FOR UPDATE TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);
COMMIT;
