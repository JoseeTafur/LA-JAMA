package com.web.restaurante.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class LoteInsumoDTO {
    private Long id;
    private Long idInsumo;
    private String nombreInsumo;
    private LocalDateTime fechaCompra;
    private Double kgComprados;
    private Double porcionesPorKg;
    private Double saldoKg;
    private Double costoTotal;
    private String observacion;
}