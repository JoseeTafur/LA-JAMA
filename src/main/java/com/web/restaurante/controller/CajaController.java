package com.web.restaurante.controller;

import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.TurnoCajaRepository;
import com.web.restaurante.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

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

            if (horaActual.isBefore(LocalTime.of(8, 0))) {
                model.addAttribute("horarioBloqueado", true);
                model.addAttribute("horaAperturaPermitida", "08:00 AM");
                model.addAttribute("horaActualSimulada", horaActual.toString());
            } else {
                model.addAttribute("horarioBloqueado", false);
            }

            return "admin/caja_apertura";
        }

        TurnoCaja turnoActivo = turnoOpt.get();
        List<MovimientoCaja> movimientos = turnoCajaService.obtenerMovimientosDelTurnoActivo();

        double totalVentas = movimientos.stream().filter(m -> "VENTA".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalIngresos = movimientos.stream().filter(m -> "INGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalEgresos = movimientos.stream().filter(m -> "EGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();

        double saldoTeorico = turnoActivo.getMontoApertura() + totalVentas + totalIngresos + totalEgresos;

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientos);
        model.addAttribute("saldoTeorico", saldoTeorico);

        // BANDEJA OPERATIVA INTERNA: Listamos los pedidos listos para cobrar internamente
        List<Pedido> pedidosParaCaja = pedidoService.listarPedidosPorCobrar();
        model.addAttribute("pedidos", pedidosParaCaja);

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
        // Purgamos la aduana de timbrado. Ahora el turno se cierra directamente validando las ventas operativas.
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

    // ============================================================================
    // 🚀 NUEVO ENDPOINT RECEPTOR DE LIQUIDACIÓN MULTITICKET (CONEXIÓN CERRADA)
    // ============================================================================
    @PostMapping("/admin/mesas/comanda/liquidar-bloque-multiticket/{pedidoId}")
    @ResponseBody
    public ResponseEntity<?> liquidarMesaBloqueMultiticket(
            @PathVariable Long pedidoId,
            @RequestParam Long mesaId,
            @RequestParam String matrizTickets,
            @RequestParam(required = false) String idsDetallesPagados) {
        try {
            System.out.println("🛰️ [CAJA MÓVIL] Recibiendo Matriz de Pago para Comanda #" + pedidoId);

            // 1. Convertimos el String de IDs pagados a una lista de Longs segura
            List<Long> idsDetalles = new ArrayList<>();
            if (idsDetallesPagados != null && !idsDetallesPagados.trim().isEmpty()) {
                for (String idStr : idsDetallesPagados.split(",")) {
                    idsDetalles.add(Long.parseLong(idStr.trim()));
                }
            }

            // 2. Mapeamos la matriz de tickets JSON usando Jackson a objetos TicketDTO de forma manual
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<com.web.restaurante.dto.mesas.TicketDTO> listaTickets = mapper.readValue(
                    matrizTickets,
                    new com.fasterxml.jackson.core.type.TypeReference<List<com.web.restaurante.dto.mesas.TicketDTO>>() {}
            );

            // 3. Invocamos tu servicio contable transaccional de Spring
            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, idsDetalles);
            System.out.println("🎉 [CAJA MÓVIL] Transacción procesada con éxito en Base de Datos.");

            return ResponseEntity.ok("Mesa liquidada operativamente");

        } catch (Exception e) {
            System.err.println("💥 ERROR EN ADUANA MULTITICKET: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Error al procesar la liquidación en bloque: " + e.getMessage());
        }
    }

    @GetMapping("/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuentaMesaDebug(@PathVariable Integer numeroMesa) {
        try {
            List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesaAndEstado(
                    numeroMesa, com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);

            if (pedidosActivos.isEmpty()) {
                pedidosActivos = pedidoRepository.findByNumeroMesa(numeroMesa).stream()
                        .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO)
                        .collect(Collectors.toList());
            }

            if (pedidosActivos.isEmpty()) {
                return ResponseEntity.badRequest().body("No hay comanda activa para esta mesa.");
            }

            Pedido pedidoTarget = pedidosActivos.get(0);

            if (pedidoTarget.getListaDetalles() != null) {
                for (com.web.restaurante.model.DetallePedido d : pedidoTarget.getListaDetalles()) {
                    if (d.getSubtotal() == null || d.getSubtotal() == 0) {
                        double subtotalCalculado = d.getCantidad() * (d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0);
                        d.setSubtotal(subtotalCalculado);
                    }
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
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/delivery/nuevo")
    public String nuevoDelivery(Model model) {
        return "admin/cajero_delivery";
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
}