package com.web.restaurante.controller;

import com.web.restaurante.dto.facturacion.FacturaResponse;
import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.TurnoCajaRepository;
import com.web.restaurante.service.FacturacionService;
import com.web.restaurante.service.MesaService;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.TurnoCajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
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
    private final MesaService mesaService;
    private final TurnoCajaService turnoCajaService;
    private final TurnoCajaRepository turnoCajaRepository;
    private final PedidoRepository pedidoRepository;
    private final FacturacionService facturacionService;

    private LocalTime obtenerHoraActualSistema() {
        //return LocalTime.of(7, 45);

        // 🟩 ESCENARIO DE PRUEBA 2: Quita el comentario para simular que ya abrimos el restaurante
        //return LocalTime.of(8, 15);
        // Cuando pases el proyecto a producción, simplemente dejas esta línea:
        return LocalTime.now();
    }


    @GetMapping
    public String verCaja(Model model) {
        Optional<TurnoCaja> turnoOpt = turnoCajaService.obtenerTurnoActivo();
        LocalTime horaActual = obtenerHoraActualSistema();

        if (turnoOpt.isEmpty()) {
            model.addAttribute("montoSugerido", turnoCajaService.obtenerMontoAperturaSugerido());
            model.addAttribute("activeUri", "/admin/caja");

            // 🚨 EVALUACIÓN DE HORARIO ESTRICTO:
            if (horaActual.isBefore(LocalTime.of(8, 0))) {
                model.addAttribute("horarioBloqueado", true);
                model.addAttribute("horaAperturaPermitida", "08:00 AM");
                model.addAttribute("horaActualSimulada", horaActual.toString());
            } else {
                model.addAttribute("horarioBloqueado", false);
            }

            return "admin/caja_apertura"; // Te manda a la pantalla del botón de abrir
        }

        TurnoCaja turnoActivo = turnoOpt.get();
        List<MovimientoCaja> movimientos = turnoCajaService.obtenerMovimientosDelTurnoActivo();

        // Calcular saldos reales al vuelo protegiendo operaciones
        double totalVentas = movimientos.stream().filter(m -> "VENTA".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalIngresos = movimientos.stream().filter(m -> "INGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalEgresos = movimientos.stream().filter(m -> "EGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();

        // El saldo teórico suma ingresos (ventas/manuales) y resta egresos (guardados nativamente en negativo)
        double saldoTeorico = turnoActivo.getMontoApertura() + totalVentas + totalIngresos + totalEgresos;

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientos);
        model.addAttribute("saldoTeorico", saldoTeorico);

        // 🟩 OPERACIÓN CENTRAL: Recuperamos la lista de control para la primera pestaña (Bandeja Operativa)
        List<Pedido> pedidosParaCaja = pedidoService.listarPedidosPorCobrar();

        model.addAttribute("pedidos", pedidosParaCaja);
        model.addAttribute("pedidosDiario", pedidosParaCaja);

        model.addAttribute("pedidosPendientes", pedidoService.listarPendientesDeCarta());
        model.addAttribute("mesas", mesaService.obtenerMesasParaSalon());

        // 🚀 SEGUNDO CANDADO: Para cuando la caja ya está abierta y carga el panel principal
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
        // CORREGIDO: Enrutamiento semántico lícito del flujo monetario
        if ("INGRESO".equalsIgnoreCase(tipo)) {
            turnoCajaService.registrarVenta("Manual: " + concepto, Math.abs(monto));
        } else {
            turnoCajaService.registrarEgreso(concepto, monto);
        }
        return "redirect:/admin/caja?movimientoOk";
    }

    @PostMapping("/cerrar")
    public String cerrarCaja(@RequestParam Double montoCierre, @RequestParam(required = false) String observaciones) {

        // 🟩 PASO SEGURO DIRECTO A BASE DE DATOS (Bypass a la caché del Service)
        // Buscamos directamente en el repositorio mapeado si quedan registros en el limbo fiscal
        List<Pedido> pendientesDeTimbradoReal = pedidoRepository.findAll().stream()
                .filter(p -> com.web.restaurante.model.enums.EstadoPedido.PAGADO.equals(p.getEstado())
                        && (p.getComprobanteNumero() == null || p.getComprobanteNumero().isEmpty()))
                .toList();

        // Si la lista física en base de datos de verdad tiene elementos, rebotamos
        if (!pendientesDeTimbradoReal.isEmpty()) {
            return "redirect:/admin/caja?error=ComprobantesPendientes";
        }

        // Si está vacía de verdad, ejecutamos el cierre de caja limpio
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

    @PostMapping("/liquidar-servicio")
    public String liquidarServicioCompleto(@RequestParam Long pedidoId,
                                           @RequestParam Long mesaId,
                                           @RequestParam(required = false) List<Long> idsDetallesPagados,
                                           @RequestParam Double montoAPagar) {
        mesaService.procesarCobro(pedidoId, mesaId, idsDetallesPagados);
        Pedido pedido = pedidoService.obtenerPorId(pedidoId);

        String nroMesaStr = (pedido.getNumeroMesa() != null) ? String.valueOf(pedido.getNumeroMesa()) : "N/A";
        String concepto = "Cobro Orden #" + pedidoId + " - Mesa N° " + nroMesaStr;

        turnoCajaService.registrarVenta(concepto, montoAPagar);
        return "redirect:/admin/caja?success";
    }

    @GetMapping("/precuenta/{numeroMesa}") // CORREGIDO: Removido prefijo redundante anti-404
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
            response.put("montoPropina", 0.0);

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

    @PostMapping("/emitir-comprobante")
    public String emitirComprobanteFiscal(
            @RequestParam Long pedidoId,
            @RequestParam(required = false, defaultValue = "") String documento,
            @RequestParam String tipo) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        pedido.setPreferenciaComprobante(tipo);
        pedido.setDocumentoCliente(documento);

        // 🚀 MANDAMOS EL PEDIDO A MIAPI.CLOUD
        FacturaResponse.RespuestaData sunatResult = facturacionService.emitirComprobanteSunat(pedido);

        if (sunatResult != null && sunatResult.isSuccess()) {
            System.out.println("🔗 PDF A4: " + sunatResult.getPdfA4());
            System.out.println("🔗 PDF Ticket: " + sunatResult.getPdfTicket());
            System.out.println("🔗 XML Firmado: " + sunatResult.getXmlFirmado());

            pedido.setComprobanteNumero(String.valueOf(pedidoId));
            pedido.setComprobanteTipo(tipo);

            // 🟩 PERSISTENCIA PARALELA DE AMBOS FORMATOS FISCALES
            pedido.setComprobantePdfUrl(sunatResult.getPdfTicket()); // Ticket Térmico
            pedido.setComprobanteA4Url(sunatResult.getPdfA4());     // Hoja Estándar A4

            pedidoRepository.save(pedido);
            return "redirect:/admin/caja?param-success";
        } else {
            return "redirect:/admin/caja?error-sunat";
        }
    }

    @GetMapping("/anular-comprobante")
    public String anularComprobante(@RequestParam Long pedidoId) {
        try {
            Pedido ticket = pedidoService.obtenerPorId(pedidoId);
            if (ticket == null) return "redirect:/admin/caja?error=TicketNoEncontrado";

            // 🟩 LIMPIEZA ABSOLUTA: Reseteamos los campos fiscales y las rutas de los archivos
            ticket.setComprobanteTipo(null);
            ticket.setComprobanteNumero(null);
            ticket.setDocumentoCliente(null);
            ticket.setComprobantePdfUrl(null);
            ticket.setComprobanteA4Url(null);

            pedidoRepository.save(ticket);

            return "redirect:/admin/caja?anulacionExito";
        } catch (Exception e) {
            return "redirect:/admin/caja?error=ErrorProcesamiento";
        }
    }

    @GetMapping("/delivery/nuevo")
    public String nuevoDelivery(Model model) {
        return "admin/cajero_delivery";
    }

    // ── ENDPOINT ASÍNCRONO PARA EL HISTORIAL DE CAJAS POR RANGO DE FECHAS ──
    @GetMapping("/historial-datos")
    @ResponseBody
    public ResponseEntity<?> obtenerHistorialCajas(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fechaInicio,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fechaFin) {
        try {
            // Recuperamos todos los turnos cerrados
            List<TurnoCaja> turnos = turnoCajaRepository.findTurnosCerradosOrdenados();

            // Filtramos en memoria por el rango de fechas seleccionado por el usuario
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