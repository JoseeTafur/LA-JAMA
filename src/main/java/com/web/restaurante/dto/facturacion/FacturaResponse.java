package com.web.restaurante.dto.facturacion;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class FacturaResponse {
    private RespuestaData respuesta;

    @Data
    public static class RespuestaData {
        private boolean success;
        private int status;

        @JsonProperty("xml-sin-firmar")
        private String xmlSinFirmar;

        @JsonProperty("xml-firmado")
        private String xmlFirmado;

        @JsonProperty("pdf-a4")
        private String pdfA4;

        @JsonProperty("pdf-ticket")
        private String pdfTicket;

        private String mensaje;
    }
}