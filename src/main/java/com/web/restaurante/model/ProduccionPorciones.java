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
@Table(name = "produccion_porciones")
public class ProduccionPorciones {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_lote", nullable = false)
    private LoteInsumo lote;

    @Column(nullable = false)
    private LocalDateTime fechaProduccion;

    @Column(nullable = false)
    private Double kgProcesados;

    @Column(nullable = false)
    private Integer porcionesEsperadas;

    @Column(nullable = false)
    private Integer porcionesObtenidas;

    @Column(name = "merma_kg")
    private Double mermaKg;

    private String observacion;

    @PrePersist
    protected void onCreate() {
        this.fechaProduccion = LocalDateTime.now();
    }
}