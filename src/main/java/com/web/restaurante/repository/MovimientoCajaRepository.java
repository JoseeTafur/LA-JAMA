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

    List<MovimientoCaja> findByTipoOrderByFechaDesc(String tipo);

    @Query("SELECT m FROM MovimientoCaja m WHERE m.turno.id = :turnoId AND m.tipo = 'VENTA'")
    List<MovimientoCaja> findVentasByTurnoId(@Param("turnoId") Long turnoId);

    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tipo = 'VENTA' AND CAST(m.fecha AS date) = CURRENT_DATE")
    Double sumVentasHoy();

    @Query("SELECT COUNT(m) FROM MovimientoCaja m WHERE m.tipo = 'VENTA' AND CAST(m.fecha AS date) = CURRENT_DATE")
    Long countVentasHoy();
}