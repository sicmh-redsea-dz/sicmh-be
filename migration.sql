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
