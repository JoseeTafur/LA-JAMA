package com.web.restaurante.dto.pago;

public record PagoDigitalSaveDTO(
        Long idPedido,
        String observacion,
        String imgUrl
) {
}
