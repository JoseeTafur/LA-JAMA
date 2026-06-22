package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "insumo")
public class Insumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String categoria;

    @Column(name = "porciones_por_kg")
    private Double porcionesPorKg;

    private String unidadMedida;

    private Double stockActual;

    @Column(name = "stock_comprometido")
    private Double stockComprometido = 0.0;

    private Double stockMinimo;

    private Integer estado;

    public Double getStockDisponible() {
        if (this.stockActual == null) return 0.0;
        double comprometido = (this.stockComprometido != null) ? this.stockComprometido : 0.0;
        return this.stockActual - comprometido;
    }
}