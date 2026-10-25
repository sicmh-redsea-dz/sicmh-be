# Recuperación funcional de Beta: primera etapa

Implementado localmente el 23 de octubre de 2026. Esta etapa restaura los campos opcionales de las atenciones médicas conservando UUID y el esquema normalizado. No se modificó producción ni se aplicaron migraciones a bases de aplicación.

## Comportamiento recuperado

- Crear una atención requiere doctor y paciente válidos. El origen sigue siendo metadato enviado por la aplicación para identificar consulta externa, emergencia, quirófano u hospitalización.
- Fecha, diagnóstico, tratamiento, presión y demás mediciones son opcionales. Si no se indica fecha, atención y factura reciben la misma fecha actual.
- Se eliminó la exigencia de expediente completo y de campos específicos por módulo. Triage, datos quirúrgicos, cama, diagnóstico de ingreso, etc. pueden completarse después.
- Los campos opcionales vacíos o null no generan NaN. Si se proporciona un dato, se valida su formato/tipo; doctor y paciente mantienen validación UUID.
- Un expediente totalmente vacío no crea un registro clínico. Un expediente parcial completa los tres textos NOT NULL con texto vacío, sin inventar contenido clínico ni cambiar el esquema.
- Una edición parcial conserva identidad, fecha, diagnóstico, mediciones, expediente e inventario que no vengan en la solicitud. Al completar una parte del expediente se conserva lo ya registrado en las otras partes.
- La creación del expediente está dentro de la transacción de creación de atención/factura/stock. Un fallo del expediente revierte esas escrituras conjuntamente.
- Se corrigió la edición que solo incluye expediente: ya no falla con `No values to set` cuando no hay cambios directos en las columnas de la atención.

## Archivos principales

- `src/api/validators/visits.validator.ts`: campos clínicos opcionales y normalización de valores vacíos.
- `src/application/services/visit-input.ts`: normalización de fecha y expediente parcial.
- `src/application/services/visits.service.ts`: flujo de creación/edición sin requisitos clínicos adicionales; persistencia del expediente dentro de la transacción al crear.
- `src/infrastructure/repositories/mysql-visits.repository.ts`: conservar campos omitidos en edición y admitir actualizaciones de solo expediente.

El frontend ya tenía únicamente doctor y paciente como controles requeridos; no fue necesario modificarlo en esta etapa. No se repitió su build porque no cambió su código.

## Verificación

`RUN_SCHEMA_INTEGRATION_TESTS=1 npm test` en un contenedor temporal MySQL 8.0.46: **44 pruebas aprobadas, cero fallos y cero omisiones**. El comando también compila TypeScript.

Las pruebas nuevas verifican:

1. Validación de atención mínima en los cuatro módulos.
2. Campos vacíos/null, valores numéricos cero y rechazo de datos inválidos.
3. Fecha automática y coincidencia entre atención y factura.
4. Creación/edición reales de atenciones mínimas en cada módulo contra el esquema objetivo.
5. Expediente parcial con campos clínicos NOT NULL vacíos, sin requisitos adicionales.
6. Conservación de diagnóstico, peso y otros datos al editar solo expediente.
7. Rollback de atención y factura al simular un fallo al guardar expediente.

También pasaron las pruebas existentes de compatibilidad de esquema, inventario y consentimientos. Las pruebas usan únicamente esquemas nuevos con nombres únicos dentro del MySQL temporal. No se verificó la UI en un navegador ni un despliegue real en esta etapa.

## Pendiente de las siguientes etapas

Completar la paridad de consentimientos con Beta —correo, conservación separada de firmas/sello, reglas del encargado y permisos—, edad visible, navegación por teclado, contacto de emergencia y diferencias de facturación descritas en el informe comparativo. Esta etapa no declara resueltas esas diferencias.
