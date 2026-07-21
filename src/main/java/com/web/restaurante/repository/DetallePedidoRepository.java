package com.web.restaurante.repository;

import com.web.restaurante.model.DetallePedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface DetallePedidoRepository extends JpaRepository<DetallePedido, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM DetallePedido dp WHERE dp.producto.id = ?1")
    void deleteByProductoId(Long productoId);
}