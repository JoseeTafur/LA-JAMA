package com.web.restaurante.model.enums;

import lombok.Getter;

@Getter
public enum EstadoPedido {
    PENDIENTE("Pendiente"),
    EN_COCINA("En Cocina"),
    PREPARADO("Preparado"),
    ASIGNADO("Asignado"),
    EN_CAMINO("En Camino"),
    ENVIADO("Enviado"),
    ENTREGADO("Entregado"),
    CANCELADO("Cancelado"),
    EN_REVISION("En revisión");

    private final String descripcion;

    EstadoPedido(String descripcion) {
        this.descripcion = descripcion;
    }
}