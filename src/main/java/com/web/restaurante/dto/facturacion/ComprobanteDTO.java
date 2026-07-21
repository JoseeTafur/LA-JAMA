package com.web.restaurante.dto.facturacion;

import lombok.Data;

@Data
public class ComprobanteDTO {
    private String tipoOperacion = "0101";
    private String tipoDoc;
    private String serie;
    private String correlativo;
    private String fechaEmision;
    private String horaEmision;
    private String tipoMoneda = "PEN";
    private String tipoPago = "Contado";
    private String observacion;
}