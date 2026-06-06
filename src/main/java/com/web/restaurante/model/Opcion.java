package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "opcion")
public class Opcion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="id_opcion")
    private Long id;

    @Column(name="nombre")
    private String nombre;

    @Column(name="ruta")
    private String ruta;
}
