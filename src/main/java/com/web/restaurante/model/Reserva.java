package com.web.restaurante.model;

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

    @Column(name = "nombre_cliente", nullable = false, length = 30)
    private String nombreCliente;

    @Column(name = "telefono", nullable = false, length = 9)
    private String telefono;

    @Column(name = "numero_personas", nullable = false)
    private Integer numeroPersonas;

    @Column(name = "fecha_hora_reserva", nullable = false)
    private LocalDateTime fechaHoraReserva;

    @Column(name = "estado", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private EstadoReserva estado = EstadoReserva.PENDIENTE;

    @Column(name = "observacion", length = 150)
    private String observacion;

    @Column(name = "mesas_asignadas", length = 100)
    private String mesasAsignadas;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_hora_liberacion")
    private LocalDateTime fechaHoraLiberacion;

    @Column(name = "cantidad_personas")
    private Integer cantidadPersonas;

    @Column(name = "duracion_estimada_minutos")
    private Integer duracionEstimadaMinutos;

    @Column(name = "minutos_gracia")
    private Integer minutosGracia;

    @Column(name = "notas", length = 255)
    private String notas;

    @Column(name = "numero_mesa")
    private Integer numeroMesa;

    @PrePersist
    public void prePersist() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (duracionEstimadaMinutos == null) duracionEstimadaMinutos = 90;
        if (minutosGracia == null) minutosGracia = 15;
        if (cantidadPersonas == null) cantidadPersonas = numeroPersonas;
        if (fechaHoraLiberacion == null && fechaHoraReserva != null) {
            fechaHoraLiberacion = fechaHoraReserva.plusMinutes(duracionEstimadaMinutos);
        }
    }

    public enum EstadoReserva {
        PENDIENTE, CONFIRMADA, CANCELADA, COMPLETADA, EXPIRADA, LIBERADA
    }
}