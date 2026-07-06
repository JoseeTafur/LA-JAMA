package com.web.restaurante.model;

import com.web.restaurante.model.enums.MetodoPago;
import com.web.restaurante.model.enums.TipoMovimientoCaja;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor
@Entity
@Table(name = "movimiento_caja")
public class MovimientoCaja {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Enumerated(EnumType.STRING)
        @Column(name = "tipo", nullable = false, length = 20)
        private TipoMovimientoCaja tipo;

        @Column(name = "concepto", nullable = false, length = 200)
        private String concepto;

        // positivo = ingreso, negativo = egreso
        @Column(name = "monto", nullable = false)
        private Double monto;

        @Column(name = "comprobante", length = 50)
        private String comprobante;

        @Column(name = "fecha", nullable = false)
        private LocalDateTime fecha;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "id_turno")
        private TurnoCaja turno;

        @Enumerated(EnumType.STRING)
        @Column(name = "metodo_pago")
        private MetodoPago metodoPago;

        @PrePersist
        public void prePersist() {
            if (this.fecha == null) this.fecha = LocalDateTime.now();
        }
}