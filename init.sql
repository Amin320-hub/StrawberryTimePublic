CREATE DATABASE IF NOT EXISTS fichadordb;
USE fichadordb;

-- =============================================
-- TABLA: Admin
-- Los que gestionan el sistema (el jefe)
-- =============================================
CREATE TABLE IF NOT EXISTS Admin (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  cambiar_password TINYINT(1)  DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: Usuario (empleados)
-- Añadimos email y password para que puedan
-- iniciar sesión desde el móvil
-- =============================================
CREATE TABLE IF NOT EXISTS Usuario (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  dni             VARCHAR(20)  NOT NULL UNIQUE,
  nombre_completo VARCHAR(100) NOT NULL,
  puesto          VARCHAR(100),
  trabajando      TINYINT(1)   DEFAULT 0,
  email           VARCHAR(100) ,
  password_hash   VARCHAR(255),
  activo          TINYINT(1)   DEFAULT 1,
  cambiar_password TINYINT(1)  DEFAULT 1
);

-- =============================================
-- TABLA: Dispositivo
-- Vinculación móvil <-> empleado
-- Un móvil solo puede estar vinculado a un empleado
-- Para desvincular o vincular, el admin debe aprobar
-- =============================================
CREATE TABLE IF NOT EXISTS Dispositivo (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  dni_usuario      VARCHAR(20)  NOT NULL,
  device_id        VARCHAR(255) NOT NULL UNIQUE,
  estado           ENUM('pendiente', 'vinculado', 'revocado') DEFAULT 'pendiente',
  fecha_solicitud  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  fecha_aprobacion TIMESTAMP    NULL,
  aprobado_por     INT          NULL,
  FOREIGN KEY (dni_usuario)  REFERENCES Usuario(dni) ON UPDATE CASCADE,
  FOREIGN KEY (aprobado_por) REFERENCES Admin(id)
);

-- =============================================
-- TABLA: Jornada
-- Un registro por cada día de trabajo
-- =============================================
CREATE TABLE IF NOT EXISTS Jornada (
  id    INT  AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE
);

-- =============================================
-- TABLA: Usuario_Jornada
-- Relación entre empleado y día de trabajo
-- =============================================
CREATE TABLE IF NOT EXISTS Usuario_Jornada (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  dni_usuario VARCHAR(20) NOT NULL,
  id_jornada  INT         NOT NULL,
  FOREIGN KEY (dni_usuario) REFERENCES Usuario(dni) ON UPDATE CASCADE,
  FOREIGN KEY (id_jornada)  REFERENCES Jornada(id)
);

-- =============================================
-- TABLA: Intervalo_Jornada
-- Cada entrada/salida dentro de una jornada
-- (soporta turnos partidos y nocturnos)
-- =============================================
CREATE TABLE IF NOT EXISTS Intervalo_Jornada (
  id                  INT  AUTO_INCREMENT PRIMARY KEY,
  id_usuario_jornada  INT  NOT NULL,
  hora_entrada        TIME NOT NULL,
  hora_salida         TIME DEFAULT NULL,
  metodo_fichaje      ENUM('qr', 'manual', 'pc') DEFAULT 'pc',
  FOREIGN KEY (id_usuario_jornada) REFERENCES Usuario_Jornada(id)
);

-- =============================================
-- TABLA: Incidencia
-- El empleado reporta un problema
-- El admin puede responder y cambiar el estado
-- =============================================
CREATE TABLE IF NOT EXISTS Incidencia (
  id              INT  AUTO_INCREMENT PRIMARY KEY,
  dni_usuario     VARCHAR(20) NOT NULL,
  tipo            ENUM('retraso', 'ausencia', 'problema_tecnico', 'modificacion_horas', 'otro') NOT NULL,
  descripcion     TEXT        NOT NULL,
  fecha           DATE        NOT NULL,
  estado          ENUM('pendiente', 'revisada', 'resuelta') DEFAULT 'pendiente',
  respuesta_admin TEXT        NULL,
  respondido_por  INT         NULL,
  created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dni_usuario)    REFERENCES Usuario(dni) ON UPDATE CASCADE,
  FOREIGN KEY (respondido_por) REFERENCES Admin(id)
);

-- =============================================
-- TABLA: Modificacion_Horas
-- Queda constancia de CADA cambio en las horas
-- Solo INSERT permitido — nunca se puede editar ni borrar
-- El admin DEBE indicar el motivo
-- El empleado puede ver que le han tocado sus horas
-- =============================================
CREATE TABLE IF NOT EXISTS Modificacion_Horas (
  id                   INT  AUTO_INCREMENT PRIMARY KEY,
  id_intervalo         INT  NOT NULL,
  admin_id             INT  NOT NULL,
  hora_entrada_antes   TIME,
  hora_salida_antes    TIME,
  hora_entrada_despues TIME,
  hora_salida_despues  TIME,
  motivo               TEXT NOT NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_intervalo) REFERENCES Intervalo_Jornada(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id)     REFERENCES Admin(id)
);

-- =============================================
-- TABLA: Auditoria
-- Log general de TODO lo que ocurre en el sistema
-- Login, fichajes, borrados, cambios de estado...
-- Solo INSERT permitido — nunca se puede editar ni borrar
-- =============================================
CREATE TABLE IF NOT EXISTS Auditoria (
  id         INT  AUTO_INCREMENT PRIMARY KEY,
  actor_tipo ENUM('admin', 'empleado', 'sistema') NOT NULL,
  actor_id   VARCHAR(100) NOT NULL,
  accion     VARCHAR(100) NOT NULL,
  detalle    TEXT,
  ip         VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: Configuracion
-- Ajustes del sistema editables desde el dashboard
-- Clave-valor: smtp_host, smtp_port, smtp_user, smtp_pass, email_destino
-- =============================================
CREATE TABLE IF NOT EXISTS Configuracion (
  clave      VARCHAR(50)  PRIMARY KEY,
  valor      TEXT,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Valores por defecto vacíos — el admin los rellena desde el dashboard
INSERT IGNORE INTO Configuracion (clave, valor) VALUES
  ('smtp_host',      ''),
  ('smtp_port',      '587'),
  ('smtp_user',      ''),
  ('smtp_pass',      ''),
  ('email_destino',  ''),
  ('server_url',     '');

-- =============================================
-- TABLA: Turno
-- Horario previsto que el admin asigna a cada empleado
-- Un turno por empleado por dia (UNIQUE dni_usuario + fecha)
-- =============================================
CREATE TABLE IF NOT EXISTS Turno (
  id          INT  AUTO_INCREMENT PRIMARY KEY,
  dni_usuario VARCHAR(20) NOT NULL,
  fecha       DATE        NOT NULL,
  hora_inicio TIME        NOT NULL,
  hora_fin    TIME        NOT NULL,
  admin_id    INT         NOT NULL,
  created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dni_usuario) REFERENCES Usuario(dni) ON UPDATE CASCADE,
  FOREIGN KEY (admin_id)    REFERENCES Admin(id),
  KEY idx_turno (dni_usuario, fecha)
);

-- =============================================
-- TABLA: Puesto
-- Puestos de trabajo gestionados por el admin
-- =============================================
CREATE TABLE IF NOT EXISTS Puesto (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

INSERT IGNORE INTO Puesto (nombre) VALUES ('Camarero'), ('Cocinero'), ('Limpiador'), ('Gerente');

-- =============================================
-- TRIGGERS - Auditoría automática a nivel de BD
-- Se ejecutan directamente en MySQL aunque alguien
-- acceda sin pasar por la API
-- =============================================
DELIMITER $$

-- Detecta cualquier modificación en Intervalo_Jornada
-- y guarda los valores anteriores y nuevos automáticamente
CREATE TRIGGER after_update_intervalo
AFTER UPDATE ON Intervalo_Jornada
FOR EACH ROW
BEGIN
  INSERT INTO Auditoria (actor_tipo, actor_id, accion, detalle)
  VALUES (
    'sistema',
    'trigger',
    'modificacion_intervalo',
    CONCAT(
      '{"id":', OLD.id,
      ',"entrada_antes":"', IFNULL(OLD.hora_entrada, ''), '"',
      ',"salida_antes":"',  IFNULL(OLD.hora_salida, ''),  '"',
      ',"entrada_despues":"', IFNULL(NEW.hora_entrada, ''), '"',
      ',"salida_despues":"',  IFNULL(NEW.hora_salida, ''),  '"}'
    )
  );
END$$

-- Detecta cuando se elimina un empleado
CREATE TRIGGER after_delete_usuario
AFTER DELETE ON Usuario
FOR EACH ROW
BEGIN
  INSERT INTO Auditoria (actor_tipo, actor_id, accion, detalle)
  VALUES (
    'sistema',
    'trigger',
    'eliminar_usuario',
    CONCAT('{"dni":"', OLD.dni, '","nombre":"', OLD.nombre_completo, '"}')
  );
END$$

-- Detecta cuando se elimina un intervalo de jornada
CREATE TRIGGER after_delete_intervalo
AFTER DELETE ON Intervalo_Jornada
FOR EACH ROW
BEGIN
  INSERT INTO Auditoria (actor_tipo, actor_id, accion, detalle)
  VALUES (
    'sistema',
    'trigger',
    'eliminar_intervalo',
    CONCAT(
      '{"id":', OLD.id,
      ',"entrada":"', IFNULL(OLD.hora_entrada, ''), '"',
      ',"salida":"',  IFNULL(OLD.hora_salida, ''),  '"}'
    )
  );
END$$

DELIMITER ;

-- =============================================
-- PERMISOS - Usuario limitado para la app
-- El backend Node.js usa "fichador_app", NO root
-- Así aunque hackeen la API, no pueden borrar auditoría
-- =============================================
CREATE USER IF NOT EXISTS 'fichador_app'@'%' IDENTIFIED BY 'pon_aqui_la_contrasena_de_la_app';

-- Permisos normales en tablas operativas
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Usuario            TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Usuario_Jornada    TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Intervalo_Jornada  TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Jornada            TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Incidencia         TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Dispositivo        TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE         ON fichadordb.Admin              TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE         ON fichadordb.Configuracion      TO 'fichador_app'@'%';

-- Tablas de auditoría: SOLO lectura e inserción
-- Nunca se pueden modificar ni borrar los registros
GRANT SELECT, INSERT ON fichadordb.Auditoria          TO 'fichador_app'@'%';
GRANT SELECT, INSERT ON fichadordb.Modificacion_Horas TO 'fichador_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fichadordb.Turno   TO 'fichador_app'@'%';
GRANT SELECT, INSERT, DELETE         ON fichadordb.Puesto  TO 'fichador_app'@'%';

FLUSH PRIVILEGES;
