# Despliegue MedIT QA - 25 de octubre de 2026

Frontend base `835bb98`, backend base `e68f441`, con cambio de nombre del paquete a `medit-backend` y configuracion de las nuevas bases QA. Al finalizar el despliegue, los cambios de documentacion y configuracion de esta operacion quedaron pendientes de confirmar y enviar a Git.

- Cloud Build: `99a41084-8552-45a8-a081-3dfeaff4a81b`, SUCCESS.
- Revision backend: `medit-be-staging-00003-sux`, activada al 100% despues de la prevalidacion sin trafico.
- Frontend: https://sicmh-441423.web.app, build hash `bc91e3e94b0f97f8`, archivo principal `main.039c15ff6bca45da.js` confirmado por HTTP.
- Job del migrador: `medit-staging-db-setup-vll7j`, completado correctamente. Valido el diario canonico mediante `npm run db:migrate:tenant` sin ejecutar semillas.
- Bases activas: `medit_qa_global` y `medit`; misma VM, host, puerto y credenciales que antes.
- Datos QA conservados: 398 filas en 21 tablas; 87 productos, 2139 unidades, 26 proveedores, 5 usuarios, 3 perfiles, 2 empleados, permisos y plantillas. Ver procedimiento, respaldo y recuperacion en `migration-20261025/README.md`.
- Pruebas backend: 70 aprobadas, 2 omitidas (integraciones que requieren activacion explicita).
- Pruebas frontend: 32 aprobadas. Build de staging correcto.
- API candidata y URL habitual: ping, login, token, renovacion de sesion, token renovado, dashboard, pacientes e inventario correctos.
- La comparacion previa a la activacion verifico nuevamente todos los campos copiados; se excluyeron solamente los contadores/versiones y timestamps de autenticacion que cambian al probar el login.
- Hosting SPA `/auth/login`: HTTP 200 y bundle nuevo verificados. No se realizo una sesion visual de navegador ni una revision funcional exhaustiva de todos los modulos.
- `git diff --check`: correcto.

Nombre visible del proyecto: MedIT-Testing. Los IDs tecnicos de GCP/Firebase y carpetas Git heredadas se mantienen para no romper referencias. Las bases nuevas y nuevos nombres usan MedIT. Las bases anteriores se preservan; no se reescribio su diario de migracion. Produccion no se modifico.
