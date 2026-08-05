-- PASO PREVIO:
-- 1) En Supabase > Authentication > Users > Add user.
-- 2) Email recomendado: admin@cvbunyola.app
-- 3) Marca Auto Confirm User.
-- 4) Después ejecuta este archivo.

update public.profiles p
set
  club_id = 'b0000000-0000-4000-8000-000000000001',
  username = 'admin',
  full_name = 'Administrador del club',
  role = 'administrator',
  active = true
from auth.users u
where p.id = u.id
  and lower(u.email) = 'admin@cvbunyola.app';

select p.id, p.username, p.full_name, p.role, p.club_id
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'admin@cvbunyola.app';
