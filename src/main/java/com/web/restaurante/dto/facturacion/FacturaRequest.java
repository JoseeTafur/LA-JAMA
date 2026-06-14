package com.web.restaurante.dto.facturacion;

import lombok.Data;
import java.util.List;

@Data
public class FacturaRequest {
    private String claveSecreta;
    private ComprobanteDTO comprobante;
    private ClienteDTO cliente;
    private List<ItemDTO> items;
}