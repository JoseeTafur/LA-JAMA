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

    // --- NUEVOS CAMPOS PARA UNIFICACIÓN ---

    // Si esta mesa fue unida a otra, aquí se guarda quién es la mesa principal
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_mesa_padre")
    private Mesa mesaPadre;

    // Si esta es la mesa principal, aquí tiene la lista de las mesas que se le unieron
    @OneToMany(mappedBy = "mesaPadre")
    private List<Mesa> mesasHijas;
}