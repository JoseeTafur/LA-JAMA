package com.web.restaurante.repository;

import com.web.restaurante.model.DetallePedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface DetallePedidoRepository extends JpaRepository<DetallePedido, Long> {

    // 🚀 PURGA DE COMANDAS: Limpia el historial de este plato para abrir la llave foránea
    @Modifying
    @Transactional
    @Query("DELETE FROM DetallePedido dp WHERE dp.producto.id = ?1")
    void deleteByProductoId(Long productoId);
}