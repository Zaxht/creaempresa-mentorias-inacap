# Crea Empresa — Gestión de mentorías

Aplicación web para administrar mentores, mentoreados y sus sesiones de acompañamiento. Incluye perfiles, seguimiento de avances, archivos por sesión y exportación personalizada a Excel con el logo INACAP.

- [Sitio web](https://creaempresa-mentorias-inacap.netlify.app/)
- [Repositorio](https://github.com/Zaxht/creaempresa-mentorias-inacap)

## Funcionalidades y roles

- **Administrador:** gestiona personas y mentorías, consulta el resumen general y exporta información.
- **Mentor:** actualiza su perfil y las sesiones de sus mentorías; exporta la información a la que tiene acceso.
- **Mentoreado:** actualiza su ficha y consulta sus mentorías y sesiones.

Las altas se guardan con **Crear y guardar**. Las ediciones de fichas y sesiones se confirman con **Guardar cambios**. Cada mentoría tiene seis sesiones; cada sesión admite una foto PNG/JPEG de hasta 2 MB y un documento PDF de hasta 5 MB.

La opción **Abrir demostración** utiliza datos locales del navegador. El acceso con correo y contraseña utiliza las cuentas y registros de Supabase.

## Tecnologías

React, TypeScript y Vite para la interfaz; Supabase Auth, PostgreSQL y Storage para autenticación, datos y archivos; Netlify para alojamiento y GitHub Actions para despliegue automático.

## Desarrollo local

Requisitos: Node.js 24 y npm.

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env.local` y configurar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` con los valores del proyecto Supabase.
3. Ejecutar `npm run dev:netlify` y abrir `http://localhost:3001`.

La clave publishable es pública. Las claves secretas y `service_role` no deben incorporarse a la configuración del frontend.

## Base de datos y cuentas

Para una instalación nueva:

1. Crear un proyecto Supabase y ejecutar `supabase/migrations/202611180001_mentorias.sql` en SQL Editor.
2. Crear la cuenta inicial en Authentication y asignar su perfil mediante `supabase/primer-administrador.sql`, sustituyendo el UID de ejemplo.
3. Registrar las fichas desde la aplicación. Crear las cuentas de acceso en Authentication y vincularlas mediante los ejemplos del mismo script.

Crear una ficha no crea automáticamente una cuenta de acceso. La migración inicial se aplica una sola vez en un proyecto nuevo.

Los permisos se controlan mediante RLS y validaciones en PostgreSQL. `get_workspace()` llama al procedimiento `read_workspace` para consultar datos; `save_changes()` llama a `apply_changes` para guardar en una transacción. Los archivos se alojan en un bucket privado y se consultan mediante enlaces temporales.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `app/page.tsx` | Vistas y flujo principal |
| `components/` | Acceso, formularios y componentes de interfaz |
| `lib/mentorias/` | Modelo, reglas, repositorio, métricas y Excel |
| `supabase/` | Migración y configuración inicial de perfiles |
| `netlify/` | Entrada de la aplicación para Vite |
| `tests/` | Pruebas de reglas del cliente y base de datos |
| `.github/workflows/` | Verificación y despliegue |

`evaluacion2/implementacion/` contiene un prototipo anterior independiente; su base de datos no se utiliza en la aplicación publicada. Los comandos `dev` y `build` conservan la configuración anterior Vinext; para la versión actual se utilizan los comandos con sufijo `:netlify`.

## Comprobaciones y compilación

```sh
npm run typecheck
npm run lint
npm test
npm run build:netlify
npm run preview:netlify
```

La compilación requiere las variables de Supabase y genera `netlify-dist`. La vista previa utiliza el puerto 4173. Las pruebas incluyen reglas del cliente, PostgreSQL local con PGlite y el prototipo anterior; las integraciones de Auth y Storage requieren además comprobación contra Supabase.

## Despliegue

Cada push a `main` ejecuta las comprobaciones y publica en Netlify si todas aprueban. El flujo utiliza los secretos de GitHub `NETLIFY_AUTH_TOKEN`, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. También puede ejecutarse manualmente desde Actions.

`netlify.toml` define el comando de compilación, la carpeta publicada, las redirecciones y las cabeceras. `/api/config` expone únicamente la URL y la clave pública de Supabase.

## Limitaciones actuales

- Las cuentas y su vinculación se administran desde Supabase.
- Las sesiones se mantienen en memoria; recargar la página requiere iniciar sesión nuevamente. No se implementan sesión única ni límites de duración o inactividad del servidor.
- La carga de archivos valida formato y tamaño, pero no incluye antivirus ni limpieza automática de archivos huérfanos.
