CREATE POLICY sync_admins_self_read
  ON public.sync_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
