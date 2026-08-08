-- ═══════════════════════════════════════════════════════════════════
-- MedIT — Complete Database Schema
-- Run against the target tenant schema
-- Order matters — FK dependencies are respected
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. roles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  RolID     INT          NOT NULL AUTO_INCREMENT,
  NombreRol VARCHAR(50)  NOT NULL,
  PRIMARY KEY (RolID),
  UNIQUE KEY uq_roles_nombre (NombreRol)
);

INSERT IGNORE INTO roles (RolID, NombreRol) VALUES
  (2, 'Doctor'),
  (3, 'Enfermera'),
  (4, 'Recepcionista'),
  (5, 'Asistente'),
  (6, 'Admin');

-- ── 2. usuarios ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  UsuarioID          INT           NOT NULL AUTO_INCREMENT,
  NombreUsuario      VARCHAR(100)  NOT NULL,
  CorreoElectronico  VARCHAR(150)  NOT NULL,
  ContrasenaHash     VARCHAR(255)  NULL,
  RolId              INT           NOT NULL,
  Activo             TINYINT(1)    NOT NULL DEFAULT 1,
  firebaseID         VARCHAR(128)  NOT NULL DEFAULT '',
  provider           VARCHAR(20)   NOT NULL DEFAULT 'conventional',
  access_token       TEXT          NULL,
  SessionVersion     INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (UsuarioID),
  UNIQUE KEY uq_usuarios_email    (CorreoElectronico),
  UNIQUE KEY uq_usuarios_firebase (firebaseID),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (RolId) REFERENCES roles (RolID)
);

-- ── 3. tipo_pago ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipo_pago (
  TipoPagoID  INT          NOT NULL AUTO_INCREMENT,
  Descripcion VARCHAR(50)  NOT NULL,
  PRIMARY KEY (TipoPagoID)
);

INSERT IGNORE INTO tipo_pago (TipoPagoID, Descripcion) VALUES
  (1, 'Efectivo'),
  (2, 'Tarjeta'),
  (3, 'Transferencia');

-- ── 4. servicios ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  ServicioID  INT           NOT NULL AUTO_INCREMENT,
  Nombre      VARCHAR(100)  NOT NULL,
  Descripcion TEXT          NULL,
  Precio      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (ServicioID)
);

-- ── 5. pacientes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
  PacienteID        INT           NOT NULL AUTO_INCREMENT,
  Nombre            VARCHAR(100)  NOT NULL,
  Apellido          VARCHAR(100)  NOT NULL,
  FechaNacimiento   DATE          NULL,
  Telefono          VARCHAR(20)   NULL,
  CorreoElectronico VARCHAR(150)  NULL,
  Direccion         VARCHAR(255)  NULL,
  Identificacion    VARCHAR(50)   NULL,
  Genero            VARCHAR(20)   NULL,
  isActive          TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (PacienteID),
  KEY idx_pacientes_identificacion (Identificacion)
);

-- ── 6. personal (staff / doctors) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS personal (
  PersonalID  INT           NOT NULL AUTO_INCREMENT,
  Nombre      VARCHAR(100)  NOT NULL,
  Apellido    VARCHAR(100)  NOT NULL,
  Especialidad VARCHAR(100) NULL,
  Cargo       VARCHAR(50)   NULL,
  Telefono    VARCHAR(20)   NULL,
  CorreoElectronico VARCHAR(150) NULL,
  Direccion   VARCHAR(255)  NULL,
  FechaContratacion DATE    NULL,
  GCalCalendarId VARCHAR(255) NULL,
  UsuarioID   INT           NULL,
  PRIMARY KEY (PersonalID),
  CONSTRAINT fk_personal_usuario FOREIGN KEY (UsuarioID) REFERENCES usuarios (UsuarioID) ON DELETE SET NULL
);

-- ── 7. Inventario ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Inventario (
  ProductoID        INT            NOT NULL AUTO_INCREMENT,
  NombreProducto    VARCHAR(150)   NOT NULL,
  Descripcion       TEXT           NULL,
  PrecioUnidad      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  Cantidad          INT            NOT NULL DEFAULT 0,
  NivelMinimoStock  INT            NOT NULL DEFAULT 0,
  PRIMARY KEY (ProductoID)
);

-- ── 8. Subinventario ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Subinventario (
  SubinventarioID  INT           NOT NULL AUTO_INCREMENT,
  Nombre           VARCHAR(100)  NOT NULL,
  Descripcion      TEXT          NULL,
  PRIMARY KEY (SubinventarioID)
);

-- ── 9. ExistenciasInventario ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ExistenciasInventario (
  SubinventarioID  INT  NOT NULL,
  ProductoID       INT  NOT NULL,
  Cantidad         INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (SubinventarioID, ProductoID),
  CONSTRAINT fk_exist_subinv FOREIGN KEY (SubinventarioID) REFERENCES Subinventario (SubinventarioID),
  CONSTRAINT fk_exist_prod   FOREIGN KEY (ProductoID)      REFERENCES Inventario    (ProductoID)
);

-- ── 10. facturas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturas (
  FacturaID            INT            NOT NULL AUTO_INCREMENT,
  PacienteID           INT            NULL,
  PersonalID           INT            NULL,
  FechaFactura         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Monto                DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  Estado               VARCHAR(20)    NOT NULL DEFAULT 'Pendiente',
  InvoiceNumber        VARCHAR(50)    NOT NULL,
  TipoPagoID           INT            NULL,
  IsActive             TINYINT(1)     NOT NULL DEFAULT 1,
  DescuentoElderly     DECIMAL(5,2)   NULL,
  CodigoPromocional    VARCHAR(50)    NULL,
  DescuentoPromocional DECIMAL(5,2)   NULL,
  AseguradoraID        INT            NULL,
  RTN                  VARCHAR(50)    NULL,
  CAI                  VARCHAR(50)    NULL,
  PRIMARY KEY (FacturaID),
  UNIQUE KEY uq_facturas_invoice (InvoiceNumber),
  KEY idx_facturas_active_fecha (IsActive, FechaFactura),
  KEY idx_facturas_estado (Estado),
  CONSTRAINT fk_facturas_paciente  FOREIGN KEY (PacienteID)  REFERENCES pacientes  (PacienteID)  ON DELETE SET NULL,
  CONSTRAINT fk_facturas_personal  FOREIGN KEY (PersonalID)  REFERENCES personal   (PersonalID)  ON DELETE SET NULL,
  CONSTRAINT fk_facturas_tipopago  FOREIGN KEY (TipoPagoID)  REFERENCES tipo_pago  (TipoPagoID)  ON DELETE SET NULL
);

-- ── 11. historia_medica (visits) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS historia_medica (
  HistoriaID       INT            NOT NULL AUTO_INCREMENT,
  PacienteID       INT            NULL,
  PersonalID       INT            NULL,
  FacturaID        INT            NULL,
  FechaVisita      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FechaUltimaVisita DATETIME      NULL,
  Diagnostico      TEXT           NULL,
  Tratamiento      TEXT           NULL,
  Notas            TEXT           NULL,
  Presion          VARCHAR(20)    NULL,
  Oxigenacion      DECIMAL(5,2)   NULL,
  Temperatura      DECIMAL(5,2)   NULL,
  Glucometria      DECIMAL(6,2)   NULL,
  Peso             DECIMAL(6,2)   NULL,
  Altura           DECIMAL(5,2)   NULL,
  IMC              DECIMAL(5,2)   NULL,
  PorcentajeGrasa  DECIMAL(5,2)   NULL,
  GrasaVisceral    DECIMAL(5,2)   NULL,
  EdadSegunPeso    INT            NULL,
  TipoVisita       ENUM('Consulta','Emergencia','Hospitalizacion','Quirofano') NOT NULL DEFAULT 'Consulta',
  isActive         TINYINT(1)     NOT NULL DEFAULT 1,
  Ant_Familiar     TEXT           NULL,
  Ant_Habito       TEXT           NULL,
  Ant_Patologico   TEXT           NULL,
  Ant_Quirurgico   TEXT           NULL,
  PRIMARY KEY (HistoriaID),
  KEY idx_historia_medica_active_fecha (isActive, FechaVisita),
  CONSTRAINT fk_hm_paciente FOREIGN KEY (PacienteID) REFERENCES pacientes      (PacienteID) ON DELETE SET NULL,
  CONSTRAINT fk_hm_personal FOREIGN KEY (PersonalID) REFERENCES personal       (PersonalID) ON DELETE SET NULL,
  CONSTRAINT fk_hm_factura  FOREIGN KEY (FacturaID)  REFERENCES facturas       (FacturaID)  ON DELETE SET NULL
);

-- ── 12. Inventario_HistoriaMedica ────────────────────────────────────
CREATE TABLE IF NOT EXISTS Inventario_HistoriaMedica (
  HistoriaMedicaID  INT  NOT NULL,
  InventarioID      INT  NOT NULL,
  CantidadUsada     INT  NOT NULL DEFAULT 1,
  PRIMARY KEY (HistoriaMedicaID, InventarioID),
  CONSTRAINT fk_ihm_historia   FOREIGN KEY (HistoriaMedicaID) REFERENCES historia_medica (HistoriaID)  ON DELETE CASCADE,
  CONSTRAINT fk_ihm_inventario FOREIGN KEY (InventarioID)     REFERENCES Inventario       (ProductoID) ON DELETE CASCADE
);

-- ── 13. Factura_Inventario ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Factura_Inventario (
  FacturaInventarioID  INT  NOT NULL AUTO_INCREMENT,
  FacturaID            INT  NOT NULL,
  ProductoID           INT  NOT NULL,
  Cantidad             INT  NOT NULL DEFAULT 1,
  PRIMARY KEY (FacturaInventarioID),
  CONSTRAINT fk_fi_factura    FOREIGN KEY (FacturaID)  REFERENCES facturas   (FacturaID)  ON DELETE CASCADE,
  CONSTRAINT fk_fi_inventario FOREIGN KEY (ProductoID) REFERENCES Inventario (ProductoID) ON DELETE CASCADE
);

-- ── 14. citas (appointments) ── NEW ──────────────────────────────────
CREATE TABLE IF NOT EXISTS citas (
  CitaID        INT            NOT NULL AUTO_INCREMENT,
  Titulo        VARCHAR(200)   NOT NULL,
  Descripcion   TEXT           NULL,
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
  INDEX idx_citas_inicio     (Inicio),
  INDEX idx_citas_personal   (PersonalID),
  CONSTRAINT fk_citas_personal FOREIGN KEY (PersonalID) REFERENCES personal  (PersonalID) ON DELETE SET NULL,
  CONSTRAINT fk_citas_paciente FOREIGN KEY (PacienteID) REFERENCES pacientes (PacienteID) ON DELETE SET NULL,
  CONSTRAINT fk_citas_usuario  FOREIGN KEY (CreadoPor)  REFERENCES usuarios  (UsuarioID)  ON DELETE SET NULL
);

-- ── 15. permiso_rol_overrides ── created at runtime by MysqlRolePermissionsRepository ──
CREATE TABLE IF NOT EXISTS permiso_rol_overrides (
  rol_key    VARCHAR(50)  NOT NULL PRIMARY KEY,
  grants     JSON         NOT NULL,
  revokes    JSON         NOT NULL,
  updated_at VARCHAR(30)  NOT NULL
);

-- ── 16. permiso_usuario_overrides ── created at runtime by MysqlUserPermissionsRepository ──
CREATE TABLE IF NOT EXISTS permiso_usuario_overrides (
  usuario_id INT          NOT NULL PRIMARY KEY,
  grants     JSON         NOT NULL,
  revokes    JSON         NOT NULL,
  updated_at VARCHAR(30)  NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Stored procedure: sp_mov_inventario
-- Called by inventory transfer feature
-- ═══════════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS sp_mov_inventario;
DELIMITER $$
CREATE PROCEDURE sp_mov_inventario(
  IN  p_tipo      VARCHAR(50),
  IN  p_productoId INT,
  IN  p_cantidad   INT,
  IN  p_fromLoc    INT,
  IN  p_toLoc      INT
)
BEGIN
  -- Deduct from source sub-inventory
  UPDATE ExistenciasInventario
    SET Cantidad = Cantidad - p_cantidad
  WHERE ProductoID = p_productoId AND SubinventarioID = p_fromLoc;

  -- Add to destination sub-inventory
  INSERT INTO ExistenciasInventario (SubinventarioID, ProductoID, Cantidad)
    VALUES (p_toLoc, p_productoId, p_cantidad)
  ON DUPLICATE KEY UPDATE Cantidad = Cantidad + p_cantidad;
END$$
DELIMITER ;

-- ═══════════════════════════════════════════════════════════════════
-- Function: fn_dashboard_stats
-- Called by the dashboard cards endpoint
-- ═══════════════════════════════════════════════════════════════════
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

  -- Patients: no created-at column to compare month-over-month against, so
  -- both counts are simply all active patients (variation is always 0%).
  SELECT COUNT(*) INTO v_pac_actual FROM pacientes WHERE isActive = 1;
  SELECT COUNT(*) INTO v_pac_ant    FROM pacientes WHERE isActive = 1;

  -- Invoices this month vs last month (sargable range comparisons instead of
  -- MONTH()/YEAR(), so this can use idx_facturas_active_fecha).
  SELECT COUNT(*) INTO v_fac_actual FROM facturas
    WHERE IsActive = 1 AND FechaFactura >= v_month_start AND FechaFactura < DATE_ADD(v_month_start, INTERVAL 1 MONTH);
  SELECT COUNT(*) INTO v_fac_ant FROM facturas
    WHERE IsActive = 1 AND FechaFactura >= v_prev_month_start AND FechaFactura < v_month_start;

  -- Visits this month vs last month (same sargable-range treatment).
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
