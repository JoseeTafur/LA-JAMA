package com.web.restaurante.dto.mesas;

import lombok.Data;
import java.util.List;

@Data
public class MesaDTO {
    private Long id;
    private Integer numero;
    private String estado;

    private Long idMesaPadre;
    private List<Integer> numerosMesasHijas;
    private boolean enReserva;
}