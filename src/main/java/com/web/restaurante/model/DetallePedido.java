package com.web.restaurante.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "pedido_detalle")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DetallePedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Transient
    private String nombre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido")
    @JsonIgnore
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Producto producto;

    // --- VARIABLES DE ESTADO MICROSCOPICO ---
    private boolean cocinado = false;
    private boolean entregado = false; // Indica si el mozo ya lo dejó en la mesa del cliente
    private boolean canceladoPorCliente = false;
    private boolean impresoEnCocina = false;
    private boolean pagado = false;

    private Integer cantidad;
    private Double precioUnitario;
    private Double subtotal;

    public Double getSubtotal() {
        if (this.subtotal == null) {
            if (this.cantidad != null && this.precioUnitario != null) {
                return this.cantidad * this.precioUnitario;
            }
            return 0.0;
        }
        return this.subtotal;
    }
}