package com.web.restaurante.repository;

import com.web.restaurante.model.MovimientoSerie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MovimientoSerieRepository extends JpaRepository<MovimientoSerie, Long> {

    @Query(value = "SELECT * FROM movimiento_serie WHERE serie = :serie FOR UPDATE", nativeQuery = true)
    Optional<MovimientoSerie> findBySerieConBloqueoNativo(@Param("serie") String serie);
}