package com.web.restaurante.mapper;

import com.web.restaurante.dto.pago.PagoDigitalDTO;
import com.web.restaurante.model.PagoDigital;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping; // 🚀 No te olvides de esta importación

@Mapper(componentModel = "spring")
public interface PagoDigitalMapper {

    // 🚀 OBLIGAMOS A MAPSTRUCT A CRUZAR EL CORREO EN TIEMPO DE COMPILACIÓN
    @Mapping(source = "pedido.clienteCorreo", target = "pedido.clienteCorreo")
    PagoDigitalDTO toDTO(PagoDigital pagoDigital);
}