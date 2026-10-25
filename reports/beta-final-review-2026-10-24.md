# Revisión final de Beta, Beta-v0.0.1 y correcciones locales

Fecha: 24 de octubre de 2026. Revisión funcional de código e historial local. No se modificó código de aplicación durante esta revisión; se generó este informe. No se consultaron ni modificaron bases de la aplicación, no se enviaron correos ni se desplegó nada.

## Referencias y alcance

| Repositorio | Beta | Beta-v0.0.1 | Diferencias exclusivas |
| --- | --- | --- | --- |
| Backend | a346e03 | e0bbb9f | 15 commits de Beta; 3 de Beta-v0.0.1 |
| Frontend | 2fe7566 | a270b9c | 2 commits de Beta; 1 de Beta-v0.0.1 |

Las referencias son locales, sin fetch. La comparación de commits abarca 190 archivos backend y 56 frontend, incluyendo datos, documentación, dependencias y pruebas. Se inspeccionaron las rutas funcionales de inventario, atenciones, pacientes, consentimientos, facturas, permisos, autenticación, perfiles, citas, camas/quirófanos, adjuntos y dashboard. Se contrastaron las diferencias con el árbol de trabajo actual: las correcciones locales todavía no forman parte del commit Beta-v0.0.1.

Una diferencia estructural (UUID, Drizzle, tablas normalizadas en lugar de JSON) no es por sí misma una regresión. A continuación se separan cambios confirmados, riesgos por inspección y problemas heredados.

## Pendientes prioritarios

| Prioridad | Hallazgo y efecto | Estado / evidencia actual |
| --- | --- | --- |
| P0 | Recuperación de contraseña devuelve el enlace con token al solicitante si SMTP no está configurado. Con correo y empresa conocidos, la respuesta puede dar acceso al restablecimiento sin acceder al buzón. | Regresión frente a la respuesta genérica de Beta. Reproducido con repositorio y envío simulados; no se imprimió el token. `src/application/services/auth.service.ts:100`, especialmente 115; ruta pública `src/api/routes/auth.route.ts`. Corregir antes de publicar esta rama. |
| P1 | Inventario perdió los permisos por ubicación. Listar solo exige `inventory.read`; transferir solo `inventory.transfer`, sin comprobar acceso al origen y destino. Ocultar pestañas en frontend no sustituye esos controles. | Beta añadió `requireInventoryLocationPermissions` en 28e92b4 y cuatro pruebas; la rama nueva los eliminó. Se reprodujo que el guard actual permite un rol con solo `inventory.transfer`. `src/api/routes/inv.route.ts:9`, 21. Adaptar la resolución a códigos/UUID de ubicaciones. |
| P1 | Atenciones y documentos dejaron de comprobar el módulo de la atención persistida. Varias lecturas aceptan cualquier permiso clínico; la edición deriva permisos del body, incluyendo permisos genéricos. Aceptar consentimiento o subir el físico exige lectura en vez de actualización y ya no exige `attachments.create`. | Diferencia confirmada por rutas, no prueba HTTP con usuarios reales. `src/api/routes/visits.route.ts:27`, 56, 76, 86, 99; equivalentes de camas y quirófano permiten también permisos genéricos de consulta. Beta resolvía el origen real por ID. |
| P1 | Pago de factura perdió la transacción y el bloqueo de fila. Dos operaciones pueden leer simultáneamente una factura pendiente y superar la comprobación previa al pago. | Riesgo de concurrencia confirmado por separación de lectura/escritura; no se ejecutó carrera real. Beta usaba `findByInvoiceNumberForUpdate` dentro de transacción. `src/application/services/invoice.service.ts:86`; `mysql-invoice.repository.ts:updateByInvoiceNumber`. |
| P1 | El cargo predeterminado de consulta puede omitirse: se captura el fallo de búsqueda y se crea la factura de todos modos. Además `recordBillingTrail` se dispara sin esperarlo, de modo que el detalle puede no estar listo al responder. | Regresión frente a Beta. `src/application/services/visits.service.ts:226`, 271. El arreglo de duplicados de Reportería no recupera estas garantías de creación. |
| P1 | Correos de factura/recibo pagado y consentimiento aceptado ya no se encolan. | Desaparecieron `DocumentDeliveryService`, repositorio y conexiones al servicio. Que exista `document_deliveries` no restablece el flujo. Diff de `invoice.service.ts` y antiguo `consents.service.ts`. |
| P1 | Consentimientos no recuperaron toda la validación del encargado de un menor ni las copias separadas e históricas de firma/sello. | La aceptación actual comprueba nombre, tipo, firma/sello médico y firma dibujada cuando aplica; no exige todas las reglas de minoría/encargado que tenía Beta. `clinical-documents.service.ts:337`. Se conserva el PDF generado, pero no equivale a los assets históricos separados de Beta. `gcs-file-storage.ts` también perdió la precondición de no sobrescritura. |
| P1 | Al eliminar completamente un insumo de una atención, la devolución pierde la ubicación y termina usando `main`. | **Problema heredado de Beta**, no introducido por Drizzle. Reproducido en `computeStockDelta`: el delta de un producto ausente no contiene `subinventoryId`; `restoreStockQuantities` usa `main` por defecto. `visits.service.ts:350`; `mysql-stock.repository.ts:75`. Impacta especialmente emergencia, hospitalización y quirófano. La ubicación debe obtenerse de la atención almacenada. |
| P1 | Editar una atención no tiene una transacción exterior que agrupe visita, expediente, inventario y factura. Un fallo posterior puede dejar cambios anteriores guardados. | **Problema también presente en Beta**; la corrección local de atomicidad cubre crear, no editar. Inspección de `visits.service.ts:444`. Además no hay un bloqueo común que serialice dos ediciones del mismo consumo. |
| P2 | El detalle de insumos de factura dejó de priorizar consumo por atención y de agrupar correcciones por producto. Devuelve filas individuales de `invoice_items`, incluidas cantidades negativas de una edición. | Beta sumaba uso por producto y recurría a Factura_Inventario si faltaba historia. `mysql-stock.repository.ts:119`. Revisar neteo, cero y conservación de precios históricos antes de reemplazarlo: la nueva tabla sí tiene precios por línea y no conviene volver al precio actual del catálogo. |
| P2 | Selectores clínicos ofrecen productos con existencia cero. El selector nuevo permite agregarlos y el backend luego rechaza consumirlos. Las pestañas de inventario también incluyen cero, a diferencia de Beta. | Confirmado por ausencia de `quantity > 0` en `mysql-visits.repository.ts:213` y `mysql-inv.repository.ts:28`. Beta 28e92b4 corrigió justo el filtro por cantidad del subinventario. Puede ser útil conservar productos agotados en administración, pero los selectores de consumo deben impedir seleccionarlos. Al editar, conservar los ya reservados aunque el saldo disponible sea cero. |
| P2 | Dirección del médico en Mi perfil se muestra y se envía desde frontend, pero se descarta en backend y la receta fija `doctorAddress: null`. Tampoco se sincronizan nombre/correo/perfil con `staff_members` como antes con `personal`. | Regresión confirmada. `settings.service.ts:109`, `UserProfile.ts`, `drizzle-user-profiles.repository.ts`, `clinical-documents.service.ts:137`; frontend `my-profile.component.ts:71`. La estructura actual de user_profiles no tiene address. Requiere decidir su ubicación canónica y preparar SQL si se incorpora esa columna. |
| P2 | Autocompletado por teclado de Beta sigue faltando para doctor/paciente en atenciones y facturas. El buscador nuevo de inventario sí tiene teclado. | `appAutocompleteKeyboard` y su directiva fueron eliminados. La precarga de doctores restaurada no equivale a recuperar flechas/Enter/Escape en esos campos. Ver ambos templates de atenciones, invoice.component.html y shared.module.ts. |
| P2 | PDF perdió tres reintentos de errores transitorios y la espera de imágenes. | Diferencia confirmada; no se reprodujo un PDF incompleto. `src/utils/pdfRenderer.ts:36`. Puede afectar logo, firma y sello. |
| P2 | Repositorios de camas, quirófanos y perfiles cargan el almacén completo y vuelven a guardarlo sin la exclusión que tenía el adaptador JSON. No se ve una transacción común para toda la operación. | Riesgo de escrituras parciales/perdidas bajo concurrencia; no se reprodujo una carrera. `drizzle-beds.repository.ts:150`, `drizzle-or-rooms.repository.ts:148`, `drizzle-user-profiles.repository.ts:65`. Beta usaba `withFileLock`; con SQL debe sustituirse por operaciones dirigidas y bloqueos/transacciones apropiados, no copiar el lock de archivo. La carga completa también afecta escala. |

