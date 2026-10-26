# MedIT QA - transicion al esquema canonico, 25 de octubre de 2026

Versiones: backend `e68f441`, frontend `835bb98`, mas el cambio de nombre del paquete backend a `medit-backend`. Build Cloud Build `99a41084-8552-45a8-a081-3dfeaff4a81b`.

El historial anterior de QA tenia cuatro migraciones distintas de la linea canonica integrada. No se reescribio ese historial ni se aplicaron ALTER incompatibles sobre sus datos. Se crearon bases nuevas `medit` y `medit_qa_global`; las bases anteriores quedan disponibles para recuperacion.

Respaldo previo en la VM: `/var/backups/medit/20261025-before-deploy.sql`, permisos 600, directorio 700. Incluye la base anterior y su registro global; contiene datos de QA y hashes de contrasenas, por lo que no debe copiarse a Git ni a un bucket publico.

## Procedimiento ejecutado

1. `scripts/prepare-staging-canonical.cjs` genera el SQL de inicializacion desde las migraciones versionadas. Crea bases nuevas, sus diarios de migracion y un registro global separado que apunta MEDITQA a `medit`. Rechaza la ausencia de la empresa QA y no borra ni reemplaza bases existentes.
2. Se ejecuto `01-canonical-schema.sql` en la VM. Se aplicaron las cinco migraciones canonicas tenant y la migracion global. El usuario existente `medit_staging` recibio permisos sobre las bases nuevas.
3. `02-prepare-copy.py`, ejecutado como root en la VM, inspecciona las tablas con datos, rechaza columnas sin mapear y destinos poblados, ordena las inserciones por claves foraneas y genera SQL bajo `/var/backups/medit/`. No imprime los valores de registros ni credenciales.
4. Se probaron las inserciones con ROLLBACK; luego se guardaron con COMMIT. Las validaciones comparan todos los campos fuente, UUID y cantidades, incluyendo registros eliminados logicamente. Las comparaciones binarias evitan diferencias de collation entre los esquemas. Las tablas fuente inicialmente vacias tambien se validan como vacias.
5. Se copian 398 filas de 21 tablas, incluidos 87 productos y filas de existencias (2139 unidades), 26 proveedores, 5 usuarios, 3 perfiles, 2 empleados, 2 plantillas y 2 versiones, catalogos y permisos.

Mapeo de columnas: `consent_templates.current_version_number` -> `current_version`; `consent_template_versions.consent_template_id` -> `template_id`; `version_number` -> `version`. Columnas nuevas usan los defaults del esquema; el inventario existente queda sin lote (`batch_id` NULL, `batch_key` calculado). Se conservan IDs, hashes de contrasena, sesiones, permisos y marcas temporales fuente.

## Despliegue y recuperacion

La revision `medit-be-staging-00003-sux` se preparo con `--no-traffic` y etiqueta `qa-preview`, usando exclusivamente las bases nuevas. La revision anterior `medit-be-staging-00002-522` sigue referenciando las bases anteriores. La activacion se hace despues de las comprobaciones de API y del migrador oficial, con `gcloud run services update-traffic` dirigido explicitamente a QA.

El job `medit-staging-db-setup` de esta transicion ejecuta solamente `npm run db:migrate:tenant`; no ejecuta semillas. Los siguientes despliegues normales pueden usar los archivos env actualizados con el historial canonico.

Para recuperar la version anterior, dirigir el trafico a `medit-be-staging-00002-522` y restaurar la version compatible del frontend. No reescribir diarios de migracion. Los cambios hechos en las bases nuevas despues de la activacion requieren conciliacion antes de volver a las bases anteriores. No borrar bases ni respaldos como parte del despliegue.

Los identificadores tecnicos de GCP/Firebase y las carpetas Git heredadas se conservan hasta una migracion especifica. El nombre visible del proyecto es MedIT-Testing y los nuevos nombres usan MedIT. Los archivos historicos de importacion del 24 de octubre describen la DB anterior y no deben volver a ejecutarse sobre ella para modificar el inventario activo.
