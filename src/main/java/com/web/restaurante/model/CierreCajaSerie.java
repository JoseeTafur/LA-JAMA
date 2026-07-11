package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "cierre_caja_serie")
@Getter
@Setter
public class CierreCajaSerie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String serie;

    @Column(name = "ultimo_correlativo", nullable = false)
    private Integer ultimoCorrelativo;
}