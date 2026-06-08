package com.web.restaurante.mapper;

import com.web.restaurante.dto.pago.PagoDigitalDTO;
import com.web.restaurante.model.PagoDigital;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PagoDigitalMapper {

    PagoDigitalDTO toDTO(PagoDigital pagoDigital);
}
