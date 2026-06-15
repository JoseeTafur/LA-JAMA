package com.web.restaurante.mapper;

import com.web.restaurante.dto.pedido.PedidoRefDTO;
import com.web.restaurante.model.Pedido;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PedidoMapper {

    @Mapping(source = "clienteCorreo", target = "clienteCorreo")
    PedidoRefDTO toRefDTO(Pedido pedido);
}
