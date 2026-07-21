package com.web.restaurante.dto.notacredito;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class ClienteNotaDTO {
    @JsonProperty("tipoDoc")
    private String tipoDoc;

    @JsonProperty("numDoc")
    private String numDoc;

    @JsonProperty("rznSocial")
    private String rznSocial;

    @JsonProperty("direccion")
    private String direccion;
}