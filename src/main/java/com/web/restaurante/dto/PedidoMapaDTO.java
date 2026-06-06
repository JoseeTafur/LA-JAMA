package com.web.restaurante.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PedidoMapaDTO {
    private Long id;
    private String cliente;
    private Double latitud;
    private Double longitud;
}