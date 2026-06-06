package com.web.restaurante.repository;

import com.web.restaurante.model.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    List<MovimientoCaja> findByTurnoIdOrderByFechaAsc(Long turnoId);

    @Query("SELECT m FROM MovimientoCaja m WHERE m.turno.id = :turnoId AND m.tipo = 'VENTA'")
    List<MovimientoCaja> findVentasByTurnoId(@Param("turnoId") Long turnoId);
}