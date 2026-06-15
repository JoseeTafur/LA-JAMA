package com.web.restaurante.dto.mesas;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TicketDTO {
    private int id;
    private double consumoFinal;
    private double propina;
    private String tipoDoc;
    private String numDoc;
    private String metodoPago;

    private List<DetalleTicketDTO> listaDetalles;
}