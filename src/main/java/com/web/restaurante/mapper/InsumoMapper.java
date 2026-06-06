package com.web.restaurante.mapper;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.model.Insumo;
import com.web.restaurante.model.InsumoProducto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InsumoMapper {

    // 🔥 FORZAMOS EL MAPEO DE IDA: Copia del Entity al DTO para que llegue al HTML
    @Mapping(source = "porcionesPorKg", target = "porcionesPorKg")
    InsumoDTO toDTO(Insumo insumo);

    // 🔥 FORZAMOS EL MAPEO DE VUELTA: Copia del DTO al Entity para persistir en BD
    @Mapping(source = "porcionesPorKg", target = "porcionesPorKg")
    Insumo toEntity(InsumoDTO dto);

    @Mapping(source = "insumo.id", target = "idInsumo")
    @Mapping(source = "insumo.nombre", target = "nombreInsumo")
    @Mapping(source = "insumo.unidadMedida", target = "unidadMedida")
    @Mapping(source = "producto.id", target = "idProducto")
    @Mapping(source = "producto.nombre", target = "nombreProducto")
    InsumoProductoDTO toDTODetalle(InsumoProducto insumoProducto);
}