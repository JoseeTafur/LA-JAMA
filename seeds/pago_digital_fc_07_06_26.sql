-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-06-2026 a las 14:02:01
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
-- Estructura de tabla para la tabla `pago_digital`
--

CREATE TABLE `pago_digital` (
  `id` bigint NOT NULL,
  `fecha_pago` datetime(6) DEFAULT NULL,
  `img_url` varchar(255) DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  `situacion` enum('ANULADO','APROBADO','PENDIENTE') DEFAULT NULL,
  `id_pedido` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `pago_digital`
--

INSERT INTO `pago_digital` (`id`, `fecha_pago`, `img_url`, `observacion`, `situacion`, `id_pedido`) VALUES
(1, '2026-06-07 04:00:48.000000', NULL, 'Test', 'APROBADO', 59),
(2, '2026-06-07 05:43:59.503543', NULL, '', 'ANULADO', 60),
(3, '2026-06-07 05:46:20.283635', NULL, '', 'ANULADO', 61),
(4, '2026-06-07 05:49:14.254359', NULL, '', 'ANULADO', 62),
(5, '2026-06-07 05:50:46.626604', NULL, '', 'ANULADO', 63),
(6, '2026-06-07 05:54:08.361846', NULL, '', 'ANULADO', 64),
(7, '2026-06-07 05:56:47.661130', 'http://localhost:3000/uploads/pagodigital/7/72ea4bd450a39451.jpg', '', 'APROBADO', 65),
(8, '2026-06-07 06:46:47.046241', 'http://localhost:3000/uploads/pagodigital/8/930f05cecedf0f8c.gif', '', 'ANULADO', 66),
(9, '2026-06-07 06:52:47.755833', 'http://localhost:3000/uploads/pagodigital/9/e71fcebb5fe24519.jpg', '', 'ANULADO', 67),
(10, '2026-06-07 06:55:41.763497', 'http://localhost:3000/uploads/pagodigital/10/ef2da6e8faaa51a2.jpg', '', 'ANULADO', 70),
(11, '2026-06-07 06:56:40.522101', 'http://localhost:3000/uploads/pagodigital/11/ef2da6e8faaa51a2.jpg', '', 'APROBADO', 71);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKfotrrvqei3q76ww7blds97ymv` (`id_pedido`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `pago_digital`
--
ALTER TABLE `pago_digital`
  ADD CONSTRAINT `FKfotrrvqei3q76ww7blds97ymv` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
