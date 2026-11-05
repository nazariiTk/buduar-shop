CREATE OR REPLACE FUNCTION public.create_customer_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_customer_id bigint;
BEGIN
  SELECT id
  INTO matched_customer_id
  FROM public.customers
  WHERE auth_user_id IS NULL
    AND phone IS NOT NULL
    AND phone = NEW.raw_user_meta_data ->> 'phone'
  ORDER BY id
  LIMIT 1;

  IF matched_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET auth_user_id = NEW.id,
        email = NEW.email,
        name = COALESCE(NEW.raw_user_meta_data ->> 'name', name),
        address = COALESCE(NEW.raw_user_meta_data ->> 'address', address),
        updated_at = now()
    WHERE id = matched_customer_id;
  ELSE
    INSERT INTO public.customers (
      auth_user_id, email, name, phone, address, is_active
    )
    SELECT
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'address',
      true
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.customers
      WHERE auth_user_id = NEW.id
    );
  END IF;

  UPDATE public.orders
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_customer_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_customer_profile();

INSERT INTO public.customers (auth_user_id, email, name, phone, address, is_active)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'name', u.email),
  u.raw_user_meta_data ->> 'phone',
  u.raw_user_meta_data ->> 'address',
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.customers c
  WHERE c.auth_user_id = u.id
);
