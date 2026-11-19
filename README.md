# Crea Empresa — gestión de mentorías

Aplicación académica con React, TypeScript y Vinext/Vite. La interfaz conserva el diseño del proyecto y utiliza Supabase Auth, PostgreSQL y Storage cuando la conexión está configurada. La demostración funciona de forma separada en el navegador; cambiar su selector de rol no concede acceso a la base real.

## Ejecutar

Recomendado: Node.js 24 LTS y npm. En la carpeta del proyecto:

```sh
npm ci
npm run dev
```

Abrir la URL que imprime Vite. Sin configuración cloud se muestra la opción de demostración, sin simular una cuenta autenticada.

## Activar Supabase

1. Utilizar un proyecto nuevo o verificar que no contiene las tablas de esta aplicación. No aplicar la migración en otra aplicación existente.
2. Ejecutar `supabase/migrations/202611180001_mentorias.sql` en SQL Editor. Es una transacción. El modelo de `evaluacion2/implementacion` es histórico: **no ejecutar ambos modelos**.
3. Crear el usuario administrador en Authentication y asociar su UID mediante `supabase/primer-administrador.sql`, reemplazando el marcador. Las contraseñas se definen en Supabase, nunca en el repositorio.
4. Copiar `.env.example` a `.dev.vars` para el Worker local y completar la URL y la clave **publishable** del proyecto. Reiniciar Vite. En hosting, configurar esas mismas variables de runtime. Nunca usar una clave secreta ni `service_role` como clave pública.
5. Verificar que `/api/config` devuelve `configured: true`. Iniciar sesión, crear personas y guardar; después crear una mentoría. Al guardarla, PostgreSQL crea sus seis sesiones.
6. Vincular las cuentas de mentores y participantes con sus fichas usando los ejemplos comentados del script. No se permite que un usuario cambie su propio rol.

Los cambios se guardan mediante el botón **Guardar cambios**. Un lote inválido se revierte completo. Si otra persona modificó el mismo registro, se rechaza el guardado y se solicita actualizar. Para adjuntar archivos a una ficha nueva, guardarla primero. Las fotos aceptan PNG/JPEG de hasta 2 MB y los documentos PDF de hasta 5 MB. Los enlaces privados duran 15 minutos; **Actualizar** renueva su acceso.

## Arquitectura y seguridad

- Presentación: `app/page.tsx`, componentes de interfaz y `components/mentorias-access.tsx`.
- Dominio y operaciones: `lib/mentorias/domain.ts`, `access.ts` y `changes.ts`.
- Infraestructura: `lib/mentorias/repository.ts` adapta Auth, RPC y Storage.
- Base de datos: migración SQL con relaciones, restricciones, RLS, auditoría y control de versiones.

El backend efectivo es Supabase: se conserva la separación por capas, pero no se presenta el demostrador Node/SQLite como servidor de la web. Si el informe anterior menciona Express, hay que actualizar esa decisión y justificar el uso de funciones PostgreSQL y servicios administrados.

`get_workspace()` extrae los registros aplicando RLS y se usa también antes de exportar. `save_changes()` valida y guarda cada lote en una transacción. `dashboard_summary()` permite extraer indicadores desde SQL. Las funciones RPC delegan en los procedimientos `read_workspace(INOUT result jsonb)` y `apply_changes(commands jsonb)` mediante `CALL`. Así se ejecutan procedimientos reales de PostgreSQL tanto para extraer como para guardar información; las funciones sirven de adaptador para PostgREST.

Las sesiones de Auth permanecen solo en memoria del navegador. Recargar exige iniciar sesión nuevamente. Las escrituras se limitan a 120 lotes por minuto por cuenta. El límite de intentos de login y las políticas de duración/concurrencia de sesiones se configuran en Supabase Auth y deben verificarse en el proyecto real; no se consideran acreditadas por estas pruebas locales.

Las evidencias permanecen en un bucket privado, con rutas autorizadas por usuario y sin sobrescrituras. Se valida firma de archivo en cliente y tamaño/MIME en Storage y SQL. Esto **no equivale a un análisis antivirus en servidor**. Los archivos cargados pero no guardados, o reemplazados, requieren una política posterior de limpieza; no se borran automáticamente documentos del programa.

## Verificación

```sh
npm run typecheck
npm test
npm run build
npm run lint
```

Las pruebas incluyen el demostrador anterior, controles del cliente y la migración ejecutada en PostgreSQL local con PGlite. Las tablas Auth/Storage se simulan en esa prueba para comprobar RLS y rutinas; no reemplaza verificar login, subida y exportación contra Supabase real. No se insertan participantes reales ni se envían invitaciones automáticamente.

## Entorno observado

Equipo de desarrollo: Windows 11 Home Single Language 10.0.26200, Intel Core 5 210H, 12 procesadores lógicos y 7,6 GB de RAM utilizable. Estos datos describen el equipo inspeccionado; no implican que se haya instalado hardware nuevo. Proyecto cloud verificado: **Crea Empresa - Mentorias**, referencia `semwbguhguuoazomgcez`, organización con plan gratuito, cómputo Nano y región West US (Oregon), `us-west-2`. Supabase administra el hardware. Se observó el estado Healthy y se aplicó el script desde SQL Editor; no se ha registrado una ejecución con Supabase CLI.

La entrega debe acompañarse de evidencia del sistema conectado y una demostración con administrador, mentor y mentoreado. El código y las pruebas locales no acreditan por sí solos un despliegue cloud.

## Estado verificado de esta implementación

- Migración aplicada al proyecto nuevo: ocho tablas con RLS y bucket privado. El proyecto anterior Notes no fue modificado.
- Conexión local configurada en `.dev.vars`, excluido de Git; `/api/config` responde `configured: true`.
- API cloud: lectura anónima de mentores y ejecución anónima de `get_workspace` rechazadas con HTTP 401 / SQLSTATE 42501.
- Pruebas locales: 32 aprobadas, incluyendo las 18 del demostrador anterior. TypeScript y lint pasan.
- Exportación probada desde la interfaz: cinco hojas con logo y únicamente los datos del mentor seleccionado.
- Cuenta inicial creada por el usuario y vinculada como Administrador. Se verificaron login/logout, creación de personas y mentorías, seis sesiones por mentoría, guardado, recarga, foto PNG, foto de perfil, PDF privado y exportación Excel contra Supabase real.
- Pruebas de rol: se usó temporalmente la misma cuenta como Mentor y Mentoreado. El mentor guardó su sesión y su Excel excluyó el conjunto ajeno; el mentoreado no tuvo edición de sesiones ni exportación. Al terminar se restauró Administrador.
- Permanecen dos conjuntos identificados como PRUEBA QA, sin participantes reales, para reproducir la demostración.
- Correcciones detectadas en navegador: botón Ingresar con type=submit, descarte de vistas autenticadas cuando no hay sesión, errores de validación comprensibles, bloqueo de acceso a demostración durante login y fecha automática en America/Santiago.
- No se publicó una nueva versión del sitio hospedado durante este trabajo.

El lint conserva las comprobaciones de accesibilidad. En los componentes base reutilizables se exceptúa únicamente la preferencia estilística de etiqueta nativa sobre un rol ARIA válido, para conservar su contrato de composición.
