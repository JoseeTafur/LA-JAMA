package com.web.restaurante.repository;

import com.web.restaurante.model.InsumoProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InsumoProductoRepository extends JpaRepository<InsumoProducto, Long> {

    List<InsumoProducto> findByProductoId(Long productoId);

    @Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByProductoId(Long productoId);

    @Modifying
    @Query("DELETE FROM InsumoProducto ip WHERE ip.insumo.id = :insumoId")
    void deleteByInsumoId(@Param("insumoId") Long insumoId);

    @Query("SELECT ip FROM InsumoProducto ip WHERE ip.insumo.id = :insumoId")
    List<InsumoProducto> findByInsumoId(@Param("insumoId") Long insumoId);
}