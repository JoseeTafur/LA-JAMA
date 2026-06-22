package com.web.restaurante.controller;

import com.web.restaurante.model.*;
import com.web.restaurante.repository.*;
import com.web.restaurante.service.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin/caja")
@RequiredArgsConstructor
public class CajaController {

    private final PedidoService pedidoService;
    private final MesaService mesaService;
    private final TurnoCajaService turnoCajaService;
    private final TurnoCajaRepository turnoCajaRepository;
    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;
    private final InsumoProductoRepository insumoProductoRepository;

    private LocalTime obtenerHoraActualSistema() {
        return LocalTime.now();
    }

    @GetMapping
    public String verCaja(Model model) {
        Optional<TurnoCaja> turnoOpt = turnoCajaService.obtenerTurnoActivo();
        LocalTime horaActual = obtenerHoraActualSistema();

        if (turnoOpt.isEmpty()) {
            model.addAttribute("montoSugerido", turnoCajaService.obtenerMontoAperturaSugerido());
            model.addAttribute("activeUri", "/admin/caja");

            boolean horarioPermitido =
                    (horaActual.isAfter(LocalTime.of(8, 0)) && horaActual.isBefore(LocalTime.of(18, 0))) ||
                            (horaActual.isAfter(LocalTime.of(19, 0)) || horaActual.isBefore(LocalTime.of(7, 0)));

            if (!horarioPermitido) {
                model.addAttribute("horarioBloqueado", true);
                model.addAttribute("horaAperturaPermitida", "08:00 AM o 07:00 PM");
                model.addAttribute("horaActualSimulada", horaActual.toString());
            } else {
                model.addAttribute("horarioBloqueado", false);
            }

            return "admin/caja_apertura";
        }

        TurnoCaja turnoActivo = turnoOpt.get();
        List<MovimientoCaja> movimientos = turnoCajaService.obtenerMovimientosDelTurnoActivo();

        // ── 💵 PESTAÑA 2: HISTORIAL DEL TURNO (PROCESADO ANTICIPADO PARA KPI) ──
        List<Pedido> liquidados = pedidoRepository.findAll().stream()
                .filter(p -> {
                    // 🚀 ADUANA POS: Si no tiene mesa, es un pedido directo de caja que ya se cobró en caliente (nace liquidado)
                    boolean pagoConfirmado = (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO) || (p.getNumeroMesa() == null);
                    boolean cartaCobradaAnticipada = (p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PENDIENTE
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            && p.getNumeroMesa() == null);

                    // 🚀 ADUANA CRÍTICA: Si el estado es ANULADO, se expulsa de la matemática de KPIs
                    boolean noEstaAnulado = (p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.ANULADO);

                    return (pagoConfirmado || cartaCobradaAnticipada) && noEstaAnulado;
                })
                .filter(p -> {
                    if (p.getFechaCreacion() == null || turnoActivo.getFechaApertura() == null) return false;
                    return p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura());
                })
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // ── 📊 NUEVO STREAM: HISTORIAL COMPLETO PARA LA TABLA VISUAL (INCLUYE ANULADOS) ──
        List<Pedido> pedidosHistorialVisual = pedidoRepository.findAll().stream()
                .filter(p -> {
                    if (p.getFechaCreacion() == null || turnoActivo.getFechaApertura() == null) return false;
                    return p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura());
                })
                .filter(p -> p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO
                        || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ANULADO
                        || p.getNumeroMesa() == null) // 🚀 ADUANA POS: Se inyecta directo a la visualización del historial
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        // ── 📊 CLASIFICACIÓN DE FLUJOS POR MEDIO FINANCIERO TRADICIONAL (LA JAMA) ──
        double ventasEfectivo = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.EFECTIVO)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0)
                .sum();

        double totalIngresosManuales = movimientos.stream()
                .filter(m -> "INGRESO".equals(m.getTipo()) || ("VENTA".equals(m.getTipo()) && m.getConcepto() != null && m.getConcepto().toUpperCase().contains("VUELTO")))
                .mapToDouble(MovimientoCaja::getMonto)
                .sum();

        double totalEgresos = movimientos.stream()
                .filter(m -> "EGRESO".equals(m.getTipo()))
                .mapToDouble(MovimientoCaja::getMonto)
                .sum();

        // El saldo en efectivo esperado suma el dinero real de gaveta (Ya resta los anulados automáticamente)
        double efectivoEsperadoTotal = turnoActivo.getMontoApertura() + ventasEfectivo + totalIngresosManuales + totalEgresos;

        // Canales digitales directos al banco (Ya restan los anulados automáticamente)
        double yapePlinEsperado = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.YAPE || p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.PLIN)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0)
                .sum();

        double tarjetaEsperada = liquidados.stream()
                .filter(p -> p.getMetodoPago() == com.web.restaurante.model.enums.MetodoPago.TARJETA)
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0)
                .sum();

        double totalVentasPedidos = liquidados.stream()
                .mapToDouble(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0)
                .sum();

        double saldoTeoricoGlobal = turnoActivo.getMontoApertura() + totalVentasPedidos + totalIngresosManuales + totalEgresos;

        // ── 👤 PESTAÑA 3: FILTRADO QUIRÚRGICO DE OPERACIONES MANUALES DE BOTÓN ──
        List<MovimientoCaja> movimientosExclusivosCajero = movimientos.stream()
                .filter(m -> {
                    String concepto = m.getConcepto() != null ? m.getConcepto().toUpperCase() : "";

                    if (concepto.contains("FONDO INICIAL") ||
                            concepto.contains("LIQUIDACIÓN") ||
                            concepto.contains("LIQUIDACION") ||
                            concepto.contains("CARTA QR") ||
                            concepto.contains("VENTA POS DIRECTO") || // ◄ Excluye Lomo Saltado/Bebidas cobradas en mostrador
                            concepto.contains("ORDEN #")) {          // ◄ Filtro failsafe de respaldo por ID de orden
                        return false;
                    }

                    return true;
                })
                .sorted(Comparator.comparing(MovimientoCaja::getId).reversed())
                .collect(Collectors.toList());

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientos);
        model.addAttribute("todosLosMovimientosCaja", movimientosExclusivosCajero);
        model.addAttribute("saldoTeorico", saldoTeoricoGlobal);
        model.addAttribute("totalVentasCalculado", totalVentasPedidos + totalIngresosManuales);

        // Sub-métricas inyectadas para precisión
        model.addAttribute("efectivoEsperado", efectivoEsperadoTotal);
        model.addAttribute("yapePlinEsperado", yapePlinEsperado);
        model.addAttribute("tarjetaEsperada", tarjetaEsperada);

        // ── 🍽️ PESTAÑA 1: COMANDAS VIVAS POR COBRAR (SALÓN NO PAGADO) ──
        List<Pedido> porCobrar = pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PENDIENTE
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .filter(p -> p.getNumeroMesa() != null) // 🚀 ADUANA POS: Forzamos que solo lo de salón con mesa física ingrese aquí
                .filter(p -> p.isTicketImpresoCocina())
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream()
                        .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        System.out.println("📥 [AUDITORÍA FINANCIERA] Ventas: S/. " + totalVentasPedidos + " | Efectivo Gaveta: S/. " + efectivoEsperadoTotal);

        model.addAttribute("pedidosPorCobrar", porCobrar);
        model.addAttribute("pedidosLiquidados", pedidosHistorialVisual);

        List<Pedido> todosLosPedidosHistorial = pedidoRepository.findAll();
        model.addAttribute("pedidosDiario", todosLosPedidosHistorial);
        model.addAttribute("pedidosPendientes", pedidoService.listarPendientesDeCarta());
        model.addAttribute("mesas", mesaService.obtenerMesasParaSalon());
        model.addAttribute("activeUri", "/admin/caja");

        return "admin/caja";
    }

    @PostMapping("/abrir")
    public String abrirCaja(@RequestParam Double montoApertura) {
        turnoCajaService.abrirTurno(montoApertura);
        return "redirect:/admin/caja";
    }

    @PostMapping("/movimiento")
    public String registrarMovimientoManual(@RequestParam String tipo,
                                            @RequestParam String concepto,
                                            @RequestParam Double monto) {
        if ("INGRESO".equalsIgnoreCase(tipo)) {
            turnoCajaService.registrarVenta("Manual: " + concepto, Math.abs(monto));
        } else {
            turnoCajaService.registrarEgreso(concepto, monto);
        }
        return "redirect:/admin/caja?movimientoOk";
    }

    @PostMapping("/cerrar")
    public String cerrarCaja(@RequestParam Double montoCierre, @RequestParam(required = false) String observaciones) {
        turnoCajaService.cerrarTurno(montoCierre, observaciones);
        return "redirect:/admin/caja?cierreOk";
    }

    @PostMapping("/aprobar/{id}")
    public String aprobarPedido(@PathVariable Long id) {
        pedidoService.aprobarPedidoACocina(id);
        return "redirect:/admin/caja?aprobado";
    }

    @PostMapping("/rechazar/{id}")
    public String rechazarPedido(@PathVariable Long id) {
        pedidoService.actualizarEstadoPedido(id, com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
        return "redirect:/admin/caja?rechazado";
    }

    @PostMapping("/api/mesas/comanda/liquidar-bloque-multiticket/{pedidoId}")
    @ResponseBody
    public ResponseEntity<?> liquidarMesaBloqueMultiticket(
            @PathVariable Long pedidoId,
            @RequestParam Long mesaId,
            @RequestParam String matrizTickets,
            @RequestParam(required = false) String idsDetallesPagados) {
        try {
            System.out.println("🛰️ [CAJA MÓVIL] Recibiendo Matriz de Pago para Comanda #" + pedidoId);

            List<Long> idsDetalles = new ArrayList<>();
            if (idsDetallesPagados != null && !idsDetallesPagados.trim().isEmpty()) {
                for (String idStr : idsDetallesPagados.split(",")) {
                    idsDetalles.add(Long.parseLong(idStr.trim()));
                }
            }

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<com.web.restaurante.dto.mesas.TicketDTO> listaTickets = mapper.readValue(
                    matrizTickets,
                    new com.fasterxml.jackson.core.type.TypeReference<List<com.web.restaurante.dto.mesas.TicketDTO>>() {}
            );

            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, idsDetalles);
            return ResponseEntity.ok(Map.of("success", true, "message", "Mesa liquidada operatively"));

        } catch (Exception e) {
            System.err.println("💥 ERROR EN ADUANA MULTITICKET: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Error al procesar la liquidación en bloque: " + e.getMessage());
        }
    }

    @GetMapping("/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuentaMesaDebug(@PathVariable Integer numeroMesa) {
        try {
            List<Pedido> pedidosActivos = pedidoRepository.findAll().stream()
                    .filter(p -> p.getNumeroMesa() != null && p.getNumeroMesa().equals(numeroMesa))
                    .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                    .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream()
                            .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                    .collect(Collectors.toList());

            if (pedidosActivos.isEmpty()) {
                return ResponseEntity.badRequest().body("No hay comanda activa para esta mesa con platos pendientes.");
            }

            Pedido pedidoTarget = pedidosActivos.get(0);

            if (pedidoTarget.getListaDetalles() != null) {
                for (com.web.restaurante.model.DetallePedido d : pedidoTarget.getListaDetalles()) {
                    double precio = d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0;
                    d.setSubtotal(precio * d.getCantidad());
                }
            }
            return ResponseEntity.ok(pedidoTarget);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error interno: " + e.getMessage());
        }
    }

    @GetMapping("/api/pedido/{id}")
    @ResponseBody
    public ResponseEntity<?> obtenerDetallesParaAuditoria(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(id);
            if (pedido == null) return ResponseEntity.notFound().build();

            Map<String, Object> response = new HashMap<>();
            response.put("id", pedido.getId());
            response.put("tipoPedido", pedido.getTipoPedido() != null ? pedido.getTipoPedido().name() : "LOCAL");
            response.put("numeroMesa", pedido.getNumeroMesa());
            response.put("montoTotal", pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0);

            List<Map<String, Object>> detallesDTO = pedido.getListaDetalles().stream()
                    .map(d -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", d.getId());
                        item.put("cantidad", d.getCantidad());
                        item.put("canceladoPorCliente", d.isCanceladoPorCliente());
                        item.put("pagado", d.isPagado());

                        Map<String, Object> productoInfo = new HashMap<>();
                        if (d.getProducto() != null) {
                            productoInfo.put("id", d.getProducto().getId());
                            productoInfo.put("nombre", d.getProducto().getNombre());
                        } else {
                            productoInfo.put("id", 0);
                            productoInfo.put("nombre", "Plato Desconocido");
                        }
                        item.put("producto", productoInfo);
                        item.put("productoId", d.getProducto() != null ? d.getProducto().getId() : 0);

                        double precio = d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0;
                        item.put("subtotal", precio * d.getCantidad());
                        return item;
                    }).collect(Collectors.toList());

            response.put("detalles", detallesDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/delivery/nuevo")
    public String nuevoDelivery(Model model) {
        model.addAttribute("activeUri", "/admin/caja/delivery/nuevo");

        // 1. Extraer los platos/productos que están activos en la carta (estado = 1)
        List<Producto> productosCarta = productoRepository.findByEstado(1);
        model.addAttribute("productos", productosCarta);

        // 2. Mapear las categorías reales asociadas sin duplicados (Usando la entidad Categoria)
        List<com.web.restaurante.model.Categoria> listaCategorias = productosCarta.stream()
                .map(Producto::getCategoria)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        model.addAttribute("categorias", listaCategorias);

        // 3. Mapa de control de stock preventivo para evitar excepciones en las tarjetas
        model.addAttribute("productosAgotados", new HashMap<Long, Boolean>());

        return "admin/cajero_delivery";
    }

    @PostMapping("/delivery/guardar")
    @ResponseBody
    @Transactional
    public ResponseEntity<?> guardarPedidoCajeroDirecto(@RequestBody Pedido pedido, jakarta.servlet.http.HttpSession session) {
        try {
            // 1. Forzar parámetros estructurales de despacho inmediato para cocina
            pedido.setFechaCreacion(LocalDateTime.now());
            pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
            pedido.setTicketImpresoCocina(false);

            if (pedido.getListaDetalles() != null) {
                for (DetallePedido detalle : pedido.getListaDetalles()) {

                    // Buscamos la receta del producto para levantar el escudo virtual
                    insumoProductoRepository.findByProductoId(detalle.getProducto().getId()).forEach(ip -> {
                        if (ip.getInsumo() != null) {
                            Insumo insumo = ip.getInsumo();
                            double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
                            double totalAComprometer = cantidadUsada * detalle.getCantidad();

                            // Sumamos la reserva al escudo virtual
                            double actualComprometido = (insumo.getStockComprometido() != null) ? insumo.getStockComprometido() : 0.0;
                            insumo.setStockComprometido(actualComprometido + totalAComprometer);
                        }
                    });

                }
            }

            // Guardamos el pedido y sus detalles limpiamente en la base de datos
            // Esto enviará la orden de forma reactiva al monitor de cocina fría o caliente
            Pedido pedidoGuardado = pedidoRepository.save(pedido);

            // 💵 2. ARQUITECTURA FINANCIERA: Asentar el movimiento monetario en el turno de caja activo
            if (pedidoGuardado.getMontoTotal() != null && pedidoGuardado.getMontoTotal() > 0) {
                String conceptoCpe = "Venta POS Directo (" + pedidoGuardado.getMetodoPago() + ") - Orden #" + pedidoGuardado.getId();
                turnoCajaService.registrarVenta(conceptoCpe, pedidoGuardado.getMontoTotal());
                System.out.println("💰 [Caja POS] Transacción asentada directamente en el turno diario: S/. " + pedidoGuardado.getMontoTotal());
            }

            // Retornamos el objeto limpio mapeado para que el JavaScript limpie los inputs asíncronamente
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Comprobante emitido y enviado a producción de cocina exitosamente.",
                    "id", pedidoGuardado.getId()
            ));

        } catch (Exception e) {
            System.err.println("💥 Fallo en liquidación de caja directa: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/historial-datos")
    @ResponseBody
    public ResponseEntity<?> obtenerHistorialCajas(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fechaInicio,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fechaFin) {
        try {
            List<TurnoCaja> turnos = turnoCajaRepository.findTurnosCerradosOrdenados();

            List<Map<String, Object>> mapeoHistorial = turnos.stream()
                    .filter(t -> {
                        if (t.getFechaApertura() == null) return false;
                        java.time.LocalDate fApertura = t.getFechaApertura().toLocalDate();
                        return (!fApertura.isBefore(fechaInicio) && !fApertura.isAfter(fechaFin));
                    })
                    .map(t -> {
                        Map<String, Object> dto = new HashMap<>();
                        dto.put("id", t.getId());
                        dto.put("fechaApertura", t.getFechaApertura() != null ? t.getFechaApertura().toString() : "N/A");
                        dto.put("fechaCierre", t.getFechaCierre() != null ? t.getFechaCierre().toString() : "N/A");
                        dto.put("montoApertura", t.getMontoApertura());
                        dto.put("montoCierre", t.getMontoCierre() != null ? t.getMontoCierre() : 0.0);
                        dto.put("totalVendido", t.getTotalVendido() != null ? t.getTotalVendido() : 0.0);
                        dto.put("diferencia", t.getDiferencia() != null ? t.getDiferencia() : 0.0);
                        dto.put("observaciones", t.getObservaciones() != null ? t.getObservaciones() : "");
                        return dto;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(mapeoHistorial);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al extraer historial: " + e.getMessage());
        }
    }

    @GetMapping("/ticket-venta/{pedidoId}")
    public String verTicketVenta(@PathVariable Long pedidoId, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(pedidoId);
        if (pedido == null) return "redirect:/admin/caja?error=not_found";

        model.addAttribute("pedido", pedido);

        Collection<com.web.restaurante.model.DetallePedido> detallesAgrupados = pedido.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .collect(Collectors.toMap(
                        d -> d.getProducto().getId(),
                        d -> {
                            com.web.restaurante.model.DetallePedido copia = new com.web.restaurante.model.DetallePedido();
                            copia.setProducto(d.getProducto());
                            copia.setCantidad(d.getCantidad());
                            copia.setPrecioUnitario(d.getPrecioUnitario());
                            return copia;
                        },
                        (existente, nuevo) -> {
                            existente.setCantidad(existente.getCantidad() + nuevo.getCantidad());
                            return existente;
                        }
                )).values();

        model.addAttribute("detalles", detallesAgrupados);
        return "admin/caja/ticket_venta";
    }

    @GetMapping("/historial-comprobantes")
    @ResponseBody
    public ResponseEntity<?> obtenerHistorialComprobantes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(defaultValue = "0") int pagina) {
        try {
            System.out.println("🛰️ [AUDITORÍA HISTÓRICA] Consultando rango: " + inicio + " hasta " + fin + " | Página: " + pagina);

            // Limitamos a 20 registros por página para proteger la RAM de Railway
            Pageable pageable = PageRequest.of(pagina, 20);
            Page<Pedido> pageResult = pedidoRepository.findHistorialNotasVenta(inicio, fin, pageable);

            List<Map<String, Object>> listaDTO = pageResult.getContent().stream().map(p -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", p.getId());
                dto.put("tipoServicio", p.getTipoPedido() != null ? p.getTipoPedido().name() : "LOCAL");
                dto.put("cliente", p.getCliente() != null ? p.getCliente() : "Cliente General");
                dto.put("mesa", p.getNumeroMesa());
                dto.put("metodoPago", p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");
                dto.put("fecha", p.getFechaCreacion() != null ? p.getFechaCreacion().toLocalDate().toString() : "N/A");
                dto.put("hora", p.getFechaCreacion() != null ? p.getFechaCreacion().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : "N/A");
                dto.put("monto", p.getMontoTotal() != null ? p.getMontoTotal() : 0.0);
                dto.put("estado", p.getEstado().name());
                return dto;
            }).collect(Collectors.toList());

            Map<String, Object> respuestaJson = new HashMap<>();
            respuestaJson.put("comprobantes", listaDTO);
            respuestaJson.put("paginaActual", pageResult.getNumber());
            respuestaJson.put("totalPaginas", pageResult.getTotalPages());
            respuestaJson.put("totalElementos", pageResult.getTotalElements());

            return ResponseEntity.ok(respuestaJson);
        } catch (Exception e) {
            System.err.println("💥 Error en extractor histórico: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Error al extraer bitácora: " + e.getMessage());
        }
    }
}