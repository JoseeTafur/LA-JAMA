package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "movimiento_insumo")
public class MovimientoInsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime fecha;

    // "INGRESO" o "EGRESO"
    private String tipo;

    // "COMPRA", "CONSUMO_RECETA", "MERMA", "AJUSTE"
    private String motivo;

    private Double cantidad;

    private Double stockResultante;

    @ManyToOne
    @JoinColumn(name = "insumo_id", nullable = false)
    private Insumo insumo;

    @PrePersist
    protected void onCreate() {
        this.fecha = LocalDateTime.now();
    }
}