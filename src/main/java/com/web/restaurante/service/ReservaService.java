package com.web.restaurante.service;

import com.web.restaurante.dto.reserva.ReservaSaveDTO;
import com.web.restaurante.model.Reserva;
import com.web.restaurante.model.enums.EstadoReserva;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservaService {

    private final ReservaRepository reservaRepository;
    private final MesaRepository mesaRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── CREAR RESERVA ──────────────────────────────────────────────────────────

    @Transactional
    public Reserva crearReserva(ReservaSaveDTO dto) {

        // ✅ FIX 1: No permitir reservas en el pasado
        if (dto.getFechaHoraReserva().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException(
                "No puedes crear una reserva en el pasado. Selecciona una fecha y hora futura.");
        }

        // ✅ FIX 2: No permitir reservas con más de 30 días de anticipación
        if (dto.getFechaHoraReserva().isAfter(LocalDateTime.now().plusDays(30))) {
            throw new IllegalStateException(
                "No se pueden crear reservas con más de 30 días de anticipación.");
        }

        // ✅ FIX 3: Validar cantidad de personas
        if (dto.getCantidadPersonas() == null || dto.getCantidadPersonas() < 1) {
            throw new IllegalStateException("La cantidad de personas debe ser al menos 1.");
        }

        validarDisponibilidad(dto.getNumeroMesa(), dto.getFechaHoraReserva(),
                dto.getFechaHoraReserva().plusMinutes(dto.getDuracionEstimadaMinutos()), null);

        Reserva reserva = new Reserva();
        reserva.setNombreCliente(dto.getNombreCliente().trim());
        reserva.setTelefono(dto.getTelefono());
        reserva.setNumeroMesa(dto.getNumeroMesa());
        reserva.setCantidadPersonas(dto.getCantidadPersonas());
        reserva.setFechaHoraReserva(dto.getFechaHoraReserva());
        reserva.setDuracionEstimadaMinutos(dto.getDuracionEstimadaMinutos());
        reserva.setMinutosGracia(dto.getMinutosGracia());
        reserva.setNotas(dto.getNotas());
        reserva.setEstado(EstadoReserva.PENDIENTE);

        return reservaRepository.save(reserva);
    }

    // ── CONFIRMAR LLEGADA DEL CLIENTE ─────────────────────────────────────────

    @Transactional
    public void confirmarLlegada(Long idReserva) {
        Reserva reserva = obtenerOFallar(idReserva);

        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new IllegalStateException("Solo se pueden confirmar reservas en estado PENDIENTE.");
        }

        // Si el cliente llegó tarde, recalcular la liberación desde ahora
        LocalDateTime ahora = LocalDateTime.now();
        if (ahora.isAfter(reserva.getFechaHoraReserva())) {
            reserva.setFechaHoraLiberacion(ahora.plusMinutes(reserva.getDuracionEstimadaMinutos()));
        }

        reserva.setEstado(EstadoReserva.CONFIRMADA);
        reservaRepository.save(reserva);

        marcarMesa(reserva.getNumeroMesa(), "OCUPADA");

        String msg = "✅ Cliente '" + reserva.getNombreCliente() +
                "' confirmado en Mesa N° " + reserva.getNumeroMesa() +
                ". Liberación estimada: " + reserva.getFechaHoraLiberacion().toLocalTime();
        messagingTemplate.convertAndSend("/topic/notificaciones", msg);

        log.info("Reserva #{} confirmada → Mesa {} OCUPADA hasta {}", idReserva,
                reserva.getNumeroMesa(), reserva.getFechaHoraLiberacion());
    }

    // ── CANCELAR MANUALMENTE ──────────────────────────────────────────────────

    @Transactional
    public void cancelarReserva(Long idReserva) {
        Reserva reserva = obtenerOFallar(idReserva);

        if (reserva.getEstado() == EstadoReserva.LIBERADA || reserva.getEstado() == EstadoReserva.CANCELADA) {
            throw new IllegalStateException("Esta reserva ya está " + reserva.getEstado().getDescripcion());
        }

        EstadoReserva estadoAnterior = reserva.getEstado();
        reserva.setEstado(EstadoReserva.CANCELADA);
        reservaRepository.save(reserva);

        if (estadoAnterior == EstadoReserva.CONFIRMADA) {
            List<Reserva> otrasActivas = reservaRepository.findByNumeroMesaAndEstadoIn(
                    reserva.getNumeroMesa(), List.of(EstadoReserva.CONFIRMADA));
            if (otrasActivas.isEmpty()) {
                marcarMesa(reserva.getNumeroMesa(), "LIBRE");
            }
        }
        log.info("Reserva #{} cancelada manualmente.", idReserva);
    }

    // ── EXTENDER TIEMPO ───────────────────────────────────────────────────────

    @Transactional
    public void extenderReserva(Long idReserva, int minutosExtra) {
        Reserva reserva = obtenerOFallar(idReserva);
        if (reserva.getEstado() != EstadoReserva.CONFIRMADA) {
            throw new IllegalStateException("Solo se puede extender una reserva confirmada.");
        }
        // ✅ FIX 4: Actualizar fechaHoraLiberacion directamente sin pasar por calcularLiberacion()
        // No tocamos fechaHoraReserva ni duracionEstimadaMinutos para evitar que @PreUpdate
        // recalcule y pise nuestra extensión manual
        reserva.setFechaHoraLiberacion(reserva.getFechaHoraLiberacion().plusMinutes(minutosExtra));
        reservaRepository.save(reserva);
        log.info("Reserva #{} extendida {} min. Nueva liberación: {}", idReserva, minutosExtra,
                reserva.getFechaHoraLiberacion());
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────────────

    public List<Reserva> listarActivas() {
        return reservaRepository.findByEstadoIn(List.of(EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA));
    }

    public List<Reserva> listarTodas() {
        return reservaRepository.findAll();
    }

    // ── SCHEDULER: Cada 60 segundos revisa estados ───────────────────────────

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void procesarTemporizadoresAutomaticos() {
        LocalDateTime ahora = LocalDateTime.now();

        // 1. Expirar reservas donde el cliente no llegó en el tiempo de gracia
        List<Reserva> paraExpirar = reservaRepository.findByEstadoIn(List.of(EstadoReserva.PENDIENTE))
                .stream()
                .filter(r -> {
                    LocalDateTime limiteGracia = r.getFechaHoraReserva().plusMinutes(r.getMinutosGracia());
                    return ahora.isAfter(limiteGracia);
                })
                .toList();

        for (Reserva r : paraExpirar) {
            r.setEstado(EstadoReserva.EXPIRADA);
            reservaRepository.save(r);
            String msg = "⏰ Reserva de '" + r.getNombreCliente() + "' (Mesa " + r.getNumeroMesa()
                    + ") expiró. El cliente no llegó en " + r.getMinutosGracia() + " min de gracia.";
            messagingTemplate.convertAndSend("/topic/notificaciones", msg);
            log.warn("Reserva #{} expirada → cliente no llegó.", r.getId());
        }

        // 2. Liberar mesas cuyo tiempo estimado de estadía terminó
        List<Reserva> paraLiberar = reservaRepository.findConfirmadasParaLiberar(ahora);

        for (Reserva r : paraLiberar) {
            r.setEstado(EstadoReserva.LIBERADA);
            reservaRepository.save(r);
            marcarMesa(r.getNumeroMesa(), "LIBRE");
            String msg = "🟢 Mesa N° " + r.getNumeroMesa() + " liberada automáticamente. " +
                    "Cliente: " + r.getNombreCliente();
            messagingTemplate.convertAndSend("/topic/notificaciones", msg);
            log.info("Mesa {} liberada automáticamente (Reserva #{})", r.getNumeroMesa(), r.getId());
        }
    }

    // ── HELPERS PRIVADOS ──────────────────────────────────────────────────────

    private void validarDisponibilidad(Integer numeroMesa, LocalDateTime inicio, LocalDateTime fin, Long excludeId) {
        List<Reserva> conflictos = reservaRepository.findConflictos(numeroMesa, inicio, fin, excludeId);
        if (!conflictos.isEmpty()) {
            Reserva c = conflictos.get(0);
            throw new IllegalStateException(
                    "La Mesa N° " + numeroMesa + " ya tiene una reserva de '"
                    + c.getNombreCliente() + "' de "
                    + c.getFechaHoraReserva().toLocalTime() + " a "
                    + c.getFechaHoraLiberacion().toLocalTime()
                    + ". No se puede solapar.");
        }
    }

    private void marcarMesa(Integer numeroMesa, String nuevoEstado) {
        mesaRepository.findAll().stream()
                .filter(m -> m.getNumero().equals(numeroMesa))
                .findFirst()
                .ifPresent(mesa -> {
                    mesa.setEstado(nuevoEstado);
                    mesaRepository.save(mesa);
                });
    }

    private Reserva obtenerOFallar(Long id) {
        return reservaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reserva #" + id + " no encontrada."));
    }
}