package com.web.restaurante.repository;

import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {

    Optional<Empleado> findByUsuario(Usuario usuario);
    List<Empleado> findByCargo_IdAndEstado(Long cargoId, Integer estado);

    @Query("SELECT e FROM Empleado e WHERE e.estado <> 2 ORDER BY e.apellido ASC, e.nombre ASC")
    List<Empleado> listarNoEliminados();
    @Query("SELECT e FROM Empleado e WHERE LOWER(e.dni) = LOWER(:dni) AND e.estado <> 2")
    Optional<Empleado> buscarPorDni(@Param("dni") String dni);
    @Query("SELECT e FROM Empleado e WHERE e.turno = :turno AND e.estado <> 2 ORDER BY e.apellido ASC")
    List<Empleado> buscarPorTurno(@Param("turno") String turno);
    @Query("SELECT e FROM Empleado e WHERE e.cargo.id = :idCargo AND e.estado <> 2")
    List<Empleado> buscarPorCargo(@Param("idCargo") Long idCargo);
    @Query("SELECT COUNT(e) FROM Empleado e WHERE e.estado = 1")
    long contarActivos();
    @Query("SELECT COUNT(e) FROM Empleado e WHERE e.turno = :turno AND e.estado = 1")
    long contarPorTurno(@Param("turno") String turno);

    @Query("SELECT e FROM Empleado e WHERE e.estado <> 2 AND " +
            "(LOWER(e.nombre) LIKE LOWER(CONCAT('%',:termino,'%')) OR " +
            " LOWER(e.apellido) LIKE LOWER(CONCAT('%',:termino,'%')) OR " +
            " LOWER(e.dni) LIKE LOWER(CONCAT('%',:termino,'%')))")
    List<Empleado> buscarPorTermino(@Param("termino") String termino);
    @Modifying
    @Query("UPDATE Empleado e SET e.estado = :nuevoEstado WHERE e.id = :id")
    void actualizarEstado(@Param("id") Long id, @Param("nuevoEstado") Integer nuevoEstado);
}