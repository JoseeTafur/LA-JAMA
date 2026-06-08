package com.web.restaurante.controller;

import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.repository.MovimientoCajaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.service.MesaService;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.TurnoCajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin/caja")
@RequiredArgsConstructor
public class CajaController {

    private final PedidoService pedidoService;
    private final MesaService mesaService; // 🌟 Inyectamos tu ingeniería de mesas
    private final TurnoCajaService turnoCajaService;
    private final PedidoRepository pedidoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;

    @GetMapping
    public String verCaja(Model model) {
        Optional<TurnoCaja> turnoOpt = turnoCajaService.obtenerTurnoActivo();

        // ── CANDADO DE APERTURA ──
        if (turnoOpt.isEmpty()) {
            model.addAttribute("montoSugerido", turnoCajaService.obtenerMontoAperturaSugerido());
            return "admin/caja_apertura";
        }

        TurnoCaja turnoActivo = turnoOpt.get();
        List<MovimientoCaja> movimientos = turnoCajaService.obtenerMovimientosDelTurnoActivo();

        // Calcular saldos al vuelo para el dashboard de recaudación
        double totalVentas = movimientos.stream().filter(m -> "VENTA".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalIngresos = movimientos.stream().filter(m -> "INGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalEgresos = movimientos.stream().filter(m -> "EGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double saldoTeorico = turnoActivo.getMontoApertura() + totalVentas + totalIngresos + totalEgresos;

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientos);
        model.addAttribute("saldoTeorico", saldoTeorico);

        List<Pedido> pedidosParaCaja = pedidoService.listarPedidosPorCobrar();
        model.addAttribute("pedidos", pedidosParaCaja);
        model.addAttribute("pedidosPendientes", pedidoService.listarPendientesDeCarta());

        // 🌟 LA LÍNEA QUE FALTABA: Enviamos las mesas al ecosistema visual de Thymeleaf
        model.addAttribute("mesas", mesaService.obtenerMesasParaSalon());

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
            turnoCajaService.registrarEgreso(concepto, -Math.abs(monto));
        } else {
            turnoCajaService.registrarEgreso(concepto, monto);
        }
        return "redirect:/admin/caja?movimientoOk";
    }

    @PostMapping("/cerrar")
    public String cerrarCaja(@RequestParam Double montoCierre, @RequestParam(required = false) String observaciones) {
        turnoCajaService.cerrarTurno(montoCierre, observaciones);
        return "redirect:/admin/caja";
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

    @PostMapping("/liquidar-servicio")
    public String liquidarServicioCompleto(@RequestParam Long pedidoId,
                                           @RequestParam Long mesaId,
                                           @RequestParam(required = false) List<Long> idsDetallesPagados,
                                           @RequestParam Double montoAPagar) {

        mesaService.procesarCobro(pedidoId, mesaId, idsDetallesPagados);

        com.web.restaurante.model.Pedido pedido = pedidoService.obtenerPorId(pedidoId);

        String nroMesaStr = (pedido.getNumeroMesa() != null) ? String.valueOf(pedido.getNumeroMesa()) : "N/A";
        String concepto = "Cobro Orden #" + pedidoId + " - Mesa N° " + nroMesaStr;

        turnoCajaService.registrarVenta(concepto, montoAPagar);

        return "redirect:/admin/caja?success";
    }

    @GetMapping("/admin/mesas/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuentaMesaDebug(@PathVariable Integer numeroMesa) {
        System.out.println("\n===== 🐛 [DEBUGGER CAJA: EXTRACCIÓN DE CONSUMOS] =====");
        System.out.println("Buscando comanda activa para la Mesa N°: " + numeroMesa);

        try {
            List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesaAndEstado(
                    numeroMesa, com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);

            if (pedidosActivos.isEmpty()) {
                pedidosActivos = pedidoRepository.findByNumeroMesa(numeroMesa).stream()
                        .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO)
                        .collect(java.util.stream.Collectors.toList());
            }

            if (pedidosActivos.isEmpty()) {
                System.out.println("❌ ERROR: No se encontró ningún pedido activo en BD para la mesa " + numeroMesa);
                return ResponseEntity.badRequest().body("No hay comanda activa para esta mesa.");
            }

            Pedido pedidoTarget = pedidosActivos.get(0);
            System.out.println("📦 Pedido ID #" + pedidoTarget.getId() + " recuperado con éxito.");
            System.out.println("📊 Cantidad de platos en la comanda: " +
                    (pedidoTarget.getListaDetalles() != null ? pedidoTarget.getListaDetalles().size() : 0));

            if (pedidoTarget.getListaDetalles() != null) {
                for (com.web.restaurante.model.DetallePedido d : pedidoTarget.getListaDetalles()) {
                    System.out.print(" -> Plato: " + (d.getProducto() != null ? d.getProducto().getNombre() : "Desconocido"));
                    System.out.print(" | Cantidad: " + d.getCantidad());
                    System.out.print(" | Precio U.: S/. " + d.getPrecioUnitario());

                    if (d.getSubtotal() == null || d.getSubtotal() == 0) {
                        double subtotalCalculado = d.getCantidad() * (d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0);
                        d.setSubtotal(subtotalCalculado);
                        System.out.print(" | 🚨 REPARADO NULL -> Nuevo Subtotal: S/. " + subtotalCalculado);
                    } else {
                        System.out.print(" | Subtotal: S/. " + d.getSubtotal());
                    }
                    System.out.println(" | ¿Pagado?: " + d.isPagado());
                }
            }

            System.out.println("===== 🐛 [FIN DE LOGS DEBUGGER CAJA] =====\n");
            return ResponseEntity.ok(pedidoTarget);

        } catch (Exception e) {
            System.out.println("💥 COLAPSO EN DEBUGGER: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error interno: " + e.getMessage());
        }
    }

