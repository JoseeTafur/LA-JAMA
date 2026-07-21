package com.web.restaurante.repository;

import com.web.restaurante.model.CajaSerie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CajaSerieRepository extends JpaRepository<CajaSerie, Long> {

    @Query(value = "SELECT * FROM caja_serie WHERE serie = :serie FOR UPDATE", nativeQuery = true)
    Optional<CajaSerie> findBySerieConBloqueoNativo(@Param("serie") String serie);
}