-- Migration 00003: Auto-create profile on user signup
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    NULL,
    COALESCE(NEW.raw_user_meta_data ->> 'carrera', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'semestre', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
