-- ============================================================
-- MÓDULO 3: EMPLEADOS
-- Agregar a la base de datos restauranteweb
-- ============================================================

CREATE TABLE IF NOT EXISTS `cargo` (
  `id_cargo` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_cargo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `cargo` (`nombre`, `descripcion`) VALUES
('Administrador',   'Gestión general del restaurante'),
('Cajero',          'Manejo de caja y cobros'),
('Mozo',            'Atención a mesas'),
('Cocinero',        'Preparación de platos'),
('Ayudante Cocina', 'Apoyo en cocina'),
('Almacenero',      'Control de insumos y stock');

CREATE TABLE IF NOT EXISTS `empleado` (
  `id_empleado`    bigint NOT NULL AUTO_INCREMENT,
  `nombre`         varchar(100) NOT NULL,
  `apellido`       varchar(100) NOT NULL,
  `dni`            varchar(8) UNIQUE,
  `correo`         varchar(150) DEFAULT NULL,
  `telefono`       varchar(15) DEFAULT NULL,
  `turno`          varchar(20) DEFAULT 'DIA' COMMENT 'DIA | NOCHE',
  `tipo_contrato`  varchar(20) DEFAULT 'PLANILLA' COMMENT 'PLANILLA | EVENTUAL',
  `fecha_ingreso`  date DEFAULT NULL,
  `id_cargo`       bigint DEFAULT NULL,
  `estado`         int NOT NULL DEFAULT 1 COMMENT '1=activo 0=inactivo 2=eliminado',
  PRIMARY KEY (`id_empleado`),
  FOREIGN KEY (`id_cargo`) REFERENCES `cargo`(`id_cargo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `empleado` (`nombre`,`apellido`,`dni`,`correo`,`telefono`,`turno`,`tipo_contrato`,`fecha_ingreso`,`id_cargo`) VALUES
('Kevin',   'Quispe',   '12345678', 'kevin@lajama.com',   '999000111', 'DIA',   'PLANILLA', '2024-01-15', 1),
('María',   'Torres',   '23456789', 'maria@lajama.com',   '999000222', 'DIA',   'PLANILLA', '2024-01-15', 2),
('Carlos',  'Rojas',    '34567890', 'carlos@lajama.com',  '999000333', 'DIA',   'PLANILLA', '2024-02-01', 3),
('Ana',     'Castillo', '45678901', 'ana@lajama.com',     '999000444', 'DIA',   'PLANILLA', '2024-02-01', 4),
('Pedro',   'Mamani',   '56789012', 'pedro@lajama.com',   '999000555', 'NOCHE', 'EVENTUAL', '2024-03-01', 3),
('Luis',    'Flores',   '67890123', 'luis@lajama.com',    '999000666', 'NOCHE', 'EVENTUAL', '2024-03-01', 5);

-- Agregar opción Empleados al menú
INSERT INTO `opcion` (`nombre`, `ruta`) VALUES ('Empleados', '/empleados');

-- Darle acceso al perfil Administrador (id=1)
INSERT INTO `perfil_opcion` (`id_perfil`, `id_opcion`)
SELECT 1, id_opcion FROM opcion WHERE ruta = '/empleados';
