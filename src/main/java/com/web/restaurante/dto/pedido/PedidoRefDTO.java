package com.web.restaurante.dto.pedido;

import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.TipoPedido;
import lombok.Builder;

@Builder
public record PedidoRefDTO(
        Long id,
        String cliente,
        EstadoPedido estado,
        TipoPedido tipoPedido,
        String clienteCorreo,
        String documentoCliente
) {
}
