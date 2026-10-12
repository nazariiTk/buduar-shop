CREATE OR REPLACE FUNCTION public.create_customer_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers
  SET auth_user_id = NEW.id,
      email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data ->> 'name', name),
      address = COALESCE(NEW.raw_user_meta_data ->> 'address', address)
  WHERE auth_user_id IS NULL
    AND phone IS NOT NULL
    AND phone = NEW.raw_user_meta_data ->> 'phone';

  UPDATE public.orders
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND lower(email) = lower(NEW.email);

  INSERT INTO public.customers (
    auth_user_id, email, name, phone, address, is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'address',
    true
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
