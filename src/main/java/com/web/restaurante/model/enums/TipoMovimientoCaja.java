package com.web.restaurante.model.enums;

import lombok.Getter;

@Getter
public enum TipoMovimientoCaja {
    APERTURA("INGRESO"),
    INGRESO_VENTA("INGRESO"),
    INGRESO_MANUAL("INGRESO"),
    EGRESO_VENTA("EGRESO"),
    EGRESO_MANUAL("EGRESO"),
    CIERRE("EGRESO");

    private final String grupoMacro;

    TipoMovimientoCaja(String grupoMacro) {
        this.grupoMacro = grupoMacro;
    }
}