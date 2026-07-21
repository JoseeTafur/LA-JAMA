package com.web.restaurante.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class MovimientoInsumoDTO {
    private Long id;
    private String fecha;
    private String tipo;
    private Double cantidad;
    private String motivo;
    private Double stockResultante;
}