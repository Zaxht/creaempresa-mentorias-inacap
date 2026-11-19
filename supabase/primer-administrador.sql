-- Ejecutar manualmente en SQL Editor DESPUÉS de crear tu usuario en Authentication.
-- Reemplazar el UUID por el UID real. No crea usuarios ni envía invitaciones.
insert into public.app_profiles(id,role)
values ('REEMPLAZAR_POR_UID'::uuid,'Administrador');

-- Para cada mentor/mentoreado: crear primero su cuenta de Auth y su ficha desde la web.
-- insert into public.app_profiles(id,role) values ('UID_REAL','Mentor');
-- update public.mentors set user_id='UID_REAL' where id='ID_FICHA_REAL';
-- Para participantes usar rol 'Mentoreado' y tabla public.mentees.
