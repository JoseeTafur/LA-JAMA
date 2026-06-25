package com.web.restaurante.repository;

import com.web.restaurante.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface MetricasRepository extends JpaRepository<Pedido, Long> {

    @Query(value = "SELECT fecha_apertura FROM turno_caja ORDER BY fecha_apertura DESC LIMIT 1 OFFSET 9", nativeQuery = true)
    LocalDateTime obtenerFechaAperturaHace10Turnos();

    @Query("SELECT dp.producto.nombre AS nombre, SUM(dp.cantidad) AS total " +
            "FROM DetallePedido dp " +
            "WHERE dp.pedido.estado NOT IN (com.web.restaurante.model.enums.EstadoPedido.CANCELADO, com.web.restaurante.model.enums.EstadoPedido.PENDIENTE) " +
            "AND dp.pedido.fechaCreacion >= :fechaLimite " +
            "AND dp.canceladoPorCliente = false " +
            "GROUP BY dp.producto.id, dp.producto.nombre " +
            "ORDER BY SUM(dp.cantidad) DESC")
    List<Map<String, Object>> kpiTopPlatosUltimos10Turnos(@Param("fechaLimite") LocalDateTime fechaLimite);

    @Query("SELECT m.insumo.nombre AS nombre, SUM(m.cantidad) AS total " +
            "FROM MovimientoInsumo m " +
            "WHERE m.tipo = 'EGRESO' AND UPPER(m.insumo.categoria) LIKE '%PROTEIN%' AND m.fecha >= :fecha " +
            "GROUP BY m.insumo.id, m.insumo.nombre")
    List<Map<String, Object>> kpiConsumoProteinas(@Param("fecha") LocalDateTime fecha);

    @Query("SELECT UPPER(me.estado) AS estado, COUNT(me) AS total " +
            "FROM Mesa me " +
            "GROUP BY me.estado")
    List<Map<String, Object>> kpiEstadoMesasActual();

    @Query("SELECT COUNT(p) AS total " +
            "FROM Pedido p " +
            "WHERE p.estado NOT IN (com.web.restaurante.model.enums.EstadoPedido.CANCELADO, com.web.restaurante.model.enums.EstadoPedido.PENDIENTE) " +
            "AND p.fechaCreacion >= :fecha")
    Long kpiTotalPedidosAtendidosHoy(@Param("fecha") LocalDateTime fecha);

    @Query("SELECT p.tipoPedido AS canal, COUNT(p) AS total " +
            "FROM Pedido p " +
            "WHERE p.estado NOT IN (com.web.restaurante.model.enums.EstadoPedido.CANCELADO, com.web.restaurante.model.enums.EstadoPedido.PENDIENTE) " +
            "AND p.fechaCreacion >= :fechaLimite " +
            "GROUP BY p.tipoPedido")
    List<Map<String, Object>> kpiCanalesVenta(@Param("fechaLimite") LocalDateTime fechaLimite);
}