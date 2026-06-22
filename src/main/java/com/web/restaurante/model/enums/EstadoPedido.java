package com.web.restaurante.model.enums;

import lombok.Getter;

@Getter
public enum EstadoPedido {
    PREPARADO("Preparado"),
    ASIGNADO("Asignado"),
    EN_CAMINO("En Camino"),
    ENTREGADO("Entregado"),
    PENDIENTE("Pendiente"),
    EN_COCINA("En Cocina"),
    CANCELADO("Cancelado"),
    EN_REVISION("En revisión"),
    PAGADO("Pagado"),
    ANULADO("Anulado");

    private final String descripcion;

    EstadoPedido(String descripcion) {
        this.descripcion = descripcion;
    }
}