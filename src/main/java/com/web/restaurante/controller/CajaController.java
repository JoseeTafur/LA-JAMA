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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin/caja")
@RequiredArgsConstructor
public class CajaController {

    private final CajaService cajaService;
    private final NotaVentaSequenceService notaVentaSequenceService;
    private final PedidoService pedidoService;
    private final MesaService mesaService;
    private final TurnoCajaService turnoCajaService;
    private final TurnoCajaRepository turnoCajaRepository;
    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;

    @GetMapping
    public String verCaja(Model model) {
        Optional<TurnoCaja> turnoOpt = turnoCajaService.obtenerTurnoActivo();
        LocalTime horaActual = LocalTime.now();

        if (turnoOpt.isEmpty()) {
            model.addAttribute("montoSugerido", turnoCajaService.obtenerMontoAperturaSugerido());
            model.addAttribute("activeUri", "/admin/caja");

            if (!cajaService.esHorarioPermitido(horaActual)) {
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

        // 🧠 DELEGAMOS TODA LA LÓGICA AL CAJA_SERVICE
        Map<String, Object> metricas = cajaService.calcularMetricasDashboard(turnoActivo, movimientos);
        model.addAllAttributes(metricas);

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientos);
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
    public String registrarMovimientoManual(@RequestParam String tipo, @RequestParam String concepto, @RequestParam Double monto) {
        // 🚨 CANDADO CONTABLE INTERNO: Validar que los egresos no dejen la caja en negativo
        if ("EGRESO".equalsIgnoreCase(tipo)) {
            Optional<TurnoCaja> turnoOpt = turnoCajaService.obtenerTurnoActivo();
            if (turnoOpt.isPresent()) {
                List<MovimientoCaja> movimientos = turnoCajaService.obtenerMovimientosDelTurnoActivo();
                Map<String, Object> metricas = cajaService.calcularMetricasDashboard(turnoOpt.get(), movimientos);
                Double efectivoEsperado = (Double) metricas.get("efectivoEsperado");

                if (monto > efectivoEsperado) {
                    return "redirect:/admin/caja?errorEgresoInvalido&disponible=" + String.format("%.2f", efectivoEsperado);
                }
            }
            turnoCajaService.registrarEgreso(concepto, monto);
        } else if ("INGRESO".equalsIgnoreCase(tipo)) {
            // 🔥 CORRECCIÓN: Usamos el nuevo método nativo de ingresos
            turnoCajaService.registrarIngresoManual("Manual: " + concepto, Math.abs(monto));
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
        cajaService.aprobarYAsignarNotaVentaWeb(id);
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
            @PathVariable Long pedidoId, @RequestParam Long mesaId,
            @RequestParam String matrizTickets, @RequestParam(required = false) String idsDetallesPagados) {
        try {
            List<Long> idsDetalles = new ArrayList<>();
            if (idsDetallesPagados != null && !idsDetallesPagados.trim().isEmpty()) {
                for (String idStr : idsDetallesPagados.split(",")) idsDetalles.add(Long.parseLong(idStr.trim()));
            }

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<com.web.restaurante.dto.mesas.TicketDTO> listaTickets = mapper.readValue(
                    matrizTickets, new com.fasterxml.jackson.core.type.TypeReference<>() {}
            );

            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, idsDetalles);
            return ResponseEntity.ok(Map.of("success", true, "message", "Mesa liquidada"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error liquidación: " + e.getMessage());
        }
    }

    @GetMapping("/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuentaMesaDebug(@PathVariable Integer numeroMesa) {
        try {
            List<Pedido> pedidosActivos = pedidoRepository.findAll().stream()
                    .filter(p -> p.getNumeroMesa() != null && p.getNumeroMesa().equals(numeroMesa))
                    .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.PAGADO && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                    .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream().anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado()))
                    .collect(Collectors.toList());

            if (pedidosActivos.isEmpty()) return ResponseEntity.badRequest().body("No hay comanda activa.");

            Pedido pedidoTarget = pedidosActivos.get(0);
            if (pedidoTarget.getListaDetalles() != null) {
                for (DetallePedido d : pedidoTarget.getListaDetalles()) d.setSubtotal((d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0) * d.getCantidad());
            }
            return ResponseEntity.ok(pedidoTarget);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
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

            // 🚀 CORRECCIÓN: Si el tipo de pedido existe mandamos su nombre original, sino usamos LLEVAR como precaución de mostrador
            response.put("tipoPedido", pedido.getTipoPedido() != null ? pedido.getTipoPedido().name() : "LLEVAR");

            response.put("numeroMesa", pedido.getNumeroMesa());
            response.put("montoTotal", pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0);

            List<Map<String, Object>> detallesDTO = pedido.getListaDetalles().stream().map(d -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id", d.getId());
                item.put("node_num", d.getCantidad()); // Mantener compatibilidad si usas componentes
                item.put("cantidad", d.getCantidad());
                item.put("canceladoPorCliente", d.isCanceladoPorCliente());
                item.put("pagado", d.isPagado());
                item.put("productoId", d.getProducto() != null ? d.getProducto().getId() : 0);

                Map<String, Object> productoInfo = new HashMap<>();
                productoInfo.put("id", d.getProducto() != null ? d.getProducto().getId() : 0);
                productoInfo.put("nombre", d.getProducto() != null ? d.getProducto().getNombre() : "Desconocido");
                item.put("producto", productoInfo);

                item.put("subtotal", (d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0) * d.getCantidad());
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
        List<Producto> productosCarta = productoRepository.findByEstado(1);
        model.addAttribute("productos", productosCarta);

        List<Categoria> listaCategorias = productosCarta.stream().map(Producto::getCategoria).filter(Objects::nonNull).distinct().collect(Collectors.toList());
        model.addAttribute("categorias", listaCategorias);
        model.addAttribute("productosAgotados", new HashMap<Long, Boolean>());
        return "admin/cajero_delivery";
    }

    @PostMapping("/delivery/guardar")
    @ResponseBody
    public ResponseEntity<?> guardarPedidoCajeroDirecto(@RequestBody Pedido pedido) {
        try {
            Pedido pedidoGuardado = cajaService.guardarVentaDirectaPOS(pedido);
            return ResponseEntity.ok(Map.of("success", true, "message", "Comprobante emitido.", "id", pedidoGuardado.getId()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/historial-datos")
    @ResponseBody
    public ResponseEntity<?> obtenerHistorialCajas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        try {
            List<Map<String, Object>> mapeoHistorial = turnoCajaRepository.findTurnosCerradosOrdenados().stream()
                    .filter(t -> t.getFechaApertura() != null && !t.getFechaApertura().toLocalDate().isBefore(fechaInicio) && !t.getFechaApertura().toLocalDate().isAfter(fechaFin))
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
                    }).collect(Collectors.toList());
            return ResponseEntity.ok(mapeoHistorial);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/ticket-venta/{pedidoId}")
    public String verTicketVenta(@PathVariable Long pedidoId, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(pedidoId);
        if (pedido == null) return "redirect:/admin/caja?error=not_found";

        Collection<DetallePedido> detallesAgrupados = pedido.getListaDetalles().stream().filter(d -> !d.isCanceladoPorCliente())
                .collect(Collectors.toMap(d -> d.getProducto().getId(), d -> {
                    DetallePedido copia = new DetallePedido();
                    copia.setProducto(d.getProducto());
                    copia.setCantidad(d.getCantidad());
                    copia.setPrecioUnitario(d.getPrecioUnitario());
                    return copia;
                }, (existente, nuevo) -> {
                    existente.setCantidad(existente.getCantidad() + nuevo.getCantidad());
                    return existente;
                })).values();

        model.addAttribute("pedido", pedido);
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
            Pageable pageable = PageRequest.of(pagina, 20);
            return ResponseEntity.ok(cajaService.obtenerHistorialComprobantesPaginado(inicio, fin, pageable));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}