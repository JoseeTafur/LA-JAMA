-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 13-06-2026 a las 03:54:22
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
(7, 'Tafur', '60812709', 1, '2026-05-09', 'José', '973860761', 'PLANILLA', 'DIA', 3, NULL),
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
(1, -1, 'Pollo', NULL, 4, 'Kg', 'VERDURA', NULL),
(2, -1, 'Arroz', -4, 1, 'Sacos', 'VERDURA', 1),
(3, -1, 'Arroz', 11, 2, 'Sacos', 'VERDURA', 1),
(4, 1, 'Carne', 13, 5, 'Kg', 'PROTEINA', 1),
(5, -1, 'Pollo nuevo', NULL, 40, 'Kg', 'VERDURA', NULL),
(6, -1, 'Carne nueva', NULL, 30, 'Kg', 'PROTEINA', 4),
(7, -1, 'Carne 3', 15, 20, 'Kg', 'PROTEINA', 4),
(8, 1, 'Arróz', 5, 2, 'Und', 'VERDURA', 1),
(9, 1, 'Pescado', 60, 4, 'Kg', 'PROTEINA', 3),
(10, 1, 'Pollo', 12, 5, 'Kg', 'PROTEINA', 4),
(11, 1, 'Test', NULL, -10, 'Kg', 'PROTEINA', NULL),
(12, 1, 'a', NULL, 0, 'Kg', 'PROTEINA', NULL),
(13, 1, 'asd', NULL, 5, 'Kg', 'PROTEINA', NULL);

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
(15, 1, 4, 2),
(16, 1, 8, 2),
(17, 1.2, 4, 2);

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
(1, 1, '2026-06-07 21:45:07', 10, 120, NULL, 4, 0),
(2, 2, '2026-06-07 22:20:03', 3, 100, NULL, 1, 3),
(3, 2, '2026-06-07 22:25:26', 2, 100, NULL, 1, 2),
(4, 1, '2026-06-07 22:25:42', 10, 120, NULL, 40, 9),
(5, 1, '2026-06-08 01:22:07', 10, 120, 'Lote inicial de producción', 3, 0),
(6, 1, '2026-06-08 01:27:53', 10, 200, 'Lote inicial de producción', 5, 0),
(7, 1, '2026-06-08 01:33:00', 10, 120, 'Lote inicial de producción', 4, 10),
(8, 4, '2026-06-08 02:03:52', 5, 129, NULL, 2, 0),
(9, 3, '2026-06-08 02:05:49', 2, 120, NULL, 1, 2),
(10, 3, '2026-06-08 02:05:57', 3, 122, NULL, 1, 3),
(11, 6, '2026-06-08 02:19:36', 10, 200, NULL, 4, 10),
(12, 6, '2026-06-08 02:22:34', 16, 300, NULL, 4, 16),
(13, 6, '2026-06-08 03:05:03', 10, 100, NULL, 3, 0),
(14, 2, '2026-06-08 03:09:12', 4, 70, NULL, 1, 4),
(15, 3, '2026-06-08 04:05:40', 4, 100, NULL, 1, 4),
(16, 1, '2026-06-11 00:46:56', 20, 200, NULL, 4, 20),
(17, 7, '2026-06-11 02:24:48', 5, 100, NULL, 4, 0),
(18, 8, '2026-06-11 02:53:36', 3, 120, 'Comprado en el mercado', 1, 3),
(19, 8, '2026-06-11 02:58:21', 2, 120, 'asd', 1, 2),
(20, 8, '2026-06-11 03:00:28', 3, 120, 'asd', 1, 3),
(21, 6, '2026-06-11 03:22:14', 10, 120, '', 4, 10),
(22, 9, '2026-06-11 03:23:03', 10, 120, '', 4, 0),
(23, 9, '2026-06-11 03:25:02', 5, 120, '', 3, 0),
(24, 10, '2026-06-11 03:29:44', 10, 100, '', 5, 0),
(25, 10, '2026-06-11 03:31:20', 5, 50, '', 2, 0),
(26, 10, '2026-06-11 03:36:18', 10, 100, '', 4, 0),
(27, 10, '2026-06-11 03:50:47', 10, 100, '', 3, 0),
(28, 10, '2026-06-11 04:03:24', 10, 120, '', 4, 0),
(29, 10, '2026-06-11 04:07:03', 10, 100, '', 3, 0),
(30, 10, '2026-06-11 04:19:14', 10, 100, '', 4, 7),
(31, 4, '2026-06-12 18:47:39', 10, 100, '', 1, 0);

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
(12, 'OCUPADA', 12, NULL),
(13, 'OCUPADA', 13, NULL),
(14, 'DISPONIBLE', 14, NULL),
(15, 'LIBRE', 15, NULL),
(16, 'LIBRE', 16, NULL),
(17, 'DISPONIBLE', 17, NULL),
(18, 'LIBRE', 18, NULL),
(19, 'LIBRE', 19, NULL),
(20, 'LIBRE', 20, NULL),
(21, 'OCUPADA', 21, NULL),
(22, 'LIBRE', 22, NULL),
(23, 'LIBRE', 23, NULL),
(24, 'DISPONIBLE', 24, NULL),
(25, 'LIBRE', 25, NULL),
(26, 'LIBRE', 26, NULL),
(27, 'LIBRE', 27, NULL),
(28, 'LIBRE', 28, NULL),
(29, 'DISPONIBLE', 29, NULL),
(30, 'LIBRE', 30, NULL);

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
  `id_turno` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimiento_caja`
--

INSERT INTO `movimiento_caja` (`id`, `comprobante`, `concepto`, `fecha`, `monto`, `tipo`, `id_turno`) VALUES
(1, NULL, 'Fondo inicial', '2026-06-06 22:16:15.000000', 200, 'APERTURA', 1),
(2, NULL, 'Mesa 30', '2026-06-06 22:17:04.000000', 120, 'VENTA', 1),
(3, NULL, 'Mesa 14', '2026-06-07 00:41:27.000000', 90, 'VENTA', 1),
(4, NULL, 'Mesa 11', '2026-06-07 00:47:12.000000', 60, 'VENTA', 1),
(5, NULL, 'Mesa 5', '2026-06-07 00:48:45.000000', 90, 'VENTA', 1),
(6, NULL, 'Mesa 1', '2026-06-07 00:50:39.000000', 60, 'VENTA', 1),
(7, NULL, 'Mesa 4', '2026-06-07 00:54:44.000000', 120, 'VENTA', 1),
(8, NULL, 'Mesa 3', '2026-06-07 00:55:14.000000', 60, 'VENTA', 1),
(9, NULL, 'Cierre de caja', '2026-06-07 13:15:22.000000', 800, 'CIERRE', 1),
(10, NULL, 'Fondo inicial', '2026-06-07 13:17:19.000000', 800, 'APERTURA', 2),
(11, NULL, 'Liquidación Comanda #6 - Mesa N° 3', '2026-06-07 13:31:11.000000', 30, 'VENTA', 2),
(12, NULL, 'Liquidación Comanda #5 - Mesa N° 2', '2026-06-07 13:33:52.000000', 30, 'VENTA', 2),
(13, NULL, 'Liquidación Comanda #3 - Mesa N° 1', '2026-06-07 13:34:16.000000', 30, 'VENTA', 2),
(14, NULL, 'Liquidación Comanda #12 - Mesa N° 1', '2026-06-07 13:39:50.000000', 30, 'VENTA', 2),
(15, NULL, 'Liquidación Comanda #7 - Mesa N° 4', '2026-06-07 13:45:57.000000', 60, 'VENTA', 2),
(16, NULL, 'Liquidación Comanda #8 - Mesa N° 5', '2026-06-07 13:54:08.000000', 30, 'VENTA', 2),
(17, NULL, 'Liquidación Comanda #9 - Mesa N° 6', '2026-06-07 13:59:37.000000', 30, 'VENTA', 2),
(18, NULL, 'Liquidación Comanda #1 - Mesa N° 1', '2026-06-07 14:09:15.000000', 30, 'VENTA', 2),
(19, NULL, 'Liquidación Comanda #2 - Mesa N° 1', '2026-06-07 14:12:34.000000', 30, 'VENTA', 2),
(20, NULL, 'Liquidación Comanda #101 - Mesa N° 1', '2026-06-07 14:27:58.000000', 30, 'VENTA', 2),
(21, NULL, 'Liquidación Comanda #102 - Mesa N° 1', '2026-06-07 14:48:23.000000', 30, 'VENTA', 2),
(22, NULL, 'Liquidación Comanda #103 - Mesa N° 1', '2026-06-07 15:08:11.000000', 30, 'VENTA', 2),
(23, NULL, 'Liquidación Comanda #104 - Mesa N° 1', '2026-06-07 15:14:15.000000', 30, 'VENTA', 2),
(24, NULL, 'Liquidación Comanda #105 - Mesa N° 1', '2026-06-07 15:25:00.000000', 30, 'VENTA', 2),
(25, NULL, 'Liquidación Comanda #106 - Mesa N° 1', '2026-06-07 15:52:12.000000', 30, 'VENTA', 2),
(26, NULL, 'Liquidación Comanda #107 - Mesa N° 1', '2026-06-07 15:54:52.000000', 30, 'VENTA', 2),
(27, NULL, 'Liquidación Comanda #108 - Mesa N° 1', '2026-06-07 15:55:42.000000', 30, 'VENTA', 2),
(28, NULL, 'Liquidación Comanda #109 - Mesa N° 1', '2026-06-07 16:08:33.000000', 90, 'VENTA', 2),
(29, NULL, 'Liquidación Comanda #110 - Mesa N° 4', '2026-06-07 17:09:46.000000', 30, 'VENTA', 2),
(30, NULL, 'Liquidación Comanda #111 - Mesa N° 1', '2026-06-08 00:00:11.000000', 30, 'VENTA', 2),
(31, NULL, 'Liquidación Comanda #112 - Mesa N° 1', '2026-06-08 00:12:14.000000', 30, 'VENTA', 2),
(32, NULL, 'asd', '2026-06-11 23:12:49.000000', -100, 'EGRESO', 2),
(33, NULL, 'asd', '2026-06-11 23:12:59.000000', -20, 'EGRESO', 2);

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
(1, 3, '2026-06-07 22:31:35.000000', 'Ingreso Lote: Compra regular', 3, 'INGRESO', 2, NULL),
(2, 4, '2026-06-07 23:57:27.000000', 'Ingreso Lote: Compra regular', 4, 'INGRESO', 3, NULL),
(3, 0.14, '2026-06-07 23:59:07.000000', 'Despacho a cocina: 1x Mondonguito', 38.86, 'EGRESO', 1, NULL),
(4, 0.14, '2026-06-08 00:04:45.000000', 'Despacho a cocina: 1x Mondonguito', 36.86, 'EGRESO', 1, NULL),
(5, 2, '2026-06-08 00:12:41.000000', 'Ingreso Lote: Compra regular de almacén', 6, 'INGRESO', 3, NULL),
(6, 4, '2026-06-08 00:16:16.000000', 'Ingreso Lote: Compra regular de almacén', 10, 'INGRESO', 3, NULL),
(7, 1, '2026-06-08 00:16:43.000000', 'Ingreso Lote: Compra regular de almacén', 11, 'INGRESO', 3, NULL),
(8, 40, '2026-06-08 00:49:24.000000', 'Ingreso Lote: 10.0 Kg (Rendimiento: 4.0 porc/Kg)', 75, 'INGRESO', 1, NULL),
(9, 15, '2026-06-08 00:54:05.000000', 'Ingreso Lote: 5.0 Kg (Rendimiento: 3.0 porc/Kg)', 90, 'INGRESO', 1, NULL),
(10, 40, '2026-06-08 00:57:09.000000', 'Ingreso Lote: 10.0 Kg (Rendimiento: 4.0 porc/Kg)', 130, 'INGRESO', 1, NULL),
(11, 10, '2026-06-08 00:59:14.000000', 'Ingreso Lote: 5.0 Kg (Rendimiento: 2.0 porc/Kg)', 140, 'INGRESO', 1, NULL),
(12, 40, '2026-06-08 01:01:47.000000', 'Ingreso Lote: 10.0 Kg (Rendimiento: 4.0 porc/Kg)', 180, 'INGRESO', 1, NULL),
(13, 32, '2026-06-08 01:22:38.000000', 'Producción Cocina - Rendimiento Lote ID: 5', 212, 'INGRESO', 1, NULL),
(14, 47, '2026-06-08 01:28:29.000000', 'Producción Cocina - Rendimiento Lote ID: 6', 259, 'INGRESO', 1, NULL),
(15, 42, '2026-06-08 01:32:45.000000', 'Producción en Cocina - Procesado desde Lote #4', 301, 'PRODUCCION', 1, 0.05),
(16, 100, '2026-06-08 01:47:58.000000', 'Ingreso Lote: 20.0 Kg (Rendimiento: 5.0 porc/Kg)', 401, 'INGRESO', 1, NULL),
(17, 40, '2026-06-08 01:53:07.000000', 'Ingreso Lote: 10.0 Kg (Rendimiento: 4.0 porc/Kg)', 40, 'INGRESO', 4, NULL),
(18, 30, '2026-06-08 02:10:47.000000', 'Ingreso Lote: 10.0 Kg (Rendimiento: 3.0 porc/Kg)', 82, 'INGRESO', 4, NULL),
(19, 40, '2026-06-08 02:15:51.000000', 'Ingreso Lote: 10.0 Kg (Rendimiento: 4.0 porc/Kg)', 40, 'INGRESO', 5, NULL),
(20, 1, '2026-06-08 04:06:29.000000', 'Despacho a cocina: 1x Mondonguito', 400, 'EGRESO', 1, NULL),
(21, 1, '2026-06-08 04:06:29.000000', 'Despacho a cocina: 1x Mondonguito', 2, 'EGRESO', 2, NULL),
(22, 1, '2026-06-08 04:11:32.000000', 'Despacho a cocina: 1x Mondonguito', 398, 'EGRESO', 1, NULL),
(23, 1, '2026-06-08 04:11:32.000000', 'Despacho a cocina: 1x Mondonguito', 1, 'EGRESO', 2, NULL),
(24, 1, '2026-06-08 04:19:29.000000', 'Despacho a cocina: 1x Mondonguito', 397, 'EGRESO', 1, NULL),
(25, 1, '2026-06-08 04:19:29.000000', 'Despacho a cocina: 1x Mondonguito', 0, 'EGRESO', 2, NULL),
(26, 1, '2026-06-08 10:26:28.000000', 'Despacho a cocina: 1x Mondonguito', 396, 'EGRESO', 1, NULL),
(27, 1, '2026-06-08 10:26:28.000000', 'Despacho a cocina: 1x Mondonguito', -1, 'EGRESO', 2, NULL),
(28, 1, '2026-06-08 10:35:37.000000', 'Despacho a cocina: 1x Mondonguito', 395, 'EGRESO', 1, NULL),
(29, 1, '2026-06-08 10:35:37.000000', 'Despacho a cocina: 1x Mondonguito', -2, 'EGRESO', 2, NULL),
(30, 1, '2026-06-11 02:07:07.000000', 'Despacho a cocina: 1x Mondonguito', 344, 'EGRESO', 1, NULL),
(31, 1, '2026-06-11 02:07:07.000000', 'Despacho a cocina: 1x Mondonguito', -3, 'EGRESO', 2, NULL),
(32, 1, '2026-06-11 02:09:06.000000', 'Despacho a cocina: 1x Mondonguito', 343, 'EGRESO', 1, NULL),
(33, 1, '2026-06-11 02:09:06.000000', 'Despacho a cocina: 1x Mondonguito', -4, 'EGRESO', 2, NULL),
(34, 2, '2026-06-11 03:03:06.000000', 'Ingreso Lote: asd', 2, 'INGRESO', 8, NULL),
(35, 2, '2026-06-11 03:03:22.000000', 'Ingreso Lote: asd', 4, 'INGRESO', 8, NULL),
(36, 2, '2026-06-11 03:04:46.000000', 'Ingreso Lote: asd', 6, 'INGRESO', 8, NULL),
(37, 3, '2026-06-11 03:06:54.000000', 'Apertura de Lote (Stock Reiniciado): 3.0 Und — asd', 3, 'INGRESO', 8, NULL),
(38, 1, '2026-06-11 05:34:34.000000', 'Despacho a cocina: 1x Mondonguito', 86, 'EGRESO', 4, NULL),
(39, 1, '2026-06-11 05:34:34.000000', 'Despacho a cocina: 1x Mondonguito', 2, 'EGRESO', 8, NULL),
(40, 1, '2026-06-11 12:50:48.000000', 'Despacho a cocina: 1x Mondonguito', -1, 'EGRESO', 4, NULL),
(41, 1, '2026-06-11 12:50:48.000000', 'Despacho a cocina: 1x Mondonguito', 1, 'EGRESO', 8, NULL),
(42, 1, '2026-06-11 13:29:58.000000', 'Despacho a cocina: 1x Mondonguito', 5, 'EGRESO', 4, NULL),
(43, 1, '2026-06-11 13:29:58.000000', 'Despacho a cocina: 1x Mondonguito', 0, 'EGRESO', 8, NULL),
(44, 1, '2026-06-11 13:38:22.000000', 'Despacho a cocina: 1x Mondonguito', 4, 'EGRESO', 4, NULL),
(45, 1, '2026-06-11 21:10:33.000000', 'Despacho a cocina: 1x Mondonguito', 3, 'EGRESO', 4, NULL);

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
(1, 4, '2026-06-08 02:04:12', 'INGRESO', 12, 'PRODUCCION', 52, NULL),
(2, 6, '2026-06-08 03:05:15', 'INGRESO', 32, 'PRODUCCION', 32, NULL),
(3, 1, '2026-06-08 04:06:29', 'EGRESO', 1, 'VENTA', 399, NULL),
(4, 1, '2026-06-08 04:19:29', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 115', 397, NULL),
(5, 1, '2026-06-08 10:26:28', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 116', 396, NULL),
(6, 1, '2026-06-08 10:35:37', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 118', 395, NULL),
(7, 1, '2026-06-11 01:13:27', 'EGRESO', 10, 'asd', 385, NULL),
(8, 1, '2026-06-11 01:17:19', 'EGRESO', 10, 'asd', 375, NULL),
(9, 1, '2026-06-11 01:19:28', 'EGRESO', 10, 'fdsasd', 365, NULL),
(10, 1, '2026-06-11 01:20:58', 'EGRESO', 10, 'asd', 355, NULL),
(11, 1, '2026-06-11 01:47:49', 'EGRESO', 10, 's', 345, NULL),
(12, 1, '2026-06-11 02:07:08', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 118', 344, NULL),
(13, 1, '2026-06-11 02:09:06', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 118', 343, NULL),
(14, 7, '2026-06-11 02:26:03', 'INGRESO', 20, 'PRODUCCION', 20, NULL),
(15, 7, '2026-06-11 02:26:14', 'EGRESO', 5, 'asd', 15, NULL),
(16, 4, '2026-06-11 02:49:04', 'INGRESO', 5, 'asd', 87, NULL),
(17, 9, '2026-06-11 03:24:19', 'INGRESO', 40, 'PRODUCCION', 40, NULL),
(18, 9, '2026-06-11 03:26:36', 'INGRESO', 17, 'PRODUCCION', 57, NULL),
(19, 9, '2026-06-11 03:27:20', 'INGRESO', 2, 'PRODUCCION', 59, NULL),
(20, 10, '2026-06-11 03:30:04', 'INGRESO', 27, 'PRODUCCION', 27, NULL),
(21, 10, '2026-06-11 03:30:49', 'INGRESO', 24, 'PRODUCCION', 51, NULL),
(22, 10, '2026-06-11 03:31:45', 'EGRESO', 51, 'Se malogró', 0, NULL),
(23, 10, '2026-06-11 03:32:41', 'INGRESO', 12, 'PRODUCCION', 12, NULL),
(24, 10, '2026-06-11 03:36:13', 'EGRESO', 12, 'asd', 0, NULL),
(25, 10, '2026-06-11 03:36:31', 'INGRESO', 20, 'PRODUCCION', 20, NULL),
(26, 10, '2026-06-11 03:43:02', 'INGRESO', 8, 'PRODUCCION', 28, NULL),
(27, 10, '2026-06-11 03:48:39', 'INGRESO', 12, 'Producción: 12 porc. obtenidas / 12 esperadas (Merma esperada: 0,000 kg, Merma obtenida: 0,100 kg)', 40, NULL),
(28, 10, '2026-06-11 03:50:42', 'EGRESO', 40, 'as', 0, NULL),
(29, 10, '2026-06-11 04:00:44', 'INGRESO', 16, 'Producción: 16 porc. obtenidas / 15 esperadas (Eficiencia: 106,7%, Merma en Balanza: 0,100 kg)', 16, NULL),
(30, 10, '2026-06-11 04:01:18', 'INGRESO', 15, 'Producción: 15 porc. obtenidas / 15 esperadas (Eficiencia: 100,0%, Merma en Balanza: 16,000 kg)', 31, NULL),
(31, 10, '2026-06-11 04:03:13', 'EGRESO', 31, 'asd', 0, NULL),
(32, 10, '2026-06-11 04:03:39', 'INGRESO', 22, 'Producción: 22 porc. obtenidas / 20 esperadas (Eficiencia: 110,0%, Merma en Balanza: 0,100 kg)', 22, NULL),
(33, 10, '2026-06-11 04:04:33', 'INGRESO', 20, 'Producción: 20 porc. obtenidas / 20 esperadas (Eficiencia: 100,0%, Merma en Balanza: 5,000 kg)', 42, NULL),
(34, 10, '2026-06-11 04:06:53', 'EGRESO', 42, '1', 0, NULL),
(35, 10, '2026-06-11 04:07:42', 'INGRESO', 16, 'Producción: 16 porc. obtenidas / 15 esperadas (Eficiencia: 106,7%, Merma en Balanza: 0,210 kg)', 16, NULL),
(36, 10, '2026-06-11 04:15:35', 'INGRESO', 15, 'Producción: 15 porc. obtenidas / 15 esperadas (Eficiencia: 100,0%, Merma en Balanza: 0,100 kg)', 31, NULL),
(37, 10, '2026-06-11 04:19:00', 'EGRESO', 31, 'asd', 0, NULL),
(38, 10, '2026-06-11 04:19:29', 'INGRESO', 12, 'Producción: 12 porc. obtenidas / 12 esperadas (Eficiencia: 100,0%, Merma en Balanza: 0,240 kg)', 12, NULL),
(39, 4, '2026-06-11 05:34:34', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 122', 86, 0),
(40, 4, '2026-06-11 06:19:06', 'EGRESO', 86, 'test', 0, 0),
(41, 4, '2026-06-11 12:50:48', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 121', -1, 0),
(42, 4, '2026-06-11 12:50:58', 'INGRESO', 1, 'asd', 0, 0),
(43, 4, '2026-06-11 13:28:49', 'INGRESO', 3, 'asd', 3, 0),
(44, 4, '2026-06-11 13:28:59', 'INGRESO', 3, 'asd', 6, 0),
(45, 4, '2026-06-11 13:29:58', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 126', 5, 0),
(46, 8, '2026-06-11 13:37:22', 'INGRESO', 5, 'asd', 5, 0),
(47, 4, '2026-06-11 13:38:22', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 127', 4, 0),
(48, 4, '2026-06-11 21:10:33', 'EGRESO', 1, 'VENTA_SALA - Despacho de comanda Pedido N° 128', 3, 0),
(49, 4, '2026-06-12 18:48:54', 'INGRESO', 10, 'Producción: 10 porc. obtenidas / 10 esperadas (Eficiencia: 100,0%, Merma en Balanza: 0,100 kg)', 13, 0.1),
(50, 9, '2026-06-12 18:49:07', 'INGRESO', 1, 'asd', 60, 0);

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
  `documento_cliente` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido`
--

INSERT INTO `pedido` (`id`, `cliente_nombre`, `direccion_entrega`, `estado`, `fecha_creacion`, `fecha_entrega`, `fecha_salida`, `latitud`, `longitud`, `monto_total`, `id_repartidor`, `numero_mesa`, `tipo_pedido`, `frio_listo`, `caliente_listo`, `comprobante_numero`, `comprobante_tipo`, `documento_cliente`) VALUES
(1, 'Mesa #1', '', 'PAGADO', '2026-06-07 14:08:44.000000', '2026-06-07 14:09:15.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, 'B001-71736', 'BOLETA', '60812709'),
(2, 'Mesa #1', '', 'PAGADO', '2026-06-07 14:12:14.000000', '2026-06-07 14:12:34.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, 'B001-37716', 'BOLETA', 'CLIENTE VARIOS'),
(100, 'Mesa #5', '', 'CANCELADO', '2026-06-07 14:15:56.000000', NULL, NULL, NULL, NULL, 30, NULL, 5, 'LOCAL', 1, 1, NULL, NULL, NULL),
(101, 'Mesa #1', '', 'PAGADO', '2026-06-07 14:27:27.000000', '2026-06-07 14:27:58.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, 'F001-63460', 'FACTURA', '21432432432'),
(102, 'Mesa #1', '', 'PAGADO', '2026-06-07 14:40:06.000000', '2026-06-07 14:48:23.000000', '2026-06-07 14:45:18.000000', NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(103, 'Mesa #1', '', 'PAGADO', '2026-06-07 15:07:45.000000', '2026-06-07 15:08:10.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(104, 'Mesa #1', '', 'PAGADO', '2026-06-07 15:13:44.000000', '2026-06-07 15:14:15.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(105, 'Mesa #1', '', 'PAGADO', '2026-06-07 15:24:36.000000', '2026-06-07 15:25:00.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(106, 'Mesa #1', '', 'PAGADO', '2026-06-07 15:51:42.000000', '2026-06-07 15:52:12.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(107, 'Mesa #1', '', 'PAGADO', '2026-06-07 15:54:31.000000', '2026-06-07 15:54:52.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(108, 'Mesa #1', '', 'PAGADO', '2026-06-07 15:55:14.000000', '2026-06-07 15:55:42.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(109, 'Mesa #1', '', 'PAGADO', '2026-06-07 16:07:58.000000', '2026-06-07 16:08:33.000000', NULL, NULL, NULL, 90, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(110, 'Mesa #4', '', 'PAGADO', '2026-06-07 16:43:24.000000', '2026-06-07 17:09:46.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(111, 'Mesa #1', '', 'PAGADO', '2026-06-07 23:58:50.000000', '2026-06-08 00:00:11.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(112, 'Mesa #1', '', 'PAGADO', '2026-06-08 00:04:37.000000', '2026-06-08 00:12:14.000000', NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(113, 'Mesa #1', '', 'CANCELADO', '2026-06-08 04:06:14.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(114, 'Mesa #2', '', 'CANCELADO', '2026-06-08 04:11:26.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(115, 'Mesa #3', '', 'CANCELADO', '2026-06-08 04:19:07.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 1, 1, NULL, NULL, NULL),
(116, 'Mesa #4', '🚨 Mondonguito (SIN: Arroz)', 'PREPARADO', '2026-06-08 10:25:17.000000', NULL, NULL, NULL, NULL, 30, NULL, 4, NULL, 1, 1, NULL, NULL, NULL),
(117, 'Mesa 6', 'Salón', 'ASIGNADO', '2026-06-08 10:26:50.000000', NULL, NULL, NULL, NULL, 30, NULL, 6, NULL, 0, 0, NULL, NULL, NULL),
(118, 'Mesa #3', '', 'PREPARADO', '2026-06-08 10:33:48.000000', NULL, NULL, NULL, NULL, 60, NULL, 3, NULL, 1, 1, NULL, NULL, NULL),
(119, 'Mesa 14', 'Salón', 'CANCELADO', '2026-06-08 10:36:20.000000', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL),
(120, 'Mesa 1', 'Salón', 'PENDIENTE', '2026-06-09 08:17:51.000000', NULL, NULL, NULL, NULL, 30, NULL, 1, NULL, 0, 0, NULL, NULL, NULL),
(121, 'Mesa #2', '', 'PREPARADO', '2026-06-11 02:07:21.000000', NULL, NULL, NULL, NULL, 30, NULL, 2, NULL, 1, 1, NULL, NULL, NULL),
(122, 'Mesa #5', '', 'ASIGNADO', '2026-06-11 05:34:04.000000', NULL, NULL, NULL, NULL, 30, NULL, 5, NULL, 1, 1, NULL, NULL, NULL),
(123, 'Mesa #8', '', 'EN_COCINA', '2026-06-11 06:22:01.000000', NULL, NULL, NULL, NULL, 30, NULL, 8, NULL, 0, 1, NULL, NULL, NULL),
(124, 'Mesa 21', 'Salón', 'PENDIENTE', '2026-06-11 12:34:56.000000', NULL, NULL, NULL, NULL, 60, NULL, 21, NULL, 0, 0, NULL, NULL, NULL),
(125, 'Mesa 13', 'Salón', 'PENDIENTE', '2026-06-11 12:38:27.000000', NULL, NULL, NULL, NULL, 30, NULL, 13, NULL, 0, 0, NULL, NULL, NULL),
(126, 'Mesa #7', '', 'ASIGNADO', '2026-06-11 13:29:15.000000', NULL, NULL, NULL, NULL, 30, NULL, 7, NULL, 1, 1, NULL, NULL, NULL),
(127, 'Mesa #12', '', 'PREPARADO', '2026-06-11 13:38:09.000000', NULL, NULL, NULL, NULL, 30, NULL, 12, NULL, 1, 1, NULL, NULL, NULL),
(128, 'Mesa #9', '', 'PREPARADO', '2026-06-11 21:10:26.000000', NULL, NULL, NULL, NULL, 30, NULL, 9, NULL, 1, 1, NULL, NULL, NULL),
(129, 'Mesa #10', '', 'EN_COCINA', '2026-06-12 01:42:49.000000', NULL, NULL, NULL, NULL, 30, NULL, 10, NULL, 1, 0, NULL, NULL, NULL);

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
(1, 1, 30, 30, 1, 2, b'1', b'1', b'0', b'1', b'1'),
(2, 1, 30, 30, 2, 2, b'1', b'1', b'0', b'1', b'1'),
(100, 2, 45, NULL, 116, 1, b'1', b'1', b'0', b'1', b'1'),
(102, 1, 30, 30, 101, 2, b'1', b'1', b'0', b'1', b'1'),
(103, 1, 30, 30, 102, 2, b'1', b'1', b'0', b'1', b'1'),
(104, 1, 30, 30, 103, 2, b'1', b'1', b'0', b'1', b'1'),
(105, 1, 30, 30, 104, 2, b'1', b'1', b'0', b'1', b'1'),
(106, 1, 30, 30, 105, 2, b'1', b'1', b'0', b'1', b'1'),
(107, 1, 30, 30, 106, 2, b'1', b'1', b'0', b'1', b'1'),
(108, 1, 30, 30, 107, 2, b'1', b'1', b'0', b'1', b'1'),
(109, 1, 30, 30, 108, 2, b'1', b'1', b'0', b'1', b'1'),
(110, 1, 30, 30, 109, 2, b'1', b'1', b'0', b'1', b'1'),
(111, 1, 30, 30, 109, 2, b'1', b'1', b'0', b'1', b'1'),
(112, 1, 30, 30, 109, 2, b'1', b'1', b'0', b'1', b'1'),
(113, 1, 30, 30, 110, 2, b'1', b'1', b'0', b'1', b'1'),
(114, 1, 30, 30, 111, 2, b'1', b'1', b'0', b'1', b'1'),
(115, 1, 30, 30, 112, 2, b'1', b'1', b'0', b'1', b'1'),
(116, 1, 30, 30, 124, 2, b'1', b'1', b'0', b'1', b'0'),
(117, 1, 30, 30, 120, 2, b'1', b'1', b'0', b'1', b'0'),
(118, 1, 30, 30, 117, 2, b'1', b'1', b'0', b'1', b'0'),
(119, 1, 30, 30, 116, 2, b'1', b'0', b'0', b'1', b'0'),
(120, 1, 30, 30, 125, 2, b'1', b'1', b'0', b'1', b'0'),
(121, 1, 30, 30, 124, 2, b'0', b'0', b'0', b'1', b'0'),
(122, 1, 30, 30, 118, 2, b'1', b'0', b'0', b'1', b'0'),
(123, 1, 30, 30, 118, 2, b'1', b'0', b'0', b'1', b'0'),
(124, 1, 30, 30, 121, 2, b'1', b'0', b'0', b'1', b'0'),
(125, 1, 30, 30, 122, 2, b'1', b'1', b'0', b'1', b'0'),
(126, 1, 30, 30, 123, 1, b'0', b'0', b'0', b'1', b'0'),
(127, 1, 30, 30, 126, 2, b'1', b'1', b'0', b'1', b'0'),
(128, 1, 30, 30, 127, 2, b'1', b'0', b'0', b'1', b'0'),
(129, 1, 30, 30, 128, 2, b'1', b'0', b'0', b'1', b'0'),
(130, 1, 30, 30, 129, 2, b'0', b'0', b'0', b'1', b'0');

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
(6, 'Acceso a cocina e insumos', 1, 'Cocinero'),
(7, 'Acceso a entregas propias', 1, 'Repartidor'),
(9, 'Super Administrador', 1, 'SUPER_ADMIN');

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
(9, 14);

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
(1, 8, '2026-06-08 02:04:12', 5, 10, 12, -1, NULL),
(2, 13, '2026-06-08 03:05:15', 10, 30, 32, -0.667, NULL),
(3, 17, '2026-06-11 02:26:03', 5, 20, 20, 0, NULL),
(4, 22, '2026-06-11 03:24:19', 10, 40, 40, 0, NULL),
(5, 23, '2026-06-11 03:26:36', 4.5, 14, 17, -1.167, NULL),
(6, 23, '2026-06-11 03:27:20', 0.5, 2, 2, -0.167, NULL),
(7, 24, '2026-06-11 03:30:04', 5, 25, 27, -0.4, NULL),
(8, 24, '2026-06-11 03:30:49', 5, 25, 24, 0.2, NULL),
(9, 25, '2026-06-11 03:32:41', 5, 10, 12, -1, NULL),
(10, 26, '2026-06-11 03:36:31', 5, 20, 20, 0, NULL),
(11, 26, '2026-06-11 03:43:02', 2, 8, 8, 0, NULL),
(12, 26, '2026-06-11 03:48:39', 3, 12, 12, 0.1, NULL),
(13, 27, '2026-06-11 04:00:44', 5, 15, 16, 0.1, NULL),
(14, 27, '2026-06-11 04:01:18', 5, 15, 15, 16, NULL),
(15, 28, '2026-06-11 04:03:39', 5, 20, 22, 0.1, NULL),
(16, 28, '2026-06-11 04:04:33', 5, 20, 20, 5, NULL),
(17, 29, '2026-06-11 04:07:42', 5, 15, 16, 0.21, NULL),
(18, 29, '2026-06-11 04:15:35', 5, 15, 15, 0.1, NULL),
(19, 30, '2026-06-11 04:19:29', 3, 12, 12, 0.24, NULL),
(20, 31, '2026-06-12 18:48:54', 10, 10, 10, 0.1, NULL);

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
(1, 'Descripción de ceviche', 1, 'ceviche', 30, NULL, 1, '4e3206c5-b033-430d-8787-8c1799e17525_ceviche.jpg'),
(2, 'Descripción de mondonguito', 1, 'Mondonguito', 30, NULL, 2, 'da6889be-a4c9-449a-a772-19572aa48d57___Stan marsh__.jpg'),
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
(20, 'Suaves láminas de pulpo bañadas en cremosa salsa de aceituna negra. Entrada sofisticada.', 1, 'Pulpo al Olivo', 35, 999, 1, NULL),
(21, 'asd', 1, 'asd', 10, NULL, 1, '3093fa79-1cbd-4731-8e5f-49ccb7b5de3a_S09_s1 - Tipos de dinámicas de grupo.pdf');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reserva`
--

CREATE TABLE `reserva` (
  `id` bigint(20) NOT NULL,
  `cantidad_personas` int(11) NOT NULL,
  `duracion_estimada_minutos` int(11) NOT NULL,
  `estado` enum('CANCELADA','CONFIRMADA','EXPIRADA','LIBERADA','PENDIENTE') NOT NULL,
  `fecha_creacion` datetime(6) NOT NULL,
  `fecha_hora_liberacion` datetime(6) NOT NULL,
  `fecha_hora_reserva` datetime(6) NOT NULL,
  `minutos_gracia` int(11) NOT NULL,
  `nombre_cliente` varchar(100) NOT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `numero_mesa` int(11) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `mesas_asignadas` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `reserva`
--

INSERT INTO `reserva` (`id`, `cantidad_personas`, `duracion_estimada_minutos`, `estado`, `fecha_creacion`, `fecha_hora_liberacion`, `fecha_hora_reserva`, `minutos_gracia`, `nombre_cliente`, `notas`, `numero_mesa`, `telefono`, `mesas_asignadas`) VALUES
(1, 5, 60, 'PENDIENTE', '2026-06-07 11:10:54.000000', '2026-06-07 12:11:00.000000', '2026-06-07 11:11:00.000000', 15, 'José Tafur', '', 7, '123456789', '7,8');

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
(2, b'1', NULL, '2026-06-07 13:17:19.000000', NULL, 800, NULL, NULL, NULL);

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
(3, '$2a$10$JdOMrEO/7.xP/6ORUFiFn.LN/HyRHHJVATzoAi/9OXGyCgpFxtz8.', 'test@test.com', 2, 'testeador', 1),
(4, '$2a$10$UCSxAoxpltqoJhdRCXH1eeNxcRUWCVGikbB3DK.dfW1f4DNGuNiZu', 'test@gmail.com', 2, 'NuevoTest', 1),
(5, '$2a$10$bE6Ec68oxapcy5Kala9b6O8yBHxqNG1/Cvy61WT/OHDqORNKdaV0G', 'cajerotest@gmail.com', 1, 'Cajero', 3),
(6, '$2a$10$PnPAMGBnwIeKYfNm7lKQeervtdpUnYz6.RFes5hK/32Kzz6aHNyXK', 'CocinaFria@gmail.com', 1, 'CocinaFria', 3),
(7, '$2a$10$Dmd2ZkHfdvtc2BPeiBrjpuHU0WoolFD5/GHIF.Cm4gn/giyXAeN2K', 'mesero@gmail.com', 1, 'Mesero', 3),
(8, '$2a$10$CIosk1vtqr3IvOafkxkMYejTle4HtG/N6wRNDGaXCrmTSj9A9H3BO', 'Delivery2@gmail.com', 1, 'Pruebanueva', 3),
(9, '$2b$10$zC0eeCs/nt7LbDC5S4VLkeG2uzlZt6dNFCvXhO.t2MrO7S71Avkzq', 'superadmin@lajama.com', 1, 'superadmin', 9);

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
  ADD KEY `id_insumo` (`id_insumo`);

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
  ADD KEY `id_lote` (`id_lote`);

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
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `insumo_producto`
--
ALTER TABLE `insumo_producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `lote_insumo`
--
ALTER TABLE `lote_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `mesa`
--
ALTER TABLE `mesa`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT de la tabla `movimiento_caja`
--
ALTER TABLE `movimiento_caja`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de la tabla `movimiento_insumo`
--
ALTER TABLE `movimiento_insumo`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT de la tabla `movimiento_porciones`
--
ALTER TABLE `movimiento_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT de la tabla `opcion`
--
ALTER TABLE `opcion`
  MODIFY `id_opcion` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=130;

--
-- AUTO_INCREMENT de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=131;

--
-- AUTO_INCREMENT de la tabla `perfil`
--
ALTER TABLE `perfil`
  MODIFY `id_perfil` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `produccion_porciones`
--
ALTER TABLE `produccion_porciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `producto`
--
ALTER TABLE `producto`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `reserva`
--
ALTER TABLE `reserva`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `turno_caja`
--
ALTER TABLE `turno_caja`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
  ADD CONSTRAINT `movimiento_porciones_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumo` (`id`);

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
