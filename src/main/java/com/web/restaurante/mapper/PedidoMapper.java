package com.web.restaurante.mapper;

import com.web.restaurante.dto.pedido.PedidoRefDTO;
import com.web.restaurante.model.Pedido;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PedidoMapper {

    PedidoRefDTO toRefDTO(Pedido pedido);
}
