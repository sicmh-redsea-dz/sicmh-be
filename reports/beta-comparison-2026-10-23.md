# Comparación funcional: Beta frente a Beta-v0.0.1

Actualización posterior: la regla de campos opcionales fue restaurada localmente. Véase `beta-parity-phase1-2026-10-23.md` para los cambios y las 44 pruebas aprobadas. Los hallazgos siguientes describen el estado de la revisión original.

Fecha: 23 de octubre de 2026. Referencia funcional: `Beta`, indicada por el usuario como estable. Revisión de backend y frontend, sin checkout, merge, cambios de código ni acceso a bases de datos durante esta comparación. Se creó únicamente este informe.

## Referencias comparadas

| Repositorio | Beta estable | Beta-v0.0.1 |
| --- | --- | --- |
| Backend | `a346e03`, 18 septiembre 2026 | `e0bbb9f`, 7 septiembre 2026 |
| Frontend | `2fe7566`, 21 septiembre 2026 | `a270b9c`, 7 septiembre 2026 |

Las ramas divergieron: backend tiene 15 commits exclusivos de Beta y 3 exclusivos de Beta-v0.0.1; frontend tiene 2 y 1, respectivamente. El nombre de versión no significa que Beta-v0.0.1 incluya todas las mejoras estables. Los commits de Beta incluyen consentimientos y sus correcciones, facturación, expediente/contacto de emergencia, edad y navegación de autocompletado.

Las referencias locales coinciden con las referencias `origin/*` almacenadas localmente. No se hizo fetch ni se verificó el estado remoto actual o un despliegue. El árbol de trabajo está en Beta-v0.0.1 con las correcciones locales previas sin confirmar; ese estado se distingue de los commits de la rama.

## 1. Confirmado: cambiaron los campos obligatorios de las atenciones

En ambos frontend los únicos controles con `Validators.required` en los formularios de atención son doctor y paciente. Los validadores de módulos limpian los demás requisitos. Hospitalización conserva una validación de selección de cama si se ingresa un valor; esto no convierte todos los datos clínicos en obligatorios.

Sin embargo, Beta-v0.0.1 añadió requisitos en dos capas del backend:

| Capa / módulo | Beta | Beta-v0.0.1 y estado local actual |
| --- | --- | --- |
| Validator HTTP, crear/editar | Fecha, diagnóstico, presión y tratamiento opcionales | Los cuatro son obligatorios |
| Fecha al crear | Se sustituye una fecha vacía por la fecha actual | Se quitó esa normalización del servicio |
| Expediente estándar, todos los módulos | Sin el nuevo bloqueo del servicio | Exige motivo de consulta, padecimiento actual y exploración física; también exige el objeto expediente |
| Emergencia | Datos clínicos opcionales | Exige triage, modo de llegada y destino/condición al egreso |
| Quirófano | Datos clínicos opcionales | Exige diagnóstico pre y postoperatorio, procedimiento, anestesia, inicio y fin de cirugía |
| Hospitalización | Datos clínicos opcionales | Exige diagnóstico y motivo de ingreso, servicio, cama y resumen de evolución |

`origin` también es requerido en ambas ramas como metadato de la aplicación, no como campo adicional que deba completar el usuario. La fecha normalmente se precarga en la UI, pero borrarla sigue fallando en la nueva API.

Prueba ejecutada en memoria con los validadores de cada commit: payload con doctor, paciente y origin válidos. Beta devolvió cero errores; Beta-v0.0.1 devolvió `Date is required`, `Diagnosis is required`, `Pressure is required` y `Treatment is required`. No se intentó guardar una atención ni se consultó una base de datos.

Evidencia: `src/api/validators/visits.validator.ts` (actual: líneas 28–58 y 70–92); `src/application/services/visits.service.ts` (actual: llamadas en 199/463 y `validateExpediente` en 640–694); formularios frontend `visitForm` y `applyModuleValidators`.

**Pendiente.** Las correcciones locales previas no restauraron esta regla funcional. El nuevo esquema declara tres textos de `medical_records` como NOT NULL; quitar validadores sin definir cómo guardar un expediente parcial no completa la corrección. Debe conservarse la posibilidad de registrar una atención con solo doctor/paciente, sin inventar datos clínicos.

## 2. Los consentimientos existen en ambas ramas, pero no son equivalentes

Se mantienen en frontend: acceso desde la atención, preparación antes de guardar, cola para adjuntar al crear la atención, impresión, aceptación electrónica con checkbox/firma, encargado de menor y carga de documento firmado físicamente. No se eliminó toda la función.

Beta usa `consents.service.ts`, repositorio de consentimientos y servicio de entrega; Beta-v0.0.1 los reemplaza por `clinical-documents.service.ts`.

| Capacidad de Beta | Comparación con Beta-v0.0.1 / estado actual |
| --- | --- |
| Plantillas/versiones e instancias persistidas | La rama nueva tenía columnas incompatibles. Corregido localmente para el nuevo esquema |
| Autor de plantilla, UUID de versión, snapshot, hash y aceptante | Faltaban en la implementación nueva. Corregidos localmente |
| Aceptar y volver a imprimir sin destruir documentos anteriores | Corregido localmente mediante instancias históricas separadas |
| Envío por correo del consentimiento aceptado | Beta encola `documentDelivery.enqueue`; ese flujo fue eliminado y no está restaurado |
| Correo del paciente/encargado en contexto e instancia | Beta lo conserva; el servicio nuevo no implementa esa información para entrega |
| Copia separada de firma del aceptante, firma y sello del médico | Beta ejecuta `preserveConsentAssets` y guarda rutas históricas; la implementación actual no lo hace |
| Escritura de objetos sin sobrescritura | Beta carga con `immutable: true` y usa `ifNotExists`; ese mecanismo desapareció. Los hashes/snapshots locales no sustituyen la conservación de los objetos |
| Validación de encargado de menor en el servidor | Beta exige encargado para menor y nombre/identidad/parentesco/teléfono. El servicio actual valida tipo/nombre, pero no restablece todas esas reglas; la validación de UI no sustituye la del servidor |
| Endpoint GET de preview de consentimiento existente | Presente en Beta y ausente en la nueva ruta; impresión/contexto siguen presentes. No se encontró uso de ese GET en el frontend comparado |

Evidencia Beta: `src/application/services/consents.service.ts:125–269,282–294`; `src/application/services/clinical-attachments.service.ts:94–99,212+`; rutas de consentimientos. Evidencia actual: `src/application/services/clinical-documents.service.ts:323–431` y ausencia de `preserveConsentAssets`/document-delivery en los servicios actuales.

**Conclusión:** adaptar los nombres de tablas fue necesario, pero no recuperó todo el comportamiento estable del consentimiento.

## 3. Edad del paciente: eliminada de la UI y de parte del contrato

Beta calcula y muestra edad en registro de pacientes y en las dos variantes del formulario de atención. Beta-v0.0.1 elimina `age-in-years.ts`, los getters `patientAge` y sus bloques HTML. También quita `birthDate` de `ShortPatient` y su mapper de búsqueda.

La fecha de nacimiento del paciente sigue existiendo y el contexto de consentimientos tiene su propio cálculo de edad; eso no significa que el campo de edad visible se haya conservado en las atenciones.

Evidencia: diff de `src/app/shared/utils/age-in-years.ts`, `patient-form-page.component.*`, `visits-form-page.component.*`, `visits-form-page-v2.component.*`; backend `src/domain/entities/Patient.ts` y `PatientMapper.ts`.

**Pendiente.**

## 4. Autocompletado: teclado y selección

Beta tiene `appAutocompleteKeyboard`, opciones con `role=listbox/option`, selección accesible y manejo de salida; Beta-v0.0.1 elimina la directiva y sus usos en doctor, paciente y otras selecciones. También elimina la reapertura del dropdown con el evento input y cambia el manejo de blur.

Ya se corrigió localmente la carga/visibilidad del listado de doctores, manteniendo la precarga y el cache al inicializar VisitsService, y se eliminó el tope de 20 registros en el catálogo backend. La navegación por teclado de Beta aún no fue restaurada. La selección de paciente conserva diferencias: Beta limpiaba el paciente seleccionado inmediatamente al editar el texto; la rama nueva dejó parte de esa limpieza después del debounce.

Evidencia: directiva eliminada `src/app/shared/directives/autocomplete-keyboard.directive.ts`, `shared.module.ts`, templates y suscripciones `patientSearchControl`.

## 5. Contacto de emergencia y tipo de identificación del paciente

Beta guarda/actualiza contacto de emergencia en una transacción y lo devuelve al consultar el paciente. Su mapper incluye `emergencyContact` y `identificationType`.

Beta-v0.0.1 elimina esos campos de entidad/mapper/puerto y el repositorio actual solo escribe `patients`. El frontend todavía tiene partes del formulario de contacto y tipo de identificación, pero la API nueva no conserva ese contrato. La tabla `emergency_contacts` existe; su existencia no implica que el flujo de pacientes la utilice.

También hay requisitos nuevos en registro de pacientes: dirección, teléfono de exactamente 8 caracteres y correo pasan a ser obligatorios donde Beta los trataba como opcionales. Esto es un formulario distinto de las atenciones médicas, pero es otra diferencia funcional comprobada.

**Pendiente.** Evidencia: `mysql-patients.repository.ts`, `PatientMapper.ts`, `Patient.ts`, `patients.validator.ts`, formulario de pacientes.

## 6. Facturación asociada a la atención

- **Servicio de consulta faltante:** Beta aborta el registro si no está configurado el servicio de consulta. La nueva rama captura el error y continúa, pudiendo omitir ese cargo.
- **Detalle al terminar de guardar:** Beta espera `recordBillingTrail`; la nueva rama usa `void this.recordBillingTrail`. El cliente puede abrir la factura antes de que se registre todo el detalle. Con Cloud Run, este trabajo posterior a la respuesta merece revisión adicional; aquí se comprobó el cambio de control de flujo, no una pérdida observada en vivo.
- **Entrega de factura/recibo por correo:** Beta encola un snapshot al pagar. La nueva rama elimina esa integración.
- **Concurrencia del pago:** Beta lee la factura `FOR UPDATE` dentro de una transacción. La nueva implementación lee y actualiza por separado.
- **Atomicidad al crear atención:** el wrapper SQL de la rama nueva no cubría los repositorios Drizzle. Ya se corrigió localmente con TenantContext y transacciones/savepoints compartidos.

Evidencia: `src/application/services/visits.service.ts` y `invoice.service.ts`; repositorio de facturas y servicio de entrega eliminado.

## 7. Permisos de atención y consentimientos

Beta verifica el módulo/origen de la atención real mediante `requireVisitOriginPermission` y exige permisos de actualización para imprimir/aceptar; aceptación/carga física también requiere `attachments.create`.

Beta-v0.0.1 sustituye varias rutas por `requireAnyPermission(allVisitReadPermissions)`: aceptación e impresión usan permisos de lectura y ya no exigen `attachments.create` en esas rutas. La búsqueda de doctores/pacientes pasa de permisos de lectura **o actualización clínica** a solo lectura; un usuario que puede registrar pero no leer puede quedarse sin catálogos. También se elimina la expansión de permisos legacy.

**Pendiente.** Esto requiere preservar las reglas de acceso de Beta al adaptar UUID y obtener el origen desde la atención persistida. Se verificó el código de las rutas; no se ejecutaron solicitudes con roles reales.

## 8. Recuperación ante errores de PDF

Beta reintenta hasta tres veces fallos transitorios de Puppeteer y espera que las imágenes carguen antes del PDF. Beta-v0.0.1 elimina esos reintentos y la espera de imágenes. Puede afectar a consentimiento/receta con firma, sello o logo; no se reprodujo un fallo de renderizado en esta revisión.

**Pendiente.** Evidencia: `src/utils/pdfRenderer.ts` y prueba de renderer eliminada.

## 9. Reapertura de expediente y pruebas eliminadas

Beta usa `HistoryMapper.toExpedientePayload` para recuperar datos clínicos desde historia y un fallback. La rama nueva elimina esa reconstrucción y depende de `medical_records`. Los datos existentes necesitan backfill completo para conservar lo mostrado al abrir una atención anterior.

La comparación también muestra que se eliminaron pruebas de consentimientos, entrega de documentos, contacto de emergencia, permisos/inventario, totales de consulta, contraseña y PDF. Las pruebas nuevas de compatibilidad local cubren estructura y parte de los flujos, pero no equivalen a toda esa cobertura funcional estable.

## Orden recomendado para recuperar paridad

1. Restaurar la regla de atención mínima: doctor/paciente obligatorios; fecha por defecto; expediente y demás datos opcionales, coordinando UI, validators, servicio y persistencia.
2. Completar consentimientos con las capacidades de Beta: encargado, assets históricos, correo y permisos; conservar las correcciones UUID/snapshots actuales.
3. Recuperar edad visible, navegación por teclado y contrato completo de pacientes/contacto de emergencia.
4. Recuperar garantía del cargo de consulta, detalle disponible al responder, pago transaccional y entrega de factura/recibo.
5. Restaurar pruebas funcionales adaptadas a UUID/Drizzle y después verificar UI y despliegues por separado.

No conviene reemplazar Beta-v0.0.1 completa por Beta: las mejoras funcionales deben portarse manteniendo el esquema nuevo y los identificadores UUID. Esta revisión no implica que todas las diferencias sean regresiones ni certifica funcionalidades externas al alcance inspeccionado.
