package com.web.restaurante.dto.pedido;

import com.web.restaurante.model.enums.TipoPedido;

import java.math.BigDecimal;
import java.util.List;

public record PedidoEnLineaDTO(
        String cliente,
        String direccion,
        Float latitud,
        Float longitud,
        BigDecimal montoTotal,
        TipoPedido tipoPedido,
        List<DetallePedidoEnLineaDTO> listaDetalles
) {
}
