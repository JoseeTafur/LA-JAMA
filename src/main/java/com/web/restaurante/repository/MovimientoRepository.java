package com.web.restaurante.repository;

import com.web.restaurante.model.MovimientoInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovimientoRepository extends JpaRepository<MovimientoInsumo, Long> {
    // 🔥 Agregado Top50 para proteger el historial de insumos generales
    List<MovimientoInsumo> findTop50ByInsumoIdOrderByFechaDesc(Long insumoId);
}