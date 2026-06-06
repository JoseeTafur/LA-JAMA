package com.web.restaurante.mapper;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.dto.mesas.MesaSaveDTO;
import com.web.restaurante.model.Mesa;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MesaMapper {

    MesaDTO toDTO(Mesa mesa);

    Mesa toEntity(MesaSaveDTO mesaSaveDTO);
}