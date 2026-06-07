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
    private Integer numeroMesa; // mesa principal (la primera asignada)

    /**
     * Todas las mesas de esta reserva como "1,2" o "5".
     * Si es una sola mesa, coincide con numeroMesa.toString().
     */
    @Column(length = 100)
    private String mesasAsignadas;

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

    @PrePersist
    public void calcularLiberacionAlCrear() {
        if (fechaHoraReserva != null && duracionEstimadaMinutos != null) {
            this.fechaHoraLiberacion = fechaHoraReserva.plusMinutes(duracionEstimadaMinutos);
        }
    }

    /** Devuelve la lista de números de mesa a partir del campo mesasAsignadas. */
    @Transient
    public java.util.List<Integer> getListaMesas() {
        if (mesasAsignadas == null || mesasAsignadas.isBlank()) {
            return java.util.List.of(numeroMesa);
        }
        return java.util.Arrays.stream(mesasAsignadas.split(","))
                .map(String::trim)
                .map(Integer::parseInt)
                .sorted()
                .toList();
    }
}