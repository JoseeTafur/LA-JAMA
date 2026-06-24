package com.web.restaurante.repository;

import com.web.restaurante.model.NotaVentaSerie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotaVentaSerieRepository extends JpaRepository<NotaVentaSerie, Long> {

    // 🚀 BLINDAJE NATIVO MARIADB: Escribimos el SQL exacto para bloquear la fila sin alias conflictivos
    @Query(value = "SELECT * FROM nota_venta_serie WHERE serie = :serie FOR UPDATE", nativeQuery = true)
    Optional<NotaVentaSerie> findBySerieConBloqueoNativo(@Param("serie") String serie);
}