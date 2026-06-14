package com.web.restaurante.dto.facturacion;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ItemDTO {
    private String codProducto;
    private String descripcion;
    private String unidad = "NIU"; // Unidades en estándar SUNAT
    private Integer cantidad;
    private BigDecimal mtoBaseIgv;       // (Valor Unitario * Cantidad)
    private BigDecimal mtoValorUnitario;  // Precio de carta / 1.18
    private BigDecimal mtoPrecioUnitario; // Precio de carta completo
    private String codeAfect = "10";     // Gravado - Operación Onerosa
    private Integer igvPorcent = 18;
    private BigDecimal igv;              // Monto del impuesto del lote
}