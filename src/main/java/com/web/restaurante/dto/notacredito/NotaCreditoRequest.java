package com.web.restaurante.dto.notacredito;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class NotaCreditoRequest {
    @JsonProperty("claveSecreta")
    private String claveSecreta;

    @JsonProperty("comprobante")
    private ComprobanteNotaDTO comprobante;

    @JsonProperty("cliente")
    private ClienteNotaDTO cliente;

    @JsonProperty("items")
    private List<ItemNotaDTO> items;
}