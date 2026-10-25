# Ficha clínica persistente: consulta externa

Implementado el 24 de octubre de 2026 en backend y frontend locales.

## Flujo

1. En una consulta nueva, seleccionar al paciente carga su ficha clínica, que aparece colapsada. El usuario decide si desea abrirla.
2. La ficha conserva antecedentes familiares, patológicos, quirúrgicos, hábitos, medicamentos habituales y alergias con estado explícito: información no recabada, sin alergias conocidas o alergias registradas.
3. Si todavía no existe ficha, se proponen los valores históricos no vacíos que coinciden entre atenciones. Los valores contradictorios se muestran para revisión; ninguno se selecciona automáticamente.
4. La revisión es opcional y no bloquea el registro de la consulta. Si se modifican datos, los cambios válidos se guardan junto con la consulta; los cambios incompletos requieren corrección. El botón de registrar revisión permite dejar constancia de una revisión sin cambios. Cambiar de paciente cancela la petición anterior y descarta la selección de ficha del otro paciente.
5. Registrar motivo y evolución actual, exploración, diagnóstico, tratamiento y seguimiento. Notas y referencia a especialista permanecen opcionales.
6. Cuando se actualiza o registra la revisión de la ficha, guardar la consulta guarda también la ficha y su revisión en la misma transacción. Una ficha que cambió en otra sesión requiere recarga y revisión antes de guardar. Consultar una ficha sin modificarla ni registrar su revisión no crea un registro de revisión ni convierte propuestas históricas en datos vigentes.

## Historial

- `patient_clinical_profiles` contiene versiones completas que la aplicación nunca sobrescribe.
- `encounter_clinical_reviews` vincula una atención con la versión revisada y el usuario responsable. Revisar sin cambios reutiliza la versión y registra una revisión nueva para esa atención.
- Los campos existentes de la consulta reciben una copia de los antecedentes y medicamentos revisados para mantener los informes actuales.
- La edición de una consulta con ficha revisada conserva esos datos y no permite reasignar el paciente. Las correcciones de la consulta no actualizan la ficha vigente del paciente.
- Las atenciones anteriores conservan sus campos e informes. El padecimiento actual anterior sigue disponible cuando contiene información.
- El tratamiento de una consulta no se convierte automáticamente en medicamento habitual.

## Migración y verificación

Migración nueva: `drizzle/tenant/0003_patient_clinical_profile.sql`. Agrega dos tablas y sus restricciones; no elimina columnas ni transforma antecedentes antiguos. La ficha inicial se prepara al seleccionar el paciente y se establece cuando se guarda la primera consulta revisada.

Aplicada con el migrador a `sicmh` en `127.0.0.1:3306`. El registro local tenía solamente la migración inicial; el migrador registró también las extensiones aditivas pendientes 0001 y 0002 antes de aplicar 0003. Se verificó la existencia de ambas tablas y las cuatro entradas del registro.

Validación:

- 80 pruebas de backend aprobadas, sin omisiones; incluye migraciones desde una base vacía y desde el esquema anterior en MySQL aislado, conservación de versiones, conflictos concurrentes, reversión de factura y ficha ante un guardado fallido y reapertura/edición de la consulta.
- 17 pruebas de frontend aprobadas en la implementación inicial. Tras el ajuste colapsable, las 3 pruebas de ficha clínica pasan y verifican revisión opcional, guardado de cambios válidos, bloqueo de ediciones incompletas, cancelación de respuestas de otro paciente y resolución de conflictos/alergias.
- Compilación Angular de desarrollo aprobada.

Log: `reports/clinical-profile-tests-2026-10-24.log`.

## Prueba funcional con la doctora

Probar un paciente nuevo, uno con antecedentes coincidentes y uno con datos históricos contradictorios. Guardar una primera consulta, abrir una segunda y confirmar que la ficha se reutiliza. Cambiar un medicamento en la segunda y verificar que el reporte de la primera conserva el dato original. Registrar el tiempo de documentación y las dificultades encontradas.

Esta etapa corresponde a consulta externa. La interfaz de emergencia, hospitalización y quirófano conserva su flujo. No se ha desplegado a producción ni se ha realizado todavía la prueba interactiva con la doctora.
