package com.web.restaurante.dto.facturacion;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ItemDTO {
    private String codProducto;
    private String descripcion;
    private String unidad = "NIU";
    private Integer cantidad;
    private BigDecimal mtoBaseIgv;
    private BigDecimal mtoValorUnitario;
    private BigDecimal mtoPrecioUnitario;
    private String codeAfect = "10";
    private Integer igvPorcent = 18;
    private BigDecimal igv;
}