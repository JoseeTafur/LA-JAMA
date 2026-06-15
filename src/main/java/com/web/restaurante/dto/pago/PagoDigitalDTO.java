package com.web.restaurante.dto.pago;

import com.web.restaurante.dto.pedido.PedidoRefDTO;
import com.web.restaurante.model.enums.SituacionPagoDigital;

import java.time.LocalDateTime;

public record PagoDigitalDTO(
        Long id,
        PedidoRefDTO pedido,
        LocalDateTime fechaPago,
        SituacionPagoDigital situacion,
        String observacion,
        String imgUrl,
        String clienteCorreo
) {
}
