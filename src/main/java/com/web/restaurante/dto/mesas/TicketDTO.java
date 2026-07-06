package com.web.restaurante.dto.mesas;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TicketDTO {
    private int id;
    private String nombreCliente;
    private String tipoDoc;
    private String numDoc;
    private String metodoPago;
    private String clienteCorreo;
    private double consumoFinal;
    private double propina;

    private List<DetalleTicketDTO> listaDetalles;
}