package com.web.restaurante.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class InsumoDTO {

    private Long id;
    private String nombre;
    private String categoria;
    private String unidadMedida;
    private Double stockActual;
    private Double stockMinimo;
    private Double stockComprometido;
    private Integer estado;
    private Double porcionesPorKg;
}