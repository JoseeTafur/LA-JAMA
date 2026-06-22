package com.web.restaurante.dto.notacredito;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class NotaCreditoResponse {
    @JsonProperty("okey")
    private boolean okey;

    @JsonProperty("mensaje")
    private String mensaje;

    @JsonProperty("numeroNota")
    private String numeroNota; // Ej: FC01-00000001

    @JsonProperty("pdfTicket")
    private String pdfTicket;

    @JsonProperty("pdfA4")
    private String pdfA4;

    @JsonProperty("xmlFirmado")
    private String xmlFirmado;
}