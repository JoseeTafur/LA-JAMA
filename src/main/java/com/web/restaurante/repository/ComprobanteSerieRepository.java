package com.web.restaurante.repository;

import com.web.restaurante.model.ComprobanteSerie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ComprobanteSerieRepository extends JpaRepository<ComprobanteSerie, Long> {

    @Query(value = "SELECT * FROM comprobante_serie WHERE UPPER(tipo_comprobante) = UPPER(:tipo) FOR UPDATE", nativeQuery = true)
    Optional<ComprobanteSerie> obtenerSerieParaIncrementar(@Param("tipo") String tipo);
}