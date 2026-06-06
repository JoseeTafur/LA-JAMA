package com.web.restaurante.repository;

import com.web.restaurante.model.InsumoProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InsumoProductoRepository extends JpaRepository<InsumoProducto, Long> {

    List<InsumoProducto> findByProductoId(Long idProducto);

    List<InsumoProducto> findByInsumoId(Long idInsumo);
}