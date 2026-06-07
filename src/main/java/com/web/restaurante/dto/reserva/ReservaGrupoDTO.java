package com.web.restaurante.dto.reserva;

import com.web.restaurante.model.Reserva;
import com.web.restaurante.model.enums.EstadoReserva;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO para mostrar una reserva en la vista.
 * Ahora cada reserva ya es una sola fila en BD con múltiples mesas en mesasAsignadas.
 */
@Getter
public class ReservaGrupoDTO {

    private final Long idPrincipal;
    private final List<Long> todosLosIds;
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
        this.idPrincipal         = principal.getId();
        this.todosLosIds         = List.of(principal.getId());
        this.todosLosIdsStr      = principal.getId().toString();
        this.nombreCliente       = principal.getNombreCliente();
        this.telefono            = principal.getTelefono();
        this.cantidadPersonas    = principal.getCantidadPersonas();
        this.fechaHoraReserva    = principal.getFechaHoraReserva();
        this.fechaHoraLiberacion = principal.getFechaHoraLiberacion();
        this.minutosGracia       = principal.getMinutosGracia();
        this.notas               = principal.getNotas();
        this.estado              = principal.getEstado();
        // Leer las mesas desde el campo mesasAsignadas
        this.mesas               = principal.getListaMesas();
    }
}