package com.web.restaurante.mapper;

import com.web.restaurante.dto.LoteInsumoDTO;
import com.web.restaurante.dto.MovimientoPorcionesDTO;
import com.web.restaurante.dto.ProduccionPorcionesDTO;
import com.web.restaurante.model.LoteInsumo;
import com.web.restaurante.model.MovimientoPorciones;
import com.web.restaurante.model.ProduccionPorciones;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProteinaMapper {

    // 🔥 FORZAMOS EL MAPEO: Mapeamos los datos del lote, incluyendo rendimiento y saldos operativos
    @Mapping(source = "insumo.id", target = "idInsumo")
    @Mapping(source = "insumo.nombre", target = "nombreInsumo")
    @Mapping(source = "porcionesPorKg", target = "porcionesPorKg")
    @Mapping(source = "saldoKg", target = "saldoKg")
    LoteInsumoDTO toDTO(LoteInsumo lote);

    @Mapping(source = "lote.id", target = "idLote")
    @Mapping(source = "lote.insumo.nombre", target = "nombreInsumo")
    @Mapping(source = "mermaKg", target = "mermaKg")
    ProduccionPorcionesDTO toDTO(ProduccionPorciones produccion);

    @Mapping(source = "insumo.id", target = "idInsumo")
    @Mapping(source = "insumo.nombre", target = "nombreInsumo")
    MovimientoPorcionesDTO toDTO(MovimientoPorciones movimiento);
}