package com.web.restaurante.service;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.dto.MovimientoInsumoDTO;
import com.web.restaurante.mapper.InsumoMapper;
import com.web.restaurante.model.Insumo;
import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.MovimientoInsumo;
import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.InsumoRepository;
import com.web.restaurante.repository.MovimientoRepository;
import com.web.restaurante.repository.ProductoRepository;
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
            // Si es nuevo, usamos el mapper normal
            insumo = insumoMapper.toEntity(dto);
            insumo.setCategoria(dto.getCategoria());
        }

        if (insumo.getEstado() == null) {
            insumo.setEstado(1);
        }

        return insumoMapper.toDTO(insumoRepository.save(insumo));
    }

    public void eliminarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        insumo.setEstado(0);
        insumoRepository.save(insumo);
    }

    @Transactional
    public void reactivarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        insumo.setEstado(1);
        insumoRepository.save(insumo);
    }

    // 🌟 MÉTODO CORREGIDO Y BLINDADO CONTRA CAMPOS NULOS DE ABARROTES GENERALES
    @Transactional
    public void registrarLote(java.util.Map<String, Object> payload) {
        Long idInsumo = Long.valueOf(payload.get("idInsumo").toString());
        Double kgComprados = Double.valueOf(payload.get("kgComprados").toString());
        Double costoTotal = payload.get("costoTotal") != null ? Double.valueOf(payload.get("costoTotal").toString()) : 0.0;
        String observacion = payload.get("observacion") != null ? payload.get("observacion").toString() : "";

        // 🛡️ CONTROL DE NULOS: Si no viene porcionesPorKg (Insumo general), le asignamos 0.0 por defecto
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
            // 🛒 CASO GENERAL (Arroz, Vegetales):
            // 🌟 CAMBIO: El stock actual se REEMPLAZA por la cantidad del nuevo lote ingresado
            nuevoStock = kgComprados;
            insumo.setStockActual(nuevoStock);
            cantidadMovimientoKardex = kgComprados;
            detalleKardex = "Apertura de Lote (Stock Reiniciado): " + kgComprados + " " + insumo.getUnidadMedida() +
                    (observacion.trim().isEmpty() ? "" : " — " + observacion);
        } else {
            // 🥩 CASO PROTEÍNAS: Mantiene su comportamiento acumulativo por porciones calculadas
            double porcionesNuevas = Math.round(kgComprados * porcionesPorKg);
            nuevoStock = stockAnterior + porcionesNuevas;
            insumo.setStockActual(nuevoStock);
            insumo.setPorcionesPorKg(porcionesPorKg);

            cantidadMovimientoKardex = porcionesNuevas;
            detalleKardex = "Ingreso Lote: " + kgComprados + " Kg (Rendimiento: " + porcionesPorKg + " porc/Kg)";
        }

        // Guardamos el maestro actualizado con flush forzado
        insumoRepository.saveAndFlush(insumo);

        // Dejamos huella limpia en el Kardex general
        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumo);
        mov.setCantidad(cantidadMovimientoKardex);

        // 🌟 DOBLE CAPA: Seteamos tanto origen como tipo para que se acople al JS del Kardex que armamos
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
            Insumo insumo = ip.getInsumo();

            // 🚨 REGLA DE INTEGRIDAD DE LA JAMA:
            // Si el insumo NO es proteína, NO se debe restar automáticamente con la venta.
            if (insumo.getCategoria() == null || !"PROTEINA".equalsIgnoreCase(insumo.getCategoria())) {
                System.out.println("[La Jama - Logística] Ignorando descuento automático para insumo general: " + insumo.getNombre());
                continue; // 🚀 Salta al siguiente ingrediente sin tocar el stock ni el Kardex
            }

            // 🥩 Si es proteína, continúa con el descuento de porciones normal
            double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
            double totalADescontar = cantidadUsada * cantidadPedida;

            registrarMovimiento(
                    insumo,
                    totalADescontar,
                    "EGRESO",
                    "Despacho a cocina: " + cantidadPedida + "x " + ip.getProducto().getNombre()
            );
        }
    }

    @Transactional
    public void registrarMovimiento(Insumo insumo, Double cantidad, String tipo, String motivo) {
        double stockActual = (insumo.getStockActual() != null) ? insumo.getStockActual() : 0.0;
        double nuevoStock = tipo.equals("INGRESO") ? stockActual + cantidad : stockActual - cantidad;

        insumo.setStockActual(nuevoStock);
        insumoRepository.saveAndFlush(insumo);

        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumo);
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
                    dto.setStockResultante(m.getStockResultante() != null ? m.getStockResultante() : 0.0);
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

}