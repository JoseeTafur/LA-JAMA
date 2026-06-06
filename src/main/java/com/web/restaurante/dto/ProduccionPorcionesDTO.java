package com.web.restaurante.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class ProduccionPorcionesDTO {
    private Long id;
    private Long idLote;
    private String nombreInsumo;   // para mostrarlo en la tabla
    private LocalDateTime fechaProduccion;
    private Double kgProcesados;
    private Integer porcionesEsperadas;
    private Integer porcionesObtenidas;
    private Double mermaKg;
    private String observacion;
}