package com.web.restaurante.repository;

import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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

    @Query("SELECT p FROM Pedido p WHERE p.estado IN (" +
        "com.web.restaurante.model.enums.EstadoPedido.ENTREGADO, " +
        "com.web.restaurante.model.enums.EstadoPedido.PREPARADO) " +
        "AND p.tipoPedido = com.web.restaurante.model.enums.TipoPedido.LOCAL " +
        "OR p.estado = com.web.restaurante.model.enums.EstadoPedido.ENTREGADO " +
        "AND p.tipoPedido = com.web.restaurante.model.enums.TipoPedido.DELIVERY " +
        "ORDER BY p.fechaCreacion ASC")
List<Pedido> listarPedidosPorCobrar();

    @Query("SELECT p FROM Pedido p WHERE p.estado = com.web.restaurante.model.enums.EstadoPedido.ENTREGADO " +
            "AND CAST(p.fechaEntrega AS date) = CURRENT_DATE")
    List<Pedido> listarEntregasDelDia();

    @Query("SELECT p FROM Pedido p WHERE p.estado = com.web.restaurante.model.enums.EstadoPedido.PREPARADO " +
            "AND p.tipoPedido = com.web.restaurante.model.enums.TipoPedido.DELIVERY " +
            "ORDER BY p.fechaCreacion ASC")
    List<Pedido> findPreparadosParaDelivery();

    /**
     * Pedidos de la carta digital: DELIVERY + PENDIENTE + con coordenadas.
     * Entran directamente desde /carta sin pasar por cocina,
     * por eso se muestran en despacho como "En preparación".
     */
    @Query("SELECT p FROM Pedido p WHERE p.tipoPedido = com.web.restaurante.model.enums.TipoPedido.DELIVERY " +
            "AND p.estado = com.web.restaurante.model.enums.EstadoPedido.PENDIENTE " +
            "AND p.latitud IS NOT NULL AND p.longitud IS NOT NULL " +
            "ORDER BY p.fechaCreacion ASC")
    List<Pedido> findDeliveryPendientesConCoordenadas();

    /**
     * Pedidos de carta PENDIENTE esperando aprobación del cajero.
     */
    @Query("SELECT p FROM Pedido p WHERE p.tipoPedido IN (" +
        "com.web.restaurante.model.enums.TipoPedido.DELIVERY, " +
        "com.web.restaurante.model.enums.TipoPedido.LOCAL) " +
        "AND p.estado = com.web.restaurante.model.enums.EstadoPedido.PENDIENTE " +
        "ORDER BY p.fechaCreacion ASC")
List<Pedido> findPedidosPendientesDeCarta();
}