package com.web.restaurante.dto.mesas;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TicketDTO {
    private int id;
    private double consumoFinal;
    private double propina;
    private String tipoDoc;
    private String numDoc;
    private String metodoPago;
}