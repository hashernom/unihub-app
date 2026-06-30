-- Migration 00011: Fix privilege escalation + secure SECURITY DEFINER helpers
-- 1. Trigger handle_new_user now ignores client-provided role and always creates 'student'.
-- 2. get_user_role / is_admin recreated with explicit search_path (defense in depth).
-- 3. New RPC promote_to_admin allows only existing admins to grant admin role.

-- ============================================================
-- 1. Secure helper: get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'student');
END;
$$;

-- ============================================================
-- 2. Secure helper: check if user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN public.get_user_role() = 'admin';
END;
$$;

-- ============================================================
-- 3. Trigger: auto-create profile on signup, ALWAYS as student
--    (role='admin' must never be trusted from client user_metadata)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, student_code, full_name, role, avatar_url, carrera, semestre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'student_code', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'student',  -- CRITICAL: ignore raw_user_meta_data->>'role'
    NULL,
    COALESCE(NEW.raw_user_meta_data ->> 'carrera', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'semestre', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger already exists from 00003; ensure it points to the updated function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. RPC: promote an existing user to admin (admin-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: only admins can promote users';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$$;
