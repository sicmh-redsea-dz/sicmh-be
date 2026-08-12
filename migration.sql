-- MedIT: citas (appointments) table
-- Run this once against your MySQL schema

CREATE TABLE IF NOT EXISTS citas (
  CitaID        INT            NOT NULL AUTO_INCREMENT,
  Titulo        VARCHAR(200)   NOT NULL,
  Descripcion   TEXT,
  Inicio        DATETIME       NOT NULL,
  Fin           DATETIME       NOT NULL,
  PersonalID    INT            NULL,
  PacienteID    INT            NULL,
  NombrePaciente VARCHAR(200)  NULL,
  RecursoTipo   ENUM('quirofano','cama') NULL,
  RecursoID     VARCHAR(50)    NULL,
  Tipo          ENUM('consulta','cirugia','hospitalizacion','seguimiento','otro') NOT NULL DEFAULT 'consulta',
  Estado        ENUM('pendiente','confirmada','cancelada','completada')           NOT NULL DEFAULT 'pendiente',
  Source        VARCHAR(50)    NOT NULL DEFAULT 'manual',
  ExternalId    VARCHAR(255)   NULL,
  Notas         TEXT           NULL,
  CreadoPor     INT            NULL,
  CreadoEn      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ActualizadoEn DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (CitaID),
  CONSTRAINT fk_citas_personal  FOREIGN KEY (PersonalID) REFERENCES personal(PersonalID)   ON DELETE SET NULL,
  CONSTRAINT fk_citas_paciente  FOREIGN KEY (PacienteID) REFERENCES pacientes(PacienteID)  ON DELETE SET NULL,
  CONSTRAINT fk_citas_usuario   FOREIGN KEY (CreadoPor)  REFERENCES usuarios(UsuarioID)    ON DELETE SET NULL
);

-- Run this to upgrade an existing citas table
ALTER TABLE citas ADD COLUMN IF NOT EXISTS NombrePaciente VARCHAR(200) NULL AFTER PacienteID;

-- MedIT: fix facturas.Estado column to support 'Anulado' status
-- The column was defined as an ENUM without 'Anulado', preventing invoice annulment.
-- This converts it to VARCHAR(20) to match schema.sql and allow all status values.
ALTER TABLE `facturas`
  MODIFY COLUMN `Estado` VARCHAR(20) NOT NULL DEFAULT 'Pendiente';

-- MedIT: adjuntos clínicos (per-tenant schema)
-- Files live in GCS (nubsmart-medit-clinical); these tables hold metadata + access audit.
-- Soft delete only (deleted_at) — no hard deletes anywhere in this feature.

CREATE TABLE IF NOT EXISTS adjuntos_clinicos (
  id              INT            NOT NULL AUTO_INCREMENT,
  patient_id      INT            NOT NULL,
  record_id       INT            NULL,
  label           VARCHAR(255)   NOT NULL,
  source          ENUM('in_app_camera','file_upload') NOT NULL,
  gcs_object_path VARCHAR(512)   NOT NULL,
  mime_type       VARCHAR(127)   NOT NULL,
  size_bytes      BIGINT UNSIGNED NOT NULL,
  uploaded_by     INT            NOT NULL,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME       NULL,
  PRIMARY KEY (id),
  KEY idx_adjuntos_clinicos_patient (patient_id, deleted_at),
  KEY idx_adjuntos_clinicos_record (record_id),
  CONSTRAINT fk_adjuntos_paciente FOREIGN KEY (patient_id) REFERENCES pacientes(PacienteID)
);

CREATE TABLE IF NOT EXISTS adjuntos_clinicos_accesos (
  id            INT          NOT NULL AUTO_INCREMENT,
  attachment_id INT          NOT NULL,
  accessed_by   INT          NOT NULL,
  accessed_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address    VARCHAR(45)  NULL,
  PRIMARY KEY (id),
  KEY idx_adjuntos_accesos_attachment (attachment_id, accessed_at),
  CONSTRAINT fk_adjuntos_accesos_adjunto FOREIGN KEY (attachment_id) REFERENCES adjuntos_clinicos(id)
);

-- Run these instead if the tables were already created with the English names:
-- RENAME TABLE clinical_attachments TO adjuntos_clinicos;
-- RENAME TABLE clinical_attachment_access_log TO adjuntos_clinicos_accesos;

-- MedIT: performance indexes for existing tenant databases (schema.sql already
-- has these for newly-provisioned tenants). Billing/invoice report and search
-- queries filter/sort on these columns without an index today.
ALTER TABLE `facturas` ADD INDEX `idx_facturas_active_fecha` (`IsActive`, `FechaFactura`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_estado` (`Estado`);
ALTER TABLE `pacientes` ADD INDEX `idx_pacientes_identificacion` (`Identificacion`);

-- MedIT: documentos y datos de contacto internacionales de pacientes.
ALTER TABLE `pacientes`
  ADD COLUMN IF NOT EXISTS `TipoIdentificacion` VARCHAR(30) NOT NULL DEFAULT 'identidad' AFTER `Direccion`,
  MODIFY COLUMN `Identificacion` VARCHAR(255) NULL,
  MODIFY COLUMN `Telefono` VARCHAR(50) NULL,
  MODIFY COLUMN `CorreoElectronico` VARCHAR(150) NULL;

ALTER TABLE `contacto_emergencia`
  MODIFY COLUMN `Telefono` VARCHAR(50) NOT NULL;
ALTER TABLE `historia_medica` ADD INDEX `idx_historia_medica_active_fecha` (`isActive`, `FechaVisita`);

-- MedIT: persistencia SQL de las secciones Historia clinica y Seguimiento.
-- Desde febrero de 2026 estos valores solo se guardaban temporalmente en
-- data/expedientes.json, por lo que no sobrevivian despliegues sin ese archivo.
ALTER TABLE `historia_medica`
  ADD COLUMN IF NOT EXISTS `MotivoConsulta` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `PadecimientoActual` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `ExploracionFisica` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `Alergias` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `MedicamentosActuales` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `PlanSeguimiento` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `ReferenciasInterconsultas` TEXT NULL;

-- MedIT: redefine fn_dashboard_stats to drop a dead redundant SELECT (the
-- first pacientes query used MONTH(PacienteID), which is nonsensical, and its
-- result was immediately discarded) and replace MONTH()/YEAR() comparisons
-- with sargable date-range comparisons that can use the indexes above.
DROP FUNCTION IF EXISTS fn_dashboard_stats;
DELIMITER $$
CREATE FUNCTION fn_dashboard_stats()
RETURNS JSON
READS SQL DATA
BEGIN
  DECLARE v_pac_actual   INT DEFAULT 0;
  DECLARE v_pac_ant      INT DEFAULT 0;
  DECLARE v_fac_actual   INT DEFAULT 0;
  DECLARE v_fac_ant      INT DEFAULT 0;
  DECLARE v_vis_actual   INT DEFAULT 0;
  DECLARE v_vis_ant      INT DEFAULT 0;
  DECLARE v_month_start      DATE DEFAULT DATE_FORMAT(CURDATE(), '%Y-%m-01');
  DECLARE v_prev_month_start DATE DEFAULT DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01');

  SELECT COUNT(*) INTO v_pac_actual FROM pacientes WHERE isActive = 1;
  SELECT COUNT(*) INTO v_pac_ant    FROM pacientes WHERE isActive = 1;

  SELECT COUNT(*) INTO v_fac_actual FROM facturas
    WHERE IsActive = 1 AND FechaFactura >= v_month_start AND FechaFactura < DATE_ADD(v_month_start, INTERVAL 1 MONTH);
  SELECT COUNT(*) INTO v_fac_ant FROM facturas
    WHERE IsActive = 1 AND FechaFactura >= v_prev_month_start AND FechaFactura < v_month_start;

  SELECT COUNT(*) INTO v_vis_actual FROM historia_medica
    WHERE isActive = 1 AND FechaVisita >= v_month_start AND FechaVisita < DATE_ADD(v_month_start, INTERVAL 1 MONTH);
  SELECT COUNT(*) INTO v_vis_ant FROM historia_medica
    WHERE isActive = 1 AND FechaVisita >= v_prev_month_start AND FechaVisita < v_month_start;

  RETURN JSON_OBJECT(
    'pacientes_actuales',  v_pac_actual,
    'pacientes_variacion', IF(v_pac_ant = 0, NULL, ROUND((v_pac_actual - v_pac_ant) * 100.0 / v_pac_ant, 1)),
    'facturas_actuales',   v_fac_actual,
    'facturas_variacion',  IF(v_fac_ant = 0, NULL, ROUND((v_fac_actual - v_fac_ant) * 100.0 / v_fac_ant, 1)),
    'visitas_actuales',    v_vis_actual,
    'visitas_variacion',   IF(v_vis_ant = 0, NULL, ROUND((v_vis_actual - v_vis_ant) * 100.0 / v_vis_ant, 1))
  );
END$$
DELIMITER ;
