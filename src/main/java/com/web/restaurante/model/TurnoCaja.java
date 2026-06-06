package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor
@Entity
@Table(name = "turno_caja")
public class TurnoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monto_apertura", nullable = false)
    private Double montoApertura;

    @Column(name = "monto_cierre")
    private Double montoCierre;

    @Column(name = "total_vendido")
    private Double totalVendido;

    @Column(name = "diferencia")
    private Double diferencia;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDateTime fechaApertura;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "activo", nullable = false)
    private boolean activo = true;
}