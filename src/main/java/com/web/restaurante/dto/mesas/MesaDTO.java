package com.web.restaurante.dto.mesas;

import lombok.Data;
import java.util.List;

@Data
public class MesaDTO {
    private Long id;
    private Integer numero;
    private String estado;

    // --- NUEVOS CAMPOS PARA EL FRONTEND ---
    private Long idMesaPadre; // Para saber si pertenece a un grupo
    private List<Integer> numerosMesasHijas; // Para mostrar en la tarjeta estirada: [5, 6]
}