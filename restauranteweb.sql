-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 22, 2026 at 12:10 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `restauranteweb`
--

-- --------------------------------------------------------

--
-- Table structure for table `auditoria_anulaciones`
--

CREATE TABLE `auditoria_anulaciones` (
  `id` bigint(20) NOT NULL,
  `fecha_registro` datetime(6) DEFAULT NULL,
  `generar_nuevo_comprobante` bit(1) NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `sustento` text DEFAULT NULL,
  `tipo_nota` varchar(255) NOT NULL,
  `pedido_id` bigint(20) NOT NULL,
  `comprobante_nota_numero` varchar(255) DEFAULT NULL,
  `monto_afectado` double DEFAULT NULL,
  `nota_pdf_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `caja_serie`
--

CREATE TABLE `caja_serie` (
  `id` bigint(20) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `ultimo_correlativo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `caja_serie`
--

INSERT INTO `caja_serie` (`id`, `serie`, `ultimo_correlativo`) VALUES
(1, 'AC01', 0);

-- --------------------------------------------------------

--
-- Table structure for table `cargo`
--

CREATE TABLE `cargo` (
  `id_cargo` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cargo`
--

INSERT INTO `cargo` (`id_cargo`, `descripcion`, `estado`, `nombre`) VALUES
(1, 'Cocina de comida fría', 1, 'Cocinero frío'),
(2, 'Cocina de comida caliente', 1, 'Cocinero caliente'),
(3, 'Repartidores de productos', 1, 'Repartidor'),
(4, 'Apoyo en platos', 1, 'Mesero'),
(5, 'Apoyo en cuentas', 1, 'Cajero'),
(7, 'Gestión integral de contabilidad, supervisión de comprobantes y control absoluto de anulaciones.', 1, 'Contador');

-- --------------------------------------------------------

--
-- Table structure for table `categoria`
--

CREATE TABLE `categoria` (
  `id` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categoria`
--

INSERT INTO `categoria` (`id`, `descripcion`, `estado`, `nombre`) VALUES
(1, 'Entradas, ensaladas y platos frescos (Ceviches, Causas)', 1, 'COCINA FRÍA'),
(2, 'Platos de fondo, frituras y guisos (Lomo Saltado, Ají de Gallina)', 1, 'COCINA CALIENTE');

-- --------------------------------------------------------

--
-- Table structure for table `cierre_caja_serie`
--

CREATE TABLE `cierre_caja_serie` (
  `id` bigint(20) NOT NULL,
  `serie` varchar(10) NOT NULL,
  `ultimo_correlativo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cierre_caja_serie`
--

INSERT INTO `cierre_caja_serie` (`id`, `serie`, `ultimo_correlativo`) VALUES
(1, 'CC01', 0);

-- --------------------------------------------------------

--
-- Table structure for table `comprobante_serie`
--

CREATE TABLE `comprobante_serie` (
  `id` bigint(20) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `tipo_comprobante` varchar(255) NOT NULL,
  `ultimo_correlativo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comprobante_serie`
--

INSERT INTO `comprobante_serie` (`id`, `serie`, `tipo_comprobante`, `ultimo_correlativo`) VALUES
(1, 'B001', 'BOLETA', 1),
(2, 'F001', 'FACTURA', 1),
(5, 'BC01', 'BC01', 1),
(6, 'FC01', 'FC01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `empleado`
--

CREATE TABLE `empleado` (
  `id_empleado` bigint(20) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `dni` varchar(8) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `turno` varchar(20) DEFAULT NULL,
  `id_cargo` bigint(20) DEFAULT NULL,
  `id_usuario` bigint(20) DEFAULT NULL,
  `tipo_contrato` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `empleado`
--

INSERT INTO `empleado` (`id_empleado`, `apellido`, `dni`, `estado`, `fecha_ingreso`, `nombre`, `telefono`, `turno`, `id_cargo`, `id_usuario`, `tipo_contrato`) VALUES
(13, 'Apellido', '12345678', 1, '2026-06-03', 'Nombre', '987654321', 'DIA', 3, 19, NULL),
(14, 'Apellido', '23456789', 1, '2026-06-04', 'Nombre', '973860761', 'DIA', 1, 11, NULL),
(15, 'Apellido', '34567890', 1, '2026-06-13', 'Nombre', '973860761', 'DIA', 2, 12, NULL),
(16, 'Apellido', '45678901', 1, '2026-06-01', 'Nombre', '973860761', 'DIA', 4, 13, NULL),
(17, 'Apellido', '56789012', 1, '2026-06-09', 'Nombre', '973860761', 'DIA', 5, 17, NULL),
(18, 'Apellido', '13579246', 1, '2026-06-22', 'Nombre', '999000111', 'DIA', 7, 20, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `insumo`
--

CREATE TABLE `insumo` (
  `id` bigint(20) NOT NULL,
  `estado` int(11) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `stock_actual` double DEFAULT NULL,
  `stock_minimo` double DEFAULT NULL,
  `unidad_medida` varchar(255) DEFAULT NULL,
  `categoria` varchar(255) NOT NULL,
  `porciones_por_kg` double DEFAULT NULL,
  `stock_comprometido` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `insumo`
--

INSERT INTO `insumo` (`id`, `estado`, `nombre`, `stock_actual`, `stock_minimo`, `unidad_medida`, `categoria`, `porciones_por_kg`, `stock_comprometido`) VALUES
(1, 1, 'Carne', 11, 5, 'Kg', 'PROTEINA', 3, 0),
(2, 1, 'Arróz', 3, 5, 'Und', 'VERDURA', NULL, 0),
(3, 1, 'Papa', 6, 10, 'Und', 'VERDURA', NULL, 0),
(5, 1, 'Pescado blanco', 40, 5, 'Kg', 'PROTEINA', 4, 0),
(6, 1, 'Pollo', 15, 5, 'Kg', 'PROTEINA', 4, 0),
(10, 1, 'Mariscos', 32, 10, 'Kg', 'PROTEINA', 6, NULL),
(12, 1, 'Camote', 4, 10, 'Und', 'VERDURA', NULL, NULL),
(14, 1, 'Choclo', 2, 4, 'Und', 'VERDURA', NULL, NULL),
(15, 1, 'Cebolla', 2, 3, 'Und', 'VERDURA', NULL, NULL),
(16, 1, 'Tomate', 1, 2, 'Und', 'VERDURA', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `insumo_producto`
--

CREATE TABLE `insumo_producto` (
  `id` bigint(20) NOT NULL,
  `cantidad_usada` double NOT NULL,
  `id_insumo` bigint(20) DEFAULT NULL,
  `id_producto` bigint(20) DEFAULT NULL,
  `stock_actual` double DEFAULT NULL,
  `stock_comprometido` double DEFAULT NULL,
  `stock_disponible` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `insumo_producto`
--

INSERT INTO `insumo_producto` (`id`, `cantidad_usada`, `id_insumo`, `id_producto`, `stock_actual`, `stock_comprometido`, `stock_disponible`) VALUES
(16, 1, 6, 23, NULL, NULL, NULL),
(17, 1, 2, 23, NULL, NULL, NULL),
(18, 1, 3, 23, NULL, NULL, NULL),
(22, 1, 5, 25, NULL, NULL, NULL),
(23, 1, 3, 25, NULL, NULL, NULL),
(45, 1, 1, 22, NULL, NULL, NULL),
(46, 1, 2, 22, NULL, NULL, NULL),
(47, 1, 3, 22, NULL, NULL, NULL),
(48, 1, 6, 24, NULL, NULL, NULL),
(49, 1, 2, 24, NULL, NULL, NULL),
(50, 1, 3, 24, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `lote_insumo`
--

CREATE TABLE `lote_insumo` (
  `id` bigint(20) NOT NULL,
  `id_insumo` bigint(20) NOT NULL,
  `fecha_compra` datetime NOT NULL,
  `kg_comprados` double NOT NULL,
  `costo_total` double DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  `porciones_por_kg` double NOT NULL,
  `saldo_kg` double NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lote_insumo`
--

INSERT INTO `lote_insumo` (`id`, `id_insumo`, `fecha_compra`, `kg_comprados`, `costo_total`, `observacion`, `porciones_por_kg`, `saldo_kg`) VALUES
(1, 1, '2026-06-13 07:56:34', 10, 120, 'Comprado', 4, 0),
(2, 1, '2026-06-13 08:02:06', 3, 60, '', 3, 0),
(3, 1, '2026-06-14 22:04:08', 10, 100, '', 4, 0),
(4, 5, '2026-06-14 22:12:25', 10, 100, '', 4, 0),
(5, 6, '2026-06-14 22:12:39', 10, 100, '', 3, 0),
(6, 6, '2026-06-20 17:32:44', 10, 100, '', 4, 0),
(8, 1, '2026-06-21 23:26:34', 4, 100, '', 10, 0),
(9, 1, '2026-07-11 12:23:49', 8, 70, '', 3, 0),
(10, 5, '2026-07-11 12:24:42', 10, 100, '', 4, 0),
(11, 6, '2026-07-11 12:25:17', 6, 80, '', 4, 0),
(12, 10, '2026-07-12 18:34:45', 5, 120, '', 6, 0);

-- --------------------------------------------------------

--
-- Table structure for table `mesa`
--

CREATE TABLE `mesa` (
  `id` bigint(20) NOT NULL,
  `estado` varchar(20) DEFAULT NULL,
  `numero` int(11) NOT NULL,
  `id_mesa_padre` bigint(20) DEFAULT NULL,
  `es_extra_repuesto` bit(1) NOT NULL,
  `en_reserva` bit(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mesa`
--

INSERT INTO `mesa` (`id`, `estado`, `numero`, `id_mesa_padre`, `es_extra_repuesto`, `en_reserva`) VALUES
(1, 'DISPONIBLE', 1, NULL, b'0', b'0'),
(2, 'DISPONIBLE', 2, NULL, b'0', b'0'),
(3, 'DISPONIBLE', 3, NULL, b'0', b'0'),
(4, 'DISPONIBLE', 4, NULL, b'0', b'0'),
(5, 'DISPONIBLE', 5, NULL, b'0', b'0'),
(6, 'DISPONIBLE', 6, NULL, b'0', b'0'),
(7, 'DISPONIBLE', 7, NULL, b'0', b'0'),
(8, 'DISPONIBLE', 8, NULL, b'0', b'0'),
(9, 'DISPONIBLE', 9, NULL, b'0', b'0'),
(10, 'DISPONIBLE', 10, NULL, b'0', b'0'),
(11, 'DISPONIBLE', 11, NULL, b'0', b'0'),
(12, 'DISPONIBLE', 12, NULL, b'0', b'0'),
(13, 'DISPONIBLE', 13, NULL, b'0', b'0'),
(14, 'DISPONIBLE', 14, NULL, b'0', b'0'),
(15, 'DISPONIBLE', 15, NULL, b'0', b'0'),
(16, 'DISPONIBLE', 16, NULL, b'0', b'0'),
(17, 'DISPONIBLE', 17, NULL, b'0', b'0'),
(18, 'DISPONIBLE', 18, NULL, b'0', b'0'),
(19, 'DISPONIBLE', 19, NULL, b'0', b'0'),
(20, 'DISPONIBLE', 20, NULL, b'0', b'0'),
(21, 'DISPONIBLE', 21, NULL, b'0', b'0'),
(22, 'DISPONIBLE', 22, NULL, b'0', b'0'),
(23, 'DISPONIBLE', 23, NULL, b'0', b'0'),
(24, 'DISPONIBLE', 24, NULL, b'0', b'0'),
(25, 'DISPONIBLE', 25, NULL, b'0', b'0'),
(26, 'DISPONIBLE', 26, NULL, b'0', b'0'),
(27, 'DISPONIBLE', 27, NULL, b'0', b'0'),
(28, 'DISPONIBLE', 28, NULL, b'0', b'0'),
(29, 'DISPONIBLE', 29, NULL, b'0', b'0'),
(30, 'DISPONIBLE', 30, NULL, b'0', b'0');

-- --------------------------------------------------------

--
-- Table structure for table `movimiento_caja`
--

CREATE TABLE `movimiento_caja` (
  `id` bigint(20) NOT NULL,
  `comprobante` varchar(50) DEFAULT NULL,
  `concepto` varchar(200) NOT NULL,
  `fecha` datetime(6) NOT NULL,
  `monto` double NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `id_turno` bigint(20) DEFAULT NULL,
  `metodo_pago` enum('EFECTIVO','PLIN','TARJETA','YAPE') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `movimiento_insumo`
--

CREATE TABLE `movimiento_insumo` (
  `id` bigint(20) NOT NULL,
  `cantidad` double DEFAULT NULL,
  `fecha` datetime(6) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `stock_resultante` double DEFAULT NULL,
  `tipo` varchar(255) DEFAULT NULL,
  `insumo_id` bigint(20) NOT NULL,
  `merma_kg` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `movimiento_porciones`
--

CREATE TABLE `movimiento_porciones` (
  `id` bigint(20) NOT NULL,
  `id_insumo` bigint(20) NOT NULL,
  `fecha` datetime NOT NULL,
  `tipo` varchar(255) NOT NULL,
  `cantidad_porciones` int(11) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `stock_resultante` int(11) NOT NULL,
  `merma_kg` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `movimiento_serie`
--

CREATE TABLE `movimiento_serie` (
  `id` bigint(20) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `ultimo_correlativo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `movimiento_serie`
--

INSERT INTO `movimiento_serie` (`id`, `serie`, `ultimo_correlativo`) VALUES
(1, 'MV01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `nota_venta_serie`
--

CREATE TABLE `nota_venta_serie` (
  `id` bigint(20) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `ultimo_correlativo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `nota_venta_serie`
--

INSERT INTO `nota_venta_serie` (`id`, `serie`, `ultimo_correlativo`) VALUES
(1, 'NV01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `notificaciones_sistema`
--

CREATE TABLE `notificaciones_sistema` (
  `id` bigint(20) NOT NULL,
  `destino_perfil` varchar(30) NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `leido` bit(1) NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `tipo` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `opcion`
--

CREATE TABLE `opcion` (
  `id_opcion` bigint(20) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `ruta` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `opcion`
--

INSERT INTO `opcion` (`id_opcion`, `nombre`, `ruta`) VALUES
(1, 'Dashboard', '/dashboard'),
(2, 'Usuarios', '/usuarios'),
(3, 'Perfiles', '/perfiles'),
(4, 'Empleados', '/empleados'),
(7, 'Control de Caja', '/admin/caja'),
(8, 'Cocina Caliente', '/admin/cocina/caliente'),
(9, 'Monitor Despacho', '/admin/despacho'),
(10, 'Cocina Fría', '/admin/cocina/fria'),
(11, 'Tomar Pedido', '/admin/mesero/nuevo'),
(12, 'Gestión de Productos', '/admin/productos'),
(13, 'Tomar Pedido (Delivery)', '/admin/caja/delivery/nuevo'),
(14, 'Insumos', '/insumos'),
(15, 'Pagos Digitales', '/admin/pagos-digitales'),
(16, 'Mi Perfil', '/admin/MiPerfil'),
(18, 'Reservas', '/admin/reservas'),
(19, 'Comprobantes', '/admin/comprobantes'),
(20, 'Mis Entregas', '/admin/entregas/mis-pedidos');

-- --------------------------------------------------------

--
-- Table structure for table `pago_digital`
--

CREATE TABLE `pago_digital` (
  `id` bigint(20) NOT NULL,
  `fecha_pago` datetime(6) DEFAULT NULL,
  `img_url` varchar(255) DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  `situacion` enum('ANULADO','APROBADO','PENDIENTE') DEFAULT NULL,
  `id_pedido` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pedido`
--

CREATE TABLE `pedido` (
  `id` bigint(20) NOT NULL,
  `cliente_nombre` varchar(255) NOT NULL,
  `direccion_entrega` varchar(255) NOT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_entrega` datetime(6) DEFAULT NULL,
  `fecha_salida` datetime(6) DEFAULT NULL,
  `latitud` double DEFAULT NULL,
  `longitud` double DEFAULT NULL,
  `monto_total` double DEFAULT NULL,
  `id_repartidor` bigint(20) DEFAULT NULL,
  `numero_mesa` int(11) DEFAULT NULL,
  `tipo_pedido` enum('SALON','DELIVERY','LLEVAR') DEFAULT 'SALON',
  `frio_listo` tinyint(1) DEFAULT 0,
  `caliente_listo` tinyint(1) DEFAULT 0,
  `comprobante_numero` varchar(30) DEFAULT NULL,
  `comprobante_tipo` varchar(20) DEFAULT NULL,
  `documento_cliente` varchar(15) DEFAULT NULL,
  `preferencia_comprobante` varchar(255) DEFAULT NULL,
  `comprobante_pdf_url` varchar(255) DEFAULT NULL,
  `comprobante_a4_url` varchar(255) DEFAULT NULL,
  `metodo_pago` enum('EFECTIVO','PLIN','TARJETA','YAPE') DEFAULT NULL,
  `cliente_correo` varchar(255) DEFAULT NULL,
  `codigo_pago_operacion` varchar(100) DEFAULT NULL,
  `comprobante_xml_contenido` longtext DEFAULT NULL,
  `comprobante_nota_numero` varchar(255) DEFAULT NULL,
  `nota_a4_url` varchar(255) DEFAULT NULL,
  `nota_pdf_url` varchar(255) DEFAULT NULL,
  `nota_xml_contenido` longtext DEFAULT NULL,
  `ticket_impreso_cocina` bit(1) NOT NULL,
  `id_turno_caja` bigint(20) DEFAULT NULL,
  `estado_pago` varchar(20) DEFAULT NULL,
  `comprobante_e_numero` varchar(30) DEFAULT NULL,
  `credito_nota_numero` varchar(30) DEFAULT NULL,
  `motivo_anulacion` varchar(500) DEFAULT NULL,
  `es_nota_venta` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pedido_detalle`
--

CREATE TABLE `pedido_detalle` (
  `id` bigint(20) NOT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `precio_unitario` double DEFAULT NULL,
  `subtotal` double DEFAULT NULL,
  `id_pedido` bigint(20) DEFAULT NULL,
  `id_producto` bigint(20) DEFAULT NULL,
  `cocinado` bit(1) NOT NULL,
  `entregado` bit(1) NOT NULL,
  `cancelado_por_cliente` bit(1) NOT NULL,
  `impreso_en_cocina` bit(1) NOT NULL,
  `pagado` bit(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `perfil`
--

CREATE TABLE `perfil` (
  `id_perfil` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `perfil`
--

INSERT INTO `perfil` (`id_perfil`, `descripcion`, `estado`, `nombre`) VALUES
(1, 'Control total sobre el sistema', 1, 'Administrador'),
(2, 'Solo tiene permiso al Dashboard', 1, 'Visitante'),
(3, 'Se le asignará el cargo dependiendo de su rol', 1, 'Empleado'),
(4, 'Acceso a caja, despacho, delivery y productos', 1, 'Cajero'),
(5, 'Acceso a mesas y toma de pedidos', 1, 'Mesero'),
(6, 'Acceso a cocina e insumos', 1, 'Cocinero frío'),
(7, 'Acceso a entregas propias', 1, 'Repartidor'),
(9, 'Super Administrador', 1, 'SUPER_ADMIN'),
(13, 'Acceso a cocina e insumos', 1, 'Cocinero Caliente'),
(14, 'Auditoría de facturación, acceso total a comprobantes, emisión de notas de crédito y anulaciones.', 1, 'Contador');

-- --------------------------------------------------------

--
-- Table structure for table `perfil_opcion`
--

CREATE TABLE `perfil_opcion` (
  `id_perfil` bigint(20) NOT NULL,
  `id_opcion` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `perfil_opcion`
--

INSERT INTO `perfil_opcion` (`id_perfil`, `id_opcion`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 7),
(1, 8),
(1, 9),
(1, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 15),
(1, 16),
(1, 18),
(1, 19),
(2, 1),
(3, 1),
(4, 7),
(4, 9),
(4, 12),
(4, 13),
(4, 15),
(4, 16),
(4, 18),
(4, 19),
(5, 11),
(5, 16),
(6, 10),
(6, 14),
(7, 20),
(9, 1),
(9, 2),
(9, 3),
(9, 4),
(9, 7),
(9, 8),
(9, 9),
(9, 10),
(9, 11),
(9, 12),
(9, 13),
(9, 14),
(9, 15),
(9, 16),
(9, 18),
(9, 19),
(9, 20),
(13, 8),
(13, 14),
(14, 16),
(14, 19);

-- --------------------------------------------------------

--
-- Table structure for table `produccion_porciones`
--

CREATE TABLE `produccion_porciones` (
  `id` bigint(20) NOT NULL,
  `id_lote` bigint(20) NOT NULL,
  `fecha_produccion` datetime NOT NULL,
  `kg_procesados` double NOT NULL,
  `porciones_esperadas` int(11) NOT NULL,
  `porciones_obtenidas` int(11) NOT NULL,
  `merma_kg` double DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `produccion_porciones`
--

INSERT INTO `produccion_porciones` (`id`, `id_lote`, `fecha_produccion`, `kg_procesados`, `porciones_esperadas`, `porciones_obtenidas`, `merma_kg`, `observacion`) VALUES
(1, 1, '2026-06-13 07:56:54', 5, 20, 22, 0.21, NULL),
(2, 1, '2026-06-13 08:01:43', 3, 12, 12, 0.1, NULL),
(3, 1, '2026-06-13 08:02:39', 2, 8, 8, 0, NULL),
(4, 2, '2026-06-14 01:33:23', 3, 9, 14, 0.1, NULL),
(5, 3, '2026-06-14 22:04:17', 10, 40, 40, 0.25, NULL),
(6, 4, '2026-06-14 22:12:33', 10, 40, 49, 0.2, NULL),
(7, 5, '2026-06-14 22:12:50', 10, 30, 33, 0.15, NULL),
(8, 6, '2026-06-20 17:32:54', 10, 40, 41, 0.21, NULL),
(10, 8, '2026-06-21 23:27:07', 4, 40, 40, 0.2, NULL),
(11, 9, '2026-07-11 12:24:17', 8, 24, 28, 0.21, NULL),
(12, 10, '2026-07-11 12:25:00', 10, 40, 41, 0.15, NULL),
(13, 11, '2026-07-11 12:25:34', 6, 24, 30, 0.14, NULL),
(14, 12, '2026-07-12 18:35:57', 5, 30, 32, 0.76, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `producto`
--

CREATE TABLE `producto` (
  `id` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `precio` double DEFAULT NULL,
  `stock` int(11) DEFAULT 0,
  `id_categoria` bigint(20) DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `producto`
--

INSERT INTO `producto` (`id`, `descripcion`, `estado`, `nombre`, `precio`, `stock`, `id_categoria`, `imagen`) VALUES
(22, 'Descripción', 1, 'Lomo saltado', 35, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781359603/lajama/productos/file_et36qv.jpg'),
(23, 'Descripción', 1, 'Causa Limeña', 20, NULL, 1, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781362245/lajama/productos/file_kq29eo.jpg'),
(24, 'Descripción', 1, 'Ají de Gallina', 20, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781492950/lajama/productos/file_k9aznj.webp'),
(25, 'Descripción', 1, 'Ceviche de Pescado', 30, NULL, 1, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781493015/lajama/productos/file_cyz6tw.webp'),
(26, 'Filete de pescado fresco cocinado a la parrilla.', 1, 'Filete de Pescado al Grill', 39, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1783898207/lajama/productos/file_e9oinv.jpg'),
(27, 'Filete de pescado cocido al vapor en sus propios jugos con vegetales.', 1, 'Filete de Pescado en Sudado', 39, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1783898282/lajama/productos/file_ln5tmr.jpg'),
(28, 'Ceviche clásico acompañado de langostinos frescos y tortita de choclo.', 1, 'Ceviche de Palabritas', 49, NULL, 1, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1783898356/lajama/productos/file_afhclh.jpg'),
(29, 'Conchas negras marinadas en limón con cebolla, ají y culantro.', 1, 'Ceviche de Conchas Negras', 28, NULL, 1, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1783898396/lajama/productos/file_fujgpz.jpg'),
(30, 'Masa de papa frita rellena con carne molida y huevo duro.', 1, 'Papa Rellena', 16, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1783898552/lajama/productos/file_dslfrf.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `reserva`
--

CREATE TABLE `reserva` (
  `id` bigint(20) NOT NULL,
  `cantidad_personas` int(11) DEFAULT NULL,
  `duracion_estimada_minutos` int(11) DEFAULT NULL,
  `estado` enum('CANCELADA','COMPLETADA','CONFIRMADA','EXPIRADA','LIBERADA','PENDIENTE') NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_hora_liberacion` datetime(6) DEFAULT NULL,
  `fecha_hora_reserva` datetime(6) NOT NULL,
  `mesas_asignadas` varchar(100) DEFAULT NULL,
  `minutos_gracia` int(11) DEFAULT NULL,
  `nombre_cliente` varchar(30) NOT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `numero_mesa` int(11) DEFAULT NULL,
  `numero_personas` int(11) NOT NULL,
  `observacion` varchar(150) DEFAULT NULL,
  `telefono` varchar(9) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `turno_caja`
--

CREATE TABLE `turno_caja` (
  `id` bigint(20) NOT NULL,
  `activo` bit(1) NOT NULL,
  `diferencia` double DEFAULT NULL,
  `fecha_apertura` datetime(6) NOT NULL,
  `fecha_cierre` datetime(6) DEFAULT NULL,
  `monto_apertura` double NOT NULL,
  `monto_cierre` double DEFAULT NULL,
  `observaciones` varchar(500) DEFAULT NULL,
  `total_vendido` double DEFAULT NULL,
  `tipo_turno` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `turno_caja`
--

INSERT INTO `turno_caja` (`id`, `activo`, `diferencia`, `fecha_apertura`, `fecha_cierre`, `monto_apertura`, `monto_cierre`, `observaciones`, `total_vendido`, `tipo_turno`) VALUES
(26, b'0', -605, '2026-07-11 00:03:56.000000', '2026-07-11 08:47:44.000000', 200, 550, 'test', 955, 'NOCHE'),
(27, b'0', -1100, '2026-07-11 08:47:47.000000', '2026-07-11 13:30:22.000000', 200, 310, 'test', 1210, 'DIA'),
(28, b'0', 0, '2026-07-11 13:30:25.000000', '2026-07-11 13:30:57.000000', 200, 200, 'test', 0, 'DIA'),
(29, b'0', -55, '2026-07-11 13:30:58.000000', '2026-07-11 13:32:36.000000', 200, 255, 'prueba', 110, 'DIA'),
(30, b'0', 0, '2026-07-11 13:32:38.000000', '2026-07-11 13:46:00.000000', 200, 235, 'test', 35, 'DIA'),
(31, b'0', -70, '2026-07-11 13:46:02.000000', '2026-07-11 18:30:28.000000', 200, 355, 'test', 225, 'DIA'),
(32, b'0', 50, '2026-07-11 19:43:58.000000', '2026-07-11 20:23:01.000000', 200, 355, 'test', 105, 'NOCHE'),
(33, b'0', -190, '2026-07-11 20:23:04.000000', '2026-07-12 08:05:01.000000', 200, 515, 'test', 505, 'NOCHE'),
(34, b'0', 0, '2026-07-12 08:05:04.000000', '2026-07-12 08:34:33.000000', 200, 200, 'asd', 0, 'DIA'),
(35, b'0', -60, '2026-07-12 08:34:35.000000', '2026-07-12 18:37:13.000000', 200, 295, 'test', 155, 'DIA'),
(36, b'0', 0, '2026-07-12 22:51:07.000000', '2026-07-13 03:28:10.000000', 200, 235, 'test', 70, 'NOCHE'),
(37, b'0', 80, '2026-07-13 03:28:15.000000', '2026-07-13 09:13:10.000000', 200, 240, 'test', 40, 'NOCHE'),
(38, b'0', -20, '2026-07-13 09:13:13.000000', '2026-07-14 14:12:51.000000', 200, 200, 'test', 20, 'DIA'),
(39, b'0', -140, '2026-07-14 14:12:52.000000', '2026-07-14 19:07:51.000000', 200, 380, 'asd', 320, 'DIA'),
(40, b'0', 0, '2026-07-14 19:07:54.000000', '2026-07-15 12:26:31.000000', 200, 200, 'test', 0, 'NOCHE'),
(41, b'0', -50, '2026-07-15 12:26:32.000000', '2026-07-15 20:23:35.000000', 200, 200, 'test', 50, 'DIA'),
(42, b'0', -40, '2026-07-19 19:13:49.000000', '2026-07-19 19:55:32.000000', 200, 295, 'test', 135, 'NOCHE'),
(43, b'0', -35, '2026-07-19 19:55:34.000000', '2026-07-19 20:01:23.000000', 200, 255, 'test', 90, 'NOCHE'),
(44, b'0', 0, '2026-07-19 20:01:52.000000', '2026-07-19 20:09:29.000000', 200, 235, 'test', 35, 'NOCHE'),
(45, b'1', NULL, '2026-07-19 20:09:31.000000', NULL, 200, NULL, NULL, NULL, 'NOCHE');

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` bigint(20) NOT NULL,
  `clave` varchar(255) NOT NULL,
  `correo` varchar(255) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `usuario` varchar(255) DEFAULT NULL,
  `id_perfil` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `clave`, `correo`, `estado`, `usuario`, `id_perfil`) VALUES
(9, '$2b$10$zC0eeCs/nt7LbDC5S4VLkeG2uzlZt6dNFCvXhO.t2MrO7S71Avkzq', 'superadmin@lajama.com', 1, 'superadmin', 9),
(11, '$2a$10$NYF/4ZILspZTRDfjlbQnbuLCwwboNXuVYRPBLZvR0TKb0I/1MAFme', 'cocineroF@gmail.com', 1, 'CocineroFrio', 6),
(12, '$2a$10$bZYGhRelMCRCEWMrPYp6WuogKBPoHFyF/jQp3.4VngarpozNjEee6', 'cocineroC@gmail.com', 1, 'CocineroCaliente', 13),
(13, '$2a$10$9WRmv4TwYoG4he9v8CV0ZeISJulWzDt.BFbeAwI/Hui8/qECzDlG.', 'mesero@gmail.com', 1, 'Mesero', 5),
(15, '$2a$10$UVNU5NDDfF5Fjrj0pxSsUuoiOnvUJ9LdQaVi5ZzPDFa/Xj3xnrRqq', 'repartidor@gmail.com', 2, 'Repartidor_DELETED_15', 7),
(17, '$2a$10$.CZyWKChQgzAEvg2GipC7eDTZess5qwcNLTFdpgR4qOFuzzQNhBuS', 'cajero@gmail.com', 1, 'Cajero', 4),
(18, '$2a$10$ZdTBoUHrlwkYLvLNxoiSAO2ptNqYOvAhGQV1lDb8hUW5GynfrNg3e', 'admin@gmail.com', 2, 'Admin_DELETED_18', 1),
(19, '$2a$10$Deerajx21uJ6qzYlq6txneENT5sPBZqBhqtnCoTRZt.f2zJStVYfy', 'repartidor@gmail.com', 1, 'Distribuidor', 7),
(20, '$2a$10$iBMQhTN3QPBTPBbUGbOfieOUT9Y5EdwYlqis4IvXhYomwYNpdmfE2', 'contador@gmail.com', 1, 'Contador', 14),
(21, '$2a$10$tydMQKFOS1IDbrrrDDE5b.QFjFmpCygJrz32j3tUbQOnk6PIEGD66', 'prueba@gmail.com', 2, 'test_DELETED_21', 2),
(22, '$2a$10$QDaLntekrEzx064mXncPxeGmwT3i6aKMtjjKtaqiMfBTvJ6BW3su.', 'admin1@gmail.com', 1, 'Admin', 1),
(23, '$2a$10$n2BQyVvWdrdSvSR77Nt/a.PT3CtjYUdbixD/eCP5RyRuDsjMo0C6a', 'admin2@gmail.com', 1, 'AdminDos', 1),
(25, '$2a$10$pgaNENfYBB0CmhackUtYiuxy9TDNt9/yue1UExAnk79g67guyMqqq', 'admin4@gmail.com', 1, 'AdminTres', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `auditoria_anulaciones`
--
ALTER TABLE `auditoria_anulaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK6q7mxhssoxrpe52fa8hstuy8b` (`pedido_id`);

--
-- Indexes for table `caja_serie`
--
ALTER TABLE `caja_serie`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK_caja_serie_prefijo` (`serie`);

--
-- Indexes for table `cargo`
--
ALTER TABLE `cargo`
  ADD PRIMARY KEY (`id_cargo`);

--
-- Indexes for table `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cierre_caja_serie`
--
ALTER TABLE `cierre_caja_serie`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `serie` (`serie`);

--
-- Indexes for table `comprobante_serie`
--
ALTER TABLE `comprobante_serie`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UKa3uvp0jmqkao75tfau7x13sgt` (`tipo_comprobante`);

--
-- Indexes for table `empleado`
--
ALTER TABLE `empleado`
  ADD PRIMARY KEY (`id_empleado`),
  ADD UNIQUE KEY `UKanilfn0t89ht43r8n8lthr5b6` (`dni`),
  ADD UNIQUE KEY `UKoilhxkgrskw3bxuw5i2aysgrc` (`id_usuario`),
  ADD KEY `FK739vkywoel8qoad30ovv9ksgl` (`id_cargo`);

--
-- Indexes for table `insumo`
--
ALTER TABLE `insumo`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `insumo_producto`
--
ALTER TABLE `insumo_producto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK1m7s6455hhg0w39wmj9qfpa3d` (`id_insumo`),
  ADD KEY `FK1imhbexswceljihnjivyiq7g5` (`id_producto`);

--
-- Indexes for table `lote_insumo`
--
ALTER TABLE `lote_insumo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_insumo_ibfk_1` (`id_insumo`);

--
-- Indexes for table `mesa`
--
ALTER TABLE `mesa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK6q6ujj74b9tsjam9709h5ctw6` (`id_mesa_padre`);

--
-- Indexes for table `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKlibk28e8rg0db9i8y80emdj1n` (`id_turno`);

--
-- Indexes for table `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKbd60v7l634wbw44rh49s1wh1b` (`insumo_id`);

--
-- Indexes for table `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `movimiento_porciones_ibfk_1` (`id_insumo`);

--
-- Indexes for table `movimiento_serie`
--
ALTER TABLE `movimiento_serie`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK_movimiento_serie_prefijo` (`serie`);

--
-- Indexes for table `nota_venta_serie`
--
ALTER TABLE `nota_venta_serie`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK73rly968awkv4igtv2cv1vj1x` (`serie`);

--
-- Indexes for table `notificaciones_sistema`
--
ALTER TABLE `notificaciones_sistema`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `opcion`
--
ALTER TABLE `opcion`
  ADD PRIMARY KEY (`id_opcion`);

--
-- Indexes for table `pago_digital`
--
ALTER TABLE `pago_digital`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKfotrrvqei3q76ww7blds97ymv` (`id_pedido`);

--
-- Indexes for table `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKfx0mpssl90lcsgec718ckavj` (`id_repartidor`),
  ADD KEY `FKntwl1o3ys8fjiychcs8chq6rj` (`id_turno_caja`);

--
-- Indexes for table `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKaxtxfsueb7pagpev7p4r4mbin` (`id_pedido`),
  ADD KEY `FK5c7wbc95t8gesgfyqgad8icuh` (`id_producto`);

--
-- Indexes for table `perfil`
--
ALTER TABLE `perfil`
  ADD PRIMARY KEY (`id_perfil`);

--
-- Indexes for table `perfil_opcion`
--
ALTER TABLE `perfil_opcion`
  ADD PRIMARY KEY (`id_perfil`,`id_opcion`),
  ADD KEY `FKbsl4tlnkj5cp6rqayuprdjsfu` (`id_opcion`);

--
-- Indexes for table `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `produccion_porciones_ibfk_1` (`id_lote`);

--
-- Indexes for table `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK9nyueixdsgbycfhf7allg8su` (`id_categoria`);

--
-- Indexes for table `reserva`
--
ALTER TABLE `reserva`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `turno_caja`
--
ALTER TABLE `turno_caja`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `FK131gkl0dt1966rsw6dmesnsxw` (`id_perfil`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `auditoria_anulaciones`
--
ALTER TABLE `auditoria_anulaciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `caja_serie`
--
ALTER TABLE `caja_serie`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `cargo`
--
ALTER TABLE `cargo`
  MODIFY `id_cargo` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `categoria`
--
ALTER TABLE `categoria`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `cierre_caja_serie`
--
ALTER TABLE `cierre_caja_serie`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `comprobante_serie`
--
ALTER TABLE `comprobante_serie`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `empleado`
--
ALTER TABLE `empleado`
  MODIFY `id_empleado` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `insumo`
--
ALTER TABLE `insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `insumo_producto`
--
ALTER TABLE `insumo_producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `lote_insumo`
--
ALTER TABLE `lote_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `mesa`
--
ALTER TABLE `mesa`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `movimiento_serie`
--
ALTER TABLE `movimiento_serie`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `nota_venta_serie`
--
ALTER TABLE `nota_venta_serie`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notificaciones_sistema`
--
ALTER TABLE `notificaciones_sistema`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `opcion`
--
ALTER TABLE `opcion`
  MODIFY `id_opcion` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `pago_digital`
--
ALTER TABLE `pago_digital`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `perfil`
--
ALTER TABLE `perfil`
  MODIFY `id_perfil` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `producto`
--
ALTER TABLE `producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `reserva`
--
ALTER TABLE `reserva`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `turno_caja`
--
ALTER TABLE `turno_caja`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `auditoria_anulaciones`
--
ALTER TABLE `auditoria_anulaciones`
  ADD CONSTRAINT `FK7f74gpdggwnrghtc6sadc7yrl` FOREIGN KEY (`pedido_id`) REFERENCES `pedido` (`id`);

--
-- Constraints for table `empleado`
--
ALTER TABLE `empleado`
  ADD CONSTRAINT `FK739vkywoel8qoad30ovv9ksgl` FOREIGN KEY (`id_cargo`) REFERENCES `cargo` (`id_cargo`),
  ADD CONSTRAINT `FKt7vdal63o7rdoojoy7ywhjesh` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Constraints for table `insumo_producto`
--
ALTER TABLE `insumo_producto`
  ADD CONSTRAINT `FK1imhbexswceljihnjivyiq7g5` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id`),
  ADD CONSTRAINT `FK1m7s6455hhg0w39wmj9qfpa3d` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`);

--
-- Constraints for table `lote_insumo`
--
ALTER TABLE `lote_insumo`
  ADD CONSTRAINT `lote_insumo_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `mesa`
--
ALTER TABLE `mesa`
  ADD CONSTRAINT `FK6q6ujj74b9tsjam9709h5ctw6` FOREIGN KEY (`id_mesa_padre`) REFERENCES `mesa` (`id`);

--
-- Constraints for table `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  ADD CONSTRAINT `FKlibk28e8rg0db9i8y80emdj1n` FOREIGN KEY (`id_turno`) REFERENCES `turno_caja` (`id`);

--
-- Constraints for table `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  ADD CONSTRAINT `FKbd60v7l634wbw44rh49s1wh1b` FOREIGN KEY (`insumo_id`) REFERENCES `insumo` (`id`);

--
-- Constraints for table `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  ADD CONSTRAINT `movimiento_porciones_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pago_digital`
--
ALTER TABLE `pago_digital`
  ADD CONSTRAINT `FKfotrrvqei3q76ww7blds97ymv` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id`);

--
-- Constraints for table `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `FKfx0mpssl90lcsgec718ckavj` FOREIGN KEY (`id_repartidor`) REFERENCES `empleado` (`id_empleado`),
  ADD CONSTRAINT `FKntwl1o3ys8fjiychcs8chq6rj` FOREIGN KEY (`id_turno_caja`) REFERENCES `turno_caja` (`id`);

--
-- Constraints for table `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD CONSTRAINT `FK5c7wbc95t8gesgfyqgad8icuh` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id`),
  ADD CONSTRAINT `FKaxtxfsueb7pagpev7p4r4mbin` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id`);

--
-- Constraints for table `perfil_opcion`
--
ALTER TABLE `perfil_opcion`
  ADD CONSTRAINT `FK4dw8qw3rdo1gil420igcvu58y` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`),
  ADD CONSTRAINT `FKbsl4tlnkj5cp6rqayuprdjsfu` FOREIGN KEY (`id_opcion`) REFERENCES `opcion` (`id_opcion`);

--
-- Constraints for table `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  ADD CONSTRAINT `produccion_porciones_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lote_insumo` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `producto`
--
ALTER TABLE `producto`
  ADD CONSTRAINT `FK9nyueixdsgbycfhf7allg8su` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id`);

--
-- Constraints for table `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `FK131gkl0dt1966rsw6dmesnsxw` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
