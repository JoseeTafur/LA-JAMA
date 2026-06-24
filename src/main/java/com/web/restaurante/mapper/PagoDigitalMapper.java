package com.web.restaurante.mapper;

import com.web.restaurante.dto.pago.PagoDigitalDTO;
import com.web.restaurante.dto.pedido.PedidoRefDTO;
import com.web.restaurante.model.PagoDigital;
import com.web.restaurante.model.Pedido;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PagoDigitalMapper {

    // 🚀 MAPEAMOS EL CORREO AL CAMPO TOP-LEVEL DE TU PAGO_DIGITAL_DTO
    @Mapping(source = "pedido.clienteCorreo", target = "clienteCorreo")
    PagoDigitalDTO toDTO(PagoDigital pagoDigital);

    /**
     * 🧠 LA PIEZA MAESTRA:
     * Al declarar este método, MapStruct entiende de forma automática cómo procesar
     * el objeto anidado 'pedido'. Como 'PedidoRefDTO' es un Record, usará su constructor
     * canonical mapeando 'id', 'cliente', 'estado', etc., sin buscar setters inexistentes.
     */
    PedidoRefDTO toPedidoRefDTO(Pedido pedido);
}