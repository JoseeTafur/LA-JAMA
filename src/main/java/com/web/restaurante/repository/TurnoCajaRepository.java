package com.web.restaurante.repository;

import com.web.restaurante.model.TurnoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface TurnoCajaRepository extends JpaRepository<TurnoCaja, Long> {

    Optional<TurnoCaja> findByActivoTrue();

    @Query("SELECT t FROM TurnoCaja t WHERE t.activo = false ORDER BY t.fechaCierre DESC")
    List<TurnoCaja> findTurnosCerradosOrdenados();

    // =========================================================================
    // ⚙️ REPARADO: Consulta atómica nativa para purgar el asiento contable del Libro Diario
    // =========================================================================
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM movimiento_caja WHERE id = :movimientoId", nativeQuery = true)
    void deleteMovimientoById(@Param("movimientoId") Long movimientoId);
}