    @GetMapping("/api/pedido/{id}")
    @ResponseBody
    public ResponseEntity<?> obtenerDetallesParaAuditoria(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(id);
            if (pedido == null) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id", pedido.getId());
            response.put("tipoPedido", pedido.getTipoPedido() != null ? pedido.getTipoPedido().name() : "LOCAL");
            response.put("numeroMesa", pedido.getNumeroMesa());
            response.put("montoTotal", pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0);

            double propina = 0.0;
            response.put("montoPropina", propina);

            List<Map<String, Object>> detallesDTO = pedido.getListaDetalles().stream()
                    .map(d -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("cantidad", d.getCantidad());
                        item.put("canceladoPorCliente", d.isCanceladoPorCliente());

                        String nombrePlato = (d.getProducto() != null) ? d.getProducto().getNombre() : "Plato Desconocido";
                        item.put("producto", Map.of("nombre", nombrePlato));

                        double precio = d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0;
                        item.put("subtotal", precio * d.getCantidad());

                        return item;
                    }).collect(Collectors.toList());

            response.put("detalles", detallesDTO);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("💥 ERROR EN ENDPOINT AUDITORÍA: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error interno: " + e.getMessage());
        }
    }

    @PostMapping("/emitir-comprobante")
    public String emitirComprobante(@RequestParam Long pedidoId,
                                    @RequestParam String tipo,
                                    @RequestParam(required = false) String documento) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(pedidoId);
            if (pedido == null) {
                return "redirect:/admin/caja?error=PedidoNoEncontrado";
            }

            if (pedido.getComprobanteNumero() != null) {
                return "redirect:/admin/caja?error=YaFacturado";
            }

            String prefijo = "BOLETA".equalsIgnoreCase(tipo) ? "B001-" : "F001-";
            int numeroAleatorio = (int) (Math.random() * 90000) + 10000;
            String correlativoSimulado = prefijo + numeroAleatorio;

            pedido.setComprobanteTipo(tipo.toUpperCase());
            pedido.setComprobanteNumero(correlativoSimulado);
            pedido.setDocumentoCliente(documento != null && !documento.isBlank() ? documento : "CLIENTE VARIOS");

            pedidoRepository.save(pedido);

            return "redirect:/admin/caja?comprobanteOk";
        } catch (Exception e) {
            System.out.println("💥 ERROR AL EMITIR COMPROBANTE: " + e.getMessage());
            e.printStackTrace();
            return "redirect:/admin/caja?error=InternalError";
        }
    }

    @GetMapping("/admin/caja/anular-comprobante")
    public String anularComprobante(@RequestParam Long pedidoId) {
        try {
            Pedido ticket = pedidoService.obtenerPorId(pedidoId);
            if (ticket == null) {
                return "redirect:/admin/caja?error=TicketNoEncontrado";
            }

            System.out.println("⚠️ Anulando " + ticket.getComprobanteTipo() + " " + ticket.getComprobanteNumero());

            ticket.setComprobanteTipo(null);
            ticket.setComprobanteNumero(null);
            ticket.setDocumentoCliente(null);

            pedidoRepository.save(ticket);

            return "redirect:/admin/caja?anulacionExito";
        } catch (Exception e) {
            System.out.println("💥 Error en anulación: " + e.getMessage());
            return "redirect:/admin/caja?error=ErrorProcesamiento";
        }
    }

    // ── HISTORIAL ─────────────────────────────────────────────────────────────

    @GetMapping("/historial")
    public String verHistorial(Model model) {
        List<TurnoCaja> turnos = new java.util.ArrayList<>(turnoCajaService.obtenerTurnosCerrados());

        // Agregar turno activo si existe
        turnoCajaService.obtenerTurnoActivo().ifPresent(turnoActivo -> {
            List<MovimientoCaja> movs = turnoCajaService.obtenerMovimientosPorTurno(turnoActivo.getId());
            double totalVendidoActivo = movs.stream()
                    .filter(m -> "VENTA".equals(m.getTipo()))
                    .mapToDouble(MovimientoCaja::getMonto).sum();
            turnoActivo.setTotalVendido(totalVendidoActivo);
            turnos.add(0, turnoActivo);
        });

        double totalVendido = turnos.stream().mapToDouble(t -> t.getTotalVendido() != null ? t.getTotalVendido() : 0.0).sum();
        double promedio = turnos.isEmpty() ? 0.0 : totalVendido / turnos.size();
        model.addAttribute("turnos", turnos);
        model.addAttribute("totalVendidoHistorico", totalVendido);
        model.addAttribute("promedioPorTurno", promedio);
        return "admin/caja_historial";
    }

    @GetMapping("/historial/{turnoId}/movimientos")
    @ResponseBody
    public ResponseEntity<List<MovimientoCaja>> movimientosPorTurno(@PathVariable Long turnoId) {
        return ResponseEntity.ok(turnoCajaService.obtenerMovimientosPorTurno(turnoId));
    }

    @GetMapping("/historial/ventas")
    @ResponseBody
    public ResponseEntity<List<MovimientoCaja>> todasLasVentas() {
        return ResponseEntity.ok(movimientoCajaRepository.findByTipoOrderByFechaDesc("VENTA"));
    }

}