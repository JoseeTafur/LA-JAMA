package com.web.restaurante.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class MovimientoPorcionesDTO {
    private Long id;
    private Long idInsumo;
    private String nombreInsumo;
    private LocalDateTime fecha;
    private String tipo;            // INGRESO | EGRESO
    private Integer cantidadPorciones;
    private String motivo;
    private Integer stockResultante;
    private Double mermaKg;
}