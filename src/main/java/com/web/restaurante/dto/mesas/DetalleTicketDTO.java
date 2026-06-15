package com.web.restaurante.dto.mesas;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class DetalleTicketDTO {
    private Long productoId;
    private String nombre;
    private int cantidad;
    private double precioUnitario;
    private double subtotal;
}