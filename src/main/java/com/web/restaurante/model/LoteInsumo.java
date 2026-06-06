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
@Table(name = "lote_insumo")
public class LoteInsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_insumo", nullable = false)
    private Insumo insumo;

    @Column(nullable = false)
    private LocalDateTime fechaCompra;

    @Column(nullable = false)
    private Double kgComprados;

    @Column(name = "saldo_kg", nullable = false)
    private Double saldoKg;

    @Column(name = "porciones_por_kg", nullable = false)
    private Double porcionesPorKg;

    private Double costoTotal;

    private String observacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCompra = LocalDateTime.now();
        if (this.saldoKg == null) {
            this.saldoKg = this.kgComprados;
        }
    }
}