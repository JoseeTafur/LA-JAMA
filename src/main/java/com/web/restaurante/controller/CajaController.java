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
import java.time.LocalDateTime;
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
    private final MesaRepository mesaRepository;

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
    public String cerrarCaja(@RequestParam Double montoCierre,
                             @RequestParam(required = false) String observaciones,
                             jakarta.servlet.http.HttpSession session,
                             Model model) {

        // 1. Recuperamos las credenciales directamente de la aduana de sesión
        Usuario usuarioLogueado = (Usuario) session.getAttribute("usuarioLogueado");
        String rol = (String) session.getAttribute("rol");
        String turno = (String) session.getAttribute("empleadoTurno"); // Inyectado dinámicamente

        // Failsafe preventivo: si por alguna razón la sesión expiró
        if (usuarioLogueado == null || rol == null) {
            return "redirect:/login?error=sesion_expirada";
        }

        // 2. 🛡️ EXCEPCIÓN DE RANGO: Si es ADMIN o SUPER_ADMIN, se salta cualquier bloqueo de hora
        if ("ADMIN".equals(rol) || "SUPER_ADMIN".equals(rol)) {
            turnoCajaService.cerrarTurno(montoCierre, observaciones);
            return "redirect:/admin/caja?cierreOk";
        }

        // 3. VALIDACIÓN HORARIA ESTRICTA PARA PERSONAL DE CAJA
        LocalTime horaActual = LocalTime.now();
        boolean fueraDeHorario = false;
        String mensajeError = "";

        if ("DIA".equalsIgnoreCase(turno)) {
            // El Turno Día solo puede cerrar a partir de las 06:00 PM (18:00)
            if (horaActual.isBefore(LocalTime.of(18, 0))) {
                fueraDeHorario = true;
                mensajeError = "No puedes cerrar la caja antes de finalizar tu turno (Hora permitida: desde las 06:00 PM).";
            }
        } else if ("NOCHE".equalsIgnoreCase(turno)) {
            // El Turno Noche solo puede cerrar a partir de las 07:00 AM (07:00) hasta la tarde
            // Validamos que no intente cerrar a mitad de la madrugada (ej: entre las 7pm y las 6:59am)
            if (horaActual.isAfter(LocalTime.of(19, 0)) || horaActual.isBefore(LocalTime.of(7, 0))) {
                fueraDeHorario = true;
                mensajeError = "No puedes cerrar la caja antes de finalizar tu turno (Hora permitida: desde las 07:00 AM del día siguiente).";
            }
        }

        if (fueraDeHorario) {
            // Rebotamos el flujo al panel de caja con un flag de error controlado
            return "redirect:/admin/caja?errorCierreTurno&msg=" + java.net.URLEncoder.encode(mensajeError, java.nio.charset.StandardCharsets.UTF_8);
        }

        // Si pasó todas las aduanas contables, se procede a la clausura del turno
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

            // 1. Ejecutamos la liquidación nativa (Genera el pedido histórico y las notas de venta clonadas)
            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, idsDetalles);

            // 2. 🛡️ REPARACIÓN POST-LIQUIDACIÓN ANTI-NULL:
            // Buscamos si en este microsegundo se crearon Notas de Venta huérfanas en la mesa y les inyectamos el turno 7
            try {
                turnoCajaService.obtenerTurnoActivo().ifPresent(turnoActivo -> {
                    // Buscamos el número de mesa afectado
                    mesaRepository.findById(mesaId).ifPresent(mesa -> {
                        // Buscamos los pedidos recién creados como PAGADO para esa mesa que no tengan turno asignado
                        List<Pedido> notasVentaHuerfanas = pedidoRepository.findByNumeroMesaAndEstado(mesa.getNumero(), com.web.restaurante.model.enums.EstadoPedido.PAGADO)
                                .stream()
                                .filter(p -> p.getTurnoCaja() == null)
                                .collect(Collectors.toList());

                        for (Pedido nv : notasVentaHuerfanas) {
                            nv.setTurnoCaja(turnoActivo);
                            pedidoRepository.save(nv); // Forzamos el guardado definitivo con el turno correcto
                            System.out.println("🚀 [ESCUDO CONTABLE] Nota de Venta #" + nv.getId() + " interceptada y asociada con éxito al turno: " + turnoActivo.getId());
                        }
                    });
                });
            } catch (Exception ex) {
                System.out.println("⚠️ [ALERTA] No se pudo realizar el barrido anti-null en las notas de venta clonadas: " + ex.getMessage());
            }

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
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(defaultValue = "TODOS") String turno) {
        try {
            // 1. Inicializamos las fronteras del tiempo operativo
            LocalDateTime horaInicioCalculada = fechaInicio.atTime(8, 0); // Por defecto inicia a las 08:00 AM
            LocalDateTime horaFinCalculada = fechaFin.atTime(23, 59, 59);

            // 2. Ajustamos la aduana de tiempo según el turno seleccionado
            if ("DIA".equalsIgnoreCase(turno)) {
                horaInicioCalculada = fechaInicio.atTime(8, 0);       // 08:00 AM
                horaFinCalculada = fechaFin.atTime(18, 0);           // 06:00 PM
            } else if ("NOCHE".equalsIgnoreCase(turno)) {
                horaInicioCalculada = fechaInicio.atTime(19, 0);      // 07:00 PM
                // El turno noche muere a las 07:00 AM del DÍA SIGUIENTE
                horaFinCalculada = fechaFin.plusDays(1).atTime(7, 0);
            } else if ("TODOS".equalsIgnoreCase(turno)) {
                // Si son todos, cubrimos desde la apertura del primer día hasta el cierre de la última noche
                horaInicioCalculada = fechaInicio.atTime(8, 0);
                horaFinCalculada = fechaFin.plusDays(1).atTime(7, 0);
            }

            // 3. Ejecutamos la consulta contable en la base de datos
            List<TurnoCaja> turnosFiltrados = turnoCajaRepository.findTurnosCerradosEnRangoHorario(horaInicioCalculada, horaFinCalculada);

            List<Map<String, Object>> mapeoHistorial = turnosFiltrados.stream()
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

                        // Inyectamos un flag indicando al frontend matemáticamente a qué turno perteneció
                        int horaApertura = t.getFechaApertura().getHour();
                        dto.put("turnoCalculado", (horaApertura >= 8 && horaApertura < 18) ? "DÍA" : "NOCHE");

                        return dto;
                    }).collect(Collectors.toList());

            return ResponseEntity.ok(mapeoHistorial);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error en matriz de filtros: " + e.getMessage());
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
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(required = false) String metodoPago,
            @RequestParam(required = false) String tipoServicio,
            @RequestParam(required = false) String turno) {
        try {
            Pageable pageable = PageRequest.of(pagina, 20);

            // 1. Inicializamos los límites cronológicos del query operativo (LocalDateTime)
            LocalDateTime horaInicioCalculada = inicio.atTime(8, 0); // Apertura habitual 08:00 AM
            LocalDateTime horaFinCalculada = fin.atTime(23, 59, 59); // Fin del día por defecto

            // 2. Aplicamos el escudo de transnoción de La Jama según el Turno comercial
            if ("DIA".equalsIgnoreCase(turno)) {
                horaInicioCalculada = inicio.atTime(8, 0);       // 08:00 AM
                horaFinCalculada = fin.atTime(18, 0);           // 06:00 PM
            } else if ("NOCHE".equalsIgnoreCase(turno)) {
                horaInicioCalculada = inicio.atTime(19, 0);      // 07:00 PM
                horaFinCalculada = fin.plusDays(1).atTime(7, 0); // 07:00 AM del día siguiente
            } else if ("TODOS".equalsIgnoreCase(turno) || turno == null || turno.trim().isEmpty()) {
                horaInicioCalculada = inicio.atTime(8, 0);
                horaFinCalculada = fin.plusDays(1).atTime(7, 0);
            }

            String metodoFinal = (metodoPago != null && !metodoPago.trim().isEmpty()) ? metodoPago.trim().toUpperCase() : null;
            String servicioFinal = (tipoServicio != null && !tipoServicio.trim().isEmpty()) ? tipoServicio.trim().toUpperCase() : null;

            Map<String, Object> respuestaMapeada = cajaService.obtenerHistorialComprobantesFiltrosAvanzados(
                    horaInicioCalculada,
                    horaFinCalculada,
                    metodoFinal,
                    servicioFinal,
                    turno,
                    pageable
            );

            return ResponseEntity.ok(respuestaMapeada);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error en filtrado master de comprobantes: " + e.getMessage());
        }
    }
}