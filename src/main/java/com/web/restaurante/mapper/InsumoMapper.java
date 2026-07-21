package com.web.restaurante.mapper;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.model.Insumo;
import com.web.restaurante.model.InsumoProducto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InsumoMapper {

    @Mapping(source = "porcionesPorKg", target = "porcionesPorKg")
    InsumoDTO toDTO(Insumo insumo);

    @Mapping(source = "porcionesPorKg", target = "porcionesPorKg")
    Insumo toEntity(InsumoDTO dto);

    @Mapping(source = "insumo.id", target = "idInsumo")
    @Mapping(source = "insumo.nombre", target = "nombreInsumo")
    @Mapping(source = "insumo.unidadMedida", target = "unidadMedida")
    @Mapping(source = "producto.id", target = "idProducto")
    @Mapping(source = "producto.nombre", target = "nombreProducto")
    @Mapping(source = "insumo.categoria", target = "categoriaInsumo")
    @Mapping(source = "insumo.stockActual", target = "stockActual")
    @Mapping(source = "insumo.stockComprometido", target = "stockComprometido")
    InsumoProductoDTO toDTODetalle(InsumoProducto insumoProducto);
}