CREATE OR REPLACE FUNCTION public.is_sync_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_sync_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sync_admin() TO authenticated;