P0: corregir antes de publicar. P1: completar antes de considerar paridad funcional. P2: diferencias relevantes de uso, persistencia o robustez que necesitan una fase posterior. No se afirma que los riesgos de concurrencia hayan ocurrido con datos reales.

## Inventario: qué cambió realmente en Beta

El commit `28e92b4` (“Inventario bug fixes and emergency contact”) añadió permisos por ubicación y transferencias, corrigió las consultas para filtrar por la cantidad del subinventario y agregó pruebas. Otros cambios de Beta hicieron que el detalle de factura priorizara el consumo de las atenciones y sumara las correcciones. Esas mejoras no quedaron completamente portadas.

La consulta antigua `inv.queries.ts` aún contiene nombres españoles y un filtro de cantidad global distinto, pero **el repositorio actual de inventario ya no ejecuta esa consulta**: usa Drizzle. No se debe reportar ese SQL muerto como prueba de fallo en producción. Los hallazgos anteriores se basan en las rutas y repositorios que sí se usan.

Ya están presentes localmente: productos y ubicaciones UUID; resolución por códigos `main`, `emergency`, `operating_room`, `hospitalization` y aliases antiguos; cantidades cero y mínimos en CRUD; transferencia atómica con movimiento y descuento condicional contra sobregiro; creación de atención transaccional; y selector de inventario con filtro local, índice reutilizable y límite de resultados. No se deben reemplazar esos arreglos por el repositorio antiguo de Beta.

## Funciones recuperadas y diferencias intencionales

| Área | Estado actual |
| --- | --- |
| Doctores | Lista desde staff_members, precarga y caché al iniciar, búsqueda local y catálogo sin corte artificial en backend. |
| Pacientes | Tipo/formato de identificación, notas, contacto de emergencia, edad y fecha de nacimiento recuperados. Solo los campos con asterisco son obligatorios; contacto parcial permitido por instrucción posterior del usuario. |
| Atenciones | Solo doctor y paciente obligatorios; fecha por defecto; expediente parcial; todos los campos clínicos mapeados a la estructura nueva; edad y campos compactos; fechas quirúrgicas completas. |
| Reportería de cargos | Corregida la suma de detalle más cabecera que mostraba cuatro registros para dos facturas. Conserva líneas legítimas y conciliación. No equivale a revisar toda la lógica de pago. |
| Consentimientos | Plantillas/versiones, autor, UUID de versión, snapshot/hash, aceptación e historial de reimpresiones corregidos. Persisten los pendientes de la tabla anterior. |
| Contraseñas convencionales | El cambio forzado pasó de Firebase al backend MySQL y frontend envía newPassword y recibe token actualizado. Es una adaptación coherente de arquitectura; el problema concreto es el fallback público de recuperación, no el mero uso de JWT. |
| Persistencia | Datos JSON pasaron a tablas Drizzle y los IDs numéricos a UUID. Esto requiere migrar datos históricos; la existencia de tablas vacías no demuestra que los datos estén recuperados. |
| Configuración de empresa | Se incorporó lectura/escritura del nombre desde el esquema global; no se detectó una regresión funcional concreta en esa ruta. |

## Otras superficies revisadas y límites

- **Citas:** validación de inicio/fin y conflicto de doctor permanecen; source ahora se resuelve por códigos y aliases en el repositorio. Beta admitía normalización de acentos/espacios y elegía el primer origen si faltaba; ahora el default es manual y hay dos aliases. Los códigos exactos del catálogo que usa la UI son el flujo normal; las equivalencias de valores legacy/custom necesitan pruebas con sus catálogos. No se declara rota toda la agenda por este cambio.
- **Captura de adjuntos desde teléfono:** cambió de JSON/base64 a multipart y procesamiento sharp, con sesión de diez minutos y QR externo. Los contratos frontend/backend revisados concuerdan en el envoltorio data. Desapareció el vínculo de sesión a tenant y cambió el límite de tamaño. Requiere prueba de sesión, subida, expiración y aislamiento; no se probó con móvil ni GCS. Ambas ramas mantienen las sesiones en memoria, por lo que la dependencia de una instancia no es una novedad de esta migración.
- **Dashboard:** reemplaza función SQL por agregaciones Drizzle. Los nombres de cardData consumidos por frontend coinciden; visitData tiene una forma nueva, pero el dashboard actual no consume ese detalle. No se considera una rotura de UI confirmada por ese solo cambio. Falta equivalencia de métricas con la función del entorno estable y datos controlados.
- **Adjuntos, firmas y sello:** las rutas para subir firma/sello siguen existiendo; no se confundió su reubicación con su eliminación. La diferencia pendiente es conservación histórica y los datos del perfil.
- **Permisos legacy:** se eliminó la expansión de overrides genéricos hacia permisos de módulo. Debe probarse con roles/overrides reales al restaurar las reglas, sin conceder acceso general como sustituto.
- **Datos históricos:** el cambio de historia a medical_records y de archivos JSON a tablas requiere backfill/verificación por tenant. Esta revisión no certifica esa migración ni el estado desplegado.
- **Pruebas eliminadas:** Beta tenía cobertura específica de permisos/consultas de inventario, entregas, consentimiento, reset, PDF, totales de consulta y otros flujos que ya no está en la rama. Las pruebas nuevas cubren compatibilidad y arreglos locales, pero no reemplazan todos esos escenarios.

## Validación realizada en esta revisión

- Backend: `npm test`: 44 aprobadas, 0 fallos, 1 integración MySQL omitida porque no se inició un contenedor en esta revisión. TypeScript compila como parte del comando.
- Frontend: 5 pruebas doctor-autocomplete, 7 inventory-picker y 2 patient-clinical-fields: 14 aprobadas.
- Reproducciones con mocks: respuesta de reset con enlace cuando no hay SMTP; guard de transferencia sin permisos de ubicación; delta de eliminación sin ubicación. Sin peticiones al entorno desplegado, cuentas reales ni correos.
- No se ejecutó navegador ni se comprobó Cloud Run/Firebase. Los resultados de MySQL de revisiones anteriores no se presentan como una nueva ejecución de integración hoy.

## Orden de corrección recomendado

1. Eliminar el enlace de reset de la respuesta pública y recuperar pruebas de recuperación.
2. Restaurar permisos por módulo real y por ubicaciones de inventario, adaptados a UUID/códigos.
3. Hacer atómica la edición de atención/consumo/factura; devolver insumos a su ubicación real; recuperar agregación/validación del detalle.
4. Recuperar pago transaccional y disponibilidad del cargo/detalle antes de responder.
5. Completar consentimientos, correo encolado, assets históricos y datos del médico en recetas.
6. Recuperar teclado y robustez de PDF; después probar concurrencia de camas/quirófanos y los flujos externos de captura/agenda.

La revisión confirma que se recuperó gran parte de pacientes y formularios, pero **todavía no hay paridad completa con Beta**. Para cerrar cada pendiente hacen falta cambios dirigidos y pruebas de su comportamiento; no conviene hacer un merge o reemplazo completo de Beta sobre la migración.
