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

        LocalDate hoy = LocalDate.now();

        // Mantenemos tu hora falsa de prueba para el turno noche (9:30 PM)
        LocalTime horaFalsaNoche = LocalTime.of(21, 30);
        LocalDateTime ahora = LocalDateTime.of(hoy, horaFalsaNoche);

        pedido.setFechaCreacion(ahora);
        pedido.setFechaEntrega(ahora);

        pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
        pedido.setTicketImpresoCocina(false);

        // 🛡️ BUSCAMOS EL TURNO ACTIVO USANDO EL CAMPO 'isActivo()' REAL
        try {
            TurnoCaja turnoActivo = turnoCajaRepository.findAll().stream()
                    .filter(TurnoCaja::isActivo) // Busca el que tenga activo = true
                    .findFirst()
                    .orElse(null);
            if (turnoActivo != null) {
                pedido.setTurnoCaja(turnoActivo);
            }
        } catch (Exception e) {
            System.out.println("⚠️ No se pudo asignar el turno de caja: " + e.getMessage());
        }

        String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
        pedido.setComprobanteNotaNumero(siguienteNota);

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                Producto productoReal = productoRepository.findById(detalle.getProducto().getId())
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + detalle.getProducto().getId()));

                detalle.setProducto(productoReal);
                detalle.setPedido(pedido);
                detalle.setPagado(true);
                detalle.setEntregado(false);
                detalle.setCocinado(false);

                // Escudo de inventario original intacto
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

        if (pedidoGuardado.getMontoTotal() != null && pedidoGuardado.getMontoTotal() > 0) {
            String conceptoCpe = "Venta POS Directo (" + pedidoGuardado.getMetodoPago() + ") - " + pedidoGuardado.getComprobanteNotaNumero();
            turnoCajaService.registrarVenta(conceptoCpe, pedidoGuardado.getMontoTotal());
        }

        return pedidoGuardado;
    }

    public Map<String, Object> obtenerHistorialComprobantesFiltrosAvanzados(
            LocalDateTime inicio,
            LocalDateTime fin,
            String metodoPago,
            String tipoServicio,
            String turnoFiltro, // Recibe "DIA", "NOCHE" o "TODOS"
            Pageable pageable) {

        // 1. Extraemos los pedidos aplicando las REGLAS SEMÁNTICAS REALES
        List<Pedido> todosLosPedidos = pedidoRepository.findAll().stream()
                .filter(p -> p.getFechaCreacion() != null
                        && !p.getFechaCreacion().isBefore(inicio)
                        && !p.getFechaCreacion().isAfter(fin))
                .filter(p -> {
                    if (p.getMetodoPago() == null) {
                        return false;
                    }

                    // 🛡️ ADUANA DEL TURNO CON NUESTRA NUEVA COLUMNA BLINDADA
                    if (turnoFiltro != null && !turnoFiltro.trim().isEmpty() && !"TODOS".equalsIgnoreCase(turnoFiltro)) {
                        if (p.getTurnoCaja() != null) {
                            String tipoTurnoPedido = p.getTurnoCaja().getTipoTurno();

                            // Si el turno de caja no tiene asignado texto aún, calculamos por su hora de apertura (retrocompatibilidad)
                            if (tipoTurnoPedido == null && p.getTurnoCaja().getFechaApertura() != null) {
                                int hora = p.getTurnoCaja().getFechaApertura().getHour();
                                tipoTurnoPedido = (hora >= 8 && hora < 18) ? "DIA" : "NOCHE";
                            }

                            if (tipoTurnoPedido == null || !tipoTurnoPedido.equalsIgnoreCase(turnoFiltro.trim())) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }

                    return p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ANULADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.EN_COCINA
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PREPARADO;
                })
                .collect(Collectors.toList());

        // 2. APLICACIÓN DE FILTROS DINÁMICOS EN STREAM (Método y Origen)
        List<Pedido> pedidosFiltrados = todosLosPedidos.stream()
                .filter(p -> {
                    if (metodoPago != null) {
                        String mpEnum = p.getMetodoPago().name().toUpperCase();
                        if (metodoPago.contains("YAPE") || metodoPago.contains("DIGITAL")) {
                            if (!mpEnum.equals("YAPE") && !mpEnum.equals("PLIN") && !mpEnum.equals("YAPE_PLIN")) {
                                return false;
                            }
                        } else if (!mpEnum.equals(metodoPago)) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(p -> {
                    if (tipoServicio != null) {
                        boolean tieneMesa = p.getNumeroMesa() != null;
                        String tipoEnumStr = p.getTipoPedido() != null ? p.getTipoPedido().name().toUpperCase() : "LLEVAR";

                        if ("LOCAL".equalsIgnoreCase(tipoServicio) || "SALON".equalsIgnoreCase(tipoServicio)) {
                            return tieneMesa;
                        } else if ("DELIVERY".equalsIgnoreCase(tipoServicio)) {
                            return !tieneMesa && "DELIVERY".equals(tipoEnumStr);
                        } else if ("LLEVAR".equalsIgnoreCase(tipoServicio)) {
                            return !tieneMesa && ("LLEVAR".equals(tipoEnumStr) || "LOCAL".equals(tipoEnumStr));
                        }
                    }
                    return true;
                })
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // 3. PAGINACIÓN MANUAL
        int totalElementos = pedidosFiltrados.size();
        int desde = (int) pageable.getOffset();
        int hasta = Math.min(desde + pageable.getPageSize(), totalElementos);

        List<Pedido> subListaPaginada = new ArrayList<>();
        if (desde < totalElementos) {
            subListaPaginada = pedidosFiltrados.subList(desde, hasta);
        }

        int totalPaginas = (int) Math.ceil((double) totalElementos / pageable.getPageSize());

        // 4. MAPEO AL DTO
        List<Map<String, Object>> listaDTO = subListaPaginada.stream().map(p -> {
            Map<String, Object> dto = new HashMap<>();

            dto.put("comprobante", p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().isEmpty()
                    ? p.getComprobanteNotaNumero() : "NV-" + p.getId());
            dto.put("id", p.getId());
            dto.put("cliente", p.getCliente() != null ? p.getCliente() : "Cliente General");
            dto.put("metodoPago", p.getMetodoPago().name());
            dto.put("fecha", p.getFechaCreacion().toLocalDate().toString());
            dto.put("hora", p.getFechaCreacion().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
            dto.put("monto", p.getMontoTotal() != null ? p.getMontoTotal() : 0.0);

            if (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO
                    || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                    || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.EN_COCINA
                    || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PREPARADO) {
                dto.put("estado", "PAGADO");
            } else {
                dto.put("estado", "ANULADO");
            }

            if (p.getNumeroMesa() != null) {
                dto.put("tipoServicio", "SALON");
                dto.put("mesa", "Mesa " + p.getNumeroMesa());
            } else {
                String tipoEnumStr = p.getTipoPedido() != null ? p.getTipoPedido().name().toUpperCase() : "LLEVAR";
                if ("DELIVERY".equals(tipoEnumStr)) {
                    dto.put("tipoServicio", "DELIVERY");
                    dto.put("mesa", "Carta Web");
                } else {
                    dto.put("tipoServicio", "LLEVAR");
                    dto.put("mesa", "Para Llevar");
                }
            }
            return dto;
        }).collect(Collectors.toList());

        return Map.of(
                "comprobantes", listaDTO,
                "paginaActual", pageable.getPageNumber(),
                "totalPaginas", totalPaginas == 0 ? 1 : totalPaginas,
                "totalElementos", totalElementos
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