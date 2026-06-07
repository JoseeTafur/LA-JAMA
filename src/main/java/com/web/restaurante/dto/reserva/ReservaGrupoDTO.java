package com.web.restaurante.dto.reserva;

import com.web.restaurante.model.Reserva;
import com.web.restaurante.model.enums.EstadoReserva;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Agrupa todas las reservas del mismo cliente + misma hora en una sola tarjeta.
 */
@Getter
public class ReservaGrupoDTO {

    private final Long idPrincipal;
    private final List<Long> todosLosIds;
    // String "13,14" — seguro para usar en data-* de HTML sin problemas de serialización
    private final String todosLosIdsStr;
    private final String nombreCliente;
    private final String telefono;
    private final Integer cantidadPersonas;
    private final LocalDateTime fechaHoraReserva;
    private final LocalDateTime fechaHoraLiberacion;
    private final Integer minutosGracia;
    private final String notas;
    private final EstadoReserva estado;
    private final List<Integer> mesas;

    public ReservaGrupoDTO(List<Reserva> grupo) {
        Reserva principal = grupo.get(0);
        this.idPrincipal        = principal.getId();
        this.todosLosIds        = grupo.stream().map(Reserva::getId).toList();
        this.todosLosIdsStr     = grupo.stream().map(r -> r.getId().toString()).collect(Collectors.joining(","));
        this.nombreCliente      = principal.getNombreCliente();
        this.telefono           = principal.getTelefono();
        this.cantidadPersonas   = principal.getCantidadPersonas();
        this.fechaHoraReserva   = principal.getFechaHoraReserva();
        this.fechaHoraLiberacion= principal.getFechaHoraLiberacion();
        this.minutosGracia      = principal.getMinutosGracia();
        this.notas              = principal.getNotas();
        this.estado             = principal.getEstado();
        this.mesas              = grupo.stream().map(Reserva::getNumeroMesa).sorted().toList();
    }
}