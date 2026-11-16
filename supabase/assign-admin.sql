-- 1. Crear la cuenta desde la aplicación y confirmar su correo.
-- 2. Sustituir el correo y ejecutar SOLO en el SQL Editor de Supabase como propietario.
-- 3. Cerrar sesión y volver a ingresar para obtener el nuevo rol en el JWT.
-- No convertir esto en una función accesible desde la aplicación.
do $$
declare
  admin_email text := 'prueba@gmail.com';
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where lower(email) = lower(admin_email);
  if not found then
    raise exception 'No existe una cuenta con ese correo. Crea y confirma la cuenta primero.';
  end if;
end;
$$;
