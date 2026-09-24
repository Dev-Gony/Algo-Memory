-- Disposable PostgreSQL CI fixture only, not a production migration.
\set ON_ERROR_STOP on
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anonymous NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.user_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '');
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anonymous;
\ir ../neon/schema.sql
INSERT INTO public.user_state(user_id,state) VALUES ('user-a','{"score":1}'),('user-b','{"score":2}');

SET ROLE anonymous;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.user_state;
    RAISE EXCEPTION 'Anonymous read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_state) <> 0 THEN RAISE EXCEPTION 'Missing identity leaked rows'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','user-a',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_state) <> 1 THEN RAISE EXCEPTION 'Own-row visibility failed'; END IF;
  IF EXISTS (SELECT FROM public.user_state WHERE user_id='user-b') THEN RAISE EXCEPTION 'Other user visible'; END IF;
  BEGIN
    INSERT INTO public.user_state(user_id,state) VALUES ('user-c','{}');
    RAISE EXCEPTION 'Cross-user insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.user_state SET user_id='user-c' WHERE user_id='user-a';
    RAISE EXCEPTION 'Ownership reassignment unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
INSERT INTO public.user_state(user_id,state) VALUES ('user-a','{"score":3}')
ON CONFLICT(user_id) DO UPDATE SET state=excluded.state;
DO $$ BEGIN
  IF (SELECT state->>'score' FROM public.user_state WHERE user_id='user-a') <> '3' THEN RAISE EXCEPTION 'Own upsert failed'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','user-b',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_state) <> 1 OR (SELECT state->>'score' FROM public.user_state) <> '2' THEN RAISE EXCEPTION 'User B isolation failed'; END IF;
END $$;
RESET ROLE;
