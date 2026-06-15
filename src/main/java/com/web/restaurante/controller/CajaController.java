package com.web.restaurante.controller;

import com.web.restaurante.dto.facturacion.FacturaResponse;
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
    private EmailService emailService;

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

        // 🟩 BANDEJA OPERATIVA: Sigue filtrando solo lo que está por cobrar
        List<Pedido> pedidosParaCaja = pedidoService.listarPedidosPorCobrar();
        model.addAttribute("pedidos", pedidosParaCaja);

        // 🚀 REPARADO INTEGRAL PARA EL LIBRO DIARIO:
        // Cargamos absolutamente todos los pedidos para que los registros contables estables de la comanda
        // no se queden vacíos o desaparezcan al cambiar su estado a PAGADO.
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
        List<Pedido> pendientesDeTimbradoReal = pedidoRepository.findAll().stream()
                .filter(p -> com.web.restaurante.model.enums.EstadoPedido.PAGADO.equals(p.getEstado())
                        && (p.getComprobanteNumero() == null || p.getComprobanteNumero().isEmpty()))
                .toList();

        if (!pendientesDeTimbradoReal.isEmpty()) {
            return "redirect:/admin/caja?error=ComprobantesPendientes";
        }

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
        // 🚀 Cambia el estado del pedido a PAGADO y libera la mesa físicamente
        mesaService.procesarCobro(pedidoId, mesaId, idsDetallesPagados);

        // ⚙️ REMOVIDO: Ya no registramos el movimiento aquí de forma prematura.
        // Esto evita que aparezca en el Libro Diario antes de ser timbrado en SUNAT.

        return "redirect:/admin/caja?success";
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
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con ID: " + pedidoId));

        pedido.setPreferenciaComprobante(tipo);

        if (documento != null && !documento.trim().isEmpty()) {
            pedido.setDocumentoCliente(documento.trim());
        } else if (pedido.getDocumentoCliente() == null || pedido.getDocumentoCliente().trim().isEmpty()) {
            pedido.setDocumentoCliente("");
        }

        System.out.println("🪪 [AUDITORÍA SUNAT] Procesando Comprobante " + tipo + " para el Documento: " + pedido.getDocumentoCliente());

        FacturaResponse.RespuestaData sunatResult = facturacionService.emitirComprobanteSunat(pedido);

        if (sunatResult != null && sunatResult.isSuccess()) {
            pedido.setComprobanteNumero(String.valueOf(pedidoId));
            pedido.setComprobanteTipo(tipo);
            pedido.setComprobantePdfUrl(sunatResult.getPdfTicket());
            pedido.setComprobanteA4Url(sunatResult.getPdfA4());

            pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.PAGADO);
            pedidoRepository.save(pedido);

            /*
            if (pedido.getClienteCorreo() != null && !pedido.getClienteCorreo().isEmpty()) {
                emailService.enviarComprobante(pedido.getClienteCorreo(), pedido);
                System.out.println("📧 Correo de comprobante enviado con éxito a: " + pedido.getClienteCorreo());
            } */

            // ⚙️ UNIFICADO INTELIGENTE: Registra el asiento contable oficial en el Libro Diario
            // Funciona tanto para Delivery como para el Salón (LOCAL)
            String conceptoContable;
            if (com.web.restaurante.model.enums.TipoPedido.DELIVERY.equals(pedido.getTipoPedido())) {
                conceptoContable = "Venta Online de la Carta — Pedido #" + pedido.getId() + " (" + tipo + ")";
            } else {
                String nroMesaStr = (pedido.getNumeroMesa() != null) ? String.valueOf(pedido.getNumeroMesa()) : "N/A";
                conceptoContable = "Liquidación Comanda #" + pedido.getId() + " — Mesa N° " + nroMesaStr + " (" + tipo + ")";
            }

            double montoVenta = pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0;
            turnoCajaService.registrarVenta(conceptoContable, montoVenta);
            System.out.println("💰 [CAJA] Venta registrada en el libro diario de caja: S/ " + montoVenta);

            return "redirect:/admin/caja?param-success";
        } else {
            return "redirect:/admin/caja?error-sunat";
        }
    }

    @GetMapping("/anular-comprobante")
    public String anularComprobante(@RequestParam Long pedidoId) {
        try {
            Pedido ticket = pedidoRepository.findById(pedidoId)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

            // 1. Buscamos y purgamos el movimiento contable usando el ID único de la orden
            String coincidenciaId = "#" + ticket.getId();
            List<MovimientoCaja> movimientosTurno = turnoCajaService.obtenerMovimientosDelTurnoActivo();

            for (MovimientoCaja m : movimientosTurno) {
                if (m.getConcepto() != null && m.getConcepto().contains(coincidenciaId)) {
                    // Borrado físico seguro del asiento del Libro Diario
                    turnoCajaRepository.deleteMovimientoById(m.getId());
                }
            }

            // 2. Limpiamos los metadatos fiscales de la SUNAT
            ticket.setComprobanteTipo(null);
            ticket.setComprobanteNumero(null);
            ticket.setDocumentoCliente(null);
            ticket.setComprobantePdfUrl(null);
            ticket.setComprobanteA4Url(null);

            // 3. 🛡️ RECTIFICACIÓN LOGÍSTICA DE MESA:
            // Si el número de mesa es nulo, reconstruimos el número para que la bandeja no lo ignore
            if (ticket.getNumeroMesa() == null && ticket.getCliente() != null && ticket.getCliente().contains("Mesa")) {
                try {
                    String numeroExtraido = ticket.getCliente().replaceAll("[^0-9]", "").trim();
                    if (!numeroExtraido.isEmpty()) {
                        ticket.setNumeroMesa(Integer.parseInt(numeroExtraido));
                    }
                } catch (Exception ex) {
                    System.out.println("⚠️ Error al restaurar número de mesa: " + ex.getMessage());
                }
            }

            // 🚀 CORRECCIÓN CRUCIAL: Cambiamos el estado a PREPARADO y guardamos directamente
            // usando el repositorio inyectado en este controlador.
            ticket.setEstado(com.web.restaurante.model.enums.EstadoPedido.PREPARADO);
            pedidoRepository.save(ticket);

            // 🧼 Opcional: Si el repositorio tiene el query nativo, aseguramos la persistencia
            pedidoRepository.actualizarEstadoJPQL(ticket.getId(), com.web.restaurante.model.enums.EstadoPedido.PREPARADO);

            return "redirect:/admin/caja?anulacionExito";
        } catch (Exception e) {
            e.printStackTrace();
            return "redirect:/admin/caja?error=ErrorProcesamiento";
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