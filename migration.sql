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
ALTER TABLE `cami-vime`.`facturas`
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
