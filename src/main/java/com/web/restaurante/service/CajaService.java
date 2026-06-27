package com.web.restaurante.service;

import com.web.restaurante.model.*;
import com.web.restaurante.model.enums.EstadoPago;
import com.web.restaurante.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final MovimientoCajaRepository movimientoCajaRepository;

    public boolean esHorarioPermitido(LocalTime horaActual) {
        return (horaActual.isAfter(LocalTime.of(8, 0)) && horaActual.isBefore(LocalTime.of(18, 0))) ||
                (horaActual.isAfter(LocalTime.of(19, 0)) || horaActual.isBefore(LocalTime.of(7, 0)));
    }

    public Map<String, Object> calcularMetricasDashboard(TurnoCaja turnoActivo, List<MovimientoCaja> movimientos) {
        Map<String, Object> metricas = new HashMap<>();

        // 🚀 OPTIMIZACIÓN SUPREMA: Traemos de la BD solo los pedidos amarrados a este turno específico
        // Si no tienes este método en tu repositorio, puedes usar el findAll() temporalmente, pero filtrando por Turno.
        List<Pedido> pedidosDelTurnoActivo = pedidoRepository.findAll().stream()
                .filter(p -> p.getTurnoCaja() != null && p.getTurnoCaja().getId().equals(turnoActivo.getId()))
                .collect(Collectors.toList());

        // 1. LIQUIDADOS (Para matemática financiera del turno actual)
        List<Pedido> liquidados = pedidoRepository.findAll().stream()
                .filter(p -> EstadoPago.PAGADO.equals(p.getEstadoPago())) // ◄ Descarta automáticamente los EXTORNADO
                .filter(p -> p.getFechaCreacion() != null
                        && turnoActivo.getFechaApertura() != null
                        && p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura()))
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .collect(Collectors.toList());

        // 2. HISTORIAL VISUAL (Con aduanas de estado del turno actual)
        List<Pedido> pedidosHistorialVisual = pedidoRepository.findAll().stream()
                .filter(p -> p.getFechaCreacion() != null
                        && turnoActivo.getFechaApertura() != null
                        && p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura()))
                .filter(p -> EstadoPago.PAGADO.equals(p.getEstadoPago())
                        || EstadoPago.EXTORNADO.equals(p.getEstadoPago()))
                // 🚨 EL MISMO CANDADO: No se muestran comprobantes sin número de nota asignado
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // 3. CÁLCULOS MATEMÁTICOS (Tu lógica matemática es perfecta, se mantiene intacta)
        double ventasEfectivo = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.EFECTIVO)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0).sum();

        double totalIngresosManuales = movimientos.stream()
                .filter(m -> m.getTipo() != null && "INGRESO".equals(m.getTipo().toUpperCase().trim()))
                .mapToDouble(MovimientoCaja::getMonto).sum();

        double totalEgresos = movimientos.stream()
                .filter(m -> m.getTipo() != null && "EGRESO".equals(m.getTipo().toUpperCase().trim()))
                .mapToDouble(MovimientoCaja::getMonto).sum();

        // El signo negativo ya viene del Service: 200 + 10 + (-20) = 190.
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

        // 5. POR COBRAR (Pedidos pendientes globales en el salón que exigen pago)
        // Aquí sí consultamos el repositorio general porque un pedido pendiente de un turno anterior podría cobrarse hoy
        List<Pedido> porCobrar = pedidoRepository.findAll().stream()
                .filter(p -> p.getNumeroMesa() != null)
                .filter(p -> com.web.restaurante.model.enums.EstadoPago.PENDIENTE.equals(p.getEstadoPago()))
                .filter(p -> p.getMontoTotal() != null && p.getMontoTotal() > 0.0)
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream().anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // Asignación final al mapa
        metricas.put("todosLosMovimientosCaja", movimientosExclusivosCajero);
        metricas.put("saldoTeorico", saldoTeoricoGlobal);
        metricas.put("totalVentasCalculado", totalVentasPedidos);
        metricas.put("efectivoEsperado", efectivoEsperadoTotal);
        metricas.put("yapePlinEsperado", yapePlinEsperado);
        metricas.put("tarjetaEsperada", tarjetaEsperada);
        metricas.put("pedidosPorCobrar", porCobrar);
        metricas.put("pedidosLiquidados", pedidosHistorialVisual);
        metricas.put("pedidosDiario", pedidosDelTurnoActivo); // Cambiado para que no explote la memoria del HTML

        System.out.println("📥 [AUDITORÍA FINANCIERA] Turno: " + turnoActivo.getId() + " | Ventas: S/. " + totalVentasPedidos + " | Efectivo: S/. " + efectivoEsperadoTotal);
        return metricas;
    }

    @Transactional
    public Pedido guardarVentaDirectaPOS(Pedido pedido) {

        // 🟩 ELIMINAMOS LA HORA FALSA: Seteamos la fecha y hora actual real del sistema
        LocalDateTime ahora = LocalDateTime.now();

        pedido.setFechaCreacion(ahora);
        pedido.setFechaEntrega(ahora);

        // Nace como ENTREGADO para mostrador directo
        pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.ENTREGADO);
        pedido.setTicketImpresoCocina(true);

        // 🛡️ BUSCAMOS EL TURNO ACTIVO USANDO EL CAMPO 'isActivo()' REAL
        try {
            TurnoCaja turnoActivo = turnoCajaRepository.findAll().stream()
                    .filter(TurnoCaja::isActivo)
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

                // Sincronizamos los detalles como despachados
                detalle.setEntregado(true);
                detalle.setCocinado(true);

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

        pedido.setEstadoPago(EstadoPago.PAGADO);
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

                    return p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.PAGADO
                            || p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.EXTORNADO
                            || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO
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
            dto.put("metodoPago", p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");
            dto.put("fecha", p.getFechaCreacion().toLocalDate().toString());
            dto.put("hora", p.getFechaCreacion().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
            dto.put("monto", p.getMontoTotal() != null ? p.getMontoTotal() : 0.0);

            // 🛡️ REPARACIÓN 1: Enviamos el Estado Logístico real para que el JS no fuerce un ANULADO/EGRESO falso
            dto.put("estado", p.getEstado() != null ? p.getEstado().name() : "ENTREGADO");
            dto.put("estadoPago", p.getEstadoPago() != null ? p.getEstadoPago().name() : "PAGADO");

            // 🛡️ REPARACIÓN 2: Jerarquía estricta basada en el Enum TipoPedido, libre de la aduana de mesa nula
            com.web.restaurante.model.enums.TipoPedido tipo = p.getTipoPedido();
            if (tipo == com.web.restaurante.model.enums.TipoPedido.SALON) {
                dto.put("tipoServicio", "SALON");
                // Si el clon no tiene número de mesa impreso por el prepago, usamos el cliente o un texto descriptivo
                if (p.getNumeroMesa() != null) {
                    dto.put("mesa", "Mesa " + p.getNumeroMesa());
                } else if (p.getCliente() != null && p.getCliente().contains("Mesa")) {
                    // Extrae el identificador del nombre clonado (ej: "Mesa 1 (Ticket 1)")
                    dto.put("mesa", p.getCliente());
                } else {
                    dto.put("mesa", "Salón");
                }
            } else if (tipo == com.web.restaurante.model.enums.TipoPedido.DELIVERY) {
                dto.put("tipoServicio", "DELIVERY");
                dto.put("mesa", "Carta Web");
            } else {
                dto.put("tipoServicio", "LLEVAR");
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
        if (pedido != null && (pedido.getComprobanteNotaNumero() == null || pedido.getComprobanteNotaNumero().isEmpty())) {
            String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
            pedido.setComprobanteNotaNumero(siguienteNota);
            pedido.setEstadoPago(EstadoPago.PAGADO);
            pedidoRepository.saveAndFlush(pedido);
        }
        pedidoService.aprobarPedidoACocina(pedidoId);
    }

    public List<Map<String, Object>> consolidarDataParaReporte(LocalDateTime inicio, LocalDateTime fin, String turnoFiltro) {
        Pageable ilimitado = PageRequest.of(0, Integer.MAX_VALUE);

        // 1. Extraemos los comprobantes comerciales del método existente
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

        // 2. Extraemos e integramos los movimientos manuales puros del rango
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
                    String tipoMov = m.getTipo() != null ? m.getTipo().toUpperCase().trim() : "INGRESO";
                    String concepto = m.getConcepto() != null ? m.getConcepto() : "";

                    if (!(concepto.toUpperCase().contains("LIQUIDACIÓN") || concepto.toUpperCase().contains("LIQUIDACION") || tipoMov.equals("VENTA") || tipoMov.equals("CIERRE"))) {
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
            System.out.println("⚠️ No se pudo inyectar la bitácora al reporte: " + ex.getMessage());
        }

        // 3. Orden cronológico descendente idéntico a la pantalla
        listaReporteMaster.sort((a, b) -> {
            Long idA = Long.parseLong(a.get("id").toString());
            Long idB = Long.parseLong(b.get("id").toString());
            return idB.compareTo(idA);
        });

        return listaReporteMaster;
    }
}