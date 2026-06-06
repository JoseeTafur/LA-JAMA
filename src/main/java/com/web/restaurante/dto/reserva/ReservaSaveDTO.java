package com.web.restaurante.dto.reserva;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
public class ReservaSaveDTO {

    private String nombreCliente;
    private String telefono;
    private Integer numeroMesa;
    private Integer cantidadPersonas;

    @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime fechaHoraReserva;

    private Integer duracionEstimadaMinutos = 90;
    private Integer minutosGracia = 15;
    private String notas;
}