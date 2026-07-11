package com.web.restaurante.repository;

import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.EstadoPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    List<Pedido> findByEstado(EstadoPedido estado);
    List<Pedido> findByNumeroMesaAndEstado(Integer numeroMesa, EstadoPedido estado);
    List<Pedido> findByNumeroMesa(Integer numeroMesa);
    List<Pedido> findByEstadoNot(EstadoPedido estado);

    @Modifying
    @Transactional
    @Query("UPDATE Pedido p SET p.estado = :nuevoEstado WHERE p.id = :id")
    void actualizarEstadoJPQL(@Param("id") Long id, @Param("nuevoEstado") EstadoPedido nuevoEstado);

    @Query("SELECT p FROM Pedido p WHERE p.repartidor.id = :idEmpleado " +
            "AND p.estado IN (com.web.restaurante.model.enums.EstadoPedido.ASIGNADO, " +
            "com.web.restaurante.model.enums.EstadoPedido.EN_CAMINO)")
    List<Pedido> buscarPedidosActivosPorRepartidor(@Param("idEmpleado") Long idEmpleado);

    @Query("SELECT DISTINCT p FROM Pedido p " +
            "JOIN p.listaDetalles d " +
            "WHERE UPPER(d.producto.categoria.nombre) LIKE UPPER(CONCAT('%', :categoria, '%')) " +
            "AND p.estado = com.web.restaurante.model.enums.EstadoPedido.EN_COCINA " +
            "AND ((:categoria = 'FRI' AND p.frioListo = false) OR (:categoria = 'CALIENTE' AND p.calienteListo = false))")
    List<Pedido> buscarPedidosPorCocina(@Param("categoria") String categoria);

    // 🚀 REPARADO: La caja busca por cobrar aquellos cuya cuenta esté financieramente PENDIENTE
    @Query("SELECT p FROM Pedido p WHERE " +
            // 1. 🌐 FLUJO CARTA DIGITAL (Delivery / Recojo): Órdenes operando en producción
            "(p.numeroMesa IS NULL AND p.estado IN (com.web.restaurante.model.enums.EstadoPedido.EN_COCINA, com.web.restaurante.model.enums.EstadoPedido.PREPARADO)) " +
            "OR " +
            // 2. 🍽️ FLUJO PRESENCIAL (Salón): El estado de pago sigue PENDIENTE en mesa
            "(p.numeroMesa IS NOT NULL AND p.estadoPago = com.web.restaurante.model.enums.EstadoPago.PENDIENTE AND (p.comprobanteNumero IS NULL OR p.comprobanteNumero = '')) " +
            "ORDER BY p.fechaCreacion ASC")
    List<Pedido> listarPedidosPorCobrar();

    @Query("SELECT p FROM Pedido p WHERE p.estado = com.web.restaurante.model.enums.EstadoPedido.ENTREGADO " +
            "AND CAST(p.fechaEntrega AS date) = CURRENT_DATE")
    List<Pedido> listarEntregasDelDia();

    @Query("SELECT p FROM Pedido p WHERE p.estado = com.web.restaurante.model.enums.EstadoPedido.PREPARADO " +
            "AND p.tipoPedido = com.web.restaurante.model.enums.TipoPedido.DELIVERY " +
            "ORDER BY p.fechaCreacion ASC")
    List<Pedido> findPreparadosParaDelivery();

    @Query("SELECT p FROM Pedido p WHERE p.tipoPedido = com.web.restaurante.model.enums.TipoPedido.DELIVERY " +
            "AND p.estado = com.web.restaurante.model.enums.EstadoPedido.PENDIENTE " +
            "AND p.latitud IS NOT NULL AND p.longitud IS NOT NULL " +
            "ORDER BY p.fechaCreacion ASC")
    List<Pedido> findDeliveryPendientesConCoordenadas();

    @Query("SELECT p FROM Pedido p WHERE p.tipoPedido IN (" +
            "com.web.restaurante.model.enums.TipoPedido.DELIVERY, " +
            "com.web.restaurante.model.enums.TipoPedido.SALON, " +
            "com.web.restaurante.model.enums.TipoPedido.LLEVAR) " +
            "AND p.estado = com.web.restaurante.model.enums.EstadoPedido.PENDIENTE " +
            "ORDER BY p.fechaCreacion ASC")
    List<Pedido> findPedidosPendientesDeCarta();

    // 🚀 REPARADO: Evalúa el lote contable de hoy usando el canal financiero (PAGADO / EXTORNADO)
    @Query("SELECT p FROM Pedido p WHERE p.fechaCreacion > :fechaApertura AND ("
            + "(p.numeroMesa IS NOT NULL AND p.estadoPago IN (com.web.restaurante.model.enums.EstadoPago.PAGADO, com.web.restaurante.model.enums.EstadoPago.EXTORNADO)) OR "
            + "(p.numeroMesa IS NULL AND p.estadoPago IN (com.web.restaurante.model.enums.EstadoPago.PAGADO, com.web.restaurante.model.enums.EstadoPago.EXTORNADO) "
            + "AND p.estado IN (com.web.restaurante.model.enums.EstadoPedido.EN_COCINA, com.web.restaurante.model.enums.EstadoPedido.PREPARADO, com.web.restaurante.model.enums.EstadoPedido.ASIGNADO, com.web.restaurante.model.enums.EstadoPedido.ENTREGADO))"
            + ") ORDER BY p.fechaCreacion DESC")
    List<Pedido> findPedidosParaComprobantesHoy(@Param("fechaApertura") LocalDateTime fechaApertura);

    // 🚀 REPARADO: El historial visual de comprobantes filtra por estados de pago válidos (Finanzas)
    @Query("SELECT p FROM Pedido p WHERE "
            + "CAST(p.fechaCreacion AS date) BETWEEN :fechaInicio AND :fechaFin AND "
            + "( "
            + "  p.estadoPago IN (com.web.restaurante.model.enums.EstadoPago.PAGADO, com.web.restaurante.model.enums.EstadoPago.EXTORNADO) "
            + ") "
            + "ORDER BY p.fechaCreacion DESC")
    Page<Pedido> findHistorialComprobantes(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            Pageable pageable);

    // 🚀 REPARADO: Las notas de venta históricas evalúan el flujo financiero de caja
    @Query("SELECT p FROM Pedido p WHERE "
            + "CAST(p.fechaCreacion AS date) BETWEEN :fechaInicio AND :fechaFin AND "
            + "( "
            + "  p.estadoPago IN (com.web.restaurante.model.enums.EstadoPago.PAGADO, com.web.restaurante.model.enums.EstadoPago.EXTORNADO) "
            + ") AND "
            + "(p.comprobanteTipo IS NULL OR p.comprobanteTipo = 'NOTA_VENTA') "
            + "ORDER BY p.fechaCreacion DESC")
    Page<Pedido> findHistorialNotasVenta(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            Pageable pageable);

    List<Pedido> findByFechaCreacionBetweenOrderByFechaCreacionDesc(
            LocalDateTime inicio, LocalDateTime fin);

    // Agrega esto en tu PedidoRepository.java
    @Query("SELECT COALESCE(SUM(d.cantidad), 0) FROM Pedido p JOIN p.listaDetalles d " +
            "WHERE p.turnoCaja.id = :turnoId AND p.estadoPago != 'EXTORNADO' AND p.estado != 'CANCELADO'")
    Long countCantidadProductosPorTurno(@Param("turnoId") Long turnoId);

    @Query("SELECT COALESCE(SUM(p.montoTotal), 0.0) FROM Pedido p " +
            "WHERE p.turnoCaja.id = :turnoId " +
            "AND p.estado NOT IN ('CANCELADO', 'PENDIENTE') " +
            "AND p.estadoPago != 'EXTORNADO' " +
            "AND p.comprobanteNotaNumero IS NOT NULL " +
            "AND TRIM(p.comprobanteNotaNumero) != ''")
    Double sumMontoTotalPorTurno(@Param("turnoId") Long turnoId);
}