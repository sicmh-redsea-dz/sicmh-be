# Resolución de las tablas reportadas

Revisión actualizada el 30 de septiembre de 2026, sobre `Beta-v0.0.1` y
`Dump20260929.sql`. El esquema tenant contiene 54 tablas. La migración
`drizzle/tenant/0001_restore_reported_tables.sql` agrega siete tablas y dos
columnas de facturación a las 46 tablas de la migración inicial. Las migraciones
0002 y 0003 corrigen normalización e integridad y agregan la tabla técnica de
bloqueos. Véase [el esquema y las decisiones de normalización](database-normalization.md).

| Tabla anterior/reportada | Modelo actual | Resolución |
| --- | --- | --- |
| `consentimiento_plantillas` | `consent_templates` | Incluida en la migración; conserva nombre, versión actual y estado funcional `is_active`. Creación de plantilla y contenido en una transacción. |
| `consentimiento_plantilla_versiones` | `consent_template_versions` | Incluida en la migración. Versiones únicas por plantilla y actualizaciones concurrentes serializadas mediante bloqueo de fila. |
| `consentimiento_instancias` | `consent_instances` | Relaciona atención, versión, profesional y evidencia adjunta; el paciente se deriva de la atención. Cada emisión conserva su instancia y una reimpresión no sobrescribe aceptaciones. Las FK validan versión y adjunto de la misma atención. |
| `document_delivery` | `document_deliveries` | Nueva persistencia para las visualizaciones/descargas existentes: adjuntos, PDF de consentimiento, borrador y reporte de facturas. Registra actor, canal, estado pendiente/completado/fallido, fecha, código HTTP y referencia exacta a instancia, versión o adjunto. Los PDF generados registran su SHA-256. |
| `password_reset_tokens` | `password_reset_tokens` | Nueva persistencia con hash SHA-256 del JWT, usuario, vencimiento, uso y revocación. Emitir un nuevo enlace revoca los pendientes. Consumirlo y cambiar contraseña/versión de sesión es una sola transacción. |
| `numerotrackersar` | `invoice_number_sequences` + `invoices.number_sequence_id` / `invoices.sar_number` | Recupera mínimo, máximo y último número asignado. Agrega prefijo, longitud, CAI y series históricas. Reserva el número y crea la factura dentro de una transacción, con bloqueo de fila y unicidad del número fiscal. |
| `auditlog` | `audit_logs` | Auditoría general de solicitudes autenticadas exitosas de `/app`: actor, operación, recurso, identificador disponible, fecha, IP y estado HTTP. Coexiste con las auditorías específicas de permisos, adjuntos, camas y quirófanos. |
| `tipo_recurso` | `appointments.bed_id` / `appointments.operating_room_id` | Se conserva el modelo de claves foráneas directas. La API valida tipo e identificador. MySQL exige que el recurso exista y que una cita no tenga cama y quirófano simultáneamente. |
| `historia_medica.isActive` | `clinical_encounters.deleted_at` | Se conserva el borrado lógico. `NULL` significa vigente y una fecha significa eliminado. Los signos vitales y el expediente ampliado están en `encounter_vitals` y `medical_records`. |

## Alcance de entregas y auditoría

El dump suministrado no contiene las tres tablas `consentimiento_*`,
`document_delivery` ni `password_reset_tokens`. Por tanto, no se afirma que se
hayan migrado sus columnas o datos históricos. El modelo cubre los flujos que
existen en esta branch.

`document_deliveries` registra la terminación de la respuesta HTTP del servidor;
no confirma que una persona leyó, imprimió o recibió por correo un documento.
Las respuestas parciales 206 también son entregas registradas. Una desconexión
prematura o respuesta HTTP de error se marca como fallida. Si el proceso termina
antes de registrar el resultado, la entrega permanece pendiente. El registro de
resultado se realiza después del evento de respuesta; los errores de escritura
se reportan en los logs del servidor.

La auditoría general cubre solicitudes HTTP exitosas, no es un historial de
cambios de cada fila ni un trigger para escrituras externas a la API. Los
registros de permisos y accesos existentes siguen siendo independientes. No se
copian cuerpos, contraseñas, tokens ni parámetros de búsqueda a `audit_logs`.
La escritura posterior a la respuesta reporta sus errores en los logs del servidor.

## Numeración SAR

El identificador interno `invoice_number` conserva su contrato actual. El
correlativo fiscal se guarda en `sar_number` y el CAI se copia desde la serie al
crear la factura. El detalle de factura expone `sarNumber`; las filas del listado
incluyen `SarNumber`.

Los endpoints nuevos son:

- `GET /app/settings/invoice-number-sequences`, permiso `settings.company.read`.
- `POST /app/settings/invoice-number-sequences`, permiso `settings.company.update`.

Ejemplo ilustrativo de cuerpo para crear una serie; reemplazar por la
configuración real antes de usarlo:

```json
{
  "code": "SERIE-2026-01",
  "prefix": "001-001-01-",
  "minNumber": 1,
  "maxNumber": 1000,
  "padding": 8,
  "cai": "CAI-DE-LA-SERIE"
}
```

`current_number` representa el último número asignado y comienza en
`min_number - 1`. Una serie nueva sustituye a la activa y conserva las anteriores.
Los rangos con el mismo prefijo no pueden superponerse. El número se asigna al
crear la factura; anularla o eliminarla lógicamente no libera su correlativo.

Sin una serie configurada, las facturas conservan solamente su identificador
interno y `sar_number = NULL`. Una serie configurada y agotada rechaza nuevas
facturas; no cambia silenciosamente a un UUID fiscal. No se crearon series reales
ni se asignaron números retroactivamente a facturas existentes.

## Migraciones y comprobaciones

```sh
npm run db:generate:tenant
npm run db:migrate:tenant
npm run type-check
npm test
npm run test:mysql
```

La generación debe informar que no hay diferencias después de aplicar este
cambio. La migración se aplicó al tenant local `sicmh` del contenedor existente.
Las pruebas de integración verifican las tablas, columnas y claves foráneas
contra el snapshot, además de concurrencia SAR, rollback, tokens revocados y
vencidos, versiones de consentimientos, relaciones, borrado lógico y entregas.

`test:mysql` requiere MySQL local y un tenant de desarrollo sin tráfico concurrente.
Crea fixtures con UUID y los elimina al terminar. Si ya existe una serie SAR
activa, omite la prueba que necesita activar una serie temporal para no cambiar
su configuración. No crea ni reinicia bases de datos.

La exclusión de recursos se aplica también en MySQL mediante CHECK. Las FK de
esos dos campos utilizan RESTRICT para admitir esa comprobación. Los límites de
la revisión y el detalle del reseteo local están en el documento de normalización.
