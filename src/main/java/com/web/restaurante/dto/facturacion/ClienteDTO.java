package com.web.restaurante.dto.facturacion;

import lombok.Data;

@Data
public class ClienteDTO {
    private String codigoPais = "PE";
    private String tipoDoc;
    private String numDoc;
    private String rznSocial;
    private String direccion;
}