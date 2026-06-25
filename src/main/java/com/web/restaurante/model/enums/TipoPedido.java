package com.web.restaurante.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum TipoPedido {
    SALON,
    DELIVERY,
    LLEVAR;

    @JsonCreator
    public static TipoPedido fromString(String value) {
        if (value == null) return SALON;

        switch (value.toUpperCase().trim()) {
            case "LOCAL":
            case "SALON":
                return SALON;
            case "DELIVERY":
                return DELIVERY;
            case "LLEVAR":
            case "PARA_LLEVAR":
                return LLEVAR;
            default:
                return SALON;
        }
    }
}