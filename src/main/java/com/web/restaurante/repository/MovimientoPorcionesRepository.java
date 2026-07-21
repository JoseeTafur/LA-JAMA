package com.web.restaurante.repository;

import com.web.restaurante.model.MovimientoPorciones;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovimientoPorcionesRepository extends JpaRepository<MovimientoPorciones, Long> {

    List<MovimientoPorciones> findTop50ByInsumoIdOrderByFechaDesc(Long insumoId);
}