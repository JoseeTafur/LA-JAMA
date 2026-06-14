package com.web.restaurante.dto.facturacion;

import lombok.Data;

@Data
public class ClienteDTO {
    private String codigoPais = "PE";
    private String tipoDoc;     // "6" (RUC), "1" (DNI), "0" (Doc Trib. No Domiciliado / Varios)
    private String numDoc;      // El número capturado en la caja
    private String rznSocial;   // Nombre o Razón Social
    private String direccion;   // Dirección fiscal o Chiclayo por defecto
}