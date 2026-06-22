package com.web.restaurante.dto.notacredito;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class ComprobanteNotaDTO {
    @JsonProperty("tipoDoc")
    private String tipoDoc = "07"; // Nota de Crédito fija

    @JsonProperty("serie")
    private String serie;          // Ej: FC01 o BC01

    @JsonProperty("correlativo")
    private String correlativo;

    @JsonProperty("codmotivo")
    private String codmotivo;      // Ej: "01" por Anulación

    @JsonProperty("descripcion")
    private String descripcion;    // Ej: "ERROR DE EMISION"

    @JsonProperty("serieRef")
    private String serieRef;       // Documento afectado (Ej: F001)

    @JsonProperty("correlativoRef")
    private String correlativoRef; // Correlativo afectado (Ej: 1)

    @JsonProperty("tipoCompRef")
    private String tipoCompRef;    // "01" Factura, "03" Boleta

    @JsonProperty("fechaEmision")
    private String fechaEmision;

    @JsonProperty("horaEmision")
    private String horaEmision;

    @JsonProperty("tipoMoneda")
    private String tipoMoneda = "PEN";

    @JsonProperty("total")
    private double total;

    @JsonProperty("mtoIGV")
    private double mtoIGV;

    @JsonProperty("mtoOperGravadas")
    private double mtoOperGravadas;

    @JsonProperty("totalTexto")
    private String totalTexto;
}