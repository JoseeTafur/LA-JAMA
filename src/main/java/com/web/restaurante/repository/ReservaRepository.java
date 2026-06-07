package com.web.restaurante.repository;

import com.web.restaurante.model.Reserva;
import com.web.restaurante.model.enums.EstadoReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    List<Reserva> findByEstadoIn(List<EstadoReserva> estados);

    /**
     * Verifica conflictos de horario para una mesa:
     * Busca reservas activas que se solapan con el rango [inicio, fin].
     */
    @Query("""
        SELECT r FROM Reserva r
        WHERE r.numeroMesa = :mesa
          AND r.estado IN ('PENDIENTE', 'CONFIRMADA')
          AND r.fechaHoraReserva < :fin
          AND r.fechaHoraLiberacion > :inicio
          AND (:excludeId IS NULL OR r.id <> :excludeId)
    """)
    List<Reserva> findConflictos(
            @Param("mesa") Integer numeroMesa,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin,
            @Param("excludeId") Long excludeId
    );

    /**
     * Reservas PENDIENTES cuya hora de gracia ya expiró (cliente no llegó).
     */
    @Query("""
        SELECT r FROM Reserva r
        WHERE r.estado = 'PENDIENTE'
          AND r.fechaHoraReserva < :ahora
          AND FUNCTION('ADDTIME', r.fechaHoraReserva, FUNCTION('SEC_TO_TIME', r.minutosGracia * 60)) < :ahora
    """)
    List<Reserva> findReservasExpiradas(@Param("ahora") LocalDateTime ahora);

    /**
     * Reservas CONFIRMADAS cuya hora de liberación ya pasó.
     */
    @Query("SELECT r FROM Reserva r WHERE r.estado = 'CONFIRMADA' AND r.fechaHoraLiberacion <= :ahora")
    List<Reserva> findConfirmadasParaLiberar(@Param("ahora") LocalDateTime ahora);

    List<Reserva> findByNumeroMesaAndEstadoIn(Integer numeroMesa, List<EstadoReserva> estados);
}