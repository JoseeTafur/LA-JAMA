package com.web.restaurante.repository;

import com.web.restaurante.model.TurnoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TurnoCajaRepository extends JpaRepository<TurnoCaja, Long> {

    Optional<TurnoCaja> findByActivoTrue();

    @Query("SELECT t FROM TurnoCaja t WHERE t.activo = false ORDER BY t.fechaCierre DESC")
    List<TurnoCaja> findTurnosCerradosOrdenados();
}