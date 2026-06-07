package com.web.restaurante.dto.reserva;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
public class ReservaSaveDTO {

    private String nombreCliente;
    private String telefono;
    private Integer numeroMesa; // compatibilidad (1 sola mesa)
    private String numerosMesas; // multi-selección: "7,8" o "5"
    private Integer cantidadPersonas;

    @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime fechaHoraReserva;

    // ✅ FIX Bug 4: Default en 90, pero la validación en el service rechazará valores < 15
    private Integer duracionEstimadaMinutos = 90;

    // ✅ FIX Bug 5: Default en 15, pero la validación en el service rechazará valores negativos
    private Integer minutosGracia = 15;

    private String notas;
}