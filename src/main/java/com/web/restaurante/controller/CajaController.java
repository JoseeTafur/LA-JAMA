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

            //Turno Día (8AM - 6PM) | Turno Noche (7PM - 7AM)
            boolean horarioPermitido =
                    (horaActual.isAfter(LocalTime.of(8, 0)) && horaActual.isBefore(LocalTime.of(18, 0))) || // Guardia Día
                            (horaActual.isAfter(LocalTime.of(19, 0)) || horaActual.isBefore(LocalTime.of(7, 0)));   // Guardia Noche (Cruza medianoche)

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

        double totalVentas = movimientos.stream().filter(m -> "VENTA".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalIngresos = movimientos.stream().filter(m -> "INGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalEgresos = movimientos.stream().filter(m -> "EGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();

        double saldoTeorico = turnoActivo.getMontoApertura() + totalVentas + totalIngresos + totalEgresos;

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientos);
        model.addAttribute("saldoTeorico", saldoTeorico);

        List<Pedido> porCobrar = pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .filter(p -> p.getNumeroMesa() != null)
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream()
                        .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        List<Pedido> liquidados = pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PAGADO)
                .filter(p -> {
                    if (p.getFechaCreacion() == null || turnoActivo.getFechaApertura() == null) return false;
                    return p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura());
                })
                .sorted(Comparator.comparing(Pedido::getId).reversed())
                .collect(Collectors.toList());

        model.addAttribute("pedidosPorCobrar", porCobrar);
        model.addAttribute("pedidosLiquidados", liquidados);

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
    // 🚀 ENDPOINT RECEPTOR DE LIQUIDACIÓN MULTITICKET (RUTA RE-CALIBRADA)
    // ============================================================================
    @PostMapping("/api/mesas/comanda/liquidar-bloque-multiticket/{pedidoId}") // 🌟 CORREGIDO: Relativo al @RequestMapping base
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
            System.out.println("🎉 [CAJA MÓVIL] Transacción procesada con éxito en Base de Datos.");

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
            // 🎯 Sincronizamos la búsqueda: Trae la orden que tenga platos encima consumiéndose en este instante
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

            // Forzamos el recálculo dinámico matemático en caliente de los subtotales para auditoría
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
                        item.put("id", d.getId()); // 🌟 CRUCIAL: Identificador único del plato
                        item.put("cantidad", d.getCantidad());
                        item.put("canceladoPorCliente", d.isCanceladoPorCliente());
                        item.put("pagado", d.isPagado()); // 🌟 CRUCIAL: Estado contable real

                        // Estructuramos el producto para que JS no pierda la referencia
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

    @GetMapping("/ticket-venta/{pedidoId}")
    public String verTicketVenta(@PathVariable Long pedidoId, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(pedidoId);
        if (pedido == null) return "redirect:/admin/caja?error=not_found";

        model.addAttribute("pedido", pedido);

        // 🚀 MOTOR DE CONSOLIDACIÓN VISUAL PARA EL TICKET
        // Agrupamos los detalles activos por el ID del producto para unificar cantidades repetidas
        Collection<com.web.restaurante.model.DetallePedido> detallesAgrupados = pedido.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .collect(Collectors.toMap(
                        d -> d.getProducto().getId(), // Clave de agrupación: ID del producto
                        d -> {
                            // Creamos una copia temporal para no alterar la persistencia real de la BD
                            com.web.restaurante.model.DetallePedido copia = new com.web.restaurante.model.DetallePedido();
                            copia.setProducto(d.getProducto());
                            copia.setCantidad(d.getCantidad());
                            copia.setPrecioUnitario(d.getPrecioUnitario());
                            return copia;
                        },
                        (existente, nuevo) -> {
                            // Si el producto ya se mapeó, sumamos las cantidades en la visualización
                            existente.setCantidad(existente.getCantidad() + nuevo.getCantidad());
                            return existente;
                        }
                )).values();

        model.addAttribute("detalles", detallesAgrupados);
        return "admin/caja/ticket_venta";
    }
}