-- MedIT - Consentimientos informados
-- Ejecutar manualmente en cada base de datos tenant, despues de crear
-- adjuntos_clinicos y adjuntos_clinicos_accesos.

CREATE TABLE IF NOT EXISTS consentimiento_plantillas (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consentimiento_plantillas_active (is_active, name),
  CONSTRAINT fk_consentimiento_plantilla_creador FOREIGN KEY (created_by) REFERENCES usuarios(UsuarioID)
);

CREATE TABLE IF NOT EXISTS consentimiento_plantilla_versiones (
  id INT NOT NULL AUTO_INCREMENT,
  plantilla_id INT NOT NULL,
  version_number INT NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_consentimiento_version (plantilla_id, version_number),
  CONSTRAINT fk_consentimiento_version_plantilla FOREIGN KEY (plantilla_id) REFERENCES consentimiento_plantillas(id),
  CONSTRAINT fk_consentimiento_version_creador FOREIGN KEY (created_by) REFERENCES usuarios(UsuarioID)
);

CREATE TABLE IF NOT EXISTS consentimiento_instancias (
  id INT NOT NULL AUTO_INCREMENT,
  template_id INT NOT NULL,
  template_version_id INT NOT NULL,
  template_name VARCHAR(160) NOT NULL,
  patient_id INT NOT NULL,
  record_id INT NOT NULL,
  doctor_id INT NOT NULL,
  status ENUM('printed','accepted') NOT NULL,
  acceptance_method ENUM('checkbox','drawn_signature','physical') NULL,
  signer_type ENUM('patient','guardian') NULL,
  signer_name VARCHAR(200) NULL,
  signer_identification VARCHAR(100) NULL,
  signer_relationship VARCHAR(100) NULL,
  signer_phone VARCHAR(50) NULL,
  attachment_id INT NULL,
  document_sha256 CHAR(64) NULL,
  snapshot_json JSON NOT NULL,
  created_by INT NOT NULL,
  accepted_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_consentimiento_instancia_record (record_id, status),
  KEY idx_consentimiento_instancia_patient (patient_id, created_at),
  KEY idx_consentimiento_instancia_attachment (attachment_id),
  CONSTRAINT fk_consentimiento_instancia_template FOREIGN KEY (template_id) REFERENCES consentimiento_plantillas(id),
  CONSTRAINT fk_consentimiento_instancia_version FOREIGN KEY (template_version_id) REFERENCES consentimiento_plantilla_versiones(id),
  CONSTRAINT fk_consentimiento_instancia_patient FOREIGN KEY (patient_id) REFERENCES pacientes(PacienteID),
  CONSTRAINT fk_consentimiento_instancia_record FOREIGN KEY (record_id) REFERENCES historia_medica(HistoriaID),
  CONSTRAINT fk_consentimiento_instancia_doctor FOREIGN KEY (doctor_id) REFERENCES personal(PersonalID),
  CONSTRAINT fk_consentimiento_instancia_attachment FOREIGN KEY (attachment_id) REFERENCES adjuntos_clinicos(id),
  CONSTRAINT fk_consentimiento_instancia_created_by FOREIGN KEY (created_by) REFERENCES usuarios(UsuarioID),
  CONSTRAINT fk_consentimiento_instancia_accepted_by FOREIGN KEY (accepted_by) REFERENCES usuarios(UsuarioID)
);
