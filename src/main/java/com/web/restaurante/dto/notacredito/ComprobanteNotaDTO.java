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
    private String tipoDoc = "07";

    @JsonProperty("serie")
    private String serie;

    @JsonProperty("correlativo")
    private String correlativo;

    @JsonProperty("codmotivo")
    private String codmotivo;

    @JsonProperty("descripcion")
    private String descripcion;

    @JsonProperty("serieRef")
    private String serieRef;

    @JsonProperty("correlativoRef")
    private String correlativoRef;

    @JsonProperty("tipoCompRef")
    private String tipoCompRef;

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