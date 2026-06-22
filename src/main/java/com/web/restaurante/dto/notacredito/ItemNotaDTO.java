package com.web.restaurante.dto.notacredito;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class ItemNotaDTO {
    @JsonProperty("codProducto")
    private String codProducto;

    @JsonProperty("descripcion")
    private String descripcion;

    @JsonProperty("unidad")
    private String unidad = "NIU";

    @JsonProperty("cantidad")
    private int cantidad;

    @JsonProperty("mtoValorUnitario")
    private double mtoValorUnitario;

    @JsonProperty("mtoPrecioUnitario")
    private double mtoPrecioUnitario;

    @JsonProperty("igv")
    private double igv;
}