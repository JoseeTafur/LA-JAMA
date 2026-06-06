package com.web.restaurante.repository;

import com.web.restaurante.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    List<Usuario> findAllByEstadoNot(Integer estado);
    long countByEstadoNot(Integer estado);
    long countByPerfil_Id(Long idPerfil);

    Optional<Usuario> findByUsuario(String usuario);
    Optional<Usuario> findByUsuarioIgnoreCase(String usuario);

    Optional<Usuario> findByCorreo(String correo);
    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    boolean existsByUsuario(String usuario);
    boolean existsByCorreo(String correo);

    @Modifying
    @Query("UPDATE Usuario u SET u.estado = :nuevoEstado WHERE u.id = :id")
    void actualizarEstado(Long id, Integer nuevoEstado);
}
