-- Ejecutar manualmente en SQL Editor DESPUÉS de crear tu usuario en Authentication.
-- Reemplazar el UUID por el UID real. No crea usuarios ni envía invitaciones.
insert into public.app_profiles(id,role)
values ('REEMPLAZAR_POR_UID'::uuid,'Administrador');

-- Los mentores y mentoreados se crean desde la aplicación; no requieren vinculación manual.
