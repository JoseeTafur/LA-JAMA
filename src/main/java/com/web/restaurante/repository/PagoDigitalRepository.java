package com.web.restaurante.repository;

import com.web.restaurante.model.PagoDigital;
import com.web.restaurante.model.enums.SituacionPagoDigital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PagoDigitalRepository extends JpaRepository<PagoDigital, Long> {

    List<PagoDigital> findAllBySituacion(SituacionPagoDigital situacion);
}
