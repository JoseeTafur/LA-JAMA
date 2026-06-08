package com.web.restaurante.model.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum SituacionPagoDigital {
    PENDIENTE("Pendiente"),
    APROBADO("Aprobado"),
    ANULADO("Anulado");

    private final String descripcion;
}
