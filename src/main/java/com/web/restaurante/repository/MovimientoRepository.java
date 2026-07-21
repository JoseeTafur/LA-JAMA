package com.web.restaurante.repository;

import com.web.restaurante.model.MovimientoInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovimientoRepository extends JpaRepository<MovimientoInsumo, Long> {

    List<MovimientoInsumo> findTop50ByInsumoIdOrderByFechaDesc(Long insumoId);
    void deleteByInsumoId(Long insumoId);


}