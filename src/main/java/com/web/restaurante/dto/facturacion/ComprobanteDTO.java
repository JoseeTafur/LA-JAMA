package com.web.restaurante.dto.facturacion;

import lombok.Data;

@Data
public class ComprobanteDTO {
    private String tipoOperacion = "0101"; // Venta interna estándar
    private String tipoDoc;        // "01" (Factura) o "03" (Boleta)
    private String serie;          // "F001" o "B001"
    private String correlativo;    // ID único de transación o correlativo interno
    private String fechaEmision;   // Formato "YYYY-MM-DD"
    private String horaEmision;    // Formato "HH:mm:ss"
    private String tipoMoneda = "PEN";
    private String tipoPago = "Contado";
    private String observacion;
}