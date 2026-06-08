package com.web.restaurante.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.web.restaurante.model.enums.SituacionPagoDigital;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@SuperBuilder
@Table(name = "pago_digital")
public class PagoDigital extends BaseEntidad {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido")
    @JsonIgnore
    private Pedido pedido;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime fechaPago;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private SituacionPagoDigital situacion = SituacionPagoDigital.PENDIENTE;

    private String observacion;

    private String imgUrl;
}
