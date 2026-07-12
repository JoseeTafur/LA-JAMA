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
    long countByPerfil_NombreIgnoreCaseAndEstadoNot(String nombrePerfil, Integer estado);

    // 🔒 MÉTODOS TRADICIONALES DE AUTENTICACIÓN (LOGIN DE SESIÓN NATIVA)
    Optional<Usuario> findByUsuario(String usuario);
    Optional<Usuario> findByCorreo(String correo);
    Optional<Usuario> findByUsuarioAndEstadoNot(String usuario, Integer estadoEliminado);

    // 🚀 CAMBIADOS A LIST PARA PREVENIR EL COLAPSO DEL ERROR 500 AL EDITAR/VALIDAR DUPLICADOS
    List<Usuario> findByUsuarioIgnoreCase(String usuario);
    List<Usuario> findByCorreoIgnoreCase(String correo);

    boolean existsByUsuario(String usuario);
    boolean existsByCorreo(String correo);

    @Modifying
    @Query("UPDATE Usuario u SET u.estado = :nuevoEstado WHERE u.id = :id")
    void actualizarEstado(Long id, Integer nuevoEstado);
}