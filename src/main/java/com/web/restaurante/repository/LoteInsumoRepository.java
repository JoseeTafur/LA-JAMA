package com.web.restaurante.repository;

import com.web.restaurante.model.LoteInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoteInsumoRepository extends JpaRepository<LoteInsumo, Long> {

    List<LoteInsumo> findTop50ByInsumoIdOrderByFechaCompraDesc(Long insumoId);
    void deleteByInsumoId(Long insumoId);
}