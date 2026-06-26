package com.web.restaurante.service;

import com.web.restaurante.model.*;
import com.web.restaurante.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CajaService {

    private final PedidoRepository pedidoRepository;
    private final TurnoCajaRepository turnoCajaRepository;
    private final InsumoProductoRepository insumoProductoRepository;
    private final TurnoCajaService turnoCajaService;
    private final NotaVentaSequenceService notaVentaSequenceService;
    private final PedidoService pedidoService;
    private final ProductoRepository productoRepository;

    public boolean esHorarioPermitido(LocalTime horaActual) {
        return (horaActual.isAfter(LocalTime.of(8, 0)) && horaActual.isBefore(LocalTime.of(18, 0))) ||
                (horaActual.isAfter(LocalTime.of(19, 0)) || horaActual.isBefore(LocalTime.of(7, 0)));
    }

    /**
     * 🧠 NÚCLEO FINANCIERO: Procesa todas las matemáticas y filtros del dashboard
     */
    public Map<String, Object> calcularMetricasDashboard(TurnoCaja turnoActivo, List<MovimientoCaja> movimientos) {
        Map<String, Object> metricas = new HashMap<>();

        // 1. LIQUIDADOS (Para matemática financiera)
        List<Pedido> liquidados = pedidoRepository.findAll().stream()
                .filter(p -> {
                    boolean estaPagado = (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO);
                    boolean noEstaAnulado = (p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.ANULADO
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PENDIENTE);
                    return estaPagado || (p.getNumeroMesa() == null && noEstaAnulado);
                })
                .filter(p -> p.getFechaCreacion() != null && turnoActivo.getFechaApertura() != null && p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura()))
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // 2. HISTORIAL VISUAL (Con aduanas de estado)
        List<Pedido> pedidosHistorialVisual = pedidoRepository.findAll().stream()
                .filter(p -> p.getFechaCreacion() != null && turnoActivo.getFechaApertura() != null && p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura()))
                .filter(p -> {
                    if (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PENDIENTE) {
                        return false;
                    }
                    if (p.getNumeroMesa() != null) {
                        return p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ANULADO;
                    }
                    return p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ANULADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.EN_COCINA
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PREPARADO;
                })
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // 3. CÁLCULOS MATEMÁTICOS
        double ventasEfectivo = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.EFECTIVO)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0).sum();

        // Suma todos los ingresos manuales de la bitácora (limpios con tipo "INGRESO")
        double totalIngresosManuales = movimientos.stream()
                .filter(m -> m.getTipo() != null && "INGRESO".equals(m.getTipo().toUpperCase().trim()))
                .mapToDouble(MovimientoCaja::getMonto).sum();

        // Recupera los egresos (vienen con signo negativo desde TurnoCajaService, ej: -30.0)
        double totalEgresos = movimientos.stream()
                .filter(m -> m.getTipo() != null && "EGRESO".equals(m.getTipo().toUpperCase().trim()))
                .mapToDouble(MovimientoCaja::getMonto).sum();

        // 🔥 CORRECCIÓN CLAVE: Se usa "+" porque el número ya es negativo. Ejemplo: 200 + 10 + (-20) = 190.
        double efectivoEsperadoTotal = turnoActivo.getMontoApertura() + ventasEfectivo + totalIngresosManuales + totalEgresos;

        if (efectivoEsperadoTotal < 0) {
            efectivoEsperadoTotal = 0.0;
        }

        double yapePlinEsperado = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.YAPE || p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.PLIN)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0).sum();

        double tarjetaEsperada = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.TARJETA)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0).sum();

        double totalVentasPedidos = liquidados.stream()
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0).sum();

        // 💡 El saldo teórico global sigue la misma lógica (+) por el signo negativo nativo del egreso
        double saldoTeoricoGlobal = turnoActivo.getMontoApertura() + totalVentasPedidos + totalIngresosManuales + totalEgresos;

        // 4. MOVIMIENTOS EXCLUSIVOS CAJERO
        List<MovimientoCaja> movimientosExclusivosCajero = movimientos.stream()
                .filter(m -> {
                    String c = m.getConcepto() != null ? m.getConcepto().toUpperCase() : "";
                    return !(c.contains("FONDO INICIAL") || c.contains("LIQUIDACIÓN") || c.contains("LIQUIDACION")
                            || c.contains("CARTA QR") || c.contains("VENTA POS DIRECTO") || c.contains("ORDEN #"));
                })
                .sorted(Comparator.comparing(MovimientoCaja::getId).reversed())
                .collect(Collectors.toList());

        // 5. POR COBRAR
        List<Pedido> porCobrar = pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PENDIENTE
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .filter(p -> p.getNumeroMesa() != null && p.isTicketImpresoCocina())
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream().anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // Asignación final al mapa que leerá el Controller
        metricas.put("todosLosMovimientosCaja", movimientosExclusivosCajero);
        metricas.put("saldoTeorico", saldoTeoricoGlobal);
        metricas.put("totalVentasCalculado", totalVentasPedidos + totalIngresosManuales);
        metricas.put("efectivoEsperado", efectivoEsperadoTotal);
        metricas.put("yapePlinEsperado", yapePlinEsperado);
        metricas.put("tarjetaEsperada", tarjetaEsperada);
        metricas.put("pedidosPorCobrar", porCobrar);
        metricas.put("pedidosLiquidados", pedidosHistorialVisual);
        metricas.put("pedidosDiario", pedidoRepository.findAll());

        System.out.println("📥 [AUDITORÍA FINANCIERA] Ventas: S/. " + totalVentasPedidos + " | Efectivo Gaveta: S/. " + efectivoEsperadoTotal);
        return metricas;
    }

    @Transactional
    public Pedido guardarVentaDirectaPOS(Pedido pedido) {
        LocalDateTime ahora = LocalDateTime.now();
        pedido.setFechaCreacion(ahora);
        pedido.setFechaEntrega(ahora); // Seteado para que el HTML registre la hora de la transacción

        // 🍳 CLAVE LOGÍSTICA: Entra en EN_COCINA para que las pantallas de barra/cocina lo procesen
        pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
        pedido.setTicketImpresoCocina(false);

        // 🚀 CONEXIÓN DE LA NOTA DE VENTA SECUENCIAL DE MARIADB
        String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
        pedido.setComprobanteNotaNumero(siguienteNota);

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                Producto productoReal = productoRepository.findById(detalle.getProducto().getId())
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + detalle.getProducto().getId()));

                detalle.setProducto(productoReal);
                detalle.setPedido(pedido);
                detalle.setPagado(true); // El dinero ya se recibió en caja
                detalle.setEntregado(false); // Falso, porque recién se va a cocinar
                detalle.setCocinado(false);  // Falso, va a la línea de fuego

                // Escudo de inventario original
                insumoProductoRepository.findByProductoId(productoReal.getId()).forEach(ip -> {
                    if (ip.getInsumo() != null) {
                        Insumo insumo = ip.getInsumo();
                        double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
                        double totalAComprometer = cantidadUsada * detalle.getCantidad();
                        double actualComprometido = (insumo.getStockComprometido() != null) ? insumo.getStockComprometido() : 0.0;
                        insumo.setStockComprometido(actualComprometido + totalAComprometer);
                    }
                });
            }
        }

        Pedido pedidoGuardado = pedidoRepository.save(pedido);

        // 💵 Registro inmediato en la gaveta de dinero activa
        if (pedidoGuardado.getMontoTotal() != null && pedidoGuardado.getMontoTotal() > 0) {
            String conceptoCpe = "Venta POS Directo (" + pedidoGuardado.getMetodoPago() + ") - " + pedidoGuardado.getComprobanteNotaNumero();
            turnoCajaService.registrarVenta(conceptoCpe, pedidoGuardado.getMontoTotal());
        }

        return pedidoGuardado;
    }

    public Map<String, Object> obtenerHistorialComprobantesPaginado(LocalDate inicio, LocalDate fin, Pageable pageable) {
        Page<Pedido> pageResult = pedidoRepository.findHistorialNotasVenta(inicio, fin, pageable);

        List<Map<String, Object>> listaDTO = pageResult.getContent().stream().map(p -> {
            Map<String, Object> dto = new HashMap<>();

            dto.put("comprobante", p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "NV-" + p.getId());
            dto.put("id", p.getId());
            dto.put("cliente", p.getCliente() != null ? p.getCliente() : "Cliente General");
            dto.put("metodoPago", p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");
            dto.put("fecha", p.getFechaCreacion() != null ? p.getFechaCreacion().toLocalDate().toString() : "N/A");
            dto.put("hora", p.getFechaCreacion() != null ? p.getFechaCreacion().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : "N/A");
            dto.put("monto", p.getMontoTotal() != null ? p.getMontoTotal() : 0.0);

            if (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.EN_COCINA
                    || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PREPARADO
                    || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO) {
                dto.put("estado", "PAGADO");
            } else {
                dto.put("estado", p.getEstado().name());
            }

            if (p.getNumeroMesa() != null) {
                dto.put("tipoServicio", "SALON");
                dto.put("mesa", "Mesa " + p.getNumeroMesa());
            } else {
                String tipoEnum = p.getTipoPedido() != null ? p.getTipoPedido().name().toUpperCase() : "LLEVAR";

                if ("LOCAL".equals(tipoEnum) || "LLEVAR".equals(tipoEnum)) {
                    dto.put("tipoServicio", "LLEVAR");
                } else {
                    dto.put("tipoServicio", "DELIVERY");
                }
                dto.put("mesa", "Carta Web");
            }
            return dto;
        }).collect(Collectors.toList());

        return Map.of(
                "comprobantes", listaDTO,
                "paginaActual", pageResult.getNumber(),
                "totalPaginas", pageResult.getTotalPages(),
                "totalElementos", pageResult.getTotalElements()
        );
    }

    @Transactional
    public void aprobarYAsignarNotaVentaWeb(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElse(null);
        if (pedido != null && (pedido.getComprobanteNotaNumero() == null || pedido.getComprobanteNotaNumero().isEmpty())) {
            // Consumimos el secuenciador nativo libre de errores de sintaxis
            String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
            pedido.setComprobanteNotaNumero(siguienteNota);
            pedidoRepository.saveAndFlush(pedido); // Forzamos el guardado inmediato en MariaDB
        }
        // Ejecutamos la lógica de cocina original
        pedidoService.aprobarPedidoACocina(pedidoId);
    }
}