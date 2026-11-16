-- Ejecutar en el SQL Editor de Supabase. También actualiza la versión anterior sin borrar datos.
-- Las claves service_role/secret nunca se incluyen en la aplicación.
begin;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  price integer not null check (price > 0),
  stock integer not null check (stock >= 0),
  icon text not null default 'bag-handle-outline',
  color text not null default '#eee8db'
);
-- También actualiza proyectos donde ya se ejecutó la versión inicial del script.
alter table public.products add column if not exists image_url text;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'ready', 'delivered')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  total bigint not null check (total > 0),
  items jsonb not null,
  unique (user_id, request_id)
);
create index if not exists orders_user_created on public.orders(user_id, created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;
revoke all on public.products, public.orders from anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.orders to authenticated;
grant insert, update on public.products to authenticated;

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fotos públicas del catálogo; únicamente los administradores pueden subirlas o cambiarlas.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'product-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists catalog_read on public.products;
create policy catalog_read on public.products for select to anon, authenticated using (true);
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select to authenticated using (
  user_id = (select auth.uid()) or
  (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'operator')
);

create or replace function public.create_order(p_items jsonb, p_request_id uuid)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_product public.products;
  v_item jsonb;
  v_quantity integer;
  v_total bigint := 0;
  v_items jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_request_id is null then raise exception 'Missing request identifier'; end if;
  -- Serializa reintentos del mismo cliente y evita pedidos duplicados.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || p_request_id::text, 0));
  select * into v_order from public.orders where user_id = v_user and request_id = p_request_id;
  if found then return v_order; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid cart'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Invalid cart size'; end if;
  if (select count(distinct value ->> 'productId') from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then
    raise exception 'Duplicate or missing product';
  end if;
  -- Orden fijo de bloqueos para compras concurrentes de los mismos productos.
  for v_item in select value from jsonb_array_elements(p_items) order by value ->> 'productId' loop
    if jsonb_typeof(v_item -> 'quantity') <> 'number' or (v_item ->> 'quantity') !~ '^[1-9][0-9]?$' then
      raise exception 'Invalid quantity';
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null then raise exception 'Missing quantity'; end if;
    select * into v_product from public.products where id = v_item ->> 'productId' for update;
    if not found then raise exception 'Unknown product'; end if;
    if v_product.stock < v_quantity then raise exception 'Insufficient stock'; end if;
    update public.products set stock = stock - v_quantity where id = v_product.id;
    v_total := v_total + v_product.price::bigint * v_quantity;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'name', v_product.name, 'price', v_product.price, 'quantity', v_quantity
    ));
  end loop;
  insert into public.orders(user_id, request_id, total, items)
    values (v_user, p_request_id, v_total, v_items) returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.mark_delivered(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') not in ('admin', 'operator') then
    raise exception 'Logistics role required';
  end if;
  -- El operador confirma expresamente el cobro presencial y la entrega.
  update public.orders set status = 'delivered', payment_status = 'paid' where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
end;
$$;

revoke all on function public.create_order(jsonb, uuid) from public, anon;
revoke all on function public.mark_delivered(uuid) from public, anon;
grant execute on function public.create_order(jsonb, uuid) to authenticated;
grant execute on function public.mark_delivered(uuid) to authenticated;

insert into public.products(id, name, category, description, price, stock, icon, color) values
('mochila', 'Mochila Urbana', 'Accesorios', 'Tu día, bien organizado. Compartimento para portátil y acabado resistente.', 129900, 12, 'bag-handle-outline', '#eee8db'),
('audifonos', 'Audífonos Flow', 'Tecnología', 'Dale ritmo a tu rutina con un diseño cómodo e inalámbrico.', 189900, 8, 'headset-outline', '#e0e8e3'),
('termo', 'Termo Essential', 'Hogar', 'Acero inoxidable, 500 ml y el tamaño ideal para llevar contigo.', 64900, 20, 'water-outline', '#e5e5ee'),
('reloj', 'Reloj Tempo', 'Tecnología', 'Un compañero ligero para acompañar tus actividades diarias.', 219900, 6, 'watch-outline', '#f0e2d9'),
('libreta', 'Libreta Ideas', 'Accesorios', 'Páginas para lo que viene. Tapa dura y papel de 90 gramos.', 34900, 30, 'book-outline', '#ece6ef'),
('lampara', 'Lámpara Aura', 'Hogar', 'Luz cálida y diseño sencillo para darle vida a tu espacio.', 99900, 10, 'bulb-outline', '#f1ead6')
on conflict (id) do nothing;
commit;
