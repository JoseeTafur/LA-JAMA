package com.web.restaurante.repository;

import com.web.restaurante.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByEstado(Integer estado);
    Categoria findByNombre(String nombre);
}