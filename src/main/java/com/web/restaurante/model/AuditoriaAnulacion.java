package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_anulaciones")
@Getter
@Setter
public class AuditoriaAnulacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    @Column(nullable = false)
    private String motivo;

    @Column(nullable = false)
    private String tipoNota;

    @Column(columnDefinition = "TEXT")
    private String sustento;

    @Column(name = "comprobante_nota_numero")
    private String comprobanteNotaNumero;

    @Column(name = "monto_afectado")
    private double montoAfectado;

    @Column(name = "nota_pdf_url")
    private String notaPdfUrl;

    private boolean generarNuevoComprobante;

    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() {
        this.fechaRegistro = LocalDateTime.now();
    }
}