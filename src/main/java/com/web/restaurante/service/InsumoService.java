package com.web.restaurante.service;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.dto.MovimientoInsumoDTO;
import com.web.restaurante.mapper.InsumoMapper;
import com.web.restaurante.model.Insumo;
import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.MovimientoInsumo;
import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InsumoService {

    private final InsumoRepository insumoRepository;
    private final InsumoProductoRepository insumoProductoRepository;
    private final ProductoRepository productoRepository;
    private final InsumoMapper insumoMapper;
    private final MovimientoRepository movimientoRepository;
    private final LoteInsumoRepository loteInsumoRepository;
    private final DetallePedidoRepository detallePedidoRepository;

    public List<InsumoDTO> listarInsumos() {
        return insumoRepository.findAll()
                .stream()
                .filter(insumo -> insumo.getEstado() != null && insumo.getEstado() != -1)
                .map(insumoMapper::toDTO)
                .collect(Collectors.toList());
    }

    public InsumoDTO guardarInsumo(InsumoDTO dto) {
        Insumo insumo;

        if (dto.getId() != null) {
            insumo = insumoRepository.findById(dto.getId())
                    .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

            insumo.setNombre(dto.getNombre());
            insumo.setCategoria(dto.getCategoria());
            insumo.setUnidadMedida(dto.getUnidadMedida());
            insumo.setStockMinimo(dto.getStockMinimo());
        } else {
            insumo = insumoMapper.toEntity(dto);
            insumo.setCategoria(dto.getCategoria());
        }

        if (insumo.getEstado() == null) {
            insumo.setEstado(1);
        }

        return insumoMapper.toDTO(insumoRepository.save(insumo));
    }

    @Transactional
    public void eliminarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado con ID: " + id));

        insumoProductoRepository.deleteByInsumoId(id);

        insumo.setEstado(0);
        insumoRepository.saveAndFlush(insumo);
        System.out.println("[La Jama - Logística] Insumo desvinculado de platos y archivado correctamente: " + insumo.getNombre());
    }

    @Transactional
    public void reactivarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado con ID: " + id));

        insumo.setEstado(1);
        insumoRepository.saveAndFlush(insumo);
        System.out.println("[La Jama - Logística] Insumo restaurado a producción: " + insumo.getNombre());
    }

    @Transactional
    public void purgarInsumoDefinitivo(Long idInsumo) {
        Insumo insumo = insumoRepository.findById(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no mapeado"));

        insumoProductoRepository.deleteByInsumoId(idInsumo);

        movimientoRepository.deleteByInsumoId(idInsumo);

        loteInsumoRepository.deleteByInsumoId(idInsumo);

        insumoRepository.delete(insumo);
    }

    public List<InsumoDTO> listarInsumosArchivados() {
        return insumoRepository.findAll()
                .stream()
                .filter(insumo -> insumo.getEstado() != null && insumo.getEstado() == 0)
                .map(insumoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void registrarLote(java.util.Map<String, Object> payload) {
        Long idInsumo = Long.valueOf(payload.get("idInsumo").toString());
        Double kgComprados = Double.valueOf(payload.get("kgComprados").toString());
        Double costoTotal = payload.get("costoTotal") != null ? Double.valueOf(payload.get("costoTotal").toString()) : 0.0;
        String observacion = payload.get("observacion") != null ? payload.get("observacion").toString() : "";
        Double porcionesPorKg = (payload.get("porcionesPorKg") != null && !payload.get("porcionesPorKg").toString().trim().isEmpty())
                ? Double.valueOf(payload.get("porcionesPorKg").toString())
                : 0.0;

        Insumo insumo = insumoRepository.findById(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado con ID: " + idInsumo));

        double stockAnterior = (insumo.getStockActual() != null) ? insumo.getStockActual() : 0.0;
        double nuevoStock = 0.0;
        double cantidadMovimientoKardex = 0.0;
        String detalleKardex = "";

        if (!"PROTEINA".equalsIgnoreCase(insumo.getCategoria())) {
            nuevoStock = kgComprados;
            insumo.setStockActual(nuevoStock);
            cantidadMovimientoKardex = kgComprados;
            detalleKardex = "Apertura de Lote (Stock Reiniciado): " + kgComprados + " " + insumo.getUnidadMedida() +
                    (observacion.trim().isEmpty() ? "" : " — " + observacion);
        } else {
            double porcionesNuevas = Math.round(kgComprados * porcionesPorKg);
            nuevoStock = stockAnterior + porcionesNuevas;
            insumo.setStockActual(nuevoStock);
            insumo.setPorcionesPorKg(porcionesPorKg);

            cantidadMovimientoKardex = porcionesNuevas;
            detalleKardex = "Ingreso Lote: " + kgComprados + " Kg (Rendimiento: " + porcionesPorKg + " porc/Kg)";
        }

        insumoRepository.saveAndFlush(insumo);

        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumo);
        mov.setCantidad(cantidadMovimientoKardex);
        mov.setTipo("INGRESO");
        mov.setMotivo(detalleKardex);
        mov.setStockResultante(nuevoStock);
        mov.setFecha(java.time.LocalDateTime.now());

        movimientoRepository.saveAndFlush(mov);
    }

    public List<InsumoProductoDTO> listarInsumosPorProducto(Long idProducto) {
        return insumoProductoRepository.findByProductoId(idProducto)
                .stream()
                .map(insumoMapper::toDTODetalle)
                .collect(Collectors.toList());
    }

    public List<InsumoProductoDTO> listarTodosLosInsumosProducto() {
        return insumoProductoRepository.findAll()
                .stream()
                .map(insumoMapper::toDTODetalle)
                .collect(Collectors.toList());
    }

    public InsumoProductoDTO agregarInsumoAProducto(Long idProducto, Long idInsumo, Double cantidad) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        Insumo insumo = insumoRepository.findById(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        InsumoProducto ip = new InsumoProducto();
        ip.setProducto(producto);
        ip.setInsumo(insumo);
        ip.setCantidadUsada(cantidad);

        return insumoMapper.toDTODetalle(insumoProductoRepository.save(ip));
    }

    @Transactional
    public void descontarInsumosPorPedido(Long idProducto, int cantidadPedida) {
        List<InsumoProducto> insumos = insumoProductoRepository.findByProductoId(idProducto);

        for (InsumoProducto ip : insumos) {
            Insumo insumo = insumoRepository.findByIdForUpdate(ip.getInsumo().getId())
                    .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

            double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
            double totalTeorico = cantidadUsada * cantidadPedida;
            String detalleVenta = "Despacho a cocina: " + cantidadPedida + "x " + ip.getProducto().getNombre();

            if (insumo.getCategoria() == null || !insumo.getCategoria().toUpperCase().contains("PROTEIN")) {
                double stockEstatico = (insumo.getStockActual() != null) ? insumo.getStockActual() : 0.0;

                MovimientoInsumo movGeneral = new MovimientoInsumo();
                movGeneral.setInsumo(insumo);
                movGeneral.setCantidad(totalTeorico);
                movGeneral.setTipo("EGRESO");
                movGeneral.setMotivo(detalleVenta);
                movGeneral.setStockResultante(stockEstatico);
                movGeneral.setFecha(java.time.LocalDateTime.now());

                movimientoRepository.saveAndFlush(movGeneral);
                continue;
            }

            registrarMovimientoPorId(insumo.getId(), totalTeorico, "EGRESO", detalleVenta);
        }
    }

    @Transactional
    public void registrarMovimientoPorId(Long idInsumo, Double cantidad, String tipo, String motivo) {
        Insumo insumoPersistido = insumoRepository.findByIdForUpdate(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        double stockActual = (insumoPersistido.getStockActual() != null) ? insumoPersistido.getStockActual() : 0.0;
        double nuevoStock = stockActual;

        if (insumoPersistido.getCategoria() != null && insumoPersistido.getCategoria().toUpperCase().contains("PROTEIN")) {
            nuevoStock = tipo.equals("INGRESO") ? stockActual + cantidad : stockActual - cantidad;
            insumoPersistido.setStockActual(nuevoStock);
            insumoRepository.saveAndFlush(insumoPersistido);
        } else {
            if ("INGRESO".equals(tipo)) {
                nuevoStock = stockActual + cantidad;
                insumoPersistido.setStockActual(nuevoStock);
                insumoRepository.saveAndFlush(insumoPersistido);
            } else if ("EGRESO".equals(tipo)) {
                nuevoStock = stockActual;
            }
        }

        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumoPersistido);
        mov.setCantidad(cantidad);
        mov.setTipo(tipo);
        mov.setMotivo(motivo);
        mov.setStockResultante(nuevoStock);
        mov.setFecha(java.time.LocalDateTime.now());

        movimientoRepository.saveAndFlush(mov);
    }

    public List<MovimientoInsumoDTO> obtenerKardexPorInsumo(Long insumoId) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        return movimientoRepository.findTop50ByInsumoIdOrderByFechaDesc(insumoId)
                .stream()
                .map(m -> {
                    MovimientoInsumoDTO dto = new MovimientoInsumoDTO();
                    dto.setId(m.getId());
                    dto.setFecha(m.getFecha() != null ? m.getFecha().format(formatter) : "Sin Fecha");
                    dto.setTipo(m.getTipo());
                    dto.setCantidad(m.getCantidad());
                    dto.setMotivo(m.getMotivo());

                    double resultante = m.getStockResultante() != null ? m.getStockResultante() : 0.0;
                    dto.setStockResultante(Math.round(resultante * 100.0) / 100.0);

                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void eliminarInsumoDeReceta(Long idInsumoProducto) {
        insumoProductoRepository.deleteById(idInsumoProducto);
    }

    @Transactional
    public void limpiarRecetaDeProducto(Long idProducto) {
        insumoProductoRepository.deleteByProductoId(idProducto);
    }

    @Transactional
    public void ejecutarBajaLogicaAvanzada(Long idInsumo) {
        Insumo insumo = insumoRepository.findById(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado con ID: " + idInsumo));

        List<InsumoProducto> recetasAfectadas = insumoProductoRepository.findByInsumoId(idInsumo);

        insumoProductoRepository.deleteByInsumoId(idInsumo);

        for (InsumoProducto relacion : recetasAfectadas) {
            Producto producto = relacion.getProducto();
            if (producto != null) {
                List<InsumoProducto> ingredientesRestantes = insumoProductoRepository.findByProductoId(producto.getId());

                if (ingredientesRestantes.isEmpty()) {
                    producto.setEstado(0);
                    productoRepository.save(producto);
                }
            }
        }

        insumo.setEstado(-1);
        insumoRepository.saveAndFlush(insumo);
    }

    @Transactional
    public void eliminarProductoYDesvincularInsumos(Long idProducto) {
        detallePedidoRepository.deleteByProductoId(idProducto);
        System.out.println("[La Jama - Logística] Historial de comandas eliminado para el producto ID: " + idProducto);

        insumoProductoRepository.deleteByProductoId(idProducto);
        System.out.println("[La Jama - Logística] Receta desvinculada para el producto ID: " + idProducto);

        productoRepository.deleteById(idProducto);
        System.out.println("[La Jama - Catálogo] Producto eliminado físicamente de forma exitosa.");
    }

}