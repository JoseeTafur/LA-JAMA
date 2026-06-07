package com.web.restaurante.model.enums;

import lombok.Getter;

@Getter
public enum EstadoReserva {
    PENDIENTE("Pendiente"),       // Reserva creada, aún no llegó la hora
    CONFIRMADA("Confirmada"),     // Cajera confirmó llegada del cliente → mesa OCUPADA
    EXPIRADA("Expirada"),         // Cliente no llegó en el tiempo de gracia
    LIBERADA("Liberada"),         // Se cumplió el tiempo estimado → mesa libre automáticamente
    CANCELADA("Cancelada");       // Cancelada manualmente

    private final String descripcion;

    EstadoReserva(String descripcion) {
        this.descripcion = descripcion;
    }
}