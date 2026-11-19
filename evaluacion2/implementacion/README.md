# Demostrador de arquitectura para Crea Empresa

Este incremento construye el flujo interfaz HTTP -> aplicacion -> dominio ->
repositorio. Incluye adaptadores en memoria y SQLite con el mismo contrato.
La web publicada y Supabase siguen pendientes de conexion.

## Ejecutar las pruebas

Desde la raiz del proyecto, con Node.js 24.19.0 (version verificada):

```powershell
node --test evaluacion2/implementacion/tests/architecture.test.mjs
```

Al extraer el ZIP, ejecutar desde la carpeta que contiene `implementacion`:

```powershell
node --test implementacion/tests/architecture.test.mjs
```

Las 18 pruebas incluyen UT14: abre un servidor en 127.0.0.1 y un puerto libre,
envia peticiones HTTP, recorre las capas y guarda en un archivo SQLite temporal.
Comprueba permisos, entradas invalidas, duplicados, conflicto de version y
rollback. Cierra y reabre la base para confirmar que la sesion persiste.
El servidor y los datos temporales se eliminan al finalizar. El resultado TAP
se incluye en `evidencias/resultados_pruebas.tap` dentro del ZIP.

El proveedor de identidad utilizado por las pruebas es un doble de prueba.
Antes de exponer el handler se debe implementar `identityProvider.verify`
verificando el token con Supabase Auth y consultando un perfil administrado
en el servidor. Un encabezado o cuerpo con un rol no es una identidad.

## Contrato de repositorio

- `list()` devuelve registros independientes del almacenamiento.
- `get(id)` devuelve una mentoria o `undefined`.
- `save(record, expectedVersion)` guarda de forma atomica solo si la version
  actual coincide; en caso contrario genera CONFLICT.

El adaptador en memoria solo sirve para verificaciones locales. SQLite usa
consultas parametrizadas, restricciones y una transaccion para guardar version
y sesiones juntas. SQLite valida el contrato local; no sustituye PostgreSQL
ni sus politicas de acceso. El adaptador cloud debe comprobar
la version y aplicar restricciones, autorizacion y auditoria en el servidor.
No debe implementar el control concurrente mediante un SELECT y UPDATE sin
condicion de version.

## Alcance construido

Registro de sesiones, catalogos de estados, lectura por propietario, privilegios
de escritura, rechazo de campos desconocidos, fechas reales, limite de seis,
conflictos de version y respuesta HTTP sin detalles internos.

Fotos, documentos, autenticacion real, CRUD de personas, dashboard, exportacion,
politicas cloud y conexion con React siguen requiriendo integracion. El informe
describe su contrato y sus pruebas; no deben presentarse como ya implementados.
