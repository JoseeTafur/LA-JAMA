package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "movimiento_serie")
public class MovimientoSerie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serie", nullable = false, length = 4, unique = true)
    private String serie; // Ej: "MV01"

    @Column(name = "ultimo_correlativo", nullable = false)
    private Integer ultimoCorrelativo;
}