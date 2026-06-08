package com.web.restaurante.dto.pedido;

import com.web.restaurante.dto.producto.IdProductoDTO;

import java.math.BigDecimal;

public record DetallePedidoEnLineaDTO(
        IdProductoDTO producto,
        Long cantidad,
        BigDecimal precioUnitario,
        BigDecimal subtotal
) {
}
