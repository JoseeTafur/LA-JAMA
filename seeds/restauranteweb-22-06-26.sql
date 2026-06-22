-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-06-2026 a las 16:39:17
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `restauranteweb`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auditoria_anulaciones`
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

--
-- Volcado de datos para la tabla `auditoria_anulaciones`
--

INSERT INTO `auditoria_anulaciones` (`id`, `fecha_registro`, `generar_nuevo_comprobante`, `motivo`, `sustento`, `tipo_nota`, `pedido_id`, `comprobante_nota_numero`, `monto_afectado`, `nota_pdf_url`) VALUES
(1, '2026-06-20 16:25:31.000000', b'0', 'ERROR_PRODUCTOS', 'test', 'PARCIAL', 131, NULL, NULL, NULL),
(2, '2026-06-20 17:48:10.000000', b'0', 'ERROR_PRODUCTOS', 'test', 'TOTAL', 134, NULL, 0, NULL),
(3, '2026-06-20 17:52:08.000000', b'0', 'ERROR_CLIENTE', 'test2', 'TOTAL', 135, NULL, 0, NULL),
(4, '2026-06-20 18:08:01.000000', b'0', 'OPERACION_ANULADA', 'asd', 'TOTAL', 138, NULL, 0, NULL),
(5, '2026-06-21 07:29:13.000000', b'0', 'ERROR_CLIENTE', 'Se escribieron mal los datos', 'TOTAL', 158, NULL, 0, NULL),
(6, '2026-06-21 07:46:59.000000', b'0', 'OPERACION_ANULADA', 'TEST', 'TOTAL', 159, NULL, 0, NULL),
(7, '2026-06-21 07:55:41.000000', b'0', 'OPERACION_ANULADA', 'test prueba', 'TOTAL', 160, NULL, 0, NULL),
(8, '2026-06-21 08:01:39.000000', b'0', 'DUPLICADO', 'Test', 'TOTAL', 161, NULL, 0, NULL),
(9, '2026-06-21 08:09:37.000000', b'0', 'ERROR_CLIENTE', 'test', 'TOTAL', 157, NULL, 0, NULL),
(10, '2026-06-21 08:16:14.000000', b'0', 'OPERACION_ANULADA', 'a', 'TOTAL', 162, NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cargo`
--

CREATE TABLE `cargo` (
  `id_cargo` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cargo`
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
-- Estructura de tabla para la tabla `categoria`
--

CREATE TABLE `categoria` (
  `id` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categoria`
--

INSERT INTO `categoria` (`id`, `descripcion`, `estado`, `nombre`) VALUES
(1, 'Entradas, ensaladas y platos frescos (Ceviches, Causas)', 1, 'COCINA FRÍA'),
(2, 'Platos de fondo, frituras y guisos (Lomo Saltado, Ají de Gallina)', 1, 'COCINA CALIENTE');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comprobante_serie`
--

CREATE TABLE `comprobante_serie` (
  `id` bigint(20) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `tipo_comprobante` varchar(255) NOT NULL,
  `ultimo_correlativo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `comprobante_serie`
--

INSERT INTO `comprobante_serie` (`id`, `serie`, `tipo_comprobante`, `ultimo_correlativo`) VALUES
(1, 'B001', 'BOLETA', 27),
(2, 'F001', 'FACTURA', 1),
(5, 'BC01', 'BC01', 15),
(6, 'FC01', 'FC01', 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empleado`
--

CREATE TABLE `empleado` (
  `id_empleado` bigint(20) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `dni` varchar(8) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `tipo_contrato` varchar(20) DEFAULT NULL,
  `turno` varchar(20) DEFAULT NULL,
  `id_cargo` bigint(20) DEFAULT NULL,
  `id_usuario` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `empleado`
--

INSERT INTO `empleado` (`id_empleado`, `apellido`, `dni`, `estado`, `fecha_ingreso`, `nombre`, `telefono`, `tipo_contrato`, `turno`, `id_cargo`, `id_usuario`) VALUES
(13, 'Apellido', '12345678', 1, '2026-06-03', 'Nombre', '987654321', 'EVENTUAL', 'DIA', 3, 19),
(14, 'Apellido', '23456789', 1, '2026-06-04', 'Nombre', '973860761', 'PLANILLA', 'DIA', 1, 11),
(15, 'Apellido', '34567890', 1, '2026-06-13', 'Nombre', '973860761', 'PLANILLA', 'DIA', 2, 12),
(16, 'Apellido', '45678901', 1, '2026-06-01', 'Nombre', '973860761', 'PLANILLA', 'DIA', 4, 13),
(17, 'Apellido', '56789012', 1, '2026-06-09', 'Nombre', '973860761', 'PLANILLA', 'DIA', 5, 17);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `insumo`
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
-- Volcado de datos para la tabla `insumo`
--

INSERT INTO `insumo` (`id`, `estado`, `nombre`, `stock_actual`, `stock_minimo`, `unidad_medida`, `categoria`, `porciones_por_kg`, `stock_comprometido`) VALUES
(1, 1, 'Carne', 44, 5, 'Kg', 'PROTEINA', 10, 0),
(2, 1, 'Arróz', 5, 5, 'Und', 'VERDURA', NULL, 7),
(3, 1, 'Papa', 6, 10, 'Und', 'VERDURA', NULL, 4),
(5, 1, 'Pescado blanco', 39, 5, 'Kg', 'PROTEINA', 4, NULL),
(6, 1, 'Pollo', 25, 5, 'Kg', 'PROTEINA', 4, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `insumo_producto`
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
-- Volcado de datos para la tabla `insumo_producto`
--

INSERT INTO `insumo_producto` (`id`, `cantidad_usada`, `id_insumo`, `id_producto`, `stock_actual`, `stock_comprometido`, `stock_disponible`) VALUES
(16, 1, 6, 23, NULL, NULL, NULL),
(17, 1, 2, 23, NULL, NULL, NULL),
(18, 1, 3, 23, NULL, NULL, NULL),
(19, 1, 6, 24, NULL, NULL, NULL),
(20, 1, 2, 24, NULL, NULL, NULL),
(21, 1, 3, 24, NULL, NULL, NULL),
(22, 1, 5, 25, NULL, NULL, NULL),
(23, 1, 3, 25, NULL, NULL, NULL),
(27, 1, 1, 22, NULL, NULL, NULL),
(28, 1, 2, 22, NULL, NULL, NULL),
(29, 1, 3, 22, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lote_insumo`
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
-- Volcado de datos para la tabla `lote_insumo`
--

INSERT INTO `lote_insumo` (`id`, `id_insumo`, `fecha_compra`, `kg_comprados`, `costo_total`, `observacion`, `porciones_por_kg`, `saldo_kg`) VALUES
(1, 1, '2026-06-13 07:56:34', 10, 120, 'Comprado', 4, 0),
(2, 1, '2026-06-13 08:02:06', 3, 60, '', 3, 0),
(3, 1, '2026-06-14 22:04:08', 10, 100, '', 4, 0),
(4, 5, '2026-06-14 22:12:25', 10, 100, '', 4, 0),
(5, 6, '2026-06-14 22:12:39', 10, 100, '', 3, 0),
(6, 6, '2026-06-20 17:32:44', 10, 100, '', 4, 0),
(8, 1, '2026-06-21 23:26:34', 4, 100, '', 10, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mesa`
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
-- Volcado de datos para la tabla `mesa`
--

INSERT INTO `mesa` (`id`, `estado`, `numero`, `id_mesa_padre`, `es_extra_repuesto`, `en_reserva`) VALUES
(1, 'OCUPADA', 1, NULL, b'0', b'0'),
(2, 'DISPONIBLE', 2, NULL, b'0', b'1'),
(3, 'DISPONIBLE', 3, NULL, b'0', b'0'),
(4, 'LIBRE', 4, NULL, b'0', b'0'),
(5, 'LISTA-PARA-PAGAR', 5, NULL, b'0', b'0'),
(6, 'OCUPADA', 6, NULL, b'0', b'0'),
(7, 'DISPONIBLE', 7, NULL, b'0', b'0'),
(8, 'DISPONIBLE', 8, NULL, b'0', b'0'),
(9, 'DISPONIBLE', 9, NULL, b'0', b'0'),
(10, 'OCUPADA', 10, NULL, b'0', b'0'),
(11, 'OCUPADA', 11, NULL, b'0', b'0'),
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
(29, 'OCUPADA', 29, NULL, b'0', b'0'),
(30, 'OCUPADA', 30, NULL, b'0', b'0');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimiento_caja`
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

--
-- Volcado de datos para la tabla `movimiento_caja`
--

INSERT INTO `movimiento_caja` (`id`, `comprobante`, `concepto`, `fecha`, `monto`, `tipo`, `id_turno`, `metodo_pago`) VALUES
(10, NULL, 'Liquidación Comanda #4 — Mesa N° 1 (BOLETA)', '2026-06-15 07:14:10.000000', 10, 'VENTA', 6, NULL),
(11, NULL, 'Liquidación Comanda #3 — Mesa N° 1 (BOLETA)', '2026-06-15 07:14:40.000000', 10, 'VENTA', 6, NULL),
(12, NULL, 'Liquidación Comanda #5 — Mesa N° 1 (BOLETA)', '2026-06-15 07:16:30.000000', 35, 'VENTA', 6, NULL),
(13, NULL, 'Ticket 1 (Mesa 29) - Comanda #93', '2026-06-19 11:56:44.000000', 55, 'VENTA', 6, NULL),
(14, NULL, 'Ticket 1 (Mesa 17) - Comanda #94', '2026-06-19 11:59:51.000000', 75, 'VENTA', 6, NULL),
(15, NULL, 'Liquidación Ticket 1 (Mesa 17) - Comanda #95', '2026-06-19 12:40:16.000000', 35, 'VENTA', 6, NULL),
(16, NULL, 'Liquidación Ticket 1 (Mesa 15) - Comanda #97', '2026-06-19 12:45:50.000000', 30, 'VENTA', 6, NULL),
(17, NULL, 'Liquidación Ticket 1 (Mesa 21) - Comanda #99', '2026-06-19 12:48:31.000000', 10, 'VENTA', 6, NULL),
(18, NULL, 'Liquidación Ticket 2 (Mesa 21) - Comanda #99', '2026-06-19 12:48:31.000000', 10, 'VENTA', 6, NULL),
(19, NULL, 'Liquidación Ticket 1 (Mesa 21) - Comanda #99', '2026-06-19 12:50:08.000000', 10, 'VENTA', 6, NULL),
(20, NULL, 'Liquidación Ticket 2 (Mesa 21) - Comanda #99', '2026-06-19 12:50:08.000000', 10, 'VENTA', 6, NULL),
(21, NULL, 'Liquidación Ticket 1 (Mesa 4) - Comanda #104', '2026-06-19 12:54:11.000000', 20, 'VENTA', 6, NULL),
(22, NULL, 'Liquidación Ticket 1 (Mesa 4) - Comanda #104', '2026-06-19 12:55:44.000000', 20, 'VENTA', 6, NULL),
(23, NULL, 'Liquidación Ticket 1 (Mesa 4) - Comanda #104', '2026-06-19 13:38:22.000000', 20, 'VENTA', 6, NULL),
(24, NULL, 'Liquidación Ticket 1 (Mesa 4) - Comanda #104', '2026-06-19 13:47:07.000000', 20, 'VENTA', 6, NULL),
(25, NULL, 'Liquidación Ticket 1 (Mesa 4) - Comanda #104', '2026-06-19 14:28:27.000000', 35, 'VENTA', 6, NULL),
(26, NULL, 'Liquidación Ticket 1 (Mesa 1) - Comanda #90', '2026-06-19 14:29:52.000000', 35, 'VENTA', 6, NULL),
(27, NULL, 'Cierre estricto de caja por el operador', '2026-06-19 14:52:36.000000', 640, 'CIERRE', 6, NULL),
(28, NULL, 'Fondo inicial', '2026-06-19 14:55:27.000000', 200, 'APERTURA', 7, NULL),
(29, NULL, 'Cierre estricto de caja por el operador', '2026-06-19 14:56:35.000000', 200, 'CIERRE', 7, NULL),
(30, NULL, 'Fondo inicial', '2026-06-19 14:56:37.000000', 200, 'APERTURA', 8, NULL),
(31, NULL, 'Liquidación Ticket 1 (Mesa 17) - Comanda #118', '2026-06-20 10:23:17.000000', 20, 'VENTA', 8, NULL),
(32, NULL, 'Liquidación Ticket 1 (Mesa 27) - Comanda #120', '2026-06-20 10:41:23.000000', 35, 'VENTA', 8, NULL),
(33, NULL, 'Liquidación Ticket 2 (Mesa 27) - Comanda #120', '2026-06-20 10:41:23.000000', 20, 'VENTA', 8, NULL),
(34, NULL, 'Liquidación Ticket 1 (Mesa 12) - Comanda #123', '2026-06-20 12:51:38.000000', 20, 'VENTA', 8, NULL),
(35, NULL, 'Liquidación Ticket 1 (Mesa 10) - Comanda #125', '2026-06-20 12:59:42.000000', 20, 'VENTA', 8, NULL),
(36, NULL, 'Liquidación Ticket 1 (Mesa 19) - Comanda #127', '2026-06-20 14:04:15.000000', 20, 'VENTA', 8, NULL),
(37, NULL, 'Liquidación Ticket 1 (Mesa 13) - Comanda #129', '2026-06-20 15:43:24.000000', 50, 'VENTA', 8, NULL),
(38, NULL, 'Liquidación Ticket 1 (Mesa 30) - Comanda #80', '2026-06-20 16:24:14.000000', 140, 'VENTA', 8, NULL),
(39, NULL, 'Liquidación Ticket 1 (Mesa 10) - Comanda #133', '2026-06-20 17:42:51.000000', 40, 'VENTA', 8, NULL),
(40, NULL, 'Liquidación Ticket 1 (Mesa 10) - Comanda #136', '2026-06-20 18:06:34.000000', 21, 'VENTA', 8, NULL),
(41, NULL, 'Liquidación Ticket 2 (Mesa 10) - Comanda #136', '2026-06-20 18:06:34.000000', 14, 'VENTA', 8, NULL),
(42, NULL, 'Liquidación Ticket 1 (Mesa 2) - Comanda #148', '2026-06-20 20:17:37.000000', 20, 'VENTA', 8, NULL),
(43, NULL, 'Cierre estricto de caja por el operador', '2026-06-20 20:30:30.000000', 620, 'CIERRE', 8, NULL),
(44, NULL, 'Fondo inicial', '2026-06-20 20:30:34.000000', 200, 'APERTURA', 9, NULL),
(45, NULL, 'Liquidación Ticket 1 (Mesa 17) - Comanda #153', '2026-06-20 21:12:52.000000', 20, 'VENTA', 9, NULL),
(46, NULL, 'Carta QR (YAPE) - Orden #145', '2026-06-20 21:32:59.000000', 20, 'VENTA', 9, NULL),
(47, NULL, 'Carta QR (YAPE) - Orden #156', '2026-06-20 21:33:55.000000', 35, 'VENTA', 9, NULL),
(48, NULL, 'Manual: Vuelto', '2026-06-20 22:48:44.000000', 5, 'VENTA', 9, NULL),
(49, NULL, 'Pago de gas', '2026-06-20 23:30:43.000000', -100, 'EGRESO', 9, NULL),
(50, NULL, 'Carta QR (YAPE) - Orden #157', '2026-06-20 23:44:05.000000', 20, 'VENTA', 9, NULL),
(51, NULL, 'Carta QR (YAPE) - Orden #144', '2026-06-21 07:19:34.000000', 20, 'VENTA', 9, NULL),
(52, NULL, 'Carta QR (YAPE) - Orden #158', '2026-06-21 07:22:34.000000', 55, 'VENTA', 9, NULL),
(53, NULL, 'Cierre estricto de caja por el operador', '2026-06-21 08:32:04.000000', 245, 'CIERRE', 9, NULL),
(54, NULL, 'Fondo inicial', '2026-06-21 08:34:45.000000', 200, 'APERTURA', 10, NULL),
(55, NULL, 'Liquidación Ticket 1 (Mesa 27) - Comanda #164', '2026-06-21 09:43:58.000000', 35, 'VENTA', 10, NULL),
(56, NULL, 'Manual: Vuelto', '2026-06-21 10:17:08.000000', 10, 'VENTA', 10, NULL),
(57, NULL, 'Venta POS Directo (TARJETA) - Orden #171', '2026-06-21 17:26:49.000000', 35, 'VENTA', 10, NULL),
(58, NULL, 'Liquidación Ticket 1 (Mesa 2) - Comanda #167', '2026-06-21 17:40:54.000000', 55, 'VENTA', 10, NULL),
(59, NULL, 'Liquidación Ticket 1 (Mesa 2) - Comanda #167', '2026-06-21 17:42:21.000000', 35, 'VENTA', 10, NULL),
(60, NULL, 'Venta POS Directo (PLIN) - Orden #174', '2026-06-21 18:17:00.000000', 105, 'VENTA', 10, NULL),
(61, NULL, 'Venta POS Directo (PLIN) - Orden #177', '2026-06-21 22:05:09.000000', 70, 'VENTA', 10, NULL),
(62, NULL, 'Venta POS Directo (TARJETA) - Orden #179', '2026-06-21 23:11:42.000000', 35, 'VENTA', 10, NULL),
(63, NULL, 'Liquidación Ticket 1 (Mesa 3) - Comanda #175', '2026-06-21 23:22:33.000000', 70, 'VENTA', 10, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimiento_insumo`
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

--
-- Volcado de datos para la tabla `movimiento_insumo`
--

INSERT INTO `movimiento_insumo` (`id`, `cantidad`, `fecha`, `motivo`, `stock_resultante`, `tipo`, `insumo_id`, `merma_kg`) VALUES
(1, 1, '2026-06-15 06:37:16.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(2, 1, '2026-06-15 06:37:16.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(3, 1, '2026-06-15 06:44:24.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(4, 1, '2026-06-15 06:44:24.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(5, 1, '2026-06-15 06:48:21.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(6, 1, '2026-06-15 06:48:21.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(7, 1, '2026-06-15 06:55:55.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(8, 1, '2026-06-15 06:55:55.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(9, 1, '2026-06-15 06:59:17.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(10, 1, '2026-06-15 06:59:17.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(11, 1, '2026-06-15 07:05:34.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(12, 1, '2026-06-15 07:05:34.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(13, 1, '2026-06-15 07:10:24.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(14, 1, '2026-06-15 07:10:24.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(15, 1, '2026-06-15 07:11:54.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(16, 1, '2026-06-15 07:11:54.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(17, 1, '2026-06-15 07:13:28.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(18, 1, '2026-06-15 07:13:28.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(19, 1, '2026-06-15 07:15:39.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(20, 1, '2026-06-15 07:15:39.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(21, 1, '2026-06-16 13:07:49.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(22, 1, '2026-06-16 13:07:49.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(23, 1, '2026-06-16 20:54:40.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(24, 1, '2026-06-16 20:54:40.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(25, 1, '2026-06-16 21:07:07.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(26, 1, '2026-06-16 21:07:07.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(27, 1, '2026-06-16 21:08:46.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(28, 1, '2026-06-16 21:08:46.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(29, 1, '2026-06-16 21:08:52.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(30, 1, '2026-06-16 21:08:52.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(31, 1, '2026-06-17 07:06:47.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(32, 1, '2026-06-17 07:06:50.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(33, 1, '2026-06-17 07:06:50.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(34, 1, '2026-06-17 07:07:00.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(35, 1, '2026-06-17 07:07:00.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(36, 1, '2026-06-17 07:11:44.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(37, 1, '2026-06-17 07:11:44.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(38, 1, '2026-06-17 07:20:55.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(39, 1, '2026-06-17 07:20:55.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(40, 1, '2026-06-17 07:20:58.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(41, 1, '2026-06-17 07:20:58.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(42, 1, '2026-06-17 07:29:03.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(43, 1, '2026-06-17 07:29:03.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(44, 1, '2026-06-17 07:29:33.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(45, 1, '2026-06-17 07:29:33.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(46, 1, '2026-06-17 07:42:52.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(47, 1, '2026-06-17 07:42:52.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(48, 1, '2026-06-17 07:42:55.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(49, 1, '2026-06-17 07:42:55.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(50, 1, '2026-06-17 07:58:30.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(51, 1, '2026-06-17 07:58:30.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(52, 1, '2026-06-17 07:58:33.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(53, 1, '2026-06-17 08:12:40.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(54, 1, '2026-06-17 08:12:40.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(55, 1, '2026-06-17 08:12:42.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(56, 1, '2026-06-17 08:12:42.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(57, 1, '2026-06-17 08:13:59.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(58, 1, '2026-06-17 08:13:59.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(59, 1, '2026-06-17 08:15:11.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(60, 1, '2026-06-17 08:15:11.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(61, 1, '2026-06-17 08:15:13.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(62, 1, '2026-06-17 10:02:06.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(63, 1, '2026-06-17 10:02:06.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(64, 1, '2026-06-17 11:39:54.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(65, 1, '2026-06-17 11:39:54.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(66, 1, '2026-06-18 09:23:12.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(67, 1, '2026-06-18 09:23:12.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(68, 1, '2026-06-18 10:10:55.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(69, 1, '2026-06-18 10:10:55.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(70, 1, '2026-06-18 10:14:41.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(71, 1, '2026-06-18 10:14:41.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(72, 1, '2026-06-18 10:34:38.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(73, 1, '2026-06-18 10:34:38.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(74, 1, '2026-06-18 14:57:45.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(75, 1, '2026-06-18 14:57:45.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(76, 1, '2026-06-18 14:59:04.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(77, 1, '2026-06-18 14:59:04.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(78, 1, '2026-06-18 20:14:23.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(79, 1, '2026-06-18 20:14:23.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(80, 1, '2026-06-19 09:11:40.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(81, 1, '2026-06-19 09:11:40.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(82, 1, '2026-06-19 11:36:47.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(83, 1, '2026-06-19 11:36:47.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(84, 1, '2026-06-19 11:36:49.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(85, 1, '2026-06-19 11:36:49.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(86, 1, '2026-06-19 11:36:51.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(87, 1, '2026-06-19 11:36:51.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(88, 1, '2026-06-19 11:56:20.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(89, 1, '2026-06-19 11:56:20.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(90, 1, '2026-06-19 11:56:26.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(91, 1, '2026-06-19 11:56:26.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(92, 1, '2026-06-19 11:58:58.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(93, 1, '2026-06-19 11:58:58.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(94, 1, '2026-06-19 11:59:01.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(95, 1, '2026-06-19 11:59:01.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(96, 1, '2026-06-19 11:59:13.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(97, 1, '2026-06-19 11:59:13.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(98, 1, '2026-06-19 12:39:34.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(99, 1, '2026-06-19 12:39:34.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(100, 1, '2026-06-19 12:44:54.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(101, 1, '2026-06-19 12:47:26.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(102, 1, '2026-06-19 12:47:26.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(103, 1, '2026-06-19 12:49:40.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(104, 1, '2026-06-19 12:49:40.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(105, 1, '2026-06-19 12:53:47.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(106, 1, '2026-06-19 12:53:47.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(107, 1, '2026-06-19 12:53:49.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(108, 1, '2026-06-19 12:53:49.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(109, 1, '2026-06-19 12:55:23.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(110, 1, '2026-06-19 12:55:23.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(111, 1, '2026-06-19 13:36:55.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(112, 1, '2026-06-19 13:36:55.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(113, 1, '2026-06-19 13:46:05.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(114, 1, '2026-06-19 13:46:05.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(115, 1, '2026-06-19 19:55:16.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(116, 1, '2026-06-20 06:59:42.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(117, 1, '2026-06-20 06:59:42.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(118, 1, '2026-06-20 08:28:13.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(119, 1, '2026-06-20 08:28:13.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(120, 1, '2026-06-20 10:22:32.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(121, 1, '2026-06-20 10:22:32.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(122, 1, '2026-06-20 10:40:12.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(123, 1, '2026-06-20 10:40:12.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(124, 1, '2026-06-20 10:40:14.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(125, 1, '2026-06-20 10:40:14.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(126, 1, '2026-06-20 12:51:18.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(127, 1, '2026-06-20 12:51:18.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(128, 1, '2026-06-20 12:59:21.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(129, 1, '2026-06-20 12:59:21.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(130, 1, '2026-06-20 14:03:38.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(131, 1, '2026-06-20 14:03:38.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(132, 1, '2026-06-20 15:43:03.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(133, 1, '2026-06-20 15:43:03.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(134, 1, '2026-06-20 15:43:05.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(135, 1, '2026-06-20 17:33:46.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(136, 1, '2026-06-20 17:33:46.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(137, 1, '2026-06-20 17:42:11.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(138, 1, '2026-06-20 17:42:11.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(139, 1, '2026-06-20 19:33:26.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(140, 1, '2026-06-20 19:33:26.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(141, 1, '2026-06-20 20:31:24.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(142, 1, '2026-06-20 20:31:24.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(143, 1, '2026-06-20 20:31:31.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(144, 1, '2026-06-20 20:31:31.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(145, 1, '2026-06-20 20:31:33.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(146, 1, '2026-06-20 20:42:13.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(147, 1, '2026-06-20 20:42:13.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(148, 1, '2026-06-20 20:58:12.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(149, 1, '2026-06-20 20:58:12.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(150, 1, '2026-06-20 21:31:31.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(151, 1, '2026-06-21 09:42:36.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(152, 1, '2026-06-21 09:42:36.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(153, 1, '2026-06-21 11:38:41.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(154, 1, '2026-06-21 11:38:41.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(155, 1, '2026-06-21 11:51:02.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(156, 1, '2026-06-21 11:51:02.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(157, 1, '2026-06-21 11:54:24.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(158, 1, '2026-06-21 11:54:24.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(159, 1, '2026-06-21 11:56:45.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(160, 1, '2026-06-21 11:56:46.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(161, 1, '2026-06-21 11:57:25.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(162, 1, '2026-06-21 11:57:25.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(163, 1, '2026-06-21 12:00:18.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(164, 1, '2026-06-21 12:00:18.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(165, 1, '2026-06-21 12:06:48.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(166, 1, '2026-06-21 12:06:48.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(167, 1, '2026-06-21 12:12:03.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(168, 1, '2026-06-21 12:12:03.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(169, 1, '2026-06-21 12:13:06.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(170, 1, '2026-06-21 12:13:06.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(171, 1, '2026-06-21 12:16:42.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(172, 1, '2026-06-21 12:16:42.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(173, 1, '2026-06-21 12:36:19.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(174, 1, '2026-06-21 12:37:00.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(175, 1, '2026-06-21 12:37:00.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(176, 1, '2026-06-21 12:38:34.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(177, 1, '2026-06-21 12:38:34.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(178, 1, '2026-06-21 12:40:51.000000', 'Despacho a cocina: 1x Ceviche de Pescado', 4, 'EGRESO', 3, NULL),
(179, 1, '2026-06-21 12:43:35.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(180, 1, '2026-06-21 12:43:35.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(181, 1, '2026-06-21 12:47:10.000000', 'Despacho a cocina: 1x Causa Limeña', 3, 'EGRESO', 2, NULL),
(182, 1, '2026-06-21 12:47:10.000000', 'Despacho a cocina: 1x Causa Limeña', 4, 'EGRESO', 3, NULL),
(183, 1, '2026-06-21 12:50:21.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(184, 1, '2026-06-21 12:50:21.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(185, 1, '2026-06-21 12:50:42.000000', 'Despacho a cocina: 1x Ají de Gallina', 3, 'EGRESO', 2, NULL),
(186, 1, '2026-06-21 12:50:42.000000', 'Despacho a cocina: 1x Ají de Gallina', 4, 'EGRESO', 3, NULL),
(187, 1, '2026-06-21 17:27:31.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(188, 1, '2026-06-21 17:27:31.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(189, 1, '2026-06-21 17:39:43.000000', 'Despacho a cocina: 1x Lomo saltado', 3, 'EGRESO', 2, NULL),
(190, 1, '2026-06-21 17:39:43.000000', 'Despacho a cocina: 1x Lomo saltado', 4, 'EGRESO', 3, NULL),
(191, 1, '2026-06-21 18:19:03.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 2, 'EGRESO', 2, NULL),
(192, 1, '2026-06-21 18:19:03.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 3, 'EGRESO', 3, NULL),
(193, 1, '2026-06-21 18:19:05.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 1, 'EGRESO', 2, NULL),
(194, 1, '2026-06-21 18:19:05.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 2, 'EGRESO', 3, NULL),
(195, 1, '2026-06-21 22:18:12.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 0, 'EGRESO', 2, NULL),
(196, 1, '2026-06-21 22:18:12.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 1, 'EGRESO', 3, NULL),
(197, 1, '2026-06-21 22:18:14.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', -1, 'EGRESO', 2, NULL),
(198, 1, '2026-06-21 22:18:14.000000', 'Despacho a cocina (Gasto Real): 1x Lomo saltado', 0, 'EGRESO', 3, NULL),
(199, 5, '2026-06-21 23:12:55.000000', 'Apertura de Lote (Stock Reiniciado): 5.0 Und', 5, 'INGRESO', 2, NULL),
(200, 6, '2026-06-21 23:12:59.000000', 'Apertura de Lote (Stock Reiniciado): 6.0 Und', 6, 'INGRESO', 3, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimiento_porciones`
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

--
-- Volcado de datos para la tabla `movimiento_porciones`
--

INSERT INTO `movimiento_porciones` (`id`, `id_insumo`, `fecha`, `tipo`, `cantidad_porciones`, `motivo`, `stock_resultante`, `merma_kg`) VALUES
(1, 1, '2026-06-14 22:04:17', 'INGRESO', 40, 'Producción: 40 porc. obtenidas / 40 esperadas (Eficiencia: 100,0%, Merma en Balanza: 0,250 kg)', 44, 0.25),
(2, 5, '2026-06-14 22:12:33', 'INGRESO', 49, 'Producción: 49 porc. obtenidas / 40 esperadas (Eficiencia: 122,5%, Merma en Balanza: 0,200 kg)', 49, 0.2),
(3, 6, '2026-06-14 22:12:50', 'INGRESO', 33, 'Producción: 33 porc. obtenidas / 30 esperadas (Eficiencia: 110,0%, Merma en Balanza: 0,150 kg)', 33, 0.15),
(4, 1, '2026-06-15 06:37:16', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 43, 0),
(5, 1, '2026-06-15 06:44:23', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 42, 0),
(6, 1, '2026-06-15 06:48:21', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 41, 0),
(7, 1, '2026-06-15 06:55:55', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 40, 0),
(8, 1, '2026-06-15 06:59:17', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 39, 0),
(9, 1, '2026-06-15 07:05:34', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 38, 0),
(10, 1, '2026-06-15 07:10:24', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 2', 37, 0),
(11, 1, '2026-06-15 07:11:54', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 1', 36, 0),
(12, 6, '2026-06-15 07:13:28', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 3', 32, 0),
(13, 1, '2026-06-15 07:15:39', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 5', 35, 0),
(14, 1, '2026-06-16 13:07:49', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 6', 34, 0),
(15, 1, '2026-06-16 20:54:40', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 7', 33, 0),
(16, 6, '2026-06-16 21:07:07', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 8', 31, 0),
(17, 6, '2026-06-16 21:08:46', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 8', 30, 0),
(18, 6, '2026-06-16 21:08:52', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 8', 29, 0),
(19, 5, '2026-06-17 07:06:47', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 11', 48, 0),
(20, 6, '2026-06-17 07:06:50', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 11', 28, 0),
(21, 6, '2026-06-17 07:07:00', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 11', 27, 0),
(22, 1, '2026-06-17 07:11:44', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 13', 32, 0),
(23, 1, '2026-06-17 07:20:55', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 14', 31, 0),
(24, 6, '2026-06-17 07:20:58', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 14', 26, 0),
(25, 1, '2026-06-17 07:29:03', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 16', 30, 0),
(26, 6, '2026-06-17 07:29:33', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 16', 25, 0),
(27, 1, '2026-06-17 07:42:52', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 17', 29, 0),
(28, 6, '2026-06-17 07:42:55', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 18', 24, 0),
(29, 6, '2026-06-17 07:58:30', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 19', 23, 0),
(30, 5, '2026-06-17 07:58:33', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 19', 47, 0),
(31, 1, '2026-06-17 08:12:39', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 22', 28, 0),
(32, 6, '2026-06-17 08:12:42', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 22', 22, 0),
(33, 1, '2026-06-17 08:13:59', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 25', 27, 0),
(34, 6, '2026-06-17 08:15:11', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 27', 21, 0),
(35, 5, '2026-06-17 08:15:13', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 27', 46, 0),
(36, 1, '2026-06-17 10:02:06', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 58', 26, 0),
(37, 6, '2026-06-17 11:39:54', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 64', 20, 0),
(38, 1, '2026-06-18 09:23:12', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 69', 25, 0),
(39, 1, '2026-06-18 10:10:55', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 79', 24, 0),
(40, 1, '2026-06-18 10:14:41', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 80', 23, 0),
(41, 1, '2026-06-18 10:34:38', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 82', 22, 0),
(42, 1, '2026-06-18 14:57:45', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 86', 21, 0),
(43, 6, '2026-06-18 14:59:04', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 88', 19, 0),
(44, 6, '2026-06-18 20:14:23', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 85', 18, 0),
(45, 1, '2026-06-19 09:11:40', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 90', 20, 0),
(46, 6, '2026-06-19 11:36:47', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 91', 17, 0),
(47, 6, '2026-06-19 11:36:49', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 91', 16, 0),
(48, 6, '2026-06-19 11:36:51', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 91', 15, 0),
(49, 1, '2026-06-19 11:56:20', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 93', 19, 0),
(50, 6, '2026-06-19 11:56:26', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 93', 14, 0),
(51, 1, '2026-06-19 11:58:58', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 94', 18, 0),
(52, 6, '2026-06-19 11:59:01', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 94', 13, 0),
(53, 6, '2026-06-19 11:59:13', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 94', 12, 0),
(54, 1, '2026-06-19 12:39:34', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 95', 17, 0),
(55, 5, '2026-06-19 12:44:54', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 97', 45, 0),
(56, 6, '2026-06-19 12:47:26', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 99', 11, 0),
(57, 6, '2026-06-19 12:49:40', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 99', 10, 0),
(58, 1, '2026-06-19 12:53:47', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 104', 16, 0),
(59, 6, '2026-06-19 12:53:49', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 104', 9, 0),
(60, 6, '2026-06-19 12:55:23', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 104', 8, 0),
(61, 6, '2026-06-19 13:36:55', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 104', 7, 0),
(62, 6, '2026-06-19 13:46:05', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 104', 6, 0),
(63, 5, '2026-06-19 19:55:16', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 114', 44, 0),
(64, 1, '2026-06-20 06:59:42', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 116', 15, 0),
(65, 1, '2026-06-20 08:28:13', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 117', 14, 0),
(66, 6, '2026-06-20 10:22:32', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 118', 5, 0),
(67, 1, '2026-06-20 10:40:12', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 120', 13, 0),
(68, 6, '2026-06-20 10:40:14', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 120', 4, 0),
(69, 6, '2026-06-20 12:51:18', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 123', 3, 0),
(70, 6, '2026-06-20 12:59:21', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 125', 2, 0),
(71, 6, '2026-06-20 14:03:37', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 127', 1, 0),
(72, 6, '2026-06-20 15:43:03', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 129', 0, 0),
(73, 5, '2026-06-20 15:43:05', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 129', 43, 0),
(74, 6, '2026-06-20 17:32:54', 'INGRESO', 41, 'Producción: 41 porc. obtenidas / 40 esperadas (Eficiencia: 102,5%, Merma en Balanza: 0,210 kg)', 41, 0.21),
(75, 6, '2026-06-20 17:33:46', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 133', 40, 0),
(76, 6, '2026-06-20 17:42:11', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 133', 39, 0),
(77, 6, '2026-06-20 19:33:26', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 139', 38, 0),
(78, 6, '2026-06-20 20:31:24', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 151', 37, 0),
(79, 6, '2026-06-20 20:31:31', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 151', 36, 0),
(80, 5, '2026-06-20 20:31:33', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 151', 42, 0),
(81, 1, '2026-06-20 20:42:12', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 152', 12, 0),
(82, 6, '2026-06-20 20:58:12', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 153', 35, 0),
(83, 5, '2026-06-20 21:31:31', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 155', 41, 0),
(84, 1, '2026-06-21 09:42:36', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 164', 11, 0),
(85, 1, '2026-06-21 11:38:40', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 166', 10, 0),
(86, 6, '2026-06-21 11:51:02', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 146', 34, 0),
(87, 6, '2026-06-21 11:54:24', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 145', 33, 0),
(88, 6, '2026-06-21 11:56:45', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 144', 32, 0),
(89, 6, '2026-06-21 11:57:25', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 143', 31, 0),
(90, 1, '2026-06-21 12:00:18', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 142', 9, 0),
(91, 6, '2026-06-21 12:06:48', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 141', 30, 0),
(92, 1, '2026-06-21 12:12:03', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 166', 8, 0),
(93, 1, '2026-06-21 12:13:06', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 166', 7, 0),
(94, 1, '2026-06-21 12:16:42', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 167', 6, 0),
(95, 5, '2026-06-21 12:36:19', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 166', 40, 0),
(96, 6, '2026-06-21 12:36:59', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 111', 29, 0),
(97, 6, '2026-06-21 12:38:34', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 112', 28, 0),
(98, 5, '2026-06-21 12:40:51', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 150', 39, 0),
(99, 6, '2026-06-21 12:43:35', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 147', 27, 0),
(100, 6, '2026-06-21 12:47:10', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 167', 26, 0),
(101, 1, '2026-06-21 12:50:21', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 169', 5, 0),
(102, 6, '2026-06-21 12:50:42', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 169', 25, 0),
(103, 1, '2026-06-21 17:27:31', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 171', 4, 0),
(104, 1, '2026-06-21 17:39:43', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 167', 3, 0),
(105, 1, '2026-06-21 18:15:57', 'EGRESO', 2, 'Se malogró', 1, 0),
(106, 1, '2026-06-21 18:19:03', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 175', 0, 0),
(107, 1, '2026-06-21 18:19:05', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 175', -1, 0),
(108, 1, '2026-06-21 18:33:02', 'INGRESO', 1, 'asd', 0, 0),
(109, 1, '2026-06-21 18:39:50', 'INGRESO', 1, 'test', 1, 0),
(111, 1, '2026-06-21 21:10:41', 'INGRESO', 3, 'asd', 4, 0),
(114, 1, '2026-06-21 23:27:07', 'INGRESO', 40, 'Producción: 40 porc. obtenidas / 40 esperadas (Eficiencia: 100,0%, Merma en Balanza: 0,200 kg)', 44, 0.2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones_sistema`
--

CREATE TABLE `notificaciones_sistema` (
  `id` bigint(20) NOT NULL,
  `destino_perfil` varchar(30) NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `leido` bit(1) NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `tipo` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `notificaciones_sistema`
--

INSERT INTO `notificaciones_sistema` (`id`, `destino_perfil`, `fecha_creacion`, `leido`, `mensaje`, `tipo`) VALUES
(1, 'MESERO', '2026-06-18 17:25:25.000000', b'1', '⏳ La reserva de José Tafur está por empezar en 5 minutos. Coordinar espacios.', 'INFO'),
(2, 'TODOS', '2026-06-18 17:30:05.000000', b'1', '🚨 ¡La reserva de José Tafur ya empezó! Se requieren 2 mesas libres. Comunícate con caja.', 'RESERVA'),
(3, 'TODOS', '2026-06-18 17:42:41.000000', b'1', '📢 Una reserva fue configurada para este momento de parte de José Tafur, busque reservar 2 cantidad de mesas (Mesa #1, Mesa #2). Para más información hable con el cajero/administrador.', 'RESERVA'),
(4, 'MESERO', '2026-06-18 17:42:50.000000', b'1', '⏳ La reserva de José Tafur está por empezar en 3 minutos. Coordinar espacios.', 'INFO'),
(5, 'TODOS', '2026-06-18 17:45:00.000000', b'1', '🚨 ¡La reserva de José Tafur ya empezó! Se requieren 2 mesas libres. Comunícate con caja.', 'RESERVA'),
(6, 'TODOS', '2026-06-18 21:35:27.000000', b'1', '📢 Una reserva fue configurada para este momento de parte de José Tafur, busque reservar 1 cantidad de mesas (Mesa #1). Para más información hable con el cajero/administrador.', 'RESERVA'),
(7, 'MESERO', '2026-06-19 08:41:11.000000', b'1', '⏳ La reserva de José Tafur está por empezar en 4 minutos. Coordinar espacios.', 'INFO'),
(8, 'TODOS', '2026-06-19 08:45:01.000000', b'1', '🚨 ¡La reserva de José Tafur ya empezó! Se requieren 1 mesas libres. Comunícate con caja.', 'RESERVA'),
(9, 'MESERO', '2026-06-19 08:57:36.000000', b'1', '⏳ La reserva de José Tafur está por empezar en 3 minutos. Coordinar espacios.', 'INFO'),
(10, 'TODOS', '2026-06-19 09:00:06.000000', b'1', '🚨 ¡La reserva de José Tafur ya empezó! Se requieren 1 mesas libres. Comunícate con caja.', 'RESERVA'),
(11, 'MESERO', '2026-06-19 09:10:03.000000', b'1', '⏳ La reserva de José Tafur está por empezar en 5 minutos. Coordinar espacios.', 'INFO'),
(12, 'MESERO', '2026-06-19 09:11:40.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 1', 'SUCCESS'),
(13, 'TODOS', '2026-06-19 09:15:02.000000', b'1', '🚨 ¡La reserva de José Tafur ya empezó! Se requieren 2 mesas libres. Comunícate con caja.', 'RESERVA'),
(14, 'MESERO', '2026-06-19 11:36:47.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 29', 'SUCCESS'),
(15, 'MESERO', '2026-06-19 11:36:49.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 29', 'SUCCESS'),
(16, 'MESERO', '2026-06-19 11:36:51.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 29', 'SUCCESS'),
(17, 'MESERO', '2026-06-19 11:56:20.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 29', 'SUCCESS'),
(18, 'MESERO', '2026-06-19 11:56:26.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 29', 'SUCCESS'),
(19, 'MESERO', '2026-06-19 11:58:58.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 17', 'SUCCESS'),
(20, 'MESERO', '2026-06-19 11:59:01.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 17', 'SUCCESS'),
(21, 'MESERO', '2026-06-19 11:59:13.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 17', 'SUCCESS'),
(22, 'MESERO', '2026-06-19 12:39:34.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 17', 'SUCCESS'),
(23, 'MESERO', '2026-06-19 12:44:54.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Mesa N° 15', 'SUCCESS'),
(24, 'MESERO', '2026-06-19 12:47:26.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 21', 'SUCCESS'),
(25, 'MESERO', '2026-06-19 12:49:40.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 21', 'SUCCESS'),
(26, 'MESERO', '2026-06-19 12:53:47.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 4', 'SUCCESS'),
(27, 'MESERO', '2026-06-19 12:53:49.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 4', 'SUCCESS'),
(28, 'MESERO', '2026-06-19 12:55:23.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 4', 'SUCCESS'),
(29, 'MESERO', '2026-06-19 13:36:56.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 4', 'SUCCESS'),
(30, 'MESERO', '2026-06-19 13:46:05.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 4', 'SUCCESS'),
(31, 'MESERO', '2026-06-19 19:55:16.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Carta/Delivery', 'SUCCESS'),
(32, 'MESERO', '2026-06-20 06:59:42.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 1', 'SUCCESS'),
(33, 'MESERO', '2026-06-20 08:28:13.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 1', 'SUCCESS'),
(34, 'MESERO', '2026-06-20 10:22:32.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 17', 'SUCCESS'),
(35, 'MESERO', '2026-06-20 10:40:12.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 27', 'SUCCESS'),
(36, 'MESERO', '2026-06-20 10:40:14.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 27', 'SUCCESS'),
(37, 'MESERO', '2026-06-20 12:51:18.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 12', 'SUCCESS'),
(38, 'MESERO', '2026-06-20 12:59:21.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 10', 'SUCCESS'),
(39, 'MESERO', '2026-06-20 14:03:38.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 19', 'SUCCESS'),
(40, 'MESERO', '2026-06-20 15:43:03.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 13', 'SUCCESS'),
(41, 'MESERO', '2026-06-20 15:43:05.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Mesa N° 13', 'SUCCESS'),
(42, 'MESERO', '2026-06-20 17:33:46.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 10', 'SUCCESS'),
(43, 'MESERO', '2026-06-20 17:42:11.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 10', 'SUCCESS'),
(44, 'MESERO', '2026-06-20 19:33:26.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Carta/Delivery', 'SUCCESS'),
(45, 'MESERO', '2026-06-20 20:31:24.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 10', 'SUCCESS'),
(46, 'MESERO', '2026-06-20 20:31:31.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 10', 'SUCCESS'),
(47, 'MESERO', '2026-06-20 20:31:33.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Mesa N° 10', 'SUCCESS'),
(48, 'MESERO', '2026-06-20 20:42:13.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 11', 'SUCCESS'),
(49, 'MESERO', '2026-06-20 20:58:12.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 17', 'SUCCESS'),
(50, 'MESERO', '2026-06-20 21:31:31.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Carta/Delivery', 'SUCCESS'),
(51, 'MESERO', '2026-06-21 09:42:36.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 27', 'SUCCESS'),
(52, 'MESERO', '2026-06-21 11:38:41.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 1', 'SUCCESS'),
(53, 'MESERO', '2026-06-21 11:51:03.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Carta/Delivery', 'SUCCESS'),
(54, 'MESERO', '2026-06-21 11:54:24.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Carta/Delivery', 'SUCCESS'),
(55, 'MESERO', '2026-06-21 11:56:46.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Carta/Delivery', 'SUCCESS'),
(56, 'MESERO', '2026-06-21 11:57:25.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Carta/Delivery', 'SUCCESS'),
(57, 'MESERO', '2026-06-21 12:00:18.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Carta/Delivery', 'SUCCESS'),
(58, 'MESERO', '2026-06-21 12:06:48.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Carta/Delivery', 'SUCCESS'),
(59, 'MESERO', '2026-06-21 12:12:03.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 1', 'SUCCESS'),
(60, 'MESERO', '2026-06-21 12:13:06.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 1', 'SUCCESS'),
(61, 'MESERO', '2026-06-21 12:16:42.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 2', 'SUCCESS'),
(62, 'MESERO', '2026-06-21 12:36:19.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Mesa N° 1', 'SUCCESS'),
(63, 'MESERO', '2026-06-21 12:37:00.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Carta/Delivery', 'SUCCESS'),
(64, 'MESERO', '2026-06-21 12:38:34.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Carta/Delivery', 'SUCCESS'),
(65, 'MESERO', '2026-06-21 12:40:51.000000', b'1', '🍳 ¡Listo para servir! Ceviche de Pescado asignado a la Carta/Delivery', 'SUCCESS'),
(66, 'MESERO', '2026-06-21 12:43:35.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Carta/Delivery', 'SUCCESS'),
(67, 'MESERO', '2026-06-21 12:47:10.000000', b'1', '🍳 ¡Listo para servir! Causa Limeña asignado a la Mesa N° 2', 'SUCCESS'),
(68, 'MESERO', '2026-06-21 12:50:21.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 29', 'SUCCESS'),
(69, 'MESERO', '2026-06-21 12:50:42.000000', b'1', '🍳 ¡Listo para servir! Ají de Gallina asignado a la Mesa N° 29', 'SUCCESS'),
(70, 'MESERO', '2026-06-21 17:27:31.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Carta/Delivery', 'SUCCESS'),
(71, 'MESERO', '2026-06-21 17:39:43.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 2', 'SUCCESS'),
(72, 'MESERO', '2026-06-21 18:19:03.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 3', 'SUCCESS'),
(73, 'MESERO', '2026-06-21 18:19:05.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Mesa N° 3', 'SUCCESS'),
(74, 'MESERO', '2026-06-21 22:18:12.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Carta/Delivery', 'SUCCESS'),
(75, 'MESERO', '2026-06-21 22:18:14.000000', b'1', '🍳 ¡Listo para servir! Lomo saltado asignado a la Carta/Delivery', 'SUCCESS');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `opcion`
--

CREATE TABLE `opcion` (
  `id_opcion` bigint(20) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `ruta` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `opcion`
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
(19, 'Comprobantes', '/admin/comprobantes');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pago_digital`
--

CREATE TABLE `pago_digital` (
  `id` bigint(20) NOT NULL,
  `fecha_pago` datetime(6) DEFAULT NULL,
  `img_url` varchar(255) DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  `situacion` enum('ANULADO','APROBADO','PENDIENTE') DEFAULT NULL,
  `id_pedido` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pago_digital`
--

INSERT INTO `pago_digital` (`id`, `fecha_pago`, `img_url`, `observacion`, `situacion`, `id_pedido`) VALUES
(4, '2026-06-19 19:53:00.000000', 'flvjabipnddwn39yuors', '', 'APROBADO', 114),
(5, '2026-06-19 20:28:53.000000', 'qc9ag6mqtkguzwmimv8d', '', 'ANULADO', 115),
(6, '2026-06-20 18:13:10.000000', 'wvglenjdxaqforgv4gjs', '', 'APROBADO', 139),
(7, '2026-06-20 18:25:36.000000', 'gizpdb3duh0fo2ewjpjk', '', 'ANULADO', 140),
(8, '2026-06-20 18:32:19.000000', 'sf1otmalkxq2m8lwithj', NULL, 'PENDIENTE', 141),
(9, '2026-06-20 18:42:19.000000', 'cylxpcsywy8sssiyt4di', NULL, 'PENDIENTE', 142),
(10, '2026-06-20 18:43:12.000000', 'qoph49jsk7akbxkltaft', NULL, 'PENDIENTE', 143),
(11, '2026-06-20 18:46:02.000000', 'tr2wbelbgz90dw2ig12n', '', 'APROBADO', 144),
(12, '2026-06-20 18:48:08.000000', 'zgtky0orpixsgk3duy6f', '', 'APROBADO', 145),
(13, '2026-06-20 18:50:33.000000', 'uwkniahcv0frrzuli5pf', '', 'APROBADO', 146),
(14, '2026-06-20 19:22:59.000000', 'xqw1fqiecsuac4ombqpb', '', 'APROBADO', 147),
(15, '2026-06-20 20:19:33.000000', 'aameua2c9w1r2wlz7amt', '', 'APROBADO', 150),
(16, '2026-06-20 21:18:12.000000', 'g18lkcgl1b0n8tuwy7x8', '', 'APROBADO', 155),
(17, '2026-06-20 21:33:35.000000', 'fbpzcsgtzjl2kjtf9dob', '', 'APROBADO', 156),
(18, '2026-06-20 23:43:43.000000', 'mlyqup41cusv9pdjo7ro', '', 'APROBADO', 157),
(19, '2026-06-21 07:22:05.000000', 'ojvtm2nt8cdj7ycjgpzv', '', 'APROBADO', 158),
(20, '2026-06-21 22:53:05.000000', 'dqvbswlaxhzppvcdwym9', NULL, 'PENDIENTE', 178);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
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
  `tipo_pedido` enum('DELIVERY','LOCAL') DEFAULT NULL,
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
  `ticket_impreso_cocina` bit(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido`
--

INSERT INTO `pedido` (`id`, `cliente_nombre`, `direccion_entrega`, `estado`, `fecha_creacion`, `fecha_entrega`, `fecha_salida`, `latitud`, `longitud`, `monto_total`, `id_repartidor`, `numero_mesa`, `tipo_pedido`, `frio_listo`, `caliente_listo`, `comprobante_numero`, `comprobante_tipo`, `documento_cliente`, `preferencia_comprobante`, `comprobante_pdf_url`, `comprobante_a4_url`, `metodo_pago`, `cliente_correo`, `codigo_pago_operacion`, `comprobante_xml_contenido`, `comprobante_nota_numero`, `nota_a4_url`, `nota_pdf_url`, `nota_xml_contenido`, `ticket_impreso_cocina`) VALUES
(1, 'Mesa #1', '', 'PAGADO', '2026-06-15 06:37:01.000000', '2026-06-15 07:12:06.000000', NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, NULL, NULL, '', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(2, 'Mesa #27', '', 'PAGADO', '2026-06-15 07:09:55.000000', '2026-06-15 07:14:54.000000', NULL, NULL, NULL, 35, NULL, 27, NULL, 1, 1, NULL, NULL, '', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(3, 'Mesa #1', '', 'PAGADO', '2026-06-15 07:12:12.000000', '2026-06-15 07:13:42.000000', NULL, NULL, NULL, 10, NULL, 1, NULL, 1, 1, '3', 'BOLETA', '', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-3.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-3.pdf', 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(4, 'Mesa 1 - Ticket 2', 'Salón', 'PAGADO', '2026-06-15 07:13:42.000000', '2026-06-15 07:13:42.000000', NULL, NULL, NULL, 10, NULL, 1, NULL, 0, 0, '4', 'BOLETA', '', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-4.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-4.pdf', 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(5, 'Mesa #1', '', 'PAGADO', '2026-06-15 07:15:32.000000', '2026-06-15 07:16:04.000000', NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, '5', 'BOLETA', '', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-5.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-5.pdf', 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(6, 'Mesa #4', '', 'PAGADO', '2026-06-16 13:07:41.000000', '2026-06-16 13:08:07.000000', NULL, NULL, NULL, 35, NULL, 4, NULL, 1, 1, NULL, NULL, '', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(7, 'Mesa #1', '', 'PAGADO', '2026-06-16 20:43:09.000000', '2026-06-16 20:57:55.000000', NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, NULL, NULL, '', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(8, 'Mesa #2', '', 'PAGADO', '2026-06-16 20:43:14.000000', '2026-06-16 23:39:12.000000', NULL, NULL, NULL, 60, NULL, 2, NULL, 1, 1, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(9, 'Mesa #3', '', 'CANCELADO', '2026-06-16 20:43:19.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(10, 'Mesa 4', 'Salón', 'CANCELADO', '2026-06-16 22:10:38.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(11, 'Mesa #3', '', 'PAGADO', '2026-06-16 22:11:35.000000', '2026-06-17 07:08:58.000000', NULL, NULL, NULL, 28, NULL, 3, NULL, 1, 1, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(12, 'Mesa 3 - Ticket 2', 'Salón', 'PAGADO', '2026-06-17 07:08:58.000000', '2026-06-17 07:08:58.000000', NULL, NULL, NULL, 42, NULL, 3, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(13, 'Mesa #1', '', 'PAGADO', '2026-06-17 07:11:35.000000', '2026-06-17 07:12:18.000000', NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(14, 'Mesa #2', '', 'PAGADO', '2026-06-17 07:20:49.000000', '2026-06-17 07:21:15.000000', NULL, NULL, NULL, 35, NULL, 2, NULL, 1, 1, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(15, 'Mesa #1', '', 'CANCELADO', '2026-06-17 07:22:11.000000', NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(16, 'Mesa #1', '', 'PAGADO', '2026-06-17 07:28:41.000000', '2026-06-17 07:29:50.000000', NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(17, 'Mesa #1', '', 'CANCELADO', '2026-06-17 07:42:34.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(18, 'Mesa #2', '', 'PAGADO', '2026-06-17 07:42:41.000000', '2026-06-17 07:49:42.000000', NULL, NULL, NULL, 35, NULL, 2, NULL, 1, 1, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(19, 'Mesa #1', '', 'PAGADO', '2026-06-17 07:58:21.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(20, 'Mesa 1 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 07:58:48.000000', '2026-06-17 07:58:48.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(21, 'Mesa 1 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 07:59:36.000000', '2026-06-17 07:59:36.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(22, 'Mesa #29', '', 'CANCELADO', '2026-06-17 08:12:33.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(23, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 08:12:57.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(24, 'Mesa 2', 'Salón', 'ASIGNADO', '2026-06-17 08:13:19.000000', NULL, NULL, NULL, NULL, 55, NULL, 5, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(25, 'Mesa #29', '', 'PAGADO', '2026-06-17 08:13:52.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(26, 'Mesa 29 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 08:14:22.000000', '2026-06-17 08:14:22.000000', NULL, NULL, NULL, 35, NULL, 29, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(27, 'Mesa #29', '', 'PAGADO', '2026-06-17 08:15:04.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(28, 'Mesa 29 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 08:15:31.000000', '2026-06-17 08:15:31.000000', NULL, NULL, NULL, 20, NULL, 29, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(29, 'Mesa 29 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 08:18:43.000000', '2026-06-17 08:18:43.000000', NULL, NULL, NULL, 30, NULL, 29, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(30, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:08:22.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(31, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:20:20.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(32, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:22:38.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(33, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:23:09.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(34, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:23:36.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(35, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:32:43.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(36, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:33:09.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(37, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:33:34.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(38, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:36:55.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(39, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 09:37:12.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(40, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:39:26.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(41, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 09:39:49.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(42, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:41:51.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(43, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:42:02.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(44, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:42:19.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(45, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 09:43:09.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(46, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:43:16.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(47, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 09:48:45.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(48, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:48:52.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(49, 'Mesa 5', 'Salón', 'CANCELADO', '2026-06-17 09:52:42.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(50, 'Mesa 1', 'Salón', 'CANCELADO', '2026-06-17 09:53:02.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(52, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 09:53:26.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(54, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 09:57:08.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(56, 'Mesa 5', 'Salón', 'ASIGNADO', '2026-06-17 09:58:31.000000', NULL, NULL, NULL, NULL, 0, NULL, 5, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(57, 'Mesa 2', 'Salón', 'CANCELADO', '2026-06-17 10:01:33.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(59, 'Mesa 2', 'Salón', 'CANCELADO', '2026-06-17 10:02:48.000000', NULL, NULL, NULL, NULL, 35, NULL, 2, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(60, 'Mesa 7', 'Salón', 'CANCELADO', '2026-06-17 10:10:15.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(61, 'Mesa #6', '', 'CANCELADO', '2026-06-17 10:10:26.000000', NULL, NULL, NULL, NULL, 35, NULL, 6, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(62, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 10:10:58.000000', NULL, NULL, NULL, NULL, 35, NULL, 6, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(63, 'Mesa 7', 'Salón', 'CANCELADO', '2026-06-17 11:36:11.000000', NULL, NULL, NULL, NULL, 35, NULL, 7, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(64, 'Mesa #5', '', 'PAGADO', '2026-06-17 11:39:45.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(65, 'Mesa 5 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 11:40:13.000000', '2026-06-17 11:40:13.000000', NULL, NULL, NULL, 20, NULL, 5, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(66, 'Mesa 2', 'Salón', 'CANCELADO', '2026-06-17 13:39:54.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(67, 'Mesa 6', 'Salón', 'CANCELADO', '2026-06-17 13:41:05.000000', NULL, NULL, NULL, NULL, 35, NULL, 6, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(68, 'Mesa 2 - Ticket 1', 'Salón', 'PAGADO', '2026-06-17 13:42:40.000000', '2026-06-17 13:42:40.000000', NULL, NULL, NULL, 35, NULL, 2, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(69, 'Mesa #25', '', 'CANCELADO', '2026-06-18 09:22:36.000000', NULL, NULL, NULL, NULL, 0, NULL, 25, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(70, 'Mesa 25 - Ticket 1', 'Salón', 'PAGADO', '2026-06-18 09:30:20.000000', '2026-06-18 09:30:20.000000', NULL, NULL, NULL, 35, NULL, 25, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(71, 'Mesa #25', '', 'CANCELADO', '2026-06-18 09:35:06.000000', NULL, NULL, NULL, NULL, 0, NULL, 25, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(72, 'Mesa #25', '', 'CANCELADO', '2026-06-18 09:40:50.000000', NULL, NULL, NULL, NULL, 0, NULL, 25, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(73, 'Mesa #25', '', 'CANCELADO', '2026-06-18 09:42:52.000000', NULL, NULL, NULL, NULL, 0, NULL, 25, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(74, 'Mesa #27', '', 'CANCELADO', '2026-06-18 09:52:59.000000', NULL, NULL, NULL, NULL, 0, NULL, 27, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(75, 'Mesa #28', '', 'CANCELADO', '2026-06-18 09:59:29.000000', NULL, NULL, NULL, NULL, 0, NULL, 28, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(76, 'Mesa #26', '', 'CANCELADO', '2026-06-18 10:02:03.000000', NULL, NULL, NULL, NULL, 0, NULL, 26, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(77, 'Mesa #25', '', 'CANCELADO', '2026-06-18 10:04:51.000000', NULL, NULL, NULL, NULL, 0, NULL, 25, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(78, 'Mesa #26', '', 'CANCELADO', '2026-06-18 10:05:54.000000', NULL, NULL, NULL, NULL, 0, NULL, 26, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(79, 'Mesa #22', '', 'CANCELADO', '2026-06-18 10:10:13.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(80, 'Mesa 30', '', 'CANCELADO', '2026-06-18 10:14:26.000000', '2026-06-20 16:24:14.000000', NULL, NULL, NULL, 140, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(81, 'Mesa #1', '', 'CANCELADO', '2026-06-18 10:23:24.000000', NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(82, 'Mesa #25', '', 'CANCELADO', '2026-06-18 10:34:22.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(83, 'Mesa #1', '', 'CANCELADO', '2026-06-18 12:37:58.000000', NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(84, 'Mesa #3', '', 'CANCELADO', '2026-06-18 12:44:07.000000', NULL, NULL, NULL, NULL, 20, NULL, 3, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(85, 'Mesa #6', '', 'ASIGNADO', '2026-06-18 12:56:52.000000', NULL, NULL, NULL, NULL, 20, NULL, 6, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(86, 'Mesa 2', '', 'PAGADO', '2026-06-18 14:44:53.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(87, 'Mesa 2 - Ticket 1', 'Salón', 'PAGADO', '2026-06-18 14:58:08.000000', '2026-06-18 14:58:08.000000', NULL, NULL, NULL, 35, NULL, 2, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(88, 'Mesa #1', '', 'PAGADO', '2026-06-18 14:58:52.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(89, 'Mesa 1 - Ticket 1', 'Salón', 'PAGADO', '2026-06-18 14:59:21.000000', '2026-06-18 14:59:21.000000', NULL, NULL, NULL, 20, NULL, 1, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(90, 'Mesa #1', '', 'CANCELADO', '2026-06-19 09:11:27.000000', '2026-06-19 14:29:52.000000', NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(91, 'Mesa #29', '', 'PAGADO', '2026-06-19 11:21:13.000000', NULL, NULL, NULL, NULL, 60, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(92, 'Mesa 29 - Ticket 1', 'Salón', 'PAGADO', '2026-06-19 11:39:49.000000', '2026-06-19 11:39:49.000000', NULL, NULL, NULL, 60, NULL, 29, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(93, 'Mesa #29', '', 'PAGADO', '2026-06-19 11:40:27.000000', '2026-06-19 11:56:44.000000', NULL, NULL, NULL, 55, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(94, 'Mesa #17', '', 'PAGADO', '2026-06-19 11:57:18.000000', '2026-06-19 11:59:51.000000', NULL, NULL, NULL, 75, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(95, 'Mesa #17', '', 'PAGADO', '2026-06-19 12:39:01.000000', '2026-06-19 12:40:16.000000', NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(96, 'Mesa #17 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 12:40:16.000000', '2026-06-19 12:40:16.000000', NULL, NULL, NULL, 35, NULL, NULL, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(97, 'Mesa #15', '', 'CANCELADO', '2026-06-19 12:44:39.000000', '2026-06-19 12:45:50.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(98, 'Mesa #15 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 12:45:50.000000', '2026-06-19 12:45:50.000000', NULL, NULL, NULL, 30, NULL, 15, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(99, 'Mesa #21', '', 'CANCELADO', '2026-06-19 12:46:58.000000', '2026-06-19 12:50:08.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(100, 'Mesa #21 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 12:48:31.000000', '2026-06-19 12:48:31.000000', NULL, NULL, NULL, 10, NULL, 21, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(101, 'Mesa #21 (Ticket 2)', 'Salón', 'PAGADO', '2026-06-19 12:48:31.000000', '2026-06-19 12:48:31.000000', NULL, NULL, NULL, 10, NULL, 21, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(102, 'Mesa #21 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 12:50:08.000000', '2026-06-19 12:50:08.000000', NULL, NULL, NULL, 10, NULL, 21, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(103, 'Mesa #21 (Ticket 2)', 'Salón', 'PAGADO', '2026-06-19 12:50:08.000000', '2026-06-19 12:50:08.000000', NULL, NULL, NULL, 10, NULL, 21, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(104, 'Mesa #4', '', 'CANCELADO', '2026-06-19 12:53:36.000000', '2026-06-19 14:28:27.000000', NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(105, 'Mesa #4 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 12:54:11.000000', '2026-06-19 12:54:11.000000', NULL, NULL, NULL, 20, NULL, 4, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(106, 'Mesa #4 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 12:55:44.000000', '2026-06-19 12:55:44.000000', NULL, NULL, NULL, 20, NULL, 4, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(107, 'Mesa #4 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 13:38:22.000000', '2026-06-19 13:38:22.000000', NULL, NULL, NULL, 20, NULL, 4, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(108, 'Mesa #4 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 13:47:07.000000', '2026-06-19 13:47:07.000000', NULL, NULL, NULL, 20, NULL, 4, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(109, 'Mesa #4 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 14:28:27.000000', '2026-06-19 14:28:27.000000', NULL, NULL, NULL, 35, NULL, 4, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(110, 'Mesa #1 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-19 14:29:52.000000', '2026-06-19 14:29:52.000000', NULL, NULL, NULL, 35, NULL, 1, NULL, 0, 0, NULL, NULL, 'SIN DOCUMENTO', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(111, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-19 16:20:44.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, 'V-740080993', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(112, 'José Tafur', 'Arcangel, Avenida Luis Gonzáles, Chiclayo', 'PREPARADO', '2026-06-19 16:30:08.000000', NULL, NULL, -6.772534981068852, -79.84210906485879, 20, NULL, NULL, 'DELIVERY', 1, 1, NULL, NULL, 'V-1573772617', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(114, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-19 19:53:00.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'0'),
(115, 'José Tafur', 'Virgen de la Paz, Chiclayo, Lambayeque', 'CANCELADO', '2026-06-19 20:28:53.000000', NULL, NULL, -6.781279149204672, -79.86077785491945, 30, NULL, NULL, 'DELIVERY', 0, 0, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'0'),
(116, 'Mesa #1', '', 'PAGADO', '2026-06-20 06:58:48.000000', NULL, NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, 'B001-00000001', NULL, NULL, NULL, 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000001.pdf', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(117, 'Mesa #1', '', 'PAGADO', '2026-06-20 08:28:06.000000', NULL, NULL, NULL, NULL, 35, NULL, 1, NULL, 1, 1, 'B001-00000002', NULL, NULL, NULL, 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000002.pdf', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(118, 'Mesa #17', '', 'CANCELADO', '2026-06-20 10:22:11.000000', '2026-06-20 10:23:17.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(119, 'Mesa #17 (Ticket 1)', 'Salón', 'ANULADO', '2026-06-20 10:23:17.000000', '2026-06-20 10:23:17.000000', NULL, NULL, NULL, 20, NULL, 17, NULL, 0, 0, 'B001-00000003', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000003.pdf', NULL, 'TARJETA', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000003.XML', NULL, NULL, NULL, NULL, b'0'),
(120, 'Mesa #27', '', 'CANCELADO', '2026-06-20 10:40:03.000000', '2026-06-20 10:41:23.000000', NULL, NULL, NULL, 55, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(121, 'Mesa #27 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-20 10:41:23.000000', '2026-06-20 10:41:23.000000', NULL, NULL, NULL, 35, NULL, 27, NULL, 0, 0, 'B001-00000008', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000008.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000008.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000008.XML', NULL, NULL, NULL, NULL, b'0'),
(122, 'Mesa #27 (Ticket 2)', 'Salón', 'ANULADO', '2026-06-20 10:41:23.000000', '2026-06-20 10:41:23.000000', NULL, NULL, NULL, 20, NULL, 27, NULL, 0, 0, 'F001-00000001', NULL, '20611654571', 'FACTURA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-01-F001-00000001.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'TARJETA', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-01-F001-00000001.XML', NULL, NULL, NULL, NULL, b'0'),
(123, 'Mesa #12', '', 'CANCELADO', '2026-06-20 12:51:10.000000', '2026-06-20 12:51:38.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(124, 'Mesa #12 (Ticket 1)', 'Salón', 'ANULADO', '2026-06-20 12:51:38.000000', '2026-06-20 12:51:38.000000', NULL, NULL, NULL, 20, NULL, 12, NULL, 0, 0, 'B001-00000004', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000004.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000004.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000004.XML', 'NC-PROVISIONAL', NULL, NULL, NULL, b'0'),
(125, 'Mesa #10', '', 'CANCELADO', '2026-06-20 12:59:13.000000', '2026-06-20 12:59:42.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(126, 'Mesa #10 (Ticket 1)', 'Salón', 'ANULADO', '2026-06-20 12:59:42.000000', '2026-06-20 12:59:42.000000', NULL, NULL, NULL, 20, NULL, 10, NULL, 0, 0, 'B001-00000005', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000005.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000005.pdf', 'TARJETA', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000005.XML', 'BC01-00000006', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000006.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000006.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000006.XML', b'0'),
(127, 'Mesa #19', '', 'CANCELADO', '2026-06-20 14:03:29.000000', '2026-06-20 14:04:15.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(128, 'MESA #19', 'Salón', 'PAGADO', '2026-06-20 14:04:15.000000', '2026-06-20 14:04:15.000000', NULL, NULL, NULL, 20, NULL, 19, NULL, 0, 0, 'B001-00000010', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000010.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000010.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000010.XML', 'BC01-00000007', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000007.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000007.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000007.XML', b'0'),
(129, 'Mesa #13', '', 'CANCELADO', '2026-06-20 15:42:55.000000', '2026-06-20 15:43:24.000000', NULL, NULL, NULL, 50, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(130, 'Mesa #13 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-20 15:43:24.000000', '2026-06-20 15:43:24.000000', NULL, NULL, NULL, 0, NULL, 13, NULL, 0, 0, 'B001-00000007', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000007.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000007.pdf', 'EFECTIVO', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000007.XML', NULL, NULL, NULL, NULL, b'0'),
(131, 'Mesa 30 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-20 16:24:14.000000', '2026-06-20 16:24:14.000000', NULL, NULL, NULL, 70, NULL, 30, NULL, 0, 0, 'B001-00000009', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000009.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000009.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000009.XML', NULL, NULL, NULL, NULL, b'0'),
(132, 'MESA #10', 'Salón', 'PAGADO', '2026-06-20 17:27:38.000000', NULL, NULL, NULL, NULL, 20, NULL, 10, NULL, 0, 0, 'B001-00000011', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000011.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000011.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000011.XML', NULL, NULL, NULL, NULL, b'0'),
(133, 'Mesa #10', '', 'CANCELADO', '2026-06-20 17:33:21.000000', '2026-06-20 17:42:51.000000', NULL, NULL, NULL, 40, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(134, 'Mesa #10 (Ticket 1)', 'Salón', 'ANULADO', '2026-06-20 17:42:51.000000', '2026-06-20 17:42:51.000000', NULL, NULL, NULL, 0, NULL, 10, NULL, 0, 0, 'B001-00000012', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000012.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000012.pdf', 'TARJETA', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000012.XML', NULL, NULL, NULL, NULL, b'0'),
(135, 'MESA #10', 'Salón', 'CANCELADO', '2026-06-20 17:51:41.000000', NULL, NULL, NULL, NULL, 0, NULL, 10, NULL, 0, 0, 'B001-00000013', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000013.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000013.pdf', 'PLIN', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000013.XML', 'BC01-00000008', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000008.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000008.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000008.XML', b'0'),
(136, 'Mesa #10', '', 'CANCELADO', '2026-06-20 18:05:33.000000', '2026-06-20 18:06:34.000000', NULL, NULL, NULL, 35, NULL, NULL, NULL, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(137, 'Mesa #10 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-20 18:06:34.000000', '2026-06-20 18:06:34.000000', NULL, NULL, NULL, 21, NULL, 10, NULL, 0, 0, 'B001-00000015', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000015.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000015.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000015.XML', NULL, NULL, NULL, NULL, b'0'),
(138, 'Mesa #10 (Ticket 2)', 'Salón', 'ANULADO', '2026-06-20 18:06:34.000000', '2026-06-20 18:06:34.000000', NULL, NULL, NULL, 14, NULL, 10, NULL, 0, 0, 'B001-00000014', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000014.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000014.pdf', 'TARJETA', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000014.XML', 'BC01-00000009', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000009.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000009.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000009.XML', b'0'),
(139, 'José Tafur', 'Urb. Monterrico V, Chiclayo, Lambayeque', 'PREPARADO', '2026-06-20 18:13:10.000000', NULL, NULL, -6.784713942767902, -79.85925118412139, 20, NULL, NULL, 'DELIVERY', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(140, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'CANCELADO', '2026-06-20 18:25:36.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 0, 0, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'0'),
(141, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 18:32:19.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(142, 'When pruebas', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 18:42:19.000000', NULL, NULL, NULL, NULL, 35, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(143, 'When pruebas', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 18:43:12.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(144, 'test', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 18:46:02.000000', '2026-06-21 07:19:34.000000', NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, '', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', 'V-24828246', NULL, NULL, NULL, NULL, NULL, b'1'),
(145, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 18:48:08.000000', '2026-06-20 21:32:59.000000', NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-30410757', NULL, NULL, NULL, NULL, NULL, b'1'),
(146, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 18:50:33.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-30410757', NULL, NULL, NULL, NULL, NULL, b'1'),
(147, 'José Tafur', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PREPARADO', '2026-06-20 19:22:59.000000', NULL, NULL, NULL, NULL, 20, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, 'BOLETA', NULL, NULL, 'YAPE', NULL, 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(148, 'Mesa #2', '', 'CANCELADO', '2026-06-20 20:14:52.000000', '2026-06-20 20:17:37.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(149, 'Mesa #2 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-20 20:17:37.000000', '2026-06-20 20:17:37.000000', NULL, NULL, NULL, 20, NULL, 2, NULL, 0, 0, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(150, 'CARTA PRUEBA', 'Robert\'s, Calle Juan Cuglievan, Chiclayo', 'PREPARADO', '2026-06-20 20:19:33.000000', NULL, NULL, -6.768141232896004, -79.84063407481273, 30, NULL, NULL, 'DELIVERY', 1, 1, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(151, 'Mesa #10', '', 'ASIGNADO', '2026-06-20 20:31:15.000000', NULL, NULL, NULL, NULL, 70, NULL, 10, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(152, 'Mesa #11', '', 'PREPARADO', '2026-06-20 20:41:10.000000', NULL, NULL, NULL, NULL, 35, NULL, 11, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(153, 'Mesa #17', '', 'CANCELADO', '2026-06-20 20:56:34.000000', '2026-06-20 21:12:52.000000', NULL, NULL, NULL, 20, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(154, 'Mesa #17 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-20 21:12:52.000000', '2026-06-20 21:12:52.000000', NULL, NULL, NULL, 20, NULL, 17, NULL, 0, 0, 'B001-00000016', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000016.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000016.pdf', 'TARJETA', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000016.XML', NULL, NULL, NULL, NULL, b'0'),
(155, 'TEST', 'El Cumbe, Avenida José Quiñones Gonzales, Chiclayo', 'PREPARADO', '2026-06-20 21:18:12.000000', NULL, NULL, -6.770328862544762, -79.83325512993753, 30, NULL, NULL, 'DELIVERY', 1, 1, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'1'),
(156, 'dadasad', 'Avenida José Leonardo Ortíz, Urbanización Hipólito Unanue, Chiclayo', 'PAGADO', '2026-06-20 21:33:35.000000', '2026-06-20 21:33:55.000000', NULL, -6.773482442330517, -79.8457821758884, 35, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000017', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000017.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000017.pdf', 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000017.XML', NULL, NULL, NULL, NULL, b'0'),
(157, 'TESTCORREO', 'Calle Los Higos, Monterrico III, Chiclayo', 'ANULADO', '2026-06-20 23:43:43.000000', '2026-06-20 23:44:05.000000', NULL, -6.786563394431993, -79.85700130462648, 20, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000018', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000018.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000018.pdf', 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000018.XML', 'BC01-00000014', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000014.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000014.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000014.XML', b'0'),
(158, 'TESTCORREOdos', 'Cubas Quijano, Urbanización El Amauta, Chiclayo', 'ANULADO', '2026-06-21 07:22:05.000000', '2026-06-21 07:22:34.000000', NULL, -6.788012290251975, -79.8510789871216, 55, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000019', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000019.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000019.pdf', 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000019.XML', 'BC01-00000010', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000010.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000010.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000010.XML', b'0'),
(159, 'MESA', 'Cubas Quijano, Urbanización El Amauta, Chiclayo', 'ANULADO', '2026-06-21 07:46:05.000000', NULL, NULL, NULL, NULL, 55, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000020', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000020.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000020.pdf', 'PLIN', 'dashpan806@gmail.com', NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000020.XML', 'BC01-00000011', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000011.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000011.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000011.XML', b'0'),
(160, 'MESA #', 'Cubas Quijano, Urbanización El Amauta, Chiclayo', 'ANULADO', '2026-06-21 07:54:49.000000', NULL, NULL, NULL, NULL, 55, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000021', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000021.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000021.pdf', 'TARJETA', 'dashpan806@gmail.com', NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000021.XML', 'BC01-00000012', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000012.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000012.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000012.XML', b'0'),
(161, 'MESA #', 'Cubas Quijano, Urbanización El Amauta, Chiclayo', 'ANULADO', '2026-06-21 08:00:02.000000', NULL, NULL, NULL, NULL, 55, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000022', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000022.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000022.pdf', 'YAPE', 'dashpan806@gmail.com', NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000022.XML', 'BC01-00000013', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000013.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000013.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000013.XML', b'0'),
(162, 'MESA #', 'Cubas Quijano, Urbanización El Amauta, Chiclayo', 'ANULADO', '2026-06-21 08:12:21.000000', NULL, NULL, NULL, NULL, 55, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000023', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000023.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000023.pdf', 'YAPE', 'dashpan806@gmail.com', NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000023.XML', 'BC01-00000015', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/a4/20000000001-07-BC01-00000015.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/note/ticket/20000000001-07-BC01-00000015.pdf', 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-07-BC01-00000015.XML', b'0'),
(163, 'MESA #', 'Cubas Quijano, Urbanización El Amauta, Chiclayo', 'PAGADO', '2026-06-21 08:17:08.000000', '2026-06-21 08:17:07.000000', NULL, NULL, NULL, 55, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000024', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000024.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000024.pdf', 'TARJETA', 'dashpan806@gmail.com', NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000024.XML', NULL, NULL, NULL, NULL, b'0'),
(164, 'Mesa #27', '', 'CANCELADO', '2026-06-21 09:42:25.000000', '2026-06-21 09:43:58.000000', NULL, NULL, NULL, 35, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(165, 'Mesa #27 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-21 09:43:58.000000', '2026-06-21 09:43:58.000000', NULL, NULL, NULL, 35, NULL, 27, 'LOCAL', 0, 0, 'B001-00000025', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000025.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000025.pdf', 'EFECTIVO', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000025.XML', NULL, NULL, NULL, NULL, b'0'),
(166, 'Mesa 1', '', 'PREPARADO', '2026-06-21 11:38:21.000000', NULL, NULL, NULL, NULL, 135, NULL, 1, 'LOCAL', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(167, 'Mesa 2', '', 'CANCELADO', '2026-06-21 12:16:20.000000', '2026-06-21 17:42:21.000000', NULL, NULL, NULL, 35, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(168, 'Mesa 30', '', 'EN_COCINA', '2026-06-21 12:49:24.000000', NULL, NULL, NULL, NULL, 50, NULL, 30, 'LOCAL', 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(169, 'Mesa 29', '', 'PREPARADO', '2026-06-21 12:50:07.000000', NULL, NULL, NULL, NULL, 55, NULL, 29, 'LOCAL', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1');
INSERT INTO `pedido` (`id`, `cliente_nombre`, `direccion_entrega`, `estado`, `fecha_creacion`, `fecha_entrega`, `fecha_salida`, `latitud`, `longitud`, `monto_total`, `id_repartidor`, `numero_mesa`, `tipo_pedido`, `frio_listo`, `caliente_listo`, `comprobante_numero`, `comprobante_tipo`, `documento_cliente`, `preferencia_comprobante`, `comprobante_pdf_url`, `comprobante_a4_url`, `metodo_pago`, `cliente_correo`, `codigo_pago_operacion`, `comprobante_xml_contenido`, `comprobante_nota_numero`, `nota_a4_url`, `nota_pdf_url`, `nota_xml_contenido`, `ticket_impreso_cocina`) VALUES
(171, 'José Tafur', 'RosaTel, 293, Calle Tacna', 'PREPARADO', '2026-06-21 17:26:48.000000', NULL, NULL, -6.7746611819587255, -79.8413367996792, 35, NULL, NULL, 'DELIVERY', 1, 1, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'TARJETA', 'dashpan806@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(172, 'Mesa 2 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-21 17:40:54.000000', '2026-06-21 17:40:54.000000', NULL, NULL, NULL, 55, NULL, 2, 'LOCAL', 0, 0, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'TARJETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(173, 'Mesa 2 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-21 17:42:21.000000', '2026-06-21 17:42:21.000000', NULL, NULL, NULL, 35, NULL, 2, 'LOCAL', 0, 0, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'YAPE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(174, 'José Tafur', 'Recojo en local', 'EN_COCINA', '2026-06-21 18:17:00.000000', NULL, NULL, 0, 0, 105, NULL, NULL, 'LOCAL', 0, 0, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'PLIN', 'dashpan806@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(175, 'Mesa 3', '', 'CANCELADO', '2026-06-21 18:18:54.000000', '2026-06-21 23:22:33.000000', NULL, NULL, NULL, 70, NULL, NULL, 'LOCAL', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(176, 'Mesa 4', '', 'CANCELADO', '2026-06-21 21:33:06.000000', NULL, NULL, NULL, NULL, 0, NULL, 4, 'LOCAL', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0'),
(177, 'José Tafur', 'Avenida Luis Gonzáles, Chiclayo, Lambayeque', 'PREPARADO', '2026-06-21 22:05:09.000000', NULL, NULL, -6.768863342045648, -79.84193801879884, 70, NULL, NULL, 'DELIVERY', 1, 1, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'PLIN', 'dashpan806@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, b'1'),
(178, 'José Tafur', 'Urbanización Hipólito Unanue, Chiclayo, Lambayeque', 'PENDIENTE', '2026-06-21 22:53:05.000000', NULL, NULL, -6.781702636719934, -79.84944820404054, 105, NULL, NULL, 'DELIVERY', 0, 0, NULL, NULL, '60812709', 'BOLETA', NULL, NULL, 'YAPE', 'dashpan806@gmail.com', 'V-24828246-CHECK-MANUAL', NULL, NULL, NULL, NULL, NULL, b'0'),
(179, 'José Tafur', 'Institución Educativa 10021 San José, 167, Avenida Elvira García', 'PAGADO', '2026-06-21 23:11:41.000000', NULL, NULL, -6.774621823294735, -79.84837532043457, 35, NULL, NULL, 'DELIVERY', 0, 0, 'B001-00000026', NULL, '60812709', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000026.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000026.pdf', 'TARJETA', 'dashpan806@gmail.com', NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000026.XML', NULL, NULL, NULL, NULL, b'0'),
(180, 'Mesa 3 (Ticket 1)', 'Salón', 'PAGADO', '2026-06-21 23:22:33.000000', '2026-06-21 23:22:33.000000', NULL, NULL, NULL, 70, NULL, 3, 'LOCAL', 0, 0, 'B001-00000027', NULL, 'SIN DOCUMENTO', 'BOLETA', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/ticket/20000000001-03-B001-00000027.pdf', 'https://miapi.cloud/apifact/documents/pdf/20000000001/invoice/a4/20000000001-03-B001-00000027.pdf', 'YAPE', NULL, NULL, 'https://miapi.cloud/apifact/documents/xml/20000000001/signed/20000000001-03-B001-00000027.XML', NULL, NULL, NULL, NULL, b'0');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_detalle`
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

--
-- Volcado de datos para la tabla `pedido_detalle`
--

INSERT INTO `pedido_detalle` (`id`, `cantidad`, `precio_unitario`, `subtotal`, `id_pedido`, `id_producto`, `cocinado`, `entregado`, `cancelado_por_cliente`, `impreso_en_cocina`, `pagado`) VALUES
(15, 1, 35, 35, 1, NULL, b'1', b'1', b'0', b'0', b'1'),
(17, 1, 10, 10, 3, NULL, b'1', b'1', b'0', b'0', b'1'),
(18, 1, 10, 10, 4, NULL, b'1', b'1', b'0', b'0', b'1'),
(19, 1, 35, 35, 2, NULL, b'1', b'1', b'0', b'0', b'1'),
(21, 1, 35, 35, 5, NULL, b'1', b'1', b'0', b'0', b'1'),
(23, 1, 35, 35, 6, NULL, b'1', b'1', b'0', b'0', b'1'),
(27, 1, 35, 35, 7, NULL, b'1', b'1', b'0', b'0', b'1'),
(33, 1, 20, 20, 8, 23, b'1', b'1', b'0', b'0', b'1'),
(34, 1, 20, 20, 8, 24, b'1', b'1', b'0', b'0', b'1'),
(35, 1, 20, 20, 8, 23, b'1', b'1', b'0', b'0', b'1'),
(38, 1, 8, 8, 11, 25, b'1', b'1', b'0', b'0', b'1'),
(39, 1, 8, 8, 11, 23, b'1', b'1', b'0', b'0', b'1'),
(40, 1, 12, 12, 11, 24, b'1', b'1', b'0', b'0', b'1'),
(41, 1, 12, 12, 12, 25, b'1', b'1', b'0', b'0', b'1'),
(42, 1, 12, 12, 12, 23, b'1', b'1', b'0', b'0', b'1'),
(43, 1, 18, 18, 12, 24, b'1', b'1', b'0', b'0', b'1'),
(45, 1, 35, 35, 13, 22, b'1', b'1', b'0', b'0', b'1'),
(48, 1, 35, 35, 14, 22, b'1', b'1', b'0', b'0', b'1'),
(52, 1, 35, 35, 16, 22, b'1', b'1', b'0', b'0', b'1'),
(55, 1, 35, 35, 18, 22, b'1', b'1', b'0', b'0', b'1'),
(58, 1, 20, 20, 20, 23, b'1', b'1', b'0', b'0', b'1'),
(59, 1, 30, 30, 21, 25, b'1', b'1', b'0', b'0', b'1'),
(61, 1, 20, 20, 24, 24, b'1', b'0', b'0', b'1', b'0'),
(63, 1, 35, 35, 26, 22, b'1', b'1', b'0', b'0', b'1'),
(66, 1, 20, 20, 28, 23, b'1', b'1', b'0', b'0', b'1'),
(67, 1, 30, 30, 29, 25, b'1', b'1', b'0', b'0', b'1'),
(68, 1, 35, 35, 80, 22, b'1', b'1', b'0', b'1', b'1'),
(69, 1, 35, 35, 24, 22, b'0', b'0', b'0', b'0', b'0'),
(71, 1, 20, 20, 65, 23, b'1', b'1', b'0', b'0', b'1'),
(72, 1, 35, 35, 68, 22, b'1', b'1', b'0', b'0', b'1'),
(75, 1, 35, 35, 70, 23, b'1', b'1', b'0', b'0', b'1'),
(84, 1, 35, 35, 80, 22, b'1', b'1', b'0', b'1', b'1'),
(85, 1, 35, 35, 80, 22, b'1', b'1', b'0', b'1', b'1'),
(87, 1, 35, 35, 80, 22, b'1', b'1', b'0', b'1', b'1'),
(90, 1, 20, 20, 85, 23, b'1', b'1', b'0', b'1', b'0'),
(92, 1, 35, 35, 87, 22, b'1', b'1', b'0', b'0', b'1'),
(94, 1, 20, 20, 89, 23, b'1', b'1', b'0', b'0', b'1'),
(95, 1, 35, 35, 90, 22, b'1', b'1', b'0', b'1', b'1'),
(99, 1, 20, 20, 92, 23, b'1', b'1', b'0', b'0', b'1'),
(100, 1, 20, 20, 92, 24, b'1', b'1', b'0', b'0', b'1'),
(101, 1, 20, 20, 92, 24, b'1', b'1', b'0', b'0', b'1'),
(102, 1, 20, 20, 93, 23, b'1', b'1', b'0', b'1', b'1'),
(103, 1, 35, 35, 93, 22, b'1', b'1', b'0', b'1', b'1'),
(104, 1, 35, 35, 94, 22, b'1', b'1', b'0', b'1', b'1'),
(105, 1, 20, 20, 94, 24, b'1', b'1', b'0', b'1', b'1'),
(106, 1, 20, 20, 94, 23, b'1', b'1', b'0', b'1', b'1'),
(107, 1, 35, 35, 95, 22, b'1', b'1', b'0', b'1', b'1'),
(108, 1, 35, 35, 96, 22, b'1', b'1', b'0', b'0', b'1'),
(109, 1, 30, 30, 97, 25, b'1', b'1', b'0', b'1', b'1'),
(110, 1, 30, 30, 98, 25, b'1', b'1', b'0', b'0', b'1'),
(111, 1, 20, 20, 99, 23, b'1', b'1', b'0', b'1', b'1'),
(112, 1, 20, 20, 99, 24, b'1', b'1', b'0', b'1', b'1'),
(113, 1, 10, 10, 100, 23, b'1', b'1', b'0', b'0', b'1'),
(114, 1, 10, 10, 101, 23, b'1', b'1', b'0', b'0', b'1'),
(115, 1, 10, 10, 102, 23, b'1', b'1', b'0', b'0', b'1'),
(116, 1, 10, 10, 103, 23, b'1', b'1', b'0', b'0', b'1'),
(117, 1, 35, 35, 104, 22, b'1', b'0', b'0', b'1', b'1'),
(118, 1, 20, 20, 104, 24, b'1', b'1', b'0', b'1', b'1'),
(119, 1, 20, 20, 105, 22, b'1', b'1', b'0', b'0', b'1'),
(120, 1, 20, 20, 104, 24, b'1', b'1', b'0', b'1', b'1'),
(121, 1, 20, 20, 104, 23, b'1', b'1', b'0', b'1', b'1'),
(122, 1, 20, 20, 106, 22, b'1', b'1', b'0', b'0', b'1'),
(123, 1, 20, 20, 107, 22, b'1', b'1', b'0', b'0', b'1'),
(124, 1, 20, 20, 104, 23, b'1', b'1', b'0', b'1', b'1'),
(125, 1, 20, 20, 108, 23, b'1', b'1', b'0', b'0', b'1'),
(126, 1, 35, 35, 109, 22, b'1', b'1', b'0', b'0', b'1'),
(127, 1, 35, 35, 110, 22, b'1', b'1', b'0', b'0', b'1'),
(128, 1, 20, 20, 111, 23, b'1', b'0', b'0', b'1', b'0'),
(129, 1, 20, 20, 112, 23, b'1', b'0', b'0', b'1', b'0'),
(131, 1, 30, 30, 114, 25, b'1', b'0', b'0', b'1', b'0'),
(132, 1, 30, 30, 115, 25, b'0', b'0', b'0', b'0', b'0'),
(133, 1, 35, 35, 116, 22, b'1', b'1', b'0', b'1', b'0'),
(134, 1, 35, 35, 117, 22, b'1', b'1', b'0', b'1', b'0'),
(135, 1, 20, 20, 118, 23, b'1', b'1', b'0', b'1', b'1'),
(136, 1, 20, 20, 119, 23, b'1', b'1', b'0', b'0', b'1'),
(137, 1, 35, 35, 120, 22, b'1', b'1', b'0', b'1', b'1'),
(138, 1, 20, 20, 120, 24, b'1', b'1', b'0', b'1', b'1'),
(139, 1, 35, 35, 121, 22, b'1', b'1', b'0', b'0', b'1'),
(140, 1, 20, 20, 122, 24, b'1', b'1', b'0', b'0', b'1'),
(141, 1, 20, 20, 123, 24, b'1', b'1', b'0', b'1', b'1'),
(142, 1, 20, 20, 124, 24, b'1', b'1', b'0', b'0', b'1'),
(143, 1, 20, 20, 125, 23, b'1', b'1', b'0', b'1', b'1'),
(144, 1, 20, 20, 126, 23, b'1', b'1', b'0', b'0', b'1'),
(145, 1, 20, 20, 127, 24, b'1', b'1', b'0', b'1', b'1'),
(146, 1, 20, 20, 128, 24, b'1', b'1', b'0', b'0', b'1'),
(147, 1, 20, 20, 129, 23, b'1', b'1', b'0', b'1', b'1'),
(148, 1, 30, 30, 129, 25, b'1', b'1', b'0', b'1', b'1'),
(151, 1, 35, 35, 131, 22, b'1', b'1', b'0', b'0', b'1'),
(154, 1, 35, 35, 131, 22, b'1', b'1', b'0', b'0', b'1'),
(155, 1, 20, NULL, 132, 23, b'0', b'0', b'0', b'0', b'0'),
(156, 1, 20, 20, 133, 23, b'1', b'0', b'0', b'1', b'1'),
(157, 1, 20, 20, 133, 24, b'1', b'0', b'0', b'1', b'1'),
(158, 1, 20, 20, 134, 24, b'1', b'1', b'0', b'0', b'1'),
(159, 1, 20, 20, 134, 23, b'1', b'1', b'0', b'0', b'1'),
(161, 1, 35, 35, 136, 22, b'0', b'0', b'0', b'1', b'1'),
(162, 1, 21, 21, 137, 22, b'1', b'1', b'0', b'0', b'1'),
(163, 1, 14, 14, 138, 22, b'1', b'1', b'0', b'0', b'1'),
(164, 1, 20, 20, 139, 24, b'1', b'0', b'0', b'1', b'0'),
(165, 1, 20, 20, 140, 24, b'0', b'0', b'0', b'0', b'0'),
(166, 1, 20, 20, 141, 24, b'1', b'0', b'0', b'1', b'0'),
(167, 1, 35, 35, 142, 22, b'1', b'0', b'0', b'1', b'0'),
(168, 1, 20, 20, 143, 24, b'1', b'0', b'0', b'1', b'0'),
(169, 1, 20, 20, 144, 24, b'1', b'0', b'0', b'1', b'0'),
(170, 1, 20, 20, 145, 24, b'1', b'0', b'0', b'1', b'0'),
(171, 1, 20, 20, 146, 24, b'1', b'0', b'0', b'1', b'0'),
(172, 1, 20, 20, 147, 23, b'1', b'0', b'0', b'1', b'0'),
(173, 1, 20, 20, 148, 23, b'0', b'0', b'0', b'1', b'1'),
(174, 1, 20, 20, 149, 23, b'1', b'1', b'0', b'0', b'1'),
(175, 1, 30, 30, 150, 25, b'1', b'0', b'0', b'1', b'0'),
(176, 1, 20, 20, 151, 23, b'1', b'1', b'0', b'1', b'0'),
(177, 1, 20, 20, 151, 24, b'1', b'1', b'0', b'1', b'0'),
(178, 1, 30, 30, 151, 25, b'1', b'1', b'0', b'1', b'0'),
(179, 1, 35, 35, 152, 22, b'1', b'0', b'0', b'1', b'0'),
(180, 1, 20, 20, 153, 24, b'1', b'1', b'0', b'1', b'1'),
(181, 1, 20, 20, 154, 24, b'1', b'1', b'0', b'0', b'1'),
(182, 1, 30, 30, 155, 25, b'1', b'0', b'0', b'1', b'0'),
(183, 1, 35, 35, 156, 22, b'0', b'0', b'0', b'0', b'0'),
(184, 1, 20, 20, 157, 23, b'0', b'0', b'0', b'0', b'0'),
(185, 1, 35, 35, 158, 22, b'0', b'0', b'0', b'0', b'0'),
(186, 1, 20, 20, 158, 24, b'0', b'0', b'0', b'0', b'0'),
(187, 1, 35, NULL, 159, 22, b'0', b'0', b'0', b'0', b'0'),
(188, 1, 20, NULL, 159, 24, b'0', b'0', b'0', b'0', b'0'),
(189, 1, 35, NULL, 160, 22, b'0', b'0', b'0', b'0', b'0'),
(190, 1, 20, NULL, 160, 24, b'0', b'0', b'0', b'0', b'0'),
(191, 1, 35, NULL, 161, 22, b'0', b'0', b'0', b'0', b'0'),
(192, 1, 20, NULL, 161, 24, b'0', b'0', b'0', b'0', b'0'),
(193, 1, 35, NULL, 162, 22, b'0', b'0', b'0', b'0', b'0'),
(194, 1, 20, NULL, 162, 24, b'0', b'0', b'0', b'0', b'0'),
(195, 1, 35, NULL, 163, 22, b'0', b'0', b'0', b'0', b'0'),
(196, 1, 20, NULL, 163, 24, b'0', b'0', b'0', b'0', b'0'),
(197, 1, 35, 35, 164, 22, b'1', b'1', b'0', b'1', b'1'),
(198, 1, 35, 35, 165, 22, b'1', b'1', b'0', b'0', b'1'),
(199, 1, 35, 35, 166, 22, b'1', b'1', b'0', b'1', b'0'),
(200, 1, 30, 30, 166, 25, b'1', b'0', b'0', b'1', b'0'),
(201, 1, 35, 35, 166, 22, b'1', b'0', b'0', b'1', b'0'),
(202, 1, 35, 35, 166, 22, b'1', b'0', b'0', b'1', b'0'),
(203, 1, 35, 35, 167, 22, b'1', b'1', b'0', b'1', b'1'),
(204, 1, 20, 20, 167, 23, b'1', b'1', b'0', b'1', b'1'),
(205, 1, 20, 20, 168, 23, b'0', b'0', b'0', b'0', b'0'),
(206, 1, 30, 30, 168, 25, b'0', b'0', b'0', b'0', b'0'),
(207, 1, 35, 35, 169, 22, b'1', b'0', b'0', b'1', b'0'),
(208, 1, 20, 20, 169, 24, b'1', b'0', b'0', b'1', b'0'),
(210, 1, 35, 35, 171, 22, b'1', b'0', b'0', b'1', b'0'),
(211, 1, 35, 35, 167, 22, b'1', b'1', b'0', b'1', b'1'),
(212, 1, 20, 20, 172, 23, b'1', b'1', b'0', b'0', b'1'),
(213, 1, 35, 35, 172, 22, b'1', b'1', b'0', b'0', b'1'),
(214, 1, 35, 35, 173, 22, b'1', b'1', b'0', b'0', b'1'),
(215, 1, 35, 35, NULL, 22, b'0', b'0', b'0', b'0', b'0'),
(216, 1, 35, 35, NULL, 22, b'0', b'0', b'0', b'0', b'0'),
(217, 1, 35, 35, NULL, 22, b'0', b'0', b'0', b'0', b'0'),
(218, 1, 35, 35, 175, 22, b'1', b'0', b'0', b'1', b'1'),
(219, 1, 35, 35, 175, 22, b'1', b'0', b'0', b'1', b'1'),
(222, 1, 35, 35, 177, 22, b'1', b'0', b'0', b'1', b'0'),
(223, 1, 35, 35, 177, 22, b'1', b'0', b'0', b'1', b'0'),
(224, 1, 35, 35, 178, 22, b'0', b'0', b'0', b'0', b'0'),
(225, 1, 35, 35, 178, 22, b'0', b'0', b'0', b'0', b'0'),
(226, 1, 35, 35, 178, 22, b'0', b'0', b'0', b'0', b'0'),
(227, 1, 35, 35, NULL, 22, b'0', b'0', b'0', b'0', b'0'),
(228, 1, 35, 35, 180, 22, b'1', b'1', b'0', b'0', b'1'),
(229, 1, 35, 35, 180, 22, b'1', b'1', b'0', b'0', b'1');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `perfil`
--

CREATE TABLE `perfil` (
  `id_perfil` bigint(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` int(11) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `perfil`
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
-- Estructura de tabla para la tabla `perfil_opcion`
--

CREATE TABLE `perfil_opcion` (
  `id_perfil` bigint(20) NOT NULL,
  `id_opcion` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `perfil_opcion`
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
(4, 1),
(4, 7),
(4, 9),
(4, 12),
(4, 13),
(4, 15),
(4, 16),
(4, 18),
(4, 19),
(5, 11),
(5, 18),
(6, 1),
(6, 10),
(6, 14),
(7, 9),
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
(13, 1),
(13, 8),
(13, 14),
(14, 1),
(14, 16),
(14, 19);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `produccion_porciones`
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
-- Volcado de datos para la tabla `produccion_porciones`
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
(10, 8, '2026-06-21 23:27:07', 4, 40, 40, 0.2, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
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
-- Volcado de datos para la tabla `producto`
--

INSERT INTO `producto` (`id`, `descripcion`, `estado`, `nombre`, `precio`, `stock`, `id_categoria`, `imagen`) VALUES
(22, 'Descripción', 1, 'Lomo saltado', 35, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781359603/lajama/productos/file_et36qv.jpg'),
(23, 'Descripción', 1, 'Causa Limeña', 20, NULL, 1, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781362245/lajama/productos/file_kq29eo.jpg'),
(24, 'Descripción', 1, 'Ají de Gallina', 20, NULL, 2, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781492950/lajama/productos/file_k9aznj.webp'),
(25, 'Descripción', 1, 'Ceviche de Pescado', 30, NULL, 1, 'https://res.cloudinary.com/dyjnbddit/image/upload/v1781493015/lajama/productos/file_cyz6tw.webp');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reserva`
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

--
-- Volcado de datos para la tabla `reserva`
--

INSERT INTO `reserva` (`id`, `cantidad_personas`, `duracion_estimada_minutos`, `estado`, `fecha_creacion`, `fecha_hora_liberacion`, `fecha_hora_reserva`, `mesas_asignadas`, `minutos_gracia`, `nombre_cliente`, `notas`, `numero_mesa`, `numero_personas`, `observacion`, `telefono`) VALUES
(3, 6, 90, 'EXPIRADA', '2026-06-18 15:52:55.000000', '2026-06-18 17:30:00.000000', '2026-06-18 16:00:00.000000', 'Mesa #7, Mesa #8', 15, 'José Tafur', NULL, 7, 6, 'test', '973860761'),
(4, 5, 90, 'COMPLETADA', '2026-06-18 17:25:19.000000', '2026-06-18 19:00:00.000000', '2026-06-18 17:30:00.000000', 'Mesa #1, Mesa #2', 15, 'José Tafur', NULL, 1, 5, 'test 2', '973860761'),
(5, 3, 90, 'COMPLETADA', '2026-06-18 17:32:02.000000', '2026-06-18 19:15:00.000000', '2026-06-18 17:45:00.000000', 'Mesa #1', 15, 'José Tafur', NULL, 1, 3, 'test 3', '973860761'),
(6, 5, 90, 'CANCELADA', '2026-06-18 17:42:41.000000', '2026-06-18 19:15:00.000000', '2026-06-18 17:45:00.000000', 'Mesa #1, Mesa #2', 15, 'José Tafur', NULL, 1, 5, 'test 4', '973860761'),
(7, 4, 90, 'COMPLETADA', '2026-06-18 21:35:27.000000', '2026-06-19 10:30:00.000000', '2026-06-19 09:00:00.000000', 'Mesa #1', 15, 'José Tafur', NULL, 1, 4, 'Test', '973860761'),
(8, 8, 90, 'COMPLETADA', '2026-06-19 09:02:10.000000', '2026-06-19 10:45:00.000000', '2026-06-19 09:15:00.000000', 'Mesa #1, Mesa #2', 15, 'José Tafur', NULL, 1, 8, 'test 5', '973860761');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `turno_caja`
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
  `total_vendido` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `turno_caja`
--

INSERT INTO `turno_caja` (`id`, `activo`, `diferencia`, `fecha_apertura`, `fecha_cierre`, `monto_apertura`, `monto_cierre`, `observaciones`, `total_vendido`) VALUES
(1, b'0', 0, '2026-06-06 22:16:15.000000', '2026-06-07 13:15:22.000000', 200, 800, '', 600),
(2, b'0', -120, '2026-06-07 13:17:19.000000', '2026-06-13 14:29:27.000000', 800, 1400, '', 720),
(3, b'0', 0, '2026-06-13 14:31:03.000000', '2026-06-14 02:00:32.000000', 200, 1085, '', 885),
(4, b'0', 0, '2026-06-14 02:02:04.000000', '2026-06-14 04:15:21.000000', 200, 345, 'xd', 145),
(5, b'0', 0, '2026-06-14 11:59:26.000000', '2026-06-14 17:46:00.000000', 200, 620, '', 420),
(6, b'0', 0, '2026-06-14 17:46:07.000000', '2026-06-19 14:52:36.000000', 200, 640, 'asd', 440),
(7, b'0', 0, '2026-06-19 14:55:27.000000', '2026-06-19 14:56:35.000000', 200, 200, 'a', 0),
(8, b'0', 0, '2026-06-19 14:56:37.000000', '2026-06-20 20:30:30.000000', 200, 620, 'Ningún cambio', 420),
(9, b'0', -30, '2026-06-20 20:30:34.000000', '2026-06-21 08:32:04.000000', 200, 245, 'chevere', 175),
(10, b'1', NULL, '2026-06-21 08:34:45.000000', NULL, 200, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
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
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `clave`, `correo`, `estado`, `usuario`, `id_perfil`) VALUES
(9, '$2b$10$zC0eeCs/nt7LbDC5S4VLkeG2uzlZt6dNFCvXhO.t2MrO7S71Avkzq', 'superadmin@lajama.com', 1, 'superadmin', 9),
(11, '$2a$10$NYF/4ZILspZTRDfjlbQnbuLCwwboNXuVYRPBLZvR0TKb0I/1MAFme', 'cocineroF@gmail.com', 1, 'CocineroFrio', 6),
(12, '$2a$10$bZYGhRelMCRCEWMrPYp6WuogKBPoHFyF/jQp3.4VngarpozNjEee6', 'cocineroC@gmail.com', 1, 'CocineroCaliente', 13),
(13, '$2a$10$9WRmv4TwYoG4he9v8CV0ZeISJulWzDt.BFbeAwI/Hui8/qECzDlG.', 'mesero@gmail.com', 1, 'Mesero', 5),
(15, '$2a$10$UVNU5NDDfF5Fjrj0pxSsUuoiOnvUJ9LdQaVi5ZzPDFa/Xj3xnrRqq', 'repartidor@gmail.com', 2, 'Repartidor', 7),
(17, '$2a$10$.CZyWKChQgzAEvg2GipC7eDTZess5qwcNLTFdpgR4qOFuzzQNhBuS', 'cajero@gmail.com', 1, 'Cajero', 4),
(18, '$2a$10$ZdTBoUHrlwkYLvLNxoiSAO2ptNqYOvAhGQV1lDb8hUW5GynfrNg3e', 'admin@gmail.com', 1, 'Admin', 1),
(19, '$2a$10$Deerajx21uJ6qzYlq6txneENT5sPBZqBhqtnCoTRZt.f2zJStVYfy', 'repartidor@gmail.com', 1, 'Distribuidor', 7),
(20, '$2a$10$iBMQhTN3QPBTPBbUGbOfieOUT9Y5EdwYlqis4IvXhYomwYNpdmfE2', 'contador@gmail.com', 1, 'Contador', 14);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `auditoria_anulaciones`
--
ALTER TABLE `auditoria_anulaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK6q7mxhssoxrpe52fa8hstuy8b` (`pedido_id`);

--
-- Indices de la tabla `cargo`
--
ALTER TABLE `cargo`
  ADD PRIMARY KEY (`id_cargo`);

--
-- Indices de la tabla `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `comprobante_serie`
--
ALTER TABLE `comprobante_serie`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UKa3uvp0jmqkao75tfau7x13sgt` (`tipo_comprobante`);

--
-- Indices de la tabla `empleado`
--
ALTER TABLE `empleado`
  ADD PRIMARY KEY (`id_empleado`),
  ADD UNIQUE KEY `UKanilfn0t89ht43r8n8lthr5b6` (`dni`),
  ADD UNIQUE KEY `UKoilhxkgrskw3bxuw5i2aysgrc` (`id_usuario`),
  ADD KEY `FK739vkywoel8qoad30ovv9ksgl` (`id_cargo`);

--
-- Indices de la tabla `insumo`
--
ALTER TABLE `insumo`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `insumo_producto`
--
ALTER TABLE `insumo_producto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK1m7s6455hhg0w39wmj9qfpa3d` (`id_insumo`),
  ADD KEY `FK1imhbexswceljihnjivyiq7g5` (`id_producto`);

--
-- Indices de la tabla `lote_insumo`
--
ALTER TABLE `lote_insumo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_insumo_ibfk_1` (`id_insumo`);

--
-- Indices de la tabla `mesa`
--
ALTER TABLE `mesa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK6q6ujj74b9tsjam9709h5ctw6` (`id_mesa_padre`);

--
-- Indices de la tabla `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKlibk28e8rg0db9i8y80emdj1n` (`id_turno`);

--
-- Indices de la tabla `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKbd60v7l634wbw44rh49s1wh1b` (`insumo_id`);

--
-- Indices de la tabla `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `movimiento_porciones_ibfk_1` (`id_insumo`);

--
-- Indices de la tabla `notificaciones_sistema`
--
ALTER TABLE `notificaciones_sistema`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `opcion`
--
ALTER TABLE `opcion`
  ADD PRIMARY KEY (`id_opcion`);

--
-- Indices de la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKfotrrvqei3q76ww7blds97ymv` (`id_pedido`);

--
-- Indices de la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKfx0mpssl90lcsgec718ckavj` (`id_repartidor`);

--
-- Indices de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKaxtxfsueb7pagpev7p4r4mbin` (`id_pedido`),
  ADD KEY `FK5c7wbc95t8gesgfyqgad8icuh` (`id_producto`);

--
-- Indices de la tabla `perfil`
--
ALTER TABLE `perfil`
  ADD PRIMARY KEY (`id_perfil`);

--
-- Indices de la tabla `perfil_opcion`
--
ALTER TABLE `perfil_opcion`
  ADD PRIMARY KEY (`id_perfil`,`id_opcion`),
  ADD KEY `FKbsl4tlnkj5cp6rqayuprdjsfu` (`id_opcion`);

--
-- Indices de la tabla `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `produccion_porciones_ibfk_1` (`id_lote`);

--
-- Indices de la tabla `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK9nyueixdsgbycfhf7allg8su` (`id_categoria`);

--
-- Indices de la tabla `reserva`
--
ALTER TABLE `reserva`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `turno_caja`
--
ALTER TABLE `turno_caja`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `FK131gkl0dt1966rsw6dmesnsxw` (`id_perfil`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `auditoria_anulaciones`
--
ALTER TABLE `auditoria_anulaciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `cargo`
--
ALTER TABLE `cargo`
  MODIFY `id_cargo` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `categoria`
--
ALTER TABLE `categoria`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `comprobante_serie`
--
ALTER TABLE `comprobante_serie`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `empleado`
--
ALTER TABLE `empleado`
  MODIFY `id_empleado` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `insumo`
--
ALTER TABLE `insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `insumo_producto`
--
ALTER TABLE `insumo_producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT de la tabla `lote_insumo`
--
ALTER TABLE `lote_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `mesa`
--
ALTER TABLE `mesa`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT de la tabla `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT de la tabla `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=201;

--
-- AUTO_INCREMENT de la tabla `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT de la tabla `notificaciones_sistema`
--
ALTER TABLE `notificaciones_sistema`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT de la tabla `opcion`
--
ALTER TABLE `opcion`
  MODIFY `id_opcion` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=181;

--
-- AUTO_INCREMENT de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=230;

--
-- AUTO_INCREMENT de la tabla `perfil`
--
ALTER TABLE `perfil`
  MODIFY `id_perfil` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `producto`
--
ALTER TABLE `producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `reserva`
--
ALTER TABLE `reserva`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `turno_caja`
--
ALTER TABLE `turno_caja`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `auditoria_anulaciones`
--
ALTER TABLE `auditoria_anulaciones`
  ADD CONSTRAINT `FK7f74gpdggwnrghtc6sadc7yrl` FOREIGN KEY (`pedido_id`) REFERENCES `pedido` (`id`);

--
-- Filtros para la tabla `empleado`
--
ALTER TABLE `empleado`
  ADD CONSTRAINT `FK739vkywoel8qoad30ovv9ksgl` FOREIGN KEY (`id_cargo`) REFERENCES `cargo` (`id_cargo`),
  ADD CONSTRAINT `FKt7vdal63o7rdoojoy7ywhjesh` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Filtros para la tabla `insumo_producto`
--
ALTER TABLE `insumo_producto`
  ADD CONSTRAINT `FK1imhbexswceljihnjivyiq7g5` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id`),
  ADD CONSTRAINT `FK1m7s6455hhg0w39wmj9qfpa3d` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`);

--
-- Filtros para la tabla `lote_insumo`
--
ALTER TABLE `lote_insumo`
  ADD CONSTRAINT `lote_insumo_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mesa`
--
ALTER TABLE `mesa`
  ADD CONSTRAINT `FK6q6ujj74b9tsjam9709h5ctw6` FOREIGN KEY (`id_mesa_padre`) REFERENCES `mesa` (`id`);

--
-- Filtros para la tabla `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  ADD CONSTRAINT `FKlibk28e8rg0db9i8y80emdj1n` FOREIGN KEY (`id_turno`) REFERENCES `turno_caja` (`id`);

--
-- Filtros para la tabla `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  ADD CONSTRAINT `FKbd60v7l634wbw44rh49s1wh1b` FOREIGN KEY (`insumo_id`) REFERENCES `insumo` (`id`);

--
-- Filtros para la tabla `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  ADD CONSTRAINT `movimiento_porciones_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  ADD CONSTRAINT `FKfotrrvqei3q76ww7blds97ymv` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id`);

--
-- Filtros para la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `FKfx0mpssl90lcsgec718ckavj` FOREIGN KEY (`id_repartidor`) REFERENCES `empleado` (`id_empleado`);

--
-- Filtros para la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD CONSTRAINT `FK5c7wbc95t8gesgfyqgad8icuh` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id`),
  ADD CONSTRAINT `FKaxtxfsueb7pagpev7p4r4mbin` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id`);

--
-- Filtros para la tabla `perfil_opcion`
--
ALTER TABLE `perfil_opcion`
  ADD CONSTRAINT `FK4dw8qw3rdo1gil420igcvu58y` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`),
  ADD CONSTRAINT `FKbsl4tlnkj5cp6rqayuprdjsfu` FOREIGN KEY (`id_opcion`) REFERENCES `opcion` (`id_opcion`);

--
-- Filtros para la tabla `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  ADD CONSTRAINT `produccion_porciones_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lote_insumo` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto`
--
ALTER TABLE `producto`
  ADD CONSTRAINT `FK9nyueixdsgbycfhf7allg8su` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id`);

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `FK131gkl0dt1966rsw6dmesnsxw` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
