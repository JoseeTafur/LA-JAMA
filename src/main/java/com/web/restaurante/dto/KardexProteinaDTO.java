package com.web.restaurante.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KardexProteinaDTO {
    private LocalDateTime fecha;
    private String origen;
    private String detalle;
    private String signo;
    private String cantidad;
    private Integer stockResultante;

    private Double mermaKg = 0.0;

    public KardexProteinaDTO(LocalDateTime fecha, String origen, String detalle, String signo, String cantidad, Integer stockResultante) {
        this.fecha = fecha;
        this.origen = origen;
        this.detalle = detalle;
        this.signo = signo;
        this.cantidad = cantidad;
        this.stockResultante = stockResultante;
        this.mermaKg = 0.0; 
    }
}