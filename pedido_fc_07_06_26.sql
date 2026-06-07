-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-06-2026 a las 14:02:21
-- Versión del servidor: 9.3.0
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `restauranteweb3`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

CREATE TABLE `pedido` (
  `id` bigint NOT NULL,
  `cliente_nombre` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `direccion_entrega` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `estado` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_entrega` datetime(6) DEFAULT NULL,
  `fecha_salida` datetime(6) DEFAULT NULL,
  `latitud` double DEFAULT NULL,
  `longitud` double DEFAULT NULL,
  `monto_total` double DEFAULT NULL,
  `id_repartidor` bigint DEFAULT NULL,
  `numero_mesa` int DEFAULT NULL,
  `tipo_pedido` enum('DELIVERY','LOCAL') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `frio_listo` tinyint(1) DEFAULT '0',
  `caliente_listo` tinyint(1) DEFAULT '0'
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
(57, 'Mesa #8', '', 'ASIGNADO', '2026-06-06 04:18:38.000000', NULL, NULL, NULL, NULL, 30, NULL, 8, NULL, 1, 1),
(58, 'Pepe', 'Pampa Hermosa, Ucayali, Loreto', 'PENDIENTE', '2026-06-06 18:44:29.734731', NULL, NULL, -6.817352822622144, -75.90234428644182, 30, NULL, NULL, 'DELIVERY', 0, 0),
(59, 'Pepe botellas', 'Calle sapolio', 'PENDIENTE', '2026-06-07 03:57:09.000000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'DELIVERY', 0, 0),
(60, 'x', 'x', 'CANCELADO', '2026-06-07 03:59:35.000000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0),
(61, 'asasas', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'CANCELADO', '2026-06-07 05:42:10.794169', NULL, NULL, NULL, NULL, 25, NULL, NULL, 'LOCAL', 0, 0),
(62, 'xaaaaaa', 'Casona Elias Aguire, 971, Avenida Elias Aguirre', 'CANCELADO', '2026-06-07 05:43:59.286448', NULL, NULL, -6.772028649229518, -79.83730316162111, 25, NULL, NULL, 'DELIVERY', 0, 0),
(63, 'xxaxaxaaxax', 'Servimed Peru, Avenida Luis Gonzáles, Chiclayo', 'CANCELADO', '2026-06-07 05:46:20.060532', NULL, NULL, -6.773920793948891, -79.84210968017578, 25, NULL, NULL, 'DELIVERY', 0, 0),
(64, 'ooooo', 'Calle Cristobal Colón, Chiclayo, Lambayeque', 'CANCELADO', '2026-06-07 05:49:13.976403', NULL, NULL, -6.775096986589738, -79.83962059020998, 25, NULL, NULL, 'DELIVERY', 0, 0),
(65, 'xyxyxyxyx', 'Calle Las Acacias, Urbanización Santa Victoria, Chiclayo', 'PENDIENTE', '2026-06-07 05:50:46.346960', NULL, NULL, -6.782989342946932, -79.84185218811037, 25, NULL, NULL, 'DELIVERY', 0, 0),
(66, 'cicicicici', 'Pasaje Pavayacu, Urbanización Federico Villareal, Chiclayo', 'CANCELADO', '2026-06-07 05:54:08.134078', NULL, NULL, -6.781830214029647, -79.83524322509767, 30, NULL, NULL, 'DELIVERY', 0, 0),
(67, 'mmmmmmm', 'Buenos Aires, Chiclayo, Lambayeque', 'CANCELADO', '2026-06-07 05:56:47.451062', NULL, NULL, -6.779102842095791, -79.84168052673341, 30, NULL, NULL, 'DELIVERY', 0, 0),
(68, 'Nuevo tst', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'PENDIENTE', '2026-06-07 06:46:46.981148', NULL, NULL, NULL, NULL, 18, NULL, NULL, 'LOCAL', 0, 0),
(69, 'rueba', 'Recojo en local - Calle Amarantos 091, Santa Victoria', 'EN_REVISION', '2026-06-07 06:52:47.671940', NULL, NULL, NULL, NULL, 18, NULL, NULL, 'LOCAL', 0, 0),
(70, 'another', 'Institución Educativa Renan Elias Olivera, Avenida San Francisco de Asís, Chiclayo', 'CANCELADO', '2026-06-07 06:55:41.709331', NULL, NULL, -6.778601048154655, -79.81884956359865, 46, NULL, NULL, 'DELIVERY', 0, 0),
(71, 'anotherone', 'Institución Educativa Renan Elias Olivera, Avenida San Francisco de Asís, Chiclayo', 'PENDIENTE', '2026-06-07 06:56:40.492034', NULL, NULL, -6.778601048154655, -79.81884956359865, 46, NULL, NULL, 'DELIVERY', 0, 0);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKfx0mpssl90lcsgec718ckavj` (`id_repartidor`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `FKfx0mpssl90lcsgec718ckavj` FOREIGN KEY (`id_repartidor`) REFERENCES `empleado` (`id_empleado`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
