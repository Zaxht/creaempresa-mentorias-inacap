-- Modelo preparatorio para Supabase PostgreSQL. No se ha aplicado en cloud.
-- RLS queda en denegacion por defecto; las politicas se definen y prueban
-- antes de conceder acceso a los clientes. Ejecutar solo en un proyecto vacio.
begin;
create table public.perfiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  rol text not null check (rol in ('Administrador', 'Mentor', 'Mentoreado')),
  activo boolean not null default true
);
create table public.mentores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.perfiles(user_id) on delete restrict,
  nombre text not null check (char_length(trim(nombre)) between 1 and 100),
  perfil text not null default '',
  email text not null default '', telefono text not null default '',
  especialidades text[] not null default '{}',
  biografia text not null default '', foto_path text,
  activo boolean not null default true
);
create table public.mentoreados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.perfiles(user_id) on delete restrict,
  nombre text not null check (char_length(trim(nombre)) between 1 and 100),
  emprendimiento text not null default '', etapa text not null default '',
  email text not null default '', telefono text not null default '',
  necesidad text not null default '', foto_path text,
  activo boolean not null default true
);
create table public.mentorias (
  id uuid primary key default gen_random_uuid(),
  numero_origen integer unique not null check (numero_origen > 0),
  mentor_id uuid not null references public.mentores(id) on delete restrict,
  mentoreado_id uuid not null references public.mentoreados(id) on delete restrict,
  anio integer not null check (anio between 2000 and 2100),
  mes integer not null check (mes between 1 and 12),
  horas numeric(8,2) not null default 0 check (horas >= 0),
  espacio text not null default '',
  estado text not null check (estado in ('Suspendida', 'En proceso', 'Terminada',
    'No corresponde', 'Esperando derivación', 'Derivada')),
  servicio text not null, objetivo text not null default '',
  formalizacion text not null default 'Pendiente' check (formalizacion in ('Pendiente', 'Sí', 'No', 'No corresponde')),
  planificacion_sir text not null default 'Pendiente' check (planificacion_sir in ('Pendiente', 'Sí', 'No', 'No corresponde')),
  ejecucion_sir text not null default 'Pendiente' check (ejecucion_sir in ('Pendiente', 'Sí', 'No', 'No corresponde')),
  pagada_en date, version integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  mentoria_id uuid not null references public.mentorias(id) on delete restrict,
  numero smallint not null check (numero between 1 and 6),
  fecha date not null,
  estado text not null check (estado in ('Pendiente', 'Agendada', 'Realizada', 'Reprogramada')),
  resumen text not null check (char_length(trim(resumen)) between 1 and 2000),
  version integer not null default 0,
  unique (mentoria_id, numero)
);
create table public.evidencias (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete restrict,
  tipo text not null check (tipo in ('foto', 'documento')),
  object_path text unique not null, nombre_original text not null,
  mime text not null, bytes integer not null check (bytes > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  estado text not null check (estado in ('cuarentena', 'disponible', 'rechazada')),
  unique (sesion_id, tipo),
  check ((tipo = 'foto' and bytes <= 2097152 and mime in ('image/jpeg', 'image/png'))
    or (tipo = 'documento' and bytes <= 5242880 and mime = 'application/pdf'))
);
create table public.auditoria (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references public.perfiles(user_id),
  operacion text not null, entidad text not null, entidad_id uuid not null,
  fecha timestamptz not null default now(),
  version_anterior integer, version_nueva integer
);
create index mentoria_mentor_idx on public.mentorias(mentor_id);
create index mentoria_mentoreado_idx on public.mentorias(mentoreado_id);
create index mentoria_estado_idx on public.mentorias(estado);
alter table public.perfiles enable row level security;
alter table public.mentores enable row level security;
alter table public.mentoreados enable row level security;
alter table public.mentorias enable row level security;
alter table public.sesiones enable row level security;
alter table public.evidencias enable row level security;
alter table public.auditoria enable row level security;
commit;
