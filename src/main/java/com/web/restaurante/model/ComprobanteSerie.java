package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "comprobante_serie")
public class ComprobanteSerie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tipo_comprobante", nullable = false, unique = true)
    private String tipoComprobante;

    @Column(name = "serie", nullable = false, length = 4)
    private String serie;

    @Column(name = "ultimo_correlativo", nullable = false)
    private Integer ultimoCorrelativo;
}