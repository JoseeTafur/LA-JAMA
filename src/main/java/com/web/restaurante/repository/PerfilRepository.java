package com.web.restaurante.repository;

import com.web.restaurante.model.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfilRepository extends JpaRepository<Perfil, Long> {
    List<Perfil> findAllByEstadoNot(Integer estado);
    Optional<Perfil> findByNombreIgnoreCase(String nombre);
}
