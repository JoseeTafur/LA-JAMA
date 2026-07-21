package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Table(name = "mesa")
@Data
public class Mesa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer numero;

    @Column(length = 20)
    private String estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_mesa_padre")
    private Mesa mesaPadre;

    @OneToMany(mappedBy = "mesaPadre")
    private List<Mesa> mesasHijas;

    private boolean enReserva = false;
}