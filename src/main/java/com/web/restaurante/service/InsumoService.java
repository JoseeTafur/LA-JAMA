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
                .map(insumoMapper::toDTO)
                .collect(Collectors.toList());
    }

    public InsumoDTO guardarInsumo(InsumoDTO dto) {
        Insumo insumo = insumoMapper.toEntity(dto);
        insumo.setCategoria(dto.getCategoria());
        if (insumo.getEstado() == null) {
            insumo.setEstado(1);
        }
        return insumoMapper.toDTO(insumoRepository.save(insumo));
    }

    // REEMPLAZAR ESTE MÉTODO COMPLETO:
    public void eliminarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        // Borrado lógico: Cambiamos el estado a 0 (Inactivo) en lugar de hacer deleteById
        insumo.setEstado(0);
        insumoRepository.save(insumo);
    }

    public void reactivarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        // Borrado lógico inverso: Volvemos al estado 1 (Activo)
        insumo.setEstado(1);
        insumoRepository.save(insumo);
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

            // Blindaje anti-nulos
            double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
            double totalADescontar = cantidadUsada * cantidadPedida;

            // En lugar de solo restar y guardar a escondidas, llamamos al Kardex
            // Esto actualiza el stock Y DEJA HUELLA en la base de datos simultáneamente
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
        // 1. Blindaje: Si el stock actual es null, asumimos 0.0
        double stockActual = (insumo.getStockActual() != null) ? insumo.getStockActual() : 0.0;

        // 2. Calcular nuevo stock
        double nuevoStock = tipo.equals("INGRESO") ? stockActual + cantidad : stockActual - cantidad;

        // 3. Actualizar y guardar el insumo
        insumo.setStockActual(nuevoStock);
        insumoRepository.saveAndFlush(insumo); // 🔥 Forzamos la actualización del stock primero

        // 4. Registrar el evento en el Kardex (MovimientoInsumo)
        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumo);
        mov.setCantidad(cantidad);
        mov.setTipo(tipo);
        mov.setMotivo(motivo);
        mov.setStockResultante(nuevoStock);
        mov.setFecha(java.time.LocalDateTime.now());

        // 🔥 LA CLAVE AQUÍ: Usamos saveAndFlush para obligar a insertar la fila en el Kardex AHORA MISMO
        movimientoRepository.saveAndFlush(mov);
    }


    public List<MovimientoInsumoDTO> obtenerKardexPorInsumo(Long insumoId) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        return movimientoRepository.findTop50ByInsumoIdOrderByFechaDesc(insumoId)
                .stream()
                .map(m -> {
                    MovimientoInsumoDTO dto = new MovimientoInsumoDTO();
                    dto.setId(m.getId());
                    // Pasamos la fecha formateada de forma segura
                    dto.setFecha(m.getFecha() != null ? m.getFecha().format(formatter) : "Sin Fecha");
                    dto.setTipo(m.getTipo());
                    dto.setCantidad(m.getCantidad());
                    dto.setMotivo(m.getMotivo());

                    // 🔥 CRUCIAL: Asegurar que se asigne el stock resultante tal cual viene de la BD
                    dto.setStockResultante(m.getStockResultante() != null ? m.getStockResultante() : 0.0);

                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void eliminarInsumoDeReceta(Long idInsumoProducto) {
        insumoProductoRepository.deleteById(idInsumoProducto);
    }
}