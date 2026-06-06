package com.web.restaurante.model;

import com.web.restaurante.model.enums.EstadoReserva;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "reserva")
@Data
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombreCliente;

    @Column(length = 20)
    private String telefono;

    @Column(nullable = false)
    private Integer numeroMesa;

    @Column(nullable = false)
    private Integer cantidadPersonas;

    @Column(nullable = false)
    private LocalDateTime fechaHoraReserva;

    @Column(nullable = false)
    private Integer duracionEstimadaMinutos = 90;

    @Column(nullable = false)
    private LocalDateTime fechaHoraLiberacion;

    @Column(nullable = false)
    private Integer minutosGracia = 15;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReserva estado = EstadoReserva.PENDIENTE;

    private String notas;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    /**
     * ✅ FIX: Solo calcula la liberación en @PrePersist (creación).
     * En @PreUpdate NO recalculamos para no pisar extensiones manuales de tiempo.
     */
    @PrePersist
    public void calcularLiberacionAlCrear() {
        if (fechaHoraReserva != null && duracionEstimadaMinutos != null) {
            this.fechaHoraLiberacion = fechaHoraReserva.plusMinutes(duracionEstimadaMinutos);
        }
    }
}