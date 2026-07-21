package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "movimiento_porciones")
public class MovimientoPorciones {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_insumo", nullable = false)
    private Insumo insumo;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false)
    private Integer cantidadPorciones;

    private String motivo;

    @Column(nullable = false)
    private Integer stockResultante;

    @Column(name = "merma_kg", nullable = false)
    private Double mermaKg = 0.0;

    @PrePersist
    protected void onCreate() {
        this.fecha = LocalDateTime.now();
    }
}