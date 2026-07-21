package com.web.restaurante.service;

import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Reserva;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import com.web.restaurante.repository.NotificacionRepository;

@Service
@RequiredArgsConstructor
public class ReservaService {

    private final ReservaRepository reservaRepository;
    private final MesaRepository mesaRepository;
    private final MesaService mesaService;
    private static final int CAPACIDAD_POR_MESA = 4;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificacionRepository notificacionRepository;

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
            List<Mesa> mesasReserva = mesaRepository.findAll().stream()
                    .filter(m -> reserva.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                    .collect(Collectors.toList());
            if (mesasReserva.size() == 1) {
                Mesa m = mesasReserva.get(0);
                m.setEstado("OCUPADA");
                mesaRepository.save(m);
            } else if (mesasReserva.size() > 1) {
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
        if (reserva.getMesasAsignadas() != null) {
            mesaRepository.findAll().stream()
                    .filter(m -> reserva.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                    .forEach(m -> {
                        m.setEstado("DISPONIBLE");
                        mesaRepository.save(m);
                    });
        }
        reserva.setEstado(Reserva.EstadoReserva.CANCELADA);
        return reservaRepository.save(reserva);
    }

    @Scheduled(fixedRate = 10000)
    @Transactional
    public void vigilarRelojDeReservas() {
        LocalDateTime ahora = LocalDateTime.now();

        List<Reserva> activas = reservaRepository.findAll().stream()
                .filter(r -> r.getEstado() == Reserva.EstadoReserva.CONFIRMADA
                        || r.getEstado() == Reserva.EstadoReserva.PENDIENTE)
                .toList();

        for (Reserva r : activas) {
            LocalDateTime horaPactada = r.getFechaHoraReserva();

            if (r.getEstado() == Reserva.EstadoReserva.CONFIRMADA
                    && ahora.isAfter(horaPactada.minusMinutes(5)) && ahora.isBefore(horaPactada)) {

                long mins = java.time.Duration.between(ahora, horaPactada).toMinutes() + 1;
                String msg = "⏳ La reserva de " + r.getNombreCliente() + " está por empezar en " + mins + " minutos. Coordinar espacios.";

                r.setEstado(Reserva.EstadoReserva.PENDIENTE);
                reservaRepository.save(r);

                registrarAlertaFisica(msg, "INFO", "MESERO");
            }
            else if (r.getEstado() == Reserva.EstadoReserva.PENDIENTE
                    && !ahora.isBefore(horaPactada)
                    && ahora.isBefore(horaPactada.plusMinutes(2))) {

                int mesasEstimadas = (int) Math.ceil((double) r.getNumeroPersonas() / CAPACIDAD_POR_MESA);
                String msg = "🚨 ¡La reserva de " + r.getNombreCliente() + " ya empezó! Se requieren " + mesasEstimadas + " mesas libres. Comunícate con caja.";

                r.setEstado(Reserva.EstadoReserva.COMPLETADA);
                reservaRepository.save(r);

                registrarAlertaFisica(msg, "RESERVA", "MESERO");
            }

            else if (r.getEstado() == Reserva.EstadoReserva.PENDIENTE && ahora.isAfter(horaPactada.plusMinutes(2))) {
                r.setEstado(Reserva.EstadoReserva.EXPIRADA);
                reservaRepository.save(r);

                if (r.getMesasAsignadas() != null) {
                    mesaRepository.findAll().stream()
                            .filter(m -> r.getMesasAsignadas().contains("Mesa #" + m.getNumero()))
                            .forEach(m -> {
                                m.setEstado("DISPONIBLE");
                                mesaRepository.save(m);
                            });
                }

                String msg = "⚠️ RESERVA VENCIDA: Se agotó el tiempo de gracia de 2 min para " + r.getNombreCliente() + ". Mesas liberadas.";
                registrarAlertaFisica(msg, "ALERTA", "TODOS");
            }
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

    @Transactional
    public void registrarAlertaFisica(String mensaje, String tipo, String perfil) {
        com.web.restaurante.model.Notificacion n = new com.web.restaurante.model.Notificacion();
        n.setMensaje(mensaje);
        n.setTipo(tipo);
        n.setDestinoPerfil(perfil);
        n.setLeido(false);
        notificacionRepository.save(n);

        messagingTemplate.convertAndSend("/topic/notificaciones/mozos", mensaje);
    }
}