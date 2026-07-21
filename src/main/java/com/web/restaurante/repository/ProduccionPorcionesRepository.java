package com.web.restaurante.repository;

import com.web.restaurante.model.ProduccionPorciones;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProduccionPorcionesRepository extends JpaRepository<ProduccionPorciones, Long> {
    List<ProduccionPorciones> findByLoteIdOrderByFechaProduccionDesc(Long loteId);

    List<ProduccionPorciones> findTop50ByLoteInsumoIdOrderByFechaProduccionDesc(Long insumoId);
}