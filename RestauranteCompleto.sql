-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-06-2026 a las 00:22:25
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
(5, 'Apoyo en cuentas', 1, 'Cajero');

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
(7, 'Tafur', '60812709', 1, '2026-05-09', 'José', '973860761', 'PLANILLA', 'DIA', 3, 4),
(9, 'Sandoval', '98723948', 1, '2026-05-10', 'Kevin', '973860761', 'EVENTUAL', 'DIA', 5, 5),
(10, 'Prueba', '45678912', 1, '2026-05-11', 'Nombre', '999000111', 'PLANILLA', 'DIA', 2, 6),
(11, 'Mesero', '34567895', 1, '2026-05-10', 'Test', '973632874', 'PLANILLA', 'DIA', 4, 7),
(12, 'Tafur', '74565464', 1, '2026-05-14', 'José', '957464353', 'PLANILLA', 'DIA', 3, 8);

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
  `porciones_por_kg` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `insumo`
--

INSERT INTO `insumo` (`id`, `estado`, `nombre`, `stock_actual`, `stock_minimo`, `unidad_medida`, `categoria`, `porciones_por_kg`) VALUES
(1, NULL, 'pescado', 0, 2, 'kg', '', NULL),
(2, 1, 'Lechuga', 0, 0.5, 'kg', '', NULL),
(3, 1, 'Carne', 44, 10, 'Kg', 'PROTEINA', 4),
(4, NULL, 'Pollo', 20, 5, 'Kg', 'PROTEINA', 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `insumo_producto`
--

CREATE TABLE `insumo_producto` (
  `id` bigint(20) NOT NULL,
  `cantidad_usada` double NOT NULL,
  `id_insumo` bigint(20) DEFAULT NULL,
  `id_producto` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `insumo_producto`
--

INSERT INTO `insumo_producto` (`id`, `cantidad_usada`, `id_insumo`, `id_producto`) VALUES
(1, 0.2, 1, 1),
(2, 0.1, 2, 1);

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
(7, 3, '2026-06-06 08:47:27', 10, 150, NULL, 4, 0),
(8, 4, '2026-06-06 08:49:20', 15, 200, NULL, 4, 15);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mesa`
--

CREATE TABLE `mesa` (
  `id` bigint(20) NOT NULL,
  `estado` varchar(20) DEFAULT NULL,
  `numero` int(11) NOT NULL,
  `id_mesa_padre` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mesa`
--

INSERT INTO `mesa` (`id`, `estado`, `numero`, `id_mesa_padre`) VALUES
(1, 'OCUPADA', 1, NULL),
(2, 'OCUPADA', 2, NULL),
(3, 'OCUPADA', 3, NULL),
(4, 'OCUPADA', 4, NULL),
(5, 'OCUPADA', 5, NULL),
(6, 'OCUPADA', 6, NULL),
(7, 'OCUPADA', 7, NULL),
(8, 'OCUPADA', 8, NULL),
(9, 'OCUPADA', 9, NULL),
(10, 'OCUPADA', 10, NULL),
(11, 'DISPONIBLE', 11, NULL),
(12, 'DISPONIBLE', 12, NULL),
(13, 'DISPONIBLE', 13, NULL),
(14, 'DISPONIBLE', 14, NULL),
(15, 'DISPONIBLE', 15, NULL),
(16, 'DISPONIBLE', 16, NULL),
(17, 'DISPONIBLE', 17, NULL),
(18, 'DISPONIBLE', 18, NULL),
(19, 'DISPONIBLE', 19, NULL),
(20, 'DISPONIBLE', 20, NULL),
(21, 'DISPONIBLE', 21, NULL),
(22, 'DISPONIBLE', 22, NULL),
(23, 'DISPONIBLE', 23, NULL),
(24, 'DISPONIBLE', 24, NULL),
(25, 'DISPONIBLE', 25, NULL),
(26, 'DISPONIBLE', 26, NULL),
(27, 'DISPONIBLE', 27, NULL),
(28, 'DISPONIBLE', 28, NULL),
(29, 'DISPONIBLE', 29, NULL),
(30, 'DISPONIBLE', 30, NULL);

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
  `insumo_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `stock_resultante` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimiento_porciones`
--

INSERT INTO `movimiento_porciones` (`id`, `id_insumo`, `fecha`, `tipo`, `cantidad_porciones`, `motivo`, `stock_resultante`) VALUES
(3, 3, '2026-06-06 08:47:44', 'INGRESO', 40, 'PRODUCCION', 40),
(4, 3, '2026-06-06 09:01:34', 'INGRESO', 4, 'PRODUCCION', 44);

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
(14, 'Insumos', '/insumos');

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
  `caliente_listo` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido`
--

INSERT INTO `pedido` (`id`, `cliente_nombre`, `direccion_entrega`, `estado`, `fecha_creacion`, `fecha_entrega`, `fecha_salida`, `latitud`, `longitud`, `monto_total`, `id_repartidor`, `numero_mesa`, `tipo_pedido`, `frio_listo`, `caliente_listo`) VALUES
(1, 'Prueba 1', 'Atención en Local', 'PAGADO', '2026-05-17 19:19:56.000000', NULL, NULL, NULL, NULL, 60, NULL, NULL, NULL, 1, 1),
(2, 'José Tafur', 'Real Plaza Chiclayo, Juan Pablo Vizcardo, Urbanización Federico Villareal, Chiclayo, Lambayeque, 14008, Perú', 'ASIGNADO', '2026-05-17 19:49:56.000000', NULL, NULL, -6.7785647, -79.8325424, 30, 12, NULL, 'DELIVERY', 0, 1),
(3, 'Test 1', 'Calle Alfredo Lapoint, Chiclayo, Lambayeque, 14001, Perú', 'PAGADO', '2026-05-17 20:01:50.000000', '2026-05-17 20:13:08.000000', '2026-05-17 20:13:02.000000', -6.7698191, -79.839589, 30, 7, NULL, 'DELIVERY', 1, 0),
(4, 'Test 2', 'Prol. Av. Los Incas, Lotización Nuevo Chacupe II, La Victoria, Chiclayo, Lambayeque, 14000, Perú', 'PAGADO', '2026-05-17 20:02:27.000000', '2026-05-17 21:38:43.000000', '2026-05-17 21:38:41.000000', -6.8135391, -79.8395881, 30, 12, NULL, 'DELIVERY', 1, 0),
(5, 'Test 3', 'Avenida Sáenz Peña, Chiclayo, Lambayeque, 14001, Perú', 'ASIGNADO', '2026-05-17 20:05:51.000000', NULL, NULL, -6.7743307, -79.835924, 30, 12, NULL, 'DELIVERY', 1, 0),
(6, 'Test 4', 'Calle Manuel María Izaga, Chiclayo, Lambayeque, 14001, Perú', 'ASIGNADO', '2026-05-17 20:09:50.000000', NULL, NULL, -6.7726308, -79.8355005, 30, 7, NULL, 'DELIVERY', 1, 0),
(7, 'test', 'Calle Alfredo Lapoint, Chiclayo, Lambayeque, 14001, Perú', 'ASIGNADO', '2026-05-17 20:27:22.000000', NULL, NULL, -6.7698191, -79.839589, 30, 7, NULL, 'DELIVERY', 0, 1),
(8, 'Test 2', 'Calle Alfredo Lapoint, Chiclayo, Lambayeque, 14001, Perú', 'PREPARADO', '2026-05-17 20:28:39.000000', NULL, NULL, -6.7698191, -79.839589, 30, NULL, NULL, 'DELIVERY', 1, 0),
(9, 'Test 3', 'Opticas del Norte, Avenida Luis Gonzáles, Chiclayo, Lambayeque, 14009, Perú', 'ASIGNADO', '2026-05-17 20:29:06.000000', NULL, NULL, -6.7722007, -79.842278, 30, 7, NULL, 'DELIVERY', 1, 0),
(10, 'José Tafur', 'Palmeras, José Leonardo Ortiz, Chiclayo, Lambayeque, 14009, Perú', 'PREPARADO', '2026-05-17 21:36:29.000000', NULL, NULL, -6.7449438277771065, -79.83883809976227, 30, NULL, NULL, 'DELIVERY', 0, 1),
(11, 'Adición', 'Atención en Local', 'PAGADO', '2026-05-17 21:47:52.000000', NULL, NULL, NULL, NULL, 60, NULL, NULL, NULL, 1, 1),
(12, 'asdasd', 'Atención en Local', 'PAGADO', '2026-05-17 21:53:16.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1),
(13, 'Test', 'Atención en Local', 'PAGADO', '2026-05-17 22:01:12.000000', NULL, NULL, NULL, NULL, 60, NULL, NULL, NULL, 1, 1),
(14, 'José Tafur', 'LA-721, Urbanización Hipólito Unanue, Chiclayo, Lambayeque, 14009, Perú', 'PREPARADO', '2026-05-18 09:31:27.000000', NULL, NULL, -6.776782271164496, -79.84571788851412, 30, NULL, NULL, 'DELIVERY', 0, 1),
(15, 'asd', 'Atención en Local', 'PAGADO', '2026-05-24 20:29:44.000000', '2026-06-01 09:08:53.000000', '2026-06-01 09:08:47.000000', NULL, NULL, 58, NULL, 1, NULL, 1, 1),
(16, 'test', 'Atención en Local', 'PAGADO', '2026-05-24 21:27:07.000000', '2026-06-01 00:31:47.000000', '2026-06-01 00:31:39.000000', NULL, NULL, 30, NULL, 2, NULL, 1, 1),
(17, 'asd', 'Atención en Local', 'PAGADO', '2026-05-24 21:41:56.000000', '2026-06-04 18:29:35.000000', NULL, NULL, NULL, 60, NULL, 3, NULL, 1, 1),
(18, 'nuevo', 'Atención en Local', 'PAGADO', '2026-05-24 21:49:34.000000', '2026-05-24 22:00:19.000000', '2026-05-24 21:52:57.000000', NULL, NULL, 55, NULL, 4, NULL, 1, 1),
(19, 'asd', 'Inkafarma, Avenida Felipe Santiago Salaverry, Chiclayo, Lambayeque, 14009, Perú', 'PENDIENTE', '2026-05-25 08:33:10.000000', NULL, NULL, -6.771410392595433, -79.84542001234948, 30, NULL, NULL, 'DELIVERY', 0, 0),
(20, 'asd', 'Atención en Local', 'PAGADO', '2026-05-31 17:43:16.000000', '2026-05-31 17:43:42.000000', '2026-05-31 17:43:36.000000', NULL, NULL, 30, NULL, 4, NULL, 1, 1),
(21, 'fkldsjkfdslkf', 'Atención en Local', 'PAGADO', '2026-05-31 18:10:33.000000', '2026-06-01 00:28:54.000000', '2026-05-31 20:00:07.000000', NULL, NULL, 60, NULL, 4, NULL, 1, 1),
(22, 'Mesa: 5', '', 'PAGADO', '2026-05-31 19:15:10.000000', '2026-05-31 19:16:25.000000', '2026-05-31 19:16:20.000000', NULL, NULL, 30, NULL, 5, NULL, 1, 1),
(23, 'Mesa: 5', '', 'PAGADO', '2026-05-31 19:53:42.000000', NULL, NULL, NULL, NULL, 60, NULL, 5, NULL, 1, 1),
(24, 'Mesa: 6', 'isehifuhsdfhdskfhsd', 'CANCELADO', '2026-05-31 21:14:46.000000', NULL, NULL, NULL, NULL, 30, NULL, 6, NULL, 1, 1),
(25, 'Mesa #2', '', 'PAGADO', '2026-06-01 00:41:18.000000', NULL, '2026-06-04 17:24:51.000000', NULL, NULL, 30, NULL, 2, NULL, 1, 1),
(26, 'Mesa #4', '', 'CANCELADO', '2026-06-01 02:38:02.000000', NULL, NULL, NULL, NULL, 30, NULL, 4, NULL, 1, 1),
(27, 'Mesa #7', '', 'PAGADO', '2026-06-01 03:00:01.000000', NULL, NULL, NULL, NULL, 30, NULL, 7, NULL, 1, 1),
(28, 'Mesa #8', '🚨 ceviche (SIN: Lechuga)', 'PAGADO', '2026-06-01 03:05:52.000000', '2026-06-01 03:06:40.000000', '2026-06-01 03:06:30.000000', NULL, NULL, 30, NULL, 8, NULL, 1, 1),
(29, 'Mesa #8', '🚨 ceviche (SIN: Lechuga) - ceviche (SIN: pescado)', 'PAGADO', '2026-06-01 03:44:06.000000', NULL, '2026-06-04 17:59:00.000000', NULL, NULL, 60, NULL, 8, NULL, 1, 1),
(30, 'Mesa #1', '', 'PAGADO', '2026-06-01 09:11:25.000000', '2026-06-01 10:59:33.000000', '2026-06-01 10:59:07.000000', NULL, NULL, 85, NULL, 1, NULL, 1, 1),
(31, 'José Tafur', 'Calle Los Faiques, Urbanización Santa Victoria, Chiclayo, Lambayeque, 14820, Perú', 'PREPARADO', '2026-06-03 13:26:05.000000', NULL, NULL, -6.779786235458503, -79.83911815865947, 30, NULL, NULL, 'DELIVERY', 1, 0),
(32, 'Mesa #1', '', 'PAGADO', '2026-06-03 13:41:08.000000', NULL, '2026-06-03 13:42:54.000000', NULL, NULL, 90, NULL, 1, NULL, 1, 1),
(33, 'Mesa #9', '', 'PAGADO', '2026-06-03 14:43:20.000000', '2026-06-03 14:43:43.000000', '2026-06-03 14:43:38.000000', NULL, NULL, 30, NULL, 9, NULL, 1, 1),
(34, 'Mesa #10', '', 'PAGADO', '2026-06-04 14:52:53.000000', NULL, NULL, NULL, NULL, 0, NULL, 10, NULL, 0, 1),
(35, 'Mesa #26', '', 'PAGADO', '2026-06-04 15:45:29.000000', '2026-06-04 16:48:59.000000', '2026-06-04 16:43:02.000000', NULL, NULL, 60, NULL, 26, NULL, 1, 1),
(36, 'Mesa #16', '', 'PAGADO', '2026-06-04 17:04:37.000000', NULL, NULL, NULL, NULL, 30, NULL, 16, NULL, 1, 1),
(37, 'Mesa #25', '', 'PAGADO', '2026-06-04 17:23:39.000000', NULL, NULL, NULL, NULL, 30, NULL, 25, NULL, 1, 1),
(38, 'Mesa #13', '', 'PAGADO', '2026-06-04 18:09:39.000000', NULL, NULL, NULL, NULL, 60, NULL, 13, NULL, 1, 1),
(39, 'Mesa #30', '', 'PAGADO', '2026-06-04 18:20:12.000000', NULL, NULL, NULL, NULL, 0, NULL, 30, NULL, 1, 1),
(40, 'Mesa #21', '', 'PAGADO', '2026-06-04 18:27:23.000000', NULL, NULL, NULL, NULL, 60, NULL, 21, NULL, 1, 1),
(41, 'Mesa #19', '', 'PAGADO', '2026-06-04 18:28:26.000000', '2026-06-04 18:29:07.000000', '2026-06-04 18:28:55.000000', NULL, NULL, 30, NULL, 19, NULL, 1, 1),
(42, 'Mesa #19', '', 'PAGADO', '2026-06-05 09:03:23.000000', NULL, '2026-06-05 09:04:07.000000', NULL, NULL, 30, NULL, 19, NULL, 1, 1),
(43, 'Mesa #1', '', 'EN_COCINA', '2026-06-05 09:06:31.000000', NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 1, 0),
(44, 'Mesa #2', '', 'EN_COCINA', '2026-06-05 10:09:09.000000', NULL, NULL, NULL, NULL, 120, NULL, 2, NULL, 1, 0),
(45, 'Mesa #3', '', 'ASIGNADO', '2026-06-05 10:42:16.000000', NULL, NULL, NULL, NULL, 60, NULL, 3, NULL, 1, 1),
(46, 'Mesa #4', '', 'ASIGNADO', '2026-06-05 11:04:01.000000', NULL, NULL, NULL, NULL, 120, NULL, 4, NULL, 1, 1),
(47, 'Mesa #5', '', 'PREPARADO', '2026-06-05 11:14:49.000000', NULL, NULL, NULL, NULL, 30, NULL, 5, NULL, 1, 1),
(48, 'Mesa #6', '', 'ASIGNADO', '2026-06-05 13:46:34.000000', NULL, '2026-06-05 13:47:04.000000', NULL, NULL, 30, NULL, 6, NULL, 1, 1),
(49, 'Mesa #7', '', 'PAGADO', '2026-06-05 13:47:22.000000', '2026-06-05 14:07:07.000000', NULL, NULL, NULL, 90, NULL, 7, NULL, 1, 1),
(50, 'Mesa #7', '', 'PAGADO', '2026-06-05 14:10:56.000000', '2026-06-05 14:11:52.000000', NULL, NULL, NULL, 30, NULL, 7, NULL, 1, 1),
(51, 'Mesa #8', '', 'PAGADO', '2026-06-05 14:14:02.000000', '2026-06-05 14:32:32.000000', NULL, NULL, NULL, 30, NULL, 8, NULL, 1, 1),
(52, 'Mesa #9', '', 'PAGADO', '2026-06-05 14:25:00.000000', '2026-06-05 14:25:57.000000', NULL, NULL, NULL, 30, NULL, 9, NULL, 1, 1),
(53, 'Mesa #9', '', 'ASIGNADO', '2026-06-05 14:29:53.000000', NULL, NULL, NULL, NULL, 30, NULL, 9, NULL, 1, 1),
(54, 'Mesa #10', '', 'EN_COCINA', '2026-06-05 15:05:10.000000', NULL, NULL, NULL, NULL, 60, NULL, 10, NULL, 1, 0),
(55, 'Mesa #7', '', 'PAGADO', '2026-06-05 16:31:23.000000', '2026-06-05 16:42:39.000000', '2026-06-05 16:40:49.000000', NULL, NULL, 90, NULL, 7, NULL, 1, 1),
(56, 'Mesa #7', '', 'EN_COCINA', '2026-06-05 16:42:47.000000', NULL, NULL, NULL, NULL, 90, NULL, 7, NULL, 1, 0),
(57, 'Mesa #8', '', 'ASIGNADO', '2026-06-06 04:18:38.000000', NULL, NULL, NULL, NULL, 30, NULL, 8, NULL, 1, 1);

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
  `impreso_en_cocina` bit(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido_detalle`
--

INSERT INTO `pedido_detalle` (`id`, `cantidad`, `precio_unitario`, `subtotal`, `id_pedido`, `id_producto`, `cocinado`, `entregado`, `cancelado_por_cliente`, `impreso_en_cocina`) VALUES
(1, 1, 30, 30, 1, 1, b'0', b'0', b'0', b'0'),
(2, 1, 30, 30, 1, 2, b'0', b'0', b'0', b'0'),
(3, 1, 30, 30, 2, 2, b'0', b'0', b'0', b'0'),
(4, 1, 30, 30, 3, 1, b'0', b'0', b'0', b'0'),
(5, 1, 30, 30, 4, 1, b'0', b'0', b'0', b'0'),
(6, 1, 30, 30, 5, 1, b'0', b'0', b'0', b'0'),
(7, 1, 30, 30, 6, 1, b'0', b'0', b'0', b'0'),
(8, 1, 30, 30, 7, 2, b'0', b'0', b'0', b'0'),
(9, 1, 30, 30, 8, 1, b'0', b'0', b'0', b'0'),
(10, 1, 30, 30, 9, 1, b'0', b'0', b'0', b'0'),
(11, 1, 30, 30, 10, 2, b'0', b'0', b'0', b'0'),
(12, 1, 30, 30, 11, 2, b'0', b'0', b'0', b'0'),
(13, 1, 30, 30, 11, 2, b'0', b'0', b'0', b'0'),
(14, 1, 30, 30, 12, 1, b'0', b'0', b'0', b'0'),
(15, 1, 30, 30, 13, 1, b'0', b'0', b'0', b'0'),
(16, 1, 30, 30, 13, 2, b'0', b'0', b'0', b'0'),
(17, 1, 30, 30, 14, 2, b'0', b'0', b'0', b'0'),
(18, 1, 28, 28, 15, 8, b'0', b'0', b'0', b'0'),
(19, 1, 30, 30, 16, 1, b'0', b'0', b'0', b'0'),
(20, 1, 30, 30, 17, 2, b'0', b'0', b'0', b'0'),
(21, 1, 30, 30, 18, 1, b'0', b'0', b'0', b'0'),
(22, 1, 25, 25, 18, 3, b'0', b'0', b'0', b'0'),
(23, 1, 30, 30, 19, 1, b'0', b'0', b'0', b'0'),
(24, 1, 30, 30, 15, 2, b'0', b'0', b'0', b'0'),
(25, 1, 30, 30, 20, 1, b'0', b'0', b'0', b'0'),
(26, 1, 30, 30, 21, 1, b'0', b'0', b'0', b'0'),
(27, 1, 30, 30, 21, 2, b'0', b'0', b'0', b'0'),
(28, 1, 30, 30, 22, 1, b'0', b'0', b'0', b'0'),
(29, 1, 30, 30, 23, 2, b'0', b'0', b'0', b'0'),
(30, 1, 30, 30, 23, 1, b'0', b'0', b'0', b'0'),
(31, 1, 30, 30, 25, 1, b'0', b'0', b'0', b'0'),
(32, 1, 30, 30, 17, 1, b'0', b'0', b'0', b'0'),
(33, 1, 30, 30, 27, 1, b'0', b'0', b'0', b'0'),
(34, 1, 30, 30, 28, 1, b'0', b'0', b'0', b'0'),
(35, 1, 30, 30, 29, 1, b'0', b'0', b'0', b'0'),
(36, 1, 30, 30, 29, 1, b'0', b'0', b'0', b'0'),
(37, 1, 30, 30, 30, 1, b'0', b'0', b'0', b'0'),
(38, 1, 30, 30, 30, 2, b'0', b'0', b'0', b'0'),
(39, 1, 25, 25, 30, 3, b'0', b'0', b'0', b'0'),
(40, 1, 30, 30, 31, 1, b'0', b'0', b'0', b'0'),
(41, 1, 30, 30, 32, 1, b'0', b'0', b'0', b'0'),
(42, 1, 30, 30, 32, 2, b'0', b'0', b'0', b'0'),
(43, 1, 30, 30, 32, 1, b'0', b'0', b'0', b'0'),
(44, 1, 30, 30, 33, 1, b'0', b'0', b'0', b'0'),
(45, 1, 30, 30, 34, 1, b'0', b'0', b'0', b'0'),
(46, 1, 30, 30, 35, 1, b'0', b'0', b'0', b'0'),
(47, 1, 30, 30, 35, 2, b'0', b'0', b'0', b'0'),
(48, 1, 30, 30, 36, 1, b'0', b'0', b'0', b'0'),
(49, 1, 30, 30, 37, 1, b'0', b'0', b'0', b'0'),
(50, 2, 30, 60, 38, 2, b'0', b'0', b'0', b'0'),
(51, 1, 30, 30, 39, 1, b'0', b'0', b'0', b'0'),
(52, 1, 30, 30, 40, 1, b'0', b'0', b'0', b'0'),
(53, 1, 30, 30, 40, 2, b'0', b'0', b'0', b'0'),
(54, 1, 30, 30, 41, 1, b'0', b'0', b'0', b'0'),
(55, 1, 30, 30, 42, 1, b'0', b'0', b'0', b'0'),
(56, 1, 30, 30, 43, 2, b'0', b'0', b'0', b'1'),
(57, 1, 30, 30, 44, 2, b'0', b'0', b'1', b'1'),
(58, 1, 30, 30, 44, 2, b'1', b'1', b'0', b'1'),
(59, 1, 30, 30, 44, 2, b'1', b'1', b'0', b'1'),
(60, 1, 30, 30, 44, 2, b'1', b'1', b'0', b'1'),
(61, 1, 30, 30, 45, 2, b'1', b'1', b'0', b'1'),
(62, 1, 30, 30, 45, 2, b'1', b'1', b'0', b'1'),
(63, 1, 30, 30, 46, 2, b'1', b'1', b'0', b'1'),
(64, 1, 30, 30, 46, 2, b'1', b'1', b'0', b'1'),
(65, 1, 30, 30, 47, 2, b'1', b'0', b'0', b'0'),
(66, 1, 30, 30, 48, 2, b'1', b'0', b'0', b'1'),
(67, 1, 30, 30, 49, 2, b'1', b'1', b'0', b'1'),
(68, 1, 30, 30, 49, 2, b'1', b'1', b'0', b'1'),
(69, 1, 30, 30, 49, 2, b'1', b'1', b'0', b'1'),
(70, 1, 30, 30, 50, 2, b'1', b'1', b'0', b'0'),
(71, 1, 30, 30, 51, 2, b'1', b'1', b'0', b'1'),
(72, 1, 30, 30, 52, 2, b'1', b'0', b'0', b'0'),
(73, 1, 30, 30, 53, 2, b'1', b'1', b'0', b'0'),
(74, 1, 30, 30, 54, 2, b'0', b'0', b'0', b'1'),
(75, 1, 30, 30, 54, 2, b'0', b'0', b'1', b'1'),
(76, 1, 30, 30, 55, 2, b'1', b'1', b'0', b'1'),
(79, 1, 30, 30, 55, 2, b'1', b'1', b'0', b'1'),
(80, 1, 30, 30, 55, 2, b'1', b'1', b'0', b'1'),
(81, 3, 30, 90, 56, 2, b'0', b'0', b'0', b'0'),
(82, 1, 30, 30, 46, 2, b'1', b'1', b'0', b'1'),
(83, 1, 30, 30, 46, 2, b'1', b'1', b'0', b'1'),
(84, 1, 30, 30, 57, 2, b'1', b'1', b'0', b'1');

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
(3, 'Se le asignará el cargo dependiendo de su rol', 1, 'Empleado');

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
(2, 1),
(3, 1),
(3, 7),
(3, 8),
(3, 9),
(3, 10),
(3, 11),
(3, 12),
(3, 13);

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
(2, 7, '2026-06-06 08:47:44', 9, 36, 40, -1, NULL),
(3, 7, '2026-06-06 09:01:34', 1, 4, 4, 0, NULL);

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
(1, 'Descripción de ceviche', 1, 'ceviche', 30, 999, 1, '4e3206c5-b033-430d-8787-8c1799e17525_ceviche.jpg'),
(2, 'Descripción de mondonguito', 1, 'Mondonguito', 30, 20, 2, '2302b836-1992-4952-ad42-11100dd6832a_Mondonguito.jpg'),
(3, 'Fresco pescado cortado en trozos, marinado en limón con ají limo, cebolla, cilantro y choclo. Servido con camote y cancha.', 1, 'Ceviche Clásico', 25, 999, 1, NULL),
(4, 'Combinación de pescado fresco, mariscos y langostinos marinados en limón, ají limo y culantro. Con choclo, camote y cancha.', 1, 'Ceviche Mixto', 30, 999, 1, NULL),
(5, 'Conchas negras frescas marinadas en limón con ají limo, cebolla y culantro. Acompañado de choclo y camote.', 1, 'Ceviche de Conchas Negras', 30, 999, 1, NULL),
(6, 'Potente jugo de ceviche servido en vaso con trozos de pescado, mariscos y ají limo. El clásico reconstituyente peruano.', 1, 'Leche de Tigre', 18, 999, 1, NULL),
(7, 'Finas láminas de pescado fresco bañadas en leche de tigre con ají amarillo. Sin cebolla, suave y elegante.', 1, 'Tiradito Clásico', 25, 999, 1, NULL),
(8, 'Láminas de pescado bañadas en salsa macho de mariscos con ají panca y amarillo. Intenso sabor marino.', 1, 'Tiradito a lo Macho', 28, 999, 1, NULL),
(9, 'Causa de papa amarilla sazonada con ají amarillo y limón, rellena de pollo desmenuzado con mayonesa y palta.', 1, 'Causa Limeña de Pollo', 18, 999, 1, NULL),
(10, 'Papa amarilla condimentada rellena de atún con mayonesa, palta y huevo. Clásico entrada limeña.', 1, 'Causa Limeña de Atún', 18, 999, 1, NULL),
(11, 'Papa amarilla con ají amarillo rellena de mariscos salteados con mayonesa y palta.', 1, 'Causa Limeña de Mariscos', 22, 999, 1, NULL),
(12, 'Mix de lechugas, tomate, pepino, palta y zanahoria con aderezo de la casa.', 1, 'Ensalada Fresca de la Casa', 12, 999, 1, NULL),
(13, 'Lechuga romana, crutones, queso parmesano y pollo a la plancha con aderezo césar casero.', 1, 'Ensalada César con Pollo', 18, 999, 1, NULL),
(14, 'Rodajas de papa sancochada bañadas en cremosa salsa huancaína, decorada con huevo y aceituna.', 1, 'Papa a la Huancaína', 14, 999, 1, NULL),
(15, 'Papa sancochada con salsa de huacatay, ají mirasol, maní y queso fresco. Tradicional de Arequipa.', 1, 'Ocopa Arequipeña', 14, 999, 1, NULL),
(16, 'Ensalada fresca de habas, choclo, queso fresco, tomate y aceituna con aderezo de limón. Fresco y ligero.', 1, 'Solterito de Queso', 14, 999, 1, NULL),
(17, 'Brochetas de corazón de res marinadas en ají panca y chicha, asadas a la parrilla. Con papa y choclo.', 1, 'Anticuchos de Corazón', 20, 999, 1, NULL),
(18, 'Trozos de pota fresca marinados en limón con ají limo, cebolla y culantro. Económico y sabroso.', 1, 'Ceviche de Pota', 18, 999, 1, NULL),
(19, 'Selección de mariscos frescos marinados en limón con ají limo y cebolla. Con choclo y camote.', 1, 'Mixto de Mariscos al Limón', 32, 999, 1, NULL),
(20, 'Suaves láminas de pulpo bañadas en cremosa salsa de aceituna negra. Entrada sofisticada.', 1, 'Pulpo al Olivo', 35, 999, 1, NULL);

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
(1, '$2a$10$Mt2ltioT746kMKL0v0bprOAKGV2TdoDKSN79uMv/789.Ph0M/HyDO', 'admin@admin.com', 1, 'admin', 1),
(3, '$2a$10$JdOMrEO/7.xP/6ORUFiFn.LN/HyRHHJVATzoAi/9OXGyCgpFxtz8.', 'test@test.com', 1, 'testeador', 2),
(4, '$2a$10$UCSxAoxpltqoJhdRCXH1eeNxcRUWCVGikbB3DK.dfW1f4DNGuNiZu', 'test@gmail.com', 1, 'NuevoTest', 3),
(5, '$2a$10$bE6Ec68oxapcy5Kala9b6O8yBHxqNG1/Cvy61WT/OHDqORNKdaV0G', 'cajerotest@gmail.com', 1, 'Cajero', 3),
(6, '$2a$10$PnPAMGBnwIeKYfNm7lKQeervtdpUnYz6.RFes5hK/32Kzz6aHNyXK', 'CocinaFria@gmail.com', 1, 'CocinaFria', 3),
(7, '$2a$10$Dmd2ZkHfdvtc2BPeiBrjpuHU0WoolFD5/GHIF.Cm4gn/giyXAeN2K', 'mesero@gmail.com', 1, 'Mesero', 3),
(8, '$2a$10$CIosk1vtqr3IvOafkxkMYejTle4HtG/N6wRNDGaXCrmTSj9A9H3BO', 'Delivery2@gmail.com', 1, 'Pruebanueva', 3);

--
-- Índices para tablas volcadas
--

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
  ADD KEY `id_insumo` (`id_insumo`);

--
-- Indices de la tabla `mesa`
--
ALTER TABLE `mesa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK6q6ujj74b9tsjam9709h5ctw6` (`id_mesa_padre`);

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
  ADD KEY `id_insumo` (`id_insumo`);

--
-- Indices de la tabla `opcion`
--
ALTER TABLE `opcion`
  ADD PRIMARY KEY (`id_opcion`);

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
  ADD KEY `id_lote` (`id_lote`);

--
-- Indices de la tabla `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK9nyueixdsgbycfhf7allg8su` (`id_categoria`);

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
-- AUTO_INCREMENT de la tabla `cargo`
--
ALTER TABLE `cargo`
  MODIFY `id_cargo` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `categoria`
--
ALTER TABLE `categoria`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `empleado`
--
ALTER TABLE `empleado`
  MODIFY `id_empleado` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `insumo`
--
ALTER TABLE `insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `insumo_producto`
--
ALTER TABLE `insumo_producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- AUTO_INCREMENT de la tabla `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `opcion`
--
ALTER TABLE `opcion`
  MODIFY `id_opcion` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT de la tabla `perfil`
--
ALTER TABLE `perfil`
  MODIFY `id_perfil` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `producto`
--
ALTER TABLE `producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Restricciones para tablas volcadas
--

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
  ADD CONSTRAINT `lote_insumo_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`);

--
-- Filtros para la tabla `mesa`
--
ALTER TABLE `mesa`
  ADD CONSTRAINT `FK6q6ujj74b9tsjam9709h5ctw6` FOREIGN KEY (`id_mesa_padre`) REFERENCES `mesa` (`id`);

--
-- Filtros para la tabla `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  ADD CONSTRAINT `FKbd60v7l634wbw44rh49s1wh1b` FOREIGN KEY (`insumo_id`) REFERENCES `insumo` (`id`);

--
-- Filtros para la tabla `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  ADD CONSTRAINT `movimiento_porciones_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`);

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
  ADD CONSTRAINT `produccion_porciones_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lote_insumo` (`id`);

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
