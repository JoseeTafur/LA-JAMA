package com.web.restaurante.mapper;

import com.web.restaurante.dto.pago.PagoDigitalDTO;
import com.web.restaurante.dto.pedido.PedidoRefDTO;
import com.web.restaurante.model.PagoDigital;
import com.web.restaurante.model.Pedido;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PagoDigitalMapper {

    @Mapping(source = "pedido.clienteCorreo", target = "clienteCorreo")
    PagoDigitalDTO toDTO(PagoDigital pagoDigital);

    PedidoRefDTO toPedidoRefDTO(Pedido pedido);
}