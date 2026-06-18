package com.web.restaurante.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "reserva_detalle_comida")
@Data
public class DetalleReservaComida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "reserva_id", nullable = false)
    @JsonIgnore // Evita bucles infinitos en el parseo JSON de la API
    private Reserva reserva;

    @ManyToOne
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto; // Vinculación real del catálogo (Ceviche, Lomo, etc.)

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", nullable = false)
    private Double precioUnitario;

    @Column(name = "subtotal", nullable = false)
    private Double subtotal;

    @Column(name = "insumos_descontados_kardex")
    private Boolean insumosDescontadosKardex = false;
}