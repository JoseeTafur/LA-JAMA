package com.web.restaurante.mapper;

import com.web.restaurante.dto.usuario.UsuarioDTO;
import com.web.restaurante.model.Usuario;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UsuarioMapper {
    UsuarioDTO toDTO(Usuario usuario);
}
