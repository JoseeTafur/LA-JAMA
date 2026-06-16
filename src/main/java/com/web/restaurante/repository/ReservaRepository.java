package com.web.restaurante.repository;

import com.web.restaurante.model.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    List<Reserva> findAllByOrderByFechaHoraReservaDesc();

    @Query("SELECT r FROM Reserva r WHERE r.estado = 'CONFIRMADA' AND r.fechaHoraReserva BETWEEN :ahora AND :limite")
    List<Reserva> findProximas(LocalDateTime ahora, LocalDateTime limite);
}