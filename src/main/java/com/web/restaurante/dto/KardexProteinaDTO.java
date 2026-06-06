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
    private String origen;      // LOTE | PRODUCCION | AJUSTE | VENTA
    private String detalle;     // descripción legible
    private String signo;       // "+" | "-" | "—"
    private String cantidad;    // "10 kg" | "+47 porc." | "-1 porc."
    private Integer stockResultante; // null para lotes (aún no hay porciones)
}