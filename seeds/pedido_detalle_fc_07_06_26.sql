-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-06-2026 a las 14:02:31
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
-- Estructura de tabla para la tabla `pedido_detalle`
--

CREATE TABLE `pedido_detalle` (
  `id` bigint NOT NULL,
  `cantidad` int DEFAULT NULL,
  `precio_unitario` double DEFAULT NULL,
  `subtotal` double DEFAULT NULL,
  `id_pedido` bigint DEFAULT NULL,
  `id_producto` bigint DEFAULT NULL,
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
(84, 1, 30, 30, 57, 2, b'1', b'1', b'0', b'1'),
(85, 1, 30, 30, 58, 1, b'0', b'0', b'0', b'0'),
(86, 1, 25, 25, 61, 3, b'0', b'0', b'0', b'0'),
(87, 1, 25, 25, 62, 3, b'0', b'0', b'0', b'0'),
(88, 1, 25, 25, 63, 3, b'0', b'0', b'0', b'0'),
(89, 1, 25, 25, 64, 7, b'0', b'0', b'0', b'0'),
(90, 1, 25, 25, 65, 3, b'0', b'0', b'0', b'0'),
(91, 1, 30, 30, 66, 1, b'0', b'0', b'0', b'0'),
(92, 1, 30, 30, 67, 4, b'0', b'0', b'0', b'0'),
(93, 1, 18, 18, 68, 6, b'0', b'0', b'0', b'0'),
(94, 1, 18, 18, 69, 6, b'0', b'0', b'0', b'0'),
(95, 1, 18, 18, 70, 6, b'0', b'0', b'0', b'0'),
(96, 1, 28, 28, 70, 8, b'0', b'0', b'0', b'0'),
(97, 1, 18, 18, 71, 6, b'0', b'0', b'0', b'0'),
(98, 1, 28, 28, 71, 8, b'0', b'0', b'0', b'0');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKaxtxfsueb7pagpev7p4r4mbin` (`id_pedido`),
  ADD KEY `FK5c7wbc95t8gesgfyqgad8icuh` (`id_producto`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=99;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD CONSTRAINT `FK5c7wbc95t8gesgfyqgad8icuh` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id`),
  ADD CONSTRAINT `FKaxtxfsueb7pagpev7p4r4mbin` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
