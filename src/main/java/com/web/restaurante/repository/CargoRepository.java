package com.web.restaurante.repository;

import com.web.restaurante.model.Cargo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CargoRepository extends JpaRepository<Cargo, Long> {

    @Query("SELECT c FROM Cargo c WHERE c.estado = 1 ORDER BY c.nombre ASC")
    List<Cargo> listarActivos();
}
