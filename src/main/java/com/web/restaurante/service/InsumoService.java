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
            // Si es nuevo, usamos el mapper normal
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

        // 1. Rompemos con las recetas
        insumoProductoRepository.deleteByInsumoId(idInsumo);

        // 2. Rompemos con el Kardex
        movimientoRepository.deleteByInsumoId(idInsumo);

        // 3. 🔥 NUEVO: Rompemos con los lotes registrados en la BD
        loteInsumoRepository.deleteByInsumoId(idInsumo);
        // (Asegúrate de agregar '' en su interfaz correspondiente)

        // 4. 🚀 Ahora sí, la tabla madre queda libre de ataduras y se borra física y completamente
        insumoRepository.delete(insumo);
    }

    public List<InsumoDTO> listarInsumosArchivados() {
        return insumoRepository.findAll()
                .stream()
                .filter(insumo -> insumo.getEstado() != null && insumo.getEstado() == 0)
                .map(insumoMapper::toDTO)
                .collect(Collectors.toList());
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
            Insumo insumo = insumoRepository.findByIdForUpdate(ip.getInsumo().getId())
                    .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

            double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
            double totalTeorico = cantidadUsada * cantidadPedida;
            String detalleVenta = "Despacho a cocina: " + cantidadPedida + "x " + ip.getProducto().getNombre();

            // 🛡️ REGLA DE INTEGRIDAD REFORZADA:
            // Si NO es una proteína, registramos el movimiento histórico pero NO tocamos el stock maestro (Sacos/Cajas fijos)
            if (insumo.getCategoria() == null || !insumo.getCategoria().toUpperCase().contains("PROTEIN")) {
                double stockEstatico = (insumo.getStockActual() != null) ? insumo.getStockActual() : 0.0;

                MovimientoInsumo movGeneral = new MovimientoInsumo();
                movGeneral.setInsumo(insumo);
                movGeneral.setCantidad(totalTeorico);
                movGeneral.setTipo("EGRESO");
                movGeneral.setMotivo(detalleVenta);
                movGeneral.setStockResultante(stockEstatico); // Mantiene el stock actual del saco intacto
                movGeneral.setFecha(java.time.LocalDateTime.now());

                movimientoRepository.saveAndFlush(movGeneral);
                System.out.println("[La Jama - Auditoría] Huella de venta registrada para insumo general: " + insumo.getNombre() + " sin alterar su stock.");
                continue; // Saltamos al siguiente ingrediente sin restar en el maestro
            }

            // 🥩 Si es proteína, sigue su curso normal hacia el canal unificado de porciones
            registrarMovimientoPorId(insumo.getId(), totalTeorico, "EGRESO", detalleVenta);
        }
    }

    @Transactional
    public void registrarMovimientoPorId(Long idInsumo, Double cantidad, String tipo, String motivo) {
        Insumo insumoPersistido = insumoRepository.findByIdForUpdate(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        double stockActual = (insumoPersistido.getStockActual() != null) ? insumoPersistido.getStockActual() : 0.0;
        double nuevoStock = stockActual;

        // 🥩 CASO PROTEÍNA: Sigue con su descuento lineal automático de porciones
        if (insumoPersistido.getCategoria() != null && insumoPersistido.getCategoria().toUpperCase().contains("PROTEIN")) {
            nuevoStock = tipo.equals("INGRESO") ? stockActual + cantidad : stockActual - cantidad;
            insumoPersistido.setStockActual(nuevoStock);
            insumoRepository.saveAndFlush(insumoPersistido);
        } else {
            // 🛒 CASO GENERAL (Arroz, Verduras, Papas):
            if ("INGRESO".equals(tipo)) {
                // Los lotes manuales o aperturas sí actualizan el stock maestro
                nuevoStock = stockActual + cantidad;
                insumoPersistido.setStockActual(nuevoStock);
                insumoRepository.saveAndFlush(insumoPersistido);
            }
            // 🚨 SI ES EGRESO (VENTA): El stock físico NO se toca.
            // nuevoStock se queda valiendo exactamente lo mismo que stockActual.
        }

        // Guardamos el registro histórico para tus KPIs
        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumoPersistido);

        // 🌟 CLAVE PARA KPIS: Guardamos la cantidad como dato informativo positivo
        // para que sume en tus reportes de consumo sin simular una resta física.
        mov.setCantidad(cantidad);

        mov.setTipo(tipo);
        mov.setMotivo(motivo);
        mov.setStockResultante(nuevoStock); // El saldo visual se mantendrá estático (Ej: 5.00 -> 5.00)
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

                    // 🚨 ¡EL PEQUEÑO DETALLE ESTÁ AQUÍ! 🚨
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
        // Paso A: Purgamos el historial de comandas de pruebas (pedido_detalle)
        detallePedidoRepository.deleteByProductoId(idProducto);
        System.out.println("[La Jama - Logística] Historial de comandas eliminado para el producto ID: " + idProducto);

        // Paso B: Purgamos la matriz de recetas (insumo_producto)
        insumoProductoRepository.deleteByProductoId(idProducto);
        System.out.println("[La Jama - Logística] Receta desvinculada para el producto ID: " + idProducto);

        // Paso C: Ahora que el registro padre no tiene amarras en ninguna tabla, se elimina físicamente
        productoRepository.deleteById(idProducto);
        System.out.println("[La Jama - Catálogo] Producto eliminado físicamente de forma exitosa.");
    }

}