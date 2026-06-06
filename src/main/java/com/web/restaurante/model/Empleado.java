package com.web.restaurante.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "empleado")
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empleado")
    private Long id;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "apellido", nullable = false, length = 100)
    private String apellido;

    @Column(name = "dni", unique = true, length = 8)
    private String dni;

    @Column(name = "telefono", length = 15)
    private String telefono;

    @Column(name = "turno", length = 20)
    private String turno = "DIA";

    @Column(name = "tipo_contrato", length = 20)
    private String tipoContrato = "PLANILLA";

    @Column(name = "fecha_ingreso")
    private LocalDate fechaIngreso;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_cargo")
    private Cargo cargo;

    @Column(name = "estado", nullable = false)
    private Integer estado = 1;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario", unique = true)
    private Usuario usuario;

    @JsonIgnore
    @OneToMany(mappedBy = "repartidor")
    private List<Pedido> pedidos;

    public boolean isRealmenteDisponible() {
        if (this.pedidos == null || this.pedidos.isEmpty()) return true;

        return this.pedidos.stream()
                .noneMatch(p -> p.getEstado().name().equals("ASIGNADO") ||
                        p.getEstado().name().equals("EN_CAMINO"));
    }
}
