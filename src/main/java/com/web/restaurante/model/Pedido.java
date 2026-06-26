package com.web.restaurante.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.MetodoPago;
import com.web.restaurante.model.enums.TipoPedido;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "pedido")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private boolean frioListo = false;
    private boolean calienteListo = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_repartidor")
    @JsonIgnoreProperties("pedidos")
    private Empleado repartidor;

    @Column(name = "cliente_nombre", nullable = false)
    private String cliente;

    @Column(name = "direccion_entrega", nullable = false)
    private String direccion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_turno_caja")
    @JsonIgnoreProperties({"movimientos", "pedidos"})
    private TurnoCaja turnoCaja;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoPedido.PENDIENTE;
        }
    }

    private Double latitud;
    private Double longitud;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaSalida;
    private LocalDateTime fechaEntrega;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", length = 50)
    private EstadoPedido estado;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<DetallePedido> listaDetalles;

    @Enumerated(EnumType.STRING)
    private TipoPedido tipoPedido;

    private boolean ticketImpresoCocina = false;

    @Column(name = "numero_mesa")
    private Integer numeroMesa;

    private Double montoTotal;

    @Column(name = "comprobante_tipo", length = 20)
    private String comprobanteTipo; // "BOLETA" o "FACTURA"

    @Column(name = "comprobante_numero", length = 30)
    private String comprobanteNumero; // Correlativo, ej: "B001-000045"

    @Column(name = "documento_cliente", length = 15)
    private String documentoCliente;

    @Column(name = "codigo_pago_operacion", length = 100)
    private String codigoPagoOperacion;

    @Transient
    private String textoVoucherCrudo;

    private String clienteCorreo;

    private String preferenciaComprobante;

    private String comprobantePdfUrl;

    private String comprobanteA4Url;

    @Lob
    @Column(name = "comprobante_xml_contenido", columnDefinition = "LONGTEXT")
    private String comprobanteXmlContenido;

    @Column(name = "comprobante_nota_numero")
    private String comprobanteNotaNumero;

    @Column(name = "nota_pdf_url")
    private String notaPdfUrl;

    @Column(name = "nota_a4_url")
    private String notaA4Url;

    @Column(name = "nota_xml_contenido", columnDefinition = "LONGTEXT")
    private String notaXmlContenido;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<AuditoriaAnulacion> notasCredito = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago")
    private MetodoPago metodoPago;

    public boolean isListoParaServir() {
        if (this.estado == EstadoPedido.PREPARADO || this.estado == EstadoPedido.ASIGNADO) {
            return true;
        }
        if (this.estado != EstadoPedido.EN_COCINA) {
            return false;
        }

        boolean tieneFrio = false;
        boolean tieneCaliente = false;

        if (this.listaDetalles != null) {
            for (DetallePedido d : this.listaDetalles) {
                if (d.getProducto() != null && d.getProducto().getCategoria() != null) {
                    String catNombre = d.getProducto().getCategoria().getNombre().toUpperCase();
                    if (catNombre.contains("FRI") || catNombre.contains("FRÍ")) {
                        tieneFrio = true;
                    }
                    if (catNombre.contains("CALIENTE")) {
                        tieneCaliente = true;
                    }
                }
            }
        }

        if (tieneFrio && tieneCaliente) {
            return this.frioListo && this.calienteListo;
        } else if (tieneFrio) {
            return this.frioListo;
        } else if (tieneCaliente) {
            return this.calienteListo;
        }

        return false;
    }

    public boolean tienePlatosMicroParaRecoger() {
        if (this.listaDetalles == null || this.listaDetalles.isEmpty()) {
            return false;
        }
        return this.listaDetalles.stream()
                .anyMatch(d -> d.isCocinado() && !d.isEntregado());
    }

    public boolean tienePlatosMicroEnCocina() {
        if (this.listaDetalles == null || this.listaDetalles.isEmpty()) {
            return false;
        }
        return this.listaDetalles.stream()
                .anyMatch(d -> !d.isCocinado());
    }

    public boolean todosPlatosMicroEntregados() {
        if (this.listaDetalles == null || this.listaDetalles.isEmpty()) {
            return false;
        }
        return this.listaDetalles.stream()
                .allMatch(DetallePedido::isEntregado);
    }

    public String getOrigenFormateado() {
        if (this.tipoPedido == null) {
            return "LOCAL";
        }
        switch (this.tipoPedido) {
            case SALON:    return "LOCAL";
            case DELIVERY: return "DELIVERY";
            case LLEVAR:   return "LLEVAR";
            default:       return "LOCAL";
        }
    }
}