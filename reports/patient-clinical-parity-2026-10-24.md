# Pacientes y atenciones: paridad con Beta

Referencia funcional: ramas locales `Beta` (backend `a346e03`, frontend `2fe7566`); implementación sobre `Beta-v0.0.1`, conservando las correcciones locales anteriores. Comparación contra `medit-test-latest.sql` y su fixture de estructura. No se modificaron dumps ni bases de la aplicación. No se verificó un despliegue ni la interfaz en navegador.

## Cambios implementados

- Identidad: exactamente 13 dígitos; carné de residencia: entre 1 y 19 dígitos; pasaporte: letras y números, hasta los 50 caracteres que permite `patients.identification`. Validación en frontend y backend. Cambiar el tipo vuelve a validar el valor existente. Un PATCH que solo cambie número o tipo también valida la combinación con el dato guardado.
- Edad en años cumplidos junto a fecha de nacimiento y en las cuatro atenciones (dos componentes compartidos). No se almacena una edad que quedaría desactualizada. La búsqueda y la reapertura de atenciones incluyen fecha de nacimiento; editar el texto del paciente limpia inmediatamente la selección y la edad.
- Doctor y paciente comparten una fila más compacta con edad; la fila se adapta a pantallas pequeñas.
- Contacto de emergencia: antes se enviaba pero el repositorio lo descartaba. Ahora crea, devuelve y actualiza `emergency_contacts` en transacción con el paciente. Usa el contacto activo principal o, si no hay uno marcado principal, el primer activo; no sobrescribe otros contactos. Omitir `emergencyContact` en PATCH conserva los datos; enviar null o todos sus campos vacíos desactiva el contacto seleccionado. Agregar un contacto exige nombre, parentesco y teléfono; el paciente puede guardarse sin contacto.
- Teléfono, correo y dirección del paciente vuelven a ser opcionales, de acuerdo con el formulario y Beta.
- Notas adicionales del paciente se guardan y recuperan; antes se descartaban.
- Fecha de nacimiento se escribe como fecha de calendario, sin conversión de zona horaria. La prueba con MySQL detectó que el flujo anterior podía guardar el día anterior; se corrigió usando el modo string del tipo SQL DATE, manteniendo conversiones explícitas para los contratos antiguos y consentimientos.
- Quirófano usa fecha y hora completas en inicio/fin, serializa un instante explícito y recupera su representación local al editar. Antes los controles `time` enviaban `HH:mm`, incompatible con `timestamp`. Fecha de egreso se vuelve a presentar como `YYYY-MM-DD` al editar.

## SQL necesario antes de ejecutar el backend actualizado

Para ejecucion manual **en la base tenant con la estructura nueva**, usar `reports/sql/patient_form_parity_workbench.sql`. Seleccionar primero la base tenant correcta en Workbench y ejecutar el archivo completo. Es aditivo y repetible: consulta `information_schema` antes de agregar cada columna.

El archivo `drizzle/tenant/0002_patient_form_parity.sql` queda reservado al migrador Drizzle: sus separadores `--> statement-breakpoint` no son comentarios SQL validos para MySQL. La version para Workbench omite esos separadores y agrega consultas de verificacion. Si se ejecuta manualmente, Drizzle puede registrar su migracion despues sin duplicar columnas.

| Tabla | Columna nueva | Definición |
| --- | --- | --- |
| patients | identification_type | varchar(30) NOT NULL DEFAULT 'identidad' |
| patients | notes | text NULL |

`patients.identification` ya permite 50 caracteres: no necesita ampliarse para residencia de 19. `emergency_contacts` ya tiene todas las columnas necesarias. Los registros existentes reciben el valor predeterminado identidad; el script no puede determinar si un número antiguo corresponde a pasaporte o residencia. Revisar/clasificar esos casos manualmente: el dump nuevo no conserva el tipo anterior. El script tampoco recupera notas/contactos descartados previamente por la aplicación.

Verificación posterior, desde la base seleccionada:

```sql
SELECT DATABASE();
SHOW COLUMNS FROM patients WHERE Field IN ('identification', 'identification_type', 'notes');
SELECT id, identification, identification_type
FROM patients
WHERE deleted_at IS NULL AND identification IS NOT NULL
  AND identification_type = 'identidad'
  AND identification NOT REGEXP '^[0-9]{13}$';
SELECT patient_id, name, relationship, phone, email, address, is_primary, is_active
FROM emergency_contacts WHERE deleted_at IS NULL;
```

## Campos clínicos de Beta y equivalentes nuevos

Los cinco campos estándar y los 23 campos de módulos de Beta tienen columnas en el dump nuevo. La implementación actual los guarda y lee mediante `DrizzleExpedienteRepository`; no necesitan columnas adicionales. Beta los almacenaba con nombres españoles en historia y reconstruía el expediente; la nueva estructura los separa en `medical_records`. Los datos históricos que no se hayan migrado a esta tabla requieren una migración de datos aparte; que exista la columna no demuestra que se haya copiado su contenido.

| Control / dato | Columna de medical_records |
| --- | --- |
| chiefComplaint / motivo de consulta | chief_complaint |
| currentIllness / padecimiento actual | current_illness |
| physicalExam / exploración física | physical_exam |
| allergies / alergias | allergies |
| currentMeds / medicamentos actuales | current_medications |
| followUpPlan / plan de seguimiento | follow_up_plan |
| referrals / referencias e interconsultas | referrals |
| triageLevel | triage_level |
| arrivalMode | arrival_mode |
| painScale | pain_scale |
| glasgow | glasgow_score |
| disposition / destino al egreso de emergencia | disposition |
| injuryMechanism | injury_mechanism |
| preOpDiagnosis | preoperative_diagnosis |
| postOpDiagnosis | postoperative_diagnosis |
| procedure | procedure_name |
| anesthesiaType | anesthesia_type |
| surgeryStart | surgery_started_at |
| surgeryEnd | surgery_ended_at |
| findings | findings |
| complications | complications |
| admissionDiagnosis | admission_diagnosis |
| admissionReason | admission_reason |
| service | service_name |
| bed | bed_label |
| evolutionSummary | evolution_summary |
| dischargePlan | discharge_plan |
| dischargeDate | discharged_at |

| Otros controles de las cuatro atenciones | Tabla y columna |
| --- | --- |
| doctor, patient, date | clinical_encounters.staff_member_id, patient_id, occurred_at / last_visit_at |
| diagnosis, treatment, notes | clinical_encounters.diagnosis, treatment, notes |
| pathologicalHst, familyHst, surgicalHst, backgroundHst | clinical_encounters.pathological_history, family_history, surgical_history, habits_history |
| pressure, temperature, height, weight | encounter_vitals.blood_pressure, temperature, height, weight |
| glucometry, oxygenation | encounter_vitals.blood_glucose, oxygen_saturation |
| BMI, fatPercentage, visceralFat, ageAccordingToWeight | encounter_vitals.body_mass_index, body_fat_percent, visceral_fat, metabolic_age |
| stockItems | encounter_products.product_id, quantity (y movimientos de inventario) |

No se añaden columnas para la edad cronológica calculada ni para el texto de búsqueda del doctor/paciente. `metabolic_age` conserva el significado de edad según peso y es independiente de la edad cronológica.

## Validación

Pruebas automatizadas cubren formatos aceptados/rechazados, años cumplidos y cumpleaños, fechas quirúrgicas que cruzan medianoche, migración desde base vacía y desde estructura nueva existente, repetición del SQL, creación/edición/lectura del contacto, ausencia de duplicados, conservación en PATCH y rollback si falla el contacto. Se comprueba el recorrido de todos los campos del expediente, antecedentes y signos vitales en MySQL desechable, separado de la base local de la aplicación. El dump original permanece como fixture inmutable; las dos columnas adicionales se declaran explícitamente en la prueba de compatibilidad.

Resultado: 61 pruebas backend aprobadas, sin omisiones, incluyendo MySQL 8.0.46; 2 pruebas frontend de edad/fechas aprobadas; compilación Angular de producción aprobada. Registro backend: `patient-clinical-tests-2026-10-24.log`. Se probó también borrar las fechas del expediente al editar. No se ejecutó validación visual en navegador.
