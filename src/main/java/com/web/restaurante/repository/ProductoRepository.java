package com.web.restaurante.repository;

import com.web.restaurante.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    List<Producto> findByEstado(Integer estado);

    List<Producto> findByNombreContainingIgnoreCase(String nombre);
    @Query("SELECT p FROM Producto p WHERE p.categoria.id = :idCategoria AND p.estado = 1")
    List<Producto> listarPorCategoria(@Param("idCategoria") Long idCategoria);
    @Query("SELECT p FROM Producto p WHERE p.categoria.nombre LIKE %:tipo% AND p.estado = 1")
    List<Producto> buscarPorTipoCocina(@Param("tipo") String tipo);
}