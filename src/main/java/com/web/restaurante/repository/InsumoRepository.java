package com.web.restaurante.repository;

import com.web.restaurante.model.Insumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface InsumoRepository extends JpaRepository<Insumo, Long> {

    @Query(value = "SELECT * FROM insumo WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<Insumo> findByIdForUpdate(@Param("id") Long id);
}