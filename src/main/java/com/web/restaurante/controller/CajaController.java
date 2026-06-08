package com.web.restaurante.controller;

import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.TurnoCaja;
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
        model.addAttribute("mesas", mesaService.obtenerMesasParaSalon()); // o el método que uses para traer tu lista de mesas

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
            // Reutiliza el helper transaccional mapeando la inyección manual
            turnoCajaService.registrarEgreso(concepto, -Math.abs(monto)); // Los egresos van en negativo
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

        // 1. Ejecutamos tu lógica multiticket premium en MesaService
        // Esto cambia los estados de los platos a PAGADO y libera la mesa si ya no quedan consumos
        mesaService.procesarCobro(pedidoId, mesaId, idsDetallesPagados);

        // 2. Recuperamos el pedido para armar un concepto de auditoría limpio
        // (Asegúrate de tener este método en tu pedidoService o usa tu repositorio)
        com.web.restaurante.model.Pedido pedido = pedidoService.obtenerPorId(pedidoId);

        String nroMesaStr = (pedido.getNumeroMesa() != null) ? String.valueOf(pedido.getNumeroMesa()) : "N/A";
        String concepto = "Cobro Orden #" + pedidoId + " - Mesa N° " + nroMesaStr;

        // 3. Impactamos el libro contable de la caja registradora en vivo
        turnoCajaService.registrarVenta(concepto, montoAPagar);

        // Redirigimos al dashboard con el parámetro de éxito para activar la notificación de AppUtils
        return "redirect:/admin/caja?success";
    }

    @GetMapping("/admin/mesas/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuentaMesaDebug(@PathVariable Integer numeroMesa) {
        System.out.println("\n===== 🐛 [DEBUGGER CAJA: EXTRACCIÓN DE CONSUMOS] =====");
        System.out.println("Buscando comanda activa para la Mesa N°: " + numeroMesa);

        try {
            // Buscamos el pedido activo de la mesa usando tu repositorio nativo
            // (Ajusta la llamada según la firma exacta de tu service/repository)
            List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesaAndEstado(
                    numeroMesa, com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);

            if (pedidosActivos.isEmpty()) {
                // Intento B: Si ya cambió de estado, buscar el primero que no esté pagado
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

            // 🌟 INGENIERÍA DE BLINDAJE CONSOLIDADORA CONTRA NULOS
            if (pedidoTarget.getListaDetalles() != null) {
                for (com.web.restaurante.model.DetallePedido d : pedidoTarget.getListaDetalles()) {
                    System.out.print(" -> Plato: " + (d.getProducto() != null ? d.getProducto().getNombre() : "Desconocido"));
                    System.out.print(" | Cantidad: " + d.getCantidad());
                    System.out.print(" | Precio U.: S/. " + d.getPrecioUnitario());

                    // Si el subtotal de la base de datos es NULL, el debugger lo repara al vuelo aquí mismo
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

            // 🎯 CORREGIDO: Usamos .put() en lugar de .add()
            Map<String, Object> response = new HashMap<>();
            response.put("id", pedido.getId());
            response.put("tipoPedido", pedido.getTipoPedido() != null ? pedido.getTipoPedido().name() : "LOCAL");
            response.put("numeroMesa", pedido.getNumeroMesa());
            response.put("montoTotal", pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0);

            // 💰 SOPORTE DE PROPINA AUTOMÁTICO:
            // Si tu entidad 'Pedido' ya tiene un campo para propina, cámbialo aquí.
            // Si aún no lo creas en tu entidad, el backend enviará 0.0 por defecto y no romperá tu JS.
            double propina = 0.0;
            /* try { propina = pedido.getMontoPropina() != null ? pedido.getMontoPropina() : 0.0; }
               catch(Exception e) {}
            */
            response.put("montoPropina", propina);

            // Estructura limpia para la lista de platos (Evita recursión infinita de JPA)
            List<Map<String, Object>> detallesDTO = pedido.getListaDetalles().stream()
                    .map(d -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("cantidad", d.getCantidad());
                        item.put("canceladoPorCliente", d.isCanceladoPorCliente());

                        // Aseguramos que jale el nombre del producto de forma segura
                        String nombrePlato = (d.getProducto() != null) ? d.getProducto().getNombre() : "Plato Desconocido";
                        item.put("producto", Map.of("nombre", nombrePlato));

                        // Calculamos el subtotal curado en memoria protegiendo nulos
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
            // 1. Recuperamos el pedido de la base de datos
            Pedido pedido = pedidoService.obtenerPorId(pedidoId);
            if (pedido == null) {
                return "redirect:/admin/caja?error=PedidoNoEncontrado";
            }

            // 2. Candado de seguridad: Evitar doble emisión si ya tiene número asignado
            if (pedido.getComprobanteNumero() != null) {
                return "redirect:/admin/caja?error=YaFacturado";
            }

            // 3. Simulación de Correlativo Oficial
            // Generamos un número aleatorio simulando el formato de serie de la SUNAT
            // Ej: B001-0001245 para Boletas o F001-0004512 para Facturas
            String prefijo = "BOLETA".equalsIgnoreCase(tipo) ? "B001-" : "F001-";
            int numeroAleatorio = (int) (Math.random() * 90000) + 10000;
            String correlativoSimulado = prefijo + numeroAleatorio;

            // 4. Inyectamos los datos fiscales en la entidad
            pedido.setComprobanteTipo(tipo.toUpperCase());
            pedido.setComprobanteNumero(correlativoSimulado);
            pedido.setDocumentoCliente(documento != null && !documento.isBlank() ? documento : "CLIENTE VARIOS");

            // 5. Guardamos los cambios usando tu repositorio inyectado
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

            // 1. Simulación o disparo de Nota de Crédito legal ante SUNAT
            System.out.println("⚠️ Anulando " + ticket.getComprobanteTipo() + " " + ticket.getComprobanteNumero());

            // 2. Liberamos los campos fiscales para permitir la refacturación express
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


}