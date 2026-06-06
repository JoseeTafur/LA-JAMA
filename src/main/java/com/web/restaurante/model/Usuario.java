package com.web.restaurante.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name="usuario")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="id_usuario", nullable=false)
    private Long id;

    @Column(name="usuario", nullable = false, unique = true)
    private String usuario;

    @Column(name="correo")
    private String correo;

    @Column(name="clave",nullable = false)
    private String clave;

    @Column(name="estado", nullable = false)
    private Integer estado = 1;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_perfil")
    private Perfil perfil;

    public Usuario(String usuario, String correo, String clave, Perfil perfil) {
        this.usuario = usuario;
        this.correo = correo;
        this.clave = clave;
        this.perfil = perfil;
        this.estado = 1;
    }
}
