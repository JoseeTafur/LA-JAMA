package com.web.restaurante.service;

import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Reserva;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.ReservaRepository;
import com.web.restaurante.service.MesaService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReservaService {

    private final ReservaRepository reservaRepository;
    private final MesaRepository mesaRepository;
    private final MesaService mesaService;

    private static final int CAPACIDAD_POR_MESA = 4;

    public List<Reserva> listarTodas() {
        return reservaRepository.findAllByOrderByFechaHoraReservaDesc();
    }

    @Transactional
    public Reserva crearReserva(Reserva reserva) {
        int mesasNecesarias = (int) Math.ceil((double) reserva.getNumeroPersonas() / CAPACIDAD_POR_MESA);

        List<Mesa> mesasDisponibles = mesaRepository.findAll().stream()
                .filter(m -> ("DISPONIBLE".equals(m.getEstado()) || "LIBRE".equals(m.getEstado()))
                        && m.getMesaPadre() == null)
                .limit(mesasNecesarias)
                .collect(Collectors.toList());

        if (mesasDisponibles.size() < mesasNecesarias) {
            throw new IllegalStateException("No hay suficientes mesas disponibles. Se necesitan " + mesasNecesarias + " mesa(s).");
        }

        // Guardar números de mesas asignadas como texto
        String mesasStr = mesasDisponibles.stream()
                .map(m -> "Mesa #" + m.getNumero())
                .collect(Collectors.joining(", "));
        reserva.setMesasAsignadas(mesasStr);
        reserva.setNumeroMesa(mesasDisponibles.get(0).getNumero());
        reserva.setEstado(Reserva.EstadoReserva.CONFIRMADA);
        reserva.setCantidadPersonas(reserva.getNumeroPersonas());

        return reservaRepository.save(reserva);
    }

    @Transactional
    public Reserva confirmarLlegada(Long id) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada"));

        if (reserva.getMesasAsignadas() != null) {
            // Obtener todas las mesas de la reserva en orden
            List<Mesa> mesasReserva = mesaRepository.findAll().stream()
                    .filter(m -> reserva.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                    .collect(Collectors.toList());

            if (mesasReserva.size() == 1) {
                // Una sola mesa: solo marcar OCUPADA
                Mesa m = mesasReserva.get(0);
                m.setEstado("OCUPADA");
                mesaRepository.save(m);
            } else if (mesasReserva.size() > 1) {
                // Varias mesas: la primera es padre, el resto son hijas → unificar
                Mesa padre = mesasReserva.get(0);
                padre.setEstado("OCUPADA");
                mesaRepository.save(padre);

                List<Long> idsHijas = mesasReserva.subList(1, mesasReserva.size())
                        .stream().map(Mesa::getId).collect(Collectors.toList());

                mesaService.unificarMesas(padre.getId(), idsHijas);
            }
        }

        reserva.setEstado(Reserva.EstadoReserva.COMPLETADA);
        return reservaRepository.save(reserva);
    }

    @Transactional
    public Reserva cancelarReserva(Long id) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada"));

        // Liberar mesas RESERVADA → DISPONIBLE
        if (reserva.getMesasAsignadas() != null) {
            mesaRepository.findAll().stream()
                    .filter(m -> "RESERVADA".equals(m.getEstado())
                            && reserva.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                    .forEach(m -> {
                        m.setEstado("DISPONIBLE");
                        mesaRepository.save(m);
                    });
        }

        reserva.setEstado(Reserva.EstadoReserva.CANCELADA);
        return reservaRepository.save(reserva);
    }

    // Bloquear mesas 2 horas antes automáticamente
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void bloquearMesasProximas() {
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime limite = ahora.plusHours(2);

        List<Reserva> proximas = reservaRepository.findProximas(ahora, limite);
        for (Reserva reserva : proximas) {
            if (reserva.getMesasAsignadas() == null) continue;
            mesaRepository.findAll().stream()
                    .filter(m -> ("DISPONIBLE".equals(m.getEstado()) || "LIBRE".equals(m.getEstado()))
                            && reserva.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                    .forEach(m -> {
                        m.setEstado("RESERVADA");
                        mesaRepository.save(m);
                    });
        }
    }


    @Transactional
    public Reserva editarReserva(Long id, String nombreCliente, String telefono,
                                  Integer numeroPersonas, LocalDateTime fechaHoraReserva, String observacion) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada"));

        if (reserva.getEstado() == Reserva.EstadoReserva.CANCELADA) {
            throw new IllegalStateException("No se puede editar una reserva cancelada.");
        }

        reserva.setNombreCliente(nombreCliente);
        reserva.setTelefono(telefono);
        reserva.setNumeroPersonas(numeroPersonas);
        reserva.setFechaHoraReserva(fechaHoraReserva);
        reserva.setFechaHoraLiberacion(fechaHoraReserva.plusMinutes(
                reserva.getDuracionEstimadaMinutos() != null ? reserva.getDuracionEstimadaMinutos() : 90));
        reserva.setObservacion(observacion == null || observacion.isBlank() ? null : observacion);
        return reservaRepository.save(reserva);
    }

    @Transactional
    public void eliminarReserva(Long id) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada"));

        // Liberar mesas si estaban bloqueadas u ocupadas por esta reserva
        if (reserva.getMesasAsignadas() != null) {
            mesaRepository.findAll().stream()
                    .filter(m -> reserva.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                    .forEach(m -> {
                        if ("RESERVADA".equals(m.getEstado()) || "OCUPADA".equals(m.getEstado())) {
                            m.setEstado("DISPONIBLE");
                            mesaRepository.save(m);
                        }
                    });
        }
        reservaRepository.deleteById(id);
    }

    public Optional<Reserva> obtenerPorId(Long id) {
        return reservaRepository.findById(id);
    }
}