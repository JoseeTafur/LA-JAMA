package com.web.restaurante.service;

import com.web.restaurante.model.*;
import com.web.restaurante.model.enums.EstadoPago;
import com.web.restaurante.model.enums.TipoMovimientoCaja;
import com.web.restaurante.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

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
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final SimpMessagingTemplate messagingTemplate;


    public boolean esHorarioPermitido(LocalTime horaActual) {
        return (horaActual.isAfter(LocalTime.of(8, 0)) && horaActual.isBefore(LocalTime.of(18, 0))) ||
                (horaActual.isAfter(LocalTime.of(19, 0)) || horaActual.isBefore(LocalTime.of(7, 0)));
    }

    public Map<String, Object> calcularMetricasDashboard(TurnoCaja turnoActivo, List<MovimientoCaja> movimientos) {
        Map<String, Object> metricas = new HashMap<>();

        List<Pedido> pedidosDelTurnoActivo = pedidoRepository.findAll().stream()
                .filter(p -> p.getTurnoCaja() != null && p.getTurnoCaja().getId().equals(turnoActivo.getId()))
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .collect(Collectors.toList());

        List<Pedido> liquidados = pedidosDelTurnoActivo.stream()
                .filter(p -> EstadoPago.PAGADO.equals(p.getEstadoPago()))
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .collect(Collectors.toList());

        List<Pedido> pedidosHistorialVisual = pedidosDelTurnoActivo.stream()
                .filter(p -> EstadoPago.PAGADO.equals(p.getEstadoPago())
                        || EstadoPago.EXTORNADO.equals(p.getEstadoPago()))
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        java.util.function.ToDoubleFunction<Pedido> calcularMontoSeguro = p -> {
            double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
            if (monto <= 0.0 && p.getListaDetalles() != null) {
                monto = p.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : (d.getPrecioUnitario() != null ? d.getPrecioUnitario() * d.getCantidad() : 0.0))
                        .sum();
            }
            return monto;
        };

        java.util.function.Predicate<MovimientoCaja> esMovimientoManualPuro = m -> {
            String c = m.getConcepto() != null ? m.getConcepto().toUpperCase() : "";
            return !(c.contains("FONDO INICIAL") || c.contains("LIQUIDACIÓN") || c.contains("LIQUIDACION")
                    || c.contains("CARTA") || c.contains("VENTA POS DIRECTO") || c.contains("ORDEN #")
                    || c.contains("EXTORNO") || c.contains("ANULACI") || c.contains("RE-EMISI"));
        };

        double ventasEfectivo = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.EFECTIVO)
                .mapToDouble(calcularMontoSeguro)
                .sum();

        double yapeEsperado = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.YAPE)
                .mapToDouble(calcularMontoSeguro)
                .sum();

        double plinEsperado = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.PLIN)
                .mapToDouble(calcularMontoSeguro)
                .sum();

        double tarjetaEsperada = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.TARJETA)
                .mapToDouble(calcularMontoSeguro)
                .sum();

        double totalIngresosManuales = movimientos.stream()
                .filter(m -> m.getTipo() != null && m.getTipo().getGrupoMacro().equals("INGRESO"))
                .filter(esMovimientoManualPuro)
                .mapToDouble(MovimientoCaja::getMonto).sum();

        double totalEgresos = movimientos.stream()
                .filter(m -> m.getTipo() != null && m.getTipo().getGrupoMacro().equals("EGRESO"))
                .filter(esMovimientoManualPuro)
                .mapToDouble(MovimientoCaja::getMonto).sum();

        double totalVentasPedidos = liquidados.stream()
                .mapToDouble(calcularMontoSeguro)
                .sum();

        double efectivoEsperadoTotal = turnoActivo.getMontoApertura() + ventasEfectivo + totalIngresosManuales + totalEgresos;
        if (efectivoEsperadoTotal < 0) {
            efectivoEsperadoTotal = 0.0;
        }

        double saldoTeoricoGlobal = turnoActivo.getMontoApertura() + totalVentasPedidos + totalIngresosManuales + totalEgresos;

        List<MovimientoCaja> movimientosExclusivosCajero = movimientos.stream()
                .filter(esMovimientoManualPuro)
                .sorted(Comparator.comparing(MovimientoCaja::getId).reversed())
                .collect(Collectors.toList());

        long countIngresosManuales = movimientosExclusivosCajero.stream()
                .filter(m -> m.getTipo() != null && "INGRESO".equals(m.getTipo().getGrupoMacro()))
                .count();

        long countEgresosManuales = movimientosExclusivosCajero.stream()
                .filter(m -> m.getTipo() != null && "EGRESO".equals(m.getTipo().getGrupoMacro()))
                .count();

        List<Pedido> porCobrar = pedidoRepository.findAll().stream()
                .filter(p -> p.getNumeroMesa() != null)
                .filter(p -> com.web.restaurante.model.enums.EstadoPago.PENDIENTE.equals(p.getEstadoPago()))
                .filter(p -> p.getMontoTotal() != null && p.getMontoTotal() > 0.0)
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream().anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        metricas.put("todosLosMovimientosCaja", movimientosExclusivosCajero);
        metricas.put("saldoTeorico", saldoTeoricoGlobal);
        metricas.put("totalVentasCalculado", totalVentasPedidos);
        metricas.put("efectivoEsperado", efectivoEsperadoTotal);
        metricas.put("yapeEsperado", yapeEsperado);
        metricas.put("plinEsperado", plinEsperado);
        metricas.put("countIngresosManuales", countIngresosManuales);
        metricas.put("countEgresosManuales", countEgresosManuales);
        metricas.put("tarjetaEsperada", tarjetaEsperada);
        metricas.put("pedidosPorCobrar", porCobrar);
        metricas.put("pedidosLiquidados", pedidosHistorialVisual);
        metricas.put("pedidosDiario", pedidosDelTurnoActivo);

        return metricas;
    }

    @Transactional
    public Pedido guardarVentaDirectaPOS(Pedido pedido) {

        LocalDateTime ahora = LocalDateTime.now();

        pedido.setFechaCreacion(ahora);
        pedido.setFechaEntrega(ahora);

        pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.ENTREGADO);
        pedido.setTicketImpresoCocina(true);

        try {
            TurnoCaja turnoActivo = turnoCajaRepository.findAll().stream()
                    .filter(TurnoCaja::isActivo)
                    .findFirst()
                    .orElse(null);
            if (turnoActivo != null) {
                pedido.setTurnoCaja(turnoActivo);
            }
        } catch (Exception e) {
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

                detalle.setEntregado(true);
                detalle.setCocinado(true);

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

        pedido.setEstadoPago(EstadoPago.PAGADO);
        pedido.setEsNotaVenta(true);
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
            String turnoFiltro,
            Pageable pageable) {

        List<Pedido> todosLosPedidos = pedidoRepository.findAll().stream()
                .filter(p -> p.getFechaCreacion() != null
                        && !p.getFechaCreacion().isBefore(inicio)
                        && !p.getFechaCreacion().isAfter(fin))
                .filter(p -> {
                    if (p.getMetodoPago() == null) return false;
                    if (turnoFiltro != null && !turnoFiltro.trim().isEmpty() && !"TODOS".equalsIgnoreCase(turnoFiltro)) {
                        if (p.getTurnoCaja() != null) {
                            String tipoTurnoPedido = p.getTurnoCaja().getTipoTurno();
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
                    return p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.PAGADO
                            || p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.EXTORNADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO;
                })
                .collect(Collectors.toList());

        List<Pedido> pedidosFiltrados = todosLosPedidos.stream()
                .filter(p -> {
                    if (metodoPago != null) {
                        String mpEnum = p.getMetodoPago().name().toUpperCase();
                        if ("YAPE".equals(metodoPago)) {
                            if (!mpEnum.equals("YAPE") && !mpEnum.equals("YAPE_PLIN")) return false;
                        } else if ("PLIN".equals(metodoPago)) {
                            if (!mpEnum.equals("PLIN") && !mpEnum.equals("YAPE_PLIN")) return false;
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
                            return "SALON".equals(tipoEnumStr) || tieneMesa;
                        } else if ("DELIVERY".equalsIgnoreCase(tipoServicio)) {
                            return "DELIVERY".equals(tipoEnumStr);
                        } else if ("LLEVAR".equalsIgnoreCase(tipoServicio)) {
                            return "LLEVAR".equals(tipoEnumStr);
                        }
                    }
                    return true;
                })
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        int totalElementos = pedidosFiltrados.size();
        int desde = (int) pageable.getOffset();
        int hasta = Math.min(desde + pageable.getPageSize(), totalElementos);

        List<Pedido> subListaPaginada = new ArrayList<>();
        if (desde < totalElementos) {
            subListaPaginada = pedidosFiltrados.subList(desde, hasta);
        }

        int totalPaginas = (int) Math.ceil((double) totalElementos / pageable.getPageSize());

        List<Map<String, Object>> listaDTO = subListaPaginada.stream().map(p -> {
            Map<String, Object> dto = new HashMap<>();

            dto.put("comprobante", p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().isEmpty()
                    ? p.getComprobanteNotaNumero() : "NV-" + p.getId());
            dto.put("id", p.getId());
            dto.put("comprobanteSunat", p.getComprobanteNumero());
            dto.put("cliente", p.getCliente() != null ? p.getCliente() : "Cliente General");
            dto.put("metodoPago", p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");
            dto.put("fecha", p.getFechaCreacion().toLocalDate().toString());
            dto.put("hora", p.getFechaCreacion().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
            dto.put("fechaHoraOrden", p.getFechaCreacion().toString());

            double montoFinalFila = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
            if (montoFinalFila <= 0.0 && p.getListaDetalles() != null) {
                montoFinalFila = p.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : (d.getPrecioUnitario() != null ? d.getPrecioUnitario() * d.getCantidad() : 0.0))
                        .sum();
            }
            dto.put("monto", montoFinalFila);

            dto.put("estado", p.getEstado() != null ? p.getEstado().name() : "ENTREGADO");
            dto.put("estadoPago", p.getEstadoPago() != null ? p.getEstadoPago().name() : "PAGADO");

            com.web.restaurante.model.enums.TipoPedido tipo = p.getTipoPedido();
            if (tipo == com.web.restaurante.model.enums.TipoPedido.SALON) {
                dto.put("tipoServicio", "SALON");
                dto.put("canal", "Presencial");
                dto.put("mesa", p.getNumeroMesa() != null ? "Mesa " + p.getNumeroMesa() : "Salón");
            } else if (tipo == com.web.restaurante.model.enums.TipoPedido.DELIVERY) {
                dto.put("tipoServicio", "DELIVERY");
                dto.put("canal", "Virtual");
                dto.put("mesa", "Reparto Web");
            } else {
                dto.put("tipoServicio", "LLEVAR");
                dto.put("canal", "Virtual");
                dto.put("mesa", "Para Llevar");
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
        if (pedido != null) {
            if (pedido.getComprobanteNotaNumero() == null || pedido.getComprobanteNotaNumero().isEmpty()) {
                String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
                pedido.setComprobanteNotaNumero(siguienteNota);
            }

            pedido.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);

            pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.PENDIENTE);
            pedidoRepository.saveAndFlush(pedido);

            messagingTemplate.convertAndSend("/topic/cocina", "{\"pedidoId\":" + pedidoId + ", \"status\":\"NUEVO\"}");
        }
    }

    public List<Map<String, Object>> consolidarDataParaReporte(LocalDateTime inicio, LocalDateTime fin, String turnoFiltro) {
        Pageable ilimitado = PageRequest.of(0, Integer.MAX_VALUE);

        Map<String, Object> dataBase = obtenerHistorialComprobantesFiltrosAvanzados(inicio, fin, null, null, turnoFiltro, ilimitado);
        List<Map<String, Object>> listaReporteMaster = new ArrayList<>();

        List<Map<String, Object>> comprobantes = (List<Map<String, Object>>) dataBase.get("comprobantes");
        if (comprobantes != null) {
            for (Map<String, Object> c : comprobantes) {
                Map<String, Object> item = new HashMap<>(c);
                item.put("isMovimientoManual", false);
                listaReporteMaster.add(item);
            }
        }

        try {
            List<TurnoCaja> turnos = turnoCajaRepository.findAll().stream()
                    .filter(t -> t.getFechaApertura() != null
                            && !t.getFechaApertura().isBefore(inicio)
                            && !t.getFechaApertura().isAfter(fin))
                    .collect(Collectors.toList());

            for (TurnoCaja t : turnos) {
                if (turnoFiltro != null && !turnoFiltro.trim().isEmpty() && !"TODOS".equalsIgnoreCase(turnoFiltro)) {
                    if (t.getTipoTurno() == null || !t.getTipoTurno().equalsIgnoreCase(turnoFiltro.trim())) {
                        continue;
                    }
                }

                List<MovimientoCaja> movs = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(t.getId());
                for (MovimientoCaja m : movs) {
                    if (m == null) continue;
                    String tipoMov = m.getTipo() != null ? m.getTipo().getGrupoMacro() : "INGRESO";
                    String concepto = m.getConcepto() != null ? m.getConcepto() : "";

                    if (!(concepto.toUpperCase().contains("LIQUIDACIÓN") ||
                            concepto.toUpperCase().contains("LIQUIDACION") ||
                            concepto.toUpperCase().contains("DELIVERY MANUAL CAJERO") ||
                            concepto.toUpperCase().contains("VENTA POS DIRECTO") ||
                            concepto.toUpperCase().contains("CARTA") ||
                            tipoMov.equals("VENTA") ||
                            tipoMov.equals("CIERRE"))) {
                        Map<String, Object> mov = new HashMap<>();
                        mov.put("id", m.getId());
                        mov.put("comprobante", "M-" + m.getId());
                        mov.put("tipoServicio", "MANUAL");
                        mov.put("mesa", "—");
                        mov.put("cliente", concepto.startsWith("Manual: ") ? concepto.substring(8) : concepto);
                        mov.put("fecha", m.getFecha() != null ? m.getFecha().toLocalDate().toString() : LocalDate.now().toString());
                        mov.put("hora", m.getFecha() != null ? m.getFecha().toLocalTime().toString().substring(0, 5) : "--:--");
                        mov.put("monto", Math.abs(m.getMonto()));
                        mov.put("metodoPago", "EFECTIVO");
                        mov.put("estado", "MOV_MANUAL");
                        mov.put("estadoPago", tipoMov);
                        mov.put("isMovimientoManual", true);

                        listaReporteMaster.add(mov);
                    }
                }
            }
        } catch (Exception ex) {
        }

        listaReporteMaster.sort((a, b) -> {
            Long idA = Long.parseLong(a.get("id").toString());
            Long idB = Long.parseLong(b.get("id").toString());
            return idB.compareTo(idA);
        });

        return listaReporteMaster;
    }

    @Transactional
    public Pedido guardarDeliveryManualCajero(Pedido pedido) {
        LocalDateTime ahora = LocalDateTime.now();
        pedido.setFechaCreacion(ahora);

        pedido.setFechaEntrega(ahora);

        pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
        pedido.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
        pedido.setTicketImpresoCocina(false);

        String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
        pedido.setComprobanteNotaNumero(siguienteNota);

        try {
            turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
        } catch (Exception e) {
        }

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                Producto productoReal = productoRepository.findById(detalle.getProducto().getId())
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + detalle.getProducto().getId()));

                detalle.setProducto(productoReal);
                detalle.setPedido(pedido);
                detalle.setPagado(true);

                detalle.setCocinado(false);
                detalle.setEntregado(false);
            }
        }

        Pedido pedidoGuardado = pedidoRepository.save(pedido);

        if (pedidoGuardado.getMontoTotal() != null && pedidoGuardado.getMontoTotal() > 0) {
            String conceptoCpe = "Delivery Manual Cajero POS (" + pedidoGuardado.getMetodoPago() + ") - " + pedidoGuardado.getComprobanteNotaNumero();
            turnoCajaService.registrarVenta(conceptoCpe, pedidoGuardado.getMontoTotal());
        }

        return pedidoGuardado;
    }

    public long contarItemsVendidosEnTurno(Long turnoId) {
        try {
            Long cantidad = pedidoRepository.countCantidadProductosPorTurno(turnoId);
            return cantidad != null ? cantidad : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }
}