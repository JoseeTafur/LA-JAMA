package com.web.restaurante.service;

import com.web.restaurante.dto.reserva.ReservaSaveDTO;
import com.web.restaurante.model.Mesa;
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

    // Minutos antes de la reserva desde los cuales se permite confirmar llegada
    private static final int MINUTOS_VENTANA_CONFIRMACION = 30;
    // Minutos antes de la reserva en que la mesa se marca como RESERVADA (bloqueada)
    private static final int MINUTOS_PREVIOS_BLOQUEO = 120;

    // ── CREAR RESERVA ──────────────────────────────────────────────────────────

    @Transactional
    public List<Reserva> crearReserva(ReservaSaveDTO dto) {

        if (dto.getFechaHoraReserva() == null) {
            throw new IllegalStateException("La fecha y hora de la reserva es obligatoria.");
        }
        if (dto.getFechaHoraReserva().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException(
                "No puedes crear una reserva en el pasado. Selecciona una fecha y hora futura.");
        }
        if (dto.getFechaHoraReserva().isAfter(LocalDateTime.now().plusDays(30))) {
            throw new IllegalStateException(
                "No se pueden crear reservas con más de 30 días de anticipación.");
        }
        if (dto.getDuracionEstimadaMinutos() == null || dto.getDuracionEstimadaMinutos() < 15) {
            throw new IllegalStateException(
                "La duración estimada debe ser de al menos 15 minutos.");
        }
        if (dto.getMinutosGracia() == null || dto.getMinutosGracia() < 0) {
            throw new IllegalStateException(
                "Los minutos de gracia no pueden ser negativos.");
        }
        if (dto.getCantidadPersonas() == null || dto.getCantidadPersonas() < 1) {
            throw new IllegalStateException("La cantidad de personas debe ser al menos 1.");
        }

        // Parsear lista de mesas (puede venir como "7,8" o "5")
        String mesasRaw = (dto.getNumerosMesas() != null && !dto.getNumerosMesas().isBlank())
                ? dto.getNumerosMesas()
                : (dto.getNumeroMesa() != null ? dto.getNumeroMesa().toString() : null);

        if (mesasRaw == null || mesasRaw.isBlank()) {
            throw new IllegalStateException("Debes seleccionar al menos una mesa.");
        }

        List<Integer> numerosMesas;
        try {
            numerosMesas = java.util.Arrays.stream(mesasRaw.split(","))
                    .map(String::trim)
                    .map(Integer::parseInt)
                    .distinct()
                    .sorted()
                    .collect(java.util.stream.Collectors.toList());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("El listado de mesas contiene valores inválidos.");
        }

        final int CAPACIDAD_POR_MESA = 4;

        // Calcular capacidad total del grupo seleccionado
        int capacidadTotal = 0;
        for (Integer numMesa : numerosMesas) {
            Mesa mesa = mesaRepository.findAll().stream()
                    .filter(m -> m.getNumero().equals(numMesa))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("La Mesa N° " + numMesa + " no existe."));

            // Si la mesa tiene hijas unificadas, contar su capacidad total
            int hijasCount = mesa.getMesasHijas() != null ? mesa.getMesasHijas().size() : 0;
            capacidadTotal += (1 + hijasCount) * CAPACIDAD_POR_MESA;
        }

        if (dto.getCantidadPersonas() > capacidadTotal) {
            int mesasNecesarias = (int) Math.ceil(dto.getCantidadPersonas() / (double) CAPACIDAD_POR_MESA);
            throw new IllegalStateException(
                "Las " + numerosMesas.size() + " mesa(s) seleccionada(s) tienen capacidad para "
                + capacidadTotal + " persona(s). "
                + "Para " + dto.getCantidadPersonas() + " persona(s) necesita al menos "
                + mesasNecesarias + " mesa(s).");
        }

        // Validar disponibilidad de cada mesa sin solapamiento
        LocalDateTime fin = dto.getFechaHoraReserva().plusMinutes(dto.getDuracionEstimadaMinutos());
        for (Integer numMesa : numerosMesas) {
            validarDisponibilidad(numMesa, dto.getFechaHoraReserva(), fin, null);
        }

        // Crear una reserva por cada mesa seleccionada
        List<Reserva> reservasCreadas = new java.util.ArrayList<>();
        for (Integer numMesa : numerosMesas) {
            Reserva reserva = new Reserva();
            reserva.setNombreCliente(dto.getNombreCliente().trim());
            reserva.setTelefono(dto.getTelefono());
            reserva.setNumeroMesa(numMesa);
            reserva.setCantidadPersonas(dto.getCantidadPersonas());
            reserva.setFechaHoraReserva(dto.getFechaHoraReserva());
            reserva.setDuracionEstimadaMinutos(dto.getDuracionEstimadaMinutos());
            reserva.setMinutosGracia(dto.getMinutosGracia());
            reserva.setNotas(dto.getNotas());
            reserva.setEstado(EstadoReserva.PENDIENTE);
            reservasCreadas.add(reservaRepository.save(reserva));
        }

        return reservasCreadas;
    }

    // ── CONFIRMAR LLEGADA DEL CLIENTE ─────────────────────────────────────────

    @Transactional
    public void confirmarLlegada(Long idReserva) {
        Reserva reserva = obtenerOFallar(idReserva);

        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new IllegalStateException("Solo se pueden confirmar reservas en estado PENDIENTE.");
        }

        // ✅ FIX Bug 1: Solo permitir confirmar dentro de la ventana de tiempo permitida.
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime ventanaPermitida = reserva.getFechaHoraReserva().minusMinutes(MINUTOS_VENTANA_CONFIRMACION);
        LocalDateTime limiteGracia = reserva.getFechaHoraReserva().plusMinutes(reserva.getMinutosGracia());

        if (ahora.isBefore(ventanaPermitida)) {
            throw new IllegalStateException(
                    "Aún es muy temprano para confirmar. La reserva es a las "
                    + reserva.getFechaHoraReserva().toLocalTime()
                    + ". Solo se puede confirmar desde las "
                    + ventanaPermitida.toLocalTime() + ".");
        }

        if (ahora.isAfter(limiteGracia)) {
            throw new IllegalStateException(
                    "El período de gracia de " + reserva.getMinutosGracia()
                    + " minutos ya expiró. La reserva debió confirmarse antes de las "
                    + limiteGracia.toLocalTime() + ". Use 'Cancelar' si el cliente no llegó.");
        }

        // Si el cliente llegó después de la hora exacta, recalcular liberación desde ahora
        if (ahora.isAfter(reserva.getFechaHoraReserva())) {
            reserva.setFechaHoraLiberacion(ahora.plusMinutes(reserva.getDuracionEstimadaMinutos()));
        }

        reserva.setEstado(EstadoReserva.CONFIRMADA);
        reservaRepository.save(reserva);

        marcarMesa(reserva.getNumeroMesa(), "OCUPADA");

        String msg = "✅ Cliente '" + reserva.getNombreCliente()
                + "' confirmado en Mesa N° " + reserva.getNumeroMesa()
                + ". Liberación estimada: " + reserva.getFechaHoraLiberacion().toLocalTime();
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

        // Liberar mesa si estaba CONFIRMADA y no hay otras activas
        if (estadoAnterior == EstadoReserva.CONFIRMADA) {
            List<Reserva> otrasActivas = reservaRepository.findByNumeroMesaAndEstadoIn(
                    reserva.getNumeroMesa(), List.of(EstadoReserva.CONFIRMADA));
            if (otrasActivas.isEmpty()) {
                marcarMesa(reserva.getNumeroMesa(), "LIBRE");
            }
        }
        // Si la mesa estaba RESERVADA por esta reserva (bloqueo previo), devolverla a LIBRE
        if (estadoAnterior == EstadoReserva.PENDIENTE) {
            mesaRepository.findAll().stream()
                    .filter(m -> m.getNumero().equals(reserva.getNumeroMesa()))
                    .findFirst()
                    .ifPresent(mesa -> {
                        if ("RESERVADA".equals(mesa.getEstado())) {
                            // Verificar que no haya otra reserva pendiente para esa mesa
                            List<Reserva> otrasPendientes = reservaRepository.findByNumeroMesaAndEstadoIn(
                                    reserva.getNumeroMesa(), List.of(EstadoReserva.PENDIENTE));
                            if (otrasPendientes.isEmpty()) {
                                mesa.setEstado("LIBRE");
                                mesaRepository.save(mesa);
                            }
                        }
                    });
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
            String msg = "🟢 Mesa N° " + r.getNumeroMesa() + " liberada automáticamente. "
                    + "Cliente: " + r.getNombreCliente();
            messagingTemplate.convertAndSend("/topic/notificaciones", msg);
            log.info("Mesa {} liberada automáticamente (Reserva #{})", r.getNumeroMesa(), r.getId());
        }

        // 3. Bloquear mesas con reserva próxima (dentro de MINUTOS_PREVIOS_BLOQUEO minutos)
        List<Reserva> paraBloquear = reservaRepository.findByEstadoIn(List.of(EstadoReserva.PENDIENTE))
                .stream()
                .filter(r -> {
                    LocalDateTime inicioBloqueo = r.getFechaHoraReserva().minusMinutes(MINUTOS_PREVIOS_BLOQUEO);
                    return !ahora.isBefore(inicioBloqueo); // ahora >= inicioBloqueo
                })
                .toList();

        for (Reserva r : paraBloquear) {
            mesaRepository.findAll().stream()
                    .filter(m -> m.getNumero().equals(r.getNumeroMesa()))
                    .findFirst()
                    .ifPresent(mesa -> {
                        // Solo cambiar si la mesa aún está libre (no ocupada por otro pedido)
                        if ("LIBRE".equals(mesa.getEstado()) || "DISPONIBLE".equals(mesa.getEstado())) {
                            mesa.setEstado("RESERVADA");
                            mesaRepository.save(mesa);
                            log.info("Mesa {} marcada como RESERVADA — reserva de '{}' en {} min",
                                    r.getNumeroMesa(), r.getNombreCliente(),
                                    java.time.temporal.ChronoUnit.MINUTES.between(ahora, r.getFechaHoraReserva()));
                        }
                    });
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