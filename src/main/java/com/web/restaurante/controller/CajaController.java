package com.web.restaurante.controller;

import com.web.restaurante.model.*;
import com.web.restaurante.model.enums.EstadoPago;
import com.web.restaurante.model.enums.TipoMovimientoCaja;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;

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
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final CierreCajaSequenceService cierreCajaSequenceService;

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
        List<MovimientoCaja> movimientosCrudos = turnoCajaService.obtenerMovimientosDelTurnoActivo();

        Map<String, Object> metricas = cajaService.calcularMetricasDashboard(turnoActivo, movimientosCrudos);
        model.addAllAttributes(metricas);

        List<Map<String, Object>> movimientosBitacoraLimpia = new ArrayList<>();

        for (MovimientoCaja m : movimientosCrudos) {
            if (m == null) continue;

            TipoMovimientoCaja tipoEnum = m.getTipo() != null ? m.getTipo() : TipoMovimientoCaja.INGRESO_MANUAL;
            String conceptoCrudo = m.getConcepto() != null ? m.getConcepto() : "";
            String conceptoUpper = conceptoCrudo.toUpperCase();

            boolean esMovimientoOperativoOculto =
                    conceptoUpper.contains("LIQUIDACIÓN") ||
                            conceptoUpper.contains("LIQUIDACION") ||
                            conceptoUpper.contains("EXTORNO") ||
                            tipoEnum == TipoMovimientoCaja.INGRESO_VENTA;

            if (!esMovimientoOperativoOculto) {
                Map<String, Object> mMov = new HashMap<>();
                mMov.put("id", m.getId());
                mMov.put("comprobante", m.getComprobante() != null ? m.getComprobante() : "M-" + m.getId());

                if (tipoEnum == TipoMovimientoCaja.APERTURA) {
                    mMov.put("tipo", "APERTURA");
                    mMov.put("concepto", "Fondo inicial");
                } else if (tipoEnum == TipoMovimientoCaja.CIERRE) {
                    mMov.put("tipo", "CIERRE");
                    mMov.put("concepto", "Cierre de caja");
                } else {
                    mMov.put("tipo", tipoEnum.getGrupoMacro());
                    mMov.put("concepto", conceptoCrudo.startsWith("Manual: ") ? conceptoCrudo.substring(8) : conceptoCrudo);
                }

                mMov.put("monto", Math.abs(m.getMonto()));

                LocalDateTime fechaMov = m.getFecha() != null ? m.getFecha() : LocalDateTime.now();
                mMov.put("hora", fechaMov.toLocalTime().toString().substring(0, 5));
                mMov.put("fechaHoraOrden", fechaMov.toString());
                mMov.put("origen", "👤 HISTÓRICO");

                movimientosBitacoraLimpia.add(mMov);
            }
        }

        movimientosBitacoraLimpia.sort((a, b) -> {
            Long idA = Long.parseLong(a.get("id").toString());
            Long idB = Long.parseLong(b.get("id").toString());
            return idB.compareTo(idA);
        });

        model.addAttribute("turno", turnoActivo);
        model.addAttribute("movimientos", movimientosBitacoraLimpia);

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

            // ── 🛡️ ESCUDO DE RESPALDO PARA EL MESERO (ANTI MONTO EN CERO) ──
            // Si el terminal del mesero envió los IDs vacíos por problemas de escaneo del DOM,
            // el propio servidor se auto-abastece recuperando todos los detalles activos sin pagar del pedido padre.
            if (idsDetalles.isEmpty()) {
                pedidoRepository.findById(pedidoId).ifPresent(p -> {
                    if (p.getListaDetalles() != null) {
                        for (DetallePedido d : p.getListaDetalles()) {
                            if (!d.isCanceladoPorCliente() && !d.isPagado()) {
                                idsDetalles.add(d.getId());
                            }
                        }
                    }
                });
            }

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<com.web.restaurante.dto.mesas.TicketDTO> listaTickets = mapper.readValue(
                    matrizTickets, new com.fasterxml.jackson.core.type.TypeReference<>() {}
            );

            // 1. Ejecutamos la liquidación nativa del sistema
            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, idsDetalles);

            // 2. 🛡️ BARRIDO CONTABLE POST-LIQUIDACIÓN BLINDADO: FORZAR NÚMERO DE MESA Y PRECIO
            try {
                // Obtenemos el número real de la mesa directamente desde el repositorio
                Integer numeroMesaReal = mesaRepository.findById(mesaId)
                        .map(Mesa::getNumero).orElse(null);

                turnoCajaService.obtenerTurnoActivo().ifPresent(turnoActivo -> {
                    // Jalamos el monto original de la comanda de la mesa como resguardo de seguridad
                    double montoOriginalMesa = pedidoRepository.findById(pedidoId)
                            .map(p -> p.getMontoTotal() != null ? p.getMontoTotal() : 0.0).orElse(0.0);

                    // Buscamos las Notas de Venta recién creadas que pertenezcan a este turno
                    List<Pedido> notasVentaPorCorregir = pedidoRepository.findAll().stream()
                            .filter(p -> p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.PAGADO || p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.PAGADO)
                            .filter(p -> p.getTurnoCaja() == null || p.getMontoTotal() == null || p.getMontoTotal() <= 0.0 || p.getNumeroMesa() == null)
                            .collect(Collectors.toList());

                    for (Pedido nv : notasVentaPorCorregir) {
                        // Amarramos el turno operativo activo si le faltaba
                        if (nv.getTurnoCaja() == null) {
                            nv.setTurnoCaja(turnoActivo);
                        }

                        // Forzamos el origen de salón si llegó huérfano
                        if (nv.getTipoPedido() == null) {
                            nv.setTipoPedido(com.web.restaurante.model.enums.TipoPedido.SALON);
                        }

                        // 🎯 FORZADO SEGURO DEL NÚMERO DE MESA
                        if (nv.getNumeroMesa() == null && numeroMesaReal != null) {
                            nv.setNumeroMesa(numeroMesaReal);
                            System.out.println("🛡️ [LA JAMA SHIELD] Forzando Mesa #" + numeroMesaReal + " a la NV ID: " + nv.getId());
                        }

                        // El candado financiero del monto por si acaso
                        if (nv.getMontoTotal() == null || nv.getMontoTotal() <= 0.0) {
                            double totalCalculado = 0.0;
                            if (nv.getListaDetalles() != null && !nv.getListaDetalles().isEmpty()) {
                                totalCalculado = nv.getListaDetalles().stream()
                                        .filter(d -> !d.isCanceladoPorCliente())
                                        .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : (d.getPrecioUnitario() != null ? d.getPrecioUnitario() * d.getCantidad() : 0.0))
                                        .sum();
                            }
                            if (totalCalculado <= 0.0) {
                                totalCalculado = montoOriginalMesa;
                            }
                            nv.setMontoTotal(totalCalculado);
                        }

                        pedidoRepository.save(nv);
                    }
                });
            } catch (Exception ex) {
                System.out.println("⚠️ No se pudo realizar el barrido contable de seguridad: " + ex.getMessage());
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Mesa liquidada con metadatos corregidos"));
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
                    .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                    .filter(p -> {
                        // 🍔 REGLA DE ADUANA DE CONTROL OPERATIVO:
                        // Verificamos si al pedido aún le faltan platos físicos por despachar al cliente
                        boolean tienePlatosPendientesDeEntrega = p.getListaDetalles() != null &&
                                p.getListaDetalles().stream().anyMatch(d -> !d.isCanceladoPorCliente() && !d.isEntregado());

                        // Caso A: El pedido sigue debiendo dinero (Flujo tradicional)
                        if (p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO) {
                            return true;
                        }

                        // Caso B: El pedido ya se pagó en caja (Prepago), pero la comida sigue activa en producción.
                        // Debe seguir pintándose dentro del modal de la mesa.
                        return tienePlatosPendientesDeEntrega;
                    })
                    .collect(Collectors.toList());

            if (pedidosActivos.isEmpty()) {
                return ResponseEntity.badRequest().body("No hay comanda activa.");
            }

            Pedido pedidoTarget = pedidosActivos.get(0);
            if (pedidoTarget.getListaDetalles() != null) {
                for (DetallePedido d : pedidoTarget.getListaDetalles()) {
                    d.setSubtotal((d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0) * d.getCantidad());
                }
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

            // 🛡️ ADUANA ANTI-NULL Y ANTI-TILDES DE BASE DE DATOS
            com.web.restaurante.model.enums.TipoPedido tipo = pedido.getTipoPedido();
            boolean tieneMesaFisica = pedido.getNumeroMesa() != null && pedido.getNumeroMesa() > 0;

            String tipoServicioFinal = "LLEVAR";
            String canalFinal = "Virtual";

            if (tipo == com.web.restaurante.model.enums.TipoPedido.SALON || tieneMesaFisica) {
                tipoServicioFinal = "SALON";
                canalFinal = "Presencial";
            } else if (tipo == com.web.restaurante.model.enums.TipoPedido.DELIVERY) {
                tipoServicioFinal = "DELIVERY";
                canalFinal = "Virtual";
            }

            // Inyectamos las propiedades limpias que espera leer tu JS y tus Modales
            response.put("tipoPedido", tipoServicioFinal);
            response.put("canal", canalFinal);
            response.put("numeroMesa", pedido.getNumeroMesa());
            double totalCalculadoDetalles = 0.0;

            if (pedido.getListaDetalles() != null) {
                totalCalculadoDetalles = pedido.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .mapToDouble(d -> {
                            double precio = d.getPrecioUnitario() != null ? d.getPrecioUnitario() : 0.0;
                            int cantidad = d.getCantidad() != null ? d.getCantidad() : 0;
                            double subtotal = d.getSubtotal() != null ? d.getSubtotal() : precio * cantidad;
                            return subtotal;
                        })
                        .sum();
            }

            double montoSeguro = pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0;

            if (montoSeguro <= 0 && totalCalculadoDetalles > 0) {
                montoSeguro = totalCalculadoDetalles;
            }

            response.put("montoTotal", montoSeguro);

            List<Map<String, Object>> detallesDTO = pedido.getListaDetalles().stream().map(d -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id", d.getId());
                item.put("node_num", d.getCantidad());
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
            // 1. Guardamos la orden con la lógica limpia libre de comprometidos
            Pedido pedidoGuardado = cajaService.guardarDeliveryManualCajero(pedido);

            // 2. 🛰️ RÁFAGA WEBSOCKET REACTIVA:
            // Notificamos al monitor de cocina de forma inmediata sin exigir F5 en la pantalla del chef
            try {
                messagingTemplate.convertAndSend("/topic/cocina", "{\"pedidoId\":" + pedidoGuardado.getId() + ", \"status\":\"NUEVO\"}");
                System.out.println("🛰️ [La Jama STOMP] Alerta enviada a cocina para el Delivery Manual #" + pedidoGuardado.getId());
            } catch (Exception wsEx) {
                System.err.println("⚠️ Alerta asíncrona de WebSocket demorada temporalmente: " + wsEx.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Delivery enviado directamente a cocina con Nota de Venta " + pedidoGuardado.getComprobanteNotaNumero(),
                    "id", pedidoGuardado.getId()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
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

    @GetMapping("/historial-datos")
    @ResponseBody
    public ResponseEntity<?> obtenerHistorialDatos(
            @RequestParam("fechaInicio") String fechaInicio,
            @RequestParam("fechaFin") String fechaFin,
            @RequestParam(value = "turno", defaultValue = "TODOS") String turno) {
        try {
            LocalDate inicio = LocalDate.parse(fechaInicio);
            LocalDate fin = LocalDate.parse(fechaFin);

            LocalDateTime inicioDT = inicio.atStartOfDay();
            LocalDateTime finDT = fin.atTime(LocalTime.MAX);

            // 1. Extraemos los turnos en orden cronológico ascendente (el más antiguo primero)
            List<TurnoCaja> turnos = turnoCajaRepository.findTurnosCerradosEnRangoHorario(inicioDT, finDT).stream()
                    .sorted(Comparator.comparing(TurnoCaja::getId))
                    .collect(Collectors.toList());

            List<Map<String, Object>> respuestaFiltradaPrevia = new ArrayList<>();
            final String turnoFiltroUpper = (turno != null) ? turno.toUpperCase().trim() : "TODOS";

            // 2. Filtramos primero los turnos que calzan con el criterio de búsqueda
            for (TurnoCaja t : turnos) {
                if (t == null) continue;

                String turnoCalculado = (t.getTipoTurno() != null) ? t.getTipoTurno().toUpperCase().trim() : "DIA";
                if ("DIA".equals(turnoCalculado)) {
                    turnoCalculado = "DÍA";
                }

                if (!"TODOS".equalsIgnoreCase(turnoFiltroUpper) && !turnoCalculado.equalsIgnoreCase(turnoFiltroUpper)) {
                    continue;
                }

                Map<String, Object> dto = new HashMap<>();
                // Guardamos temporalmente los datos
                dto.put("objetoOriginal", t);
                dto.put("turnoCalculado", turnoCalculado);
                respuestaFiltradaPrevia.add(dto);
            }

            // 3. 🎯 ENUMERACIÓN DE SECUENCIA: Asignamos el correlativo incremental (1, 2, 3...)
            List<Map<String, Object>> respuestaFinalCronologica = new ArrayList<>();
            int correlativoSecuencia = 1;

            for (Map<String, Object> itemPre : respuestaFiltradaPrevia) {
                TurnoCaja t = (TurnoCaja) itemPre.get("objetoOriginal");

                Map<String, Object> dtoFinal = new HashMap<>();

                // REGLA DE SECUENCIA: Reemplazamos el ID nativo por el contador ordenado de aperturas
                dtoFinal.put("id", correlativoSecuencia++);

                dtoFinal.put("turnoCalculado", itemPre.get("turnoCalculado"));
                dtoFinal.put("fechaApertura", t.getFechaApertura() != null ? t.getFechaApertura().toString() : "");
                dtoFinal.put("fechaCierre", t.getFechaCierre() != null ? t.getFechaCierre().toString() : "null");
                dtoFinal.put("montoApertura", t.getMontoApertura() != null ? t.getMontoApertura() : 0.0);
                dtoFinal.put("totalVendido", t.getTotalVendido() != null ? t.getTotalVendido() : 0.0);
                dtoFinal.put("montoCierre", t.getMontoCierre() != null ? t.getMontoCierre() : 0.0);
                dtoFinal.put("diferencia", t.getDiferencia() != null ? t.getDiferencia() : 0.0);
                dtoFinal.put("observaciones", t.getObservaciones() != null ? t.getObservaciones() : "");

                respuestaFinalCronologica.add(dtoFinal);
            }

            // 4. Invertimos el orden final para que el arqueo más reciente salga ARRIBA en tu tabla
            Collections.reverse(respuestaFinalCronologica);

            return ResponseEntity.ok(respuestaFinalCronologica);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error al procesar la secuencia de turnos cerrados: " + e.getMessage());
        }
    }

    @GetMapping("/historial-comprobantes")
    @ResponseBody
    public ResponseEntity<?> obtenerHistorialComprobantes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(required = false) String metodoPago,
            @RequestParam(required = false) String tipoServicio,
            @RequestParam(required = false) String turno,
            @RequestParam(required = false) String operacion,
            @RequestParam(required = false) String canal,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Double montoMin,
            @RequestParam(required = false) Double montoMax
    )
    {
        try {
            Pageable pageable = PageRequest.of(pagina, 20);

            LocalDateTime horaInicioCalculada = inicio.atTime(8, 0);
            LocalDateTime horaFinCalculada = fin.atTime(23, 59, 59);

            if ("DIA".equalsIgnoreCase(turno)) {
                horaInicioCalculada = inicio.atTime(8, 0);
                horaFinCalculada = fin.atTime(18, 0);
            } else if ("NOCHE".equalsIgnoreCase(turno)) {
                horaInicioCalculada = inicio.atTime(19, 0);
                horaFinCalculada = fin.plusDays(1).atTime(7, 0);
            } else if ("TODOS".equalsIgnoreCase(turno) || turno == null || turno.trim().isEmpty()) {
                horaInicioCalculada = inicio.atTime(8, 0);
                horaFinCalculada = fin.plusDays(1).atTime(7, 0);
            }

            String metodoFinal = (metodoPago != null && !metodoPago.trim().isEmpty()) ? metodoPago.trim().toUpperCase() : null;
            String servicioFinal = (tipoServicio != null && !tipoServicio.trim().isEmpty()) ? tipoServicio.trim().toUpperCase() : null;

            Map<String, Object> respuestaMapeada = cajaService.obtenerHistorialComprobantesFiltrosAvanzados(
                    horaInicioCalculada, horaFinCalculada, metodoFinal, servicioFinal, turno, pageable
            );

            List<Map<String, Object>> listaUnificadaMaster = new ArrayList<>();

            List<Map<String, Object>> comprobantesOriginales = (List<Map<String, Object>>) respuestaMapeada.get("comprobantes");
            if (comprobantesOriginales != null) {
                for (Map<String, Object> comp : comprobantesOriginales) {
                    Map<String, Object> item = new HashMap<>(comp);
                    item.put("isMovimientoManual", false);
                    listaUnificadaMaster.add(item);
                }
            }

            double sumaFondoApertura = 0.0;
            double sumaVentasRealizadas = 0.0;
            double sumaEfectivoGaveta = 0.0;
            List<Map<String, Object>> listaMovimientosManualesHistoricos = new ArrayList<>();

            LocalDateTime inicioBusquedaTurnos = inicio.atStartOfDay();
            LocalDateTime finBusquedaTurnos = fin.atTime(LocalTime.MAX);

            List<TurnoCaja> turnosDelRango = turnoCajaRepository.findAll().stream()
                    .filter(t -> t.getFechaApertura() != null
                            && !t.getFechaApertura().isBefore(inicioBusquedaTurnos)
                            && !t.getFechaApertura().isAfter(finBusquedaTurnos))
                    .collect(Collectors.toList());

            final String turnoFiltroUpper = (turno != null) ? turno.toUpperCase().trim() : "TODOS";

            for (TurnoCaja turnoObjetivo : turnosDelRango) {
                if (turnoObjetivo == null) continue;

                String tipoTurnoReal = turnoObjetivo.getTipoTurno() != null
                        ? turnoObjetivo.getTipoTurno().toUpperCase().trim()
                        : "DIA";

                if (!"TODOS".equals(turnoFiltroUpper) && !tipoTurnoReal.equals(turnoFiltroUpper)) {
                    continue;
                }

                sumaFondoApertura += turnoObjetivo.getMontoApertura() != null ? turnoObjetivo.getMontoApertura() : 0.0;
                sumaVentasRealizadas += turnoObjetivo.getTotalVendido() != null ? turnoObjetivo.getTotalVendido() : 0.0;

                List<MovimientoCaja> movs = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(turnoObjetivo.getId());

                double ingresosManuales = movs.stream()
                        .filter(m -> m.getTipo() == TipoMovimientoCaja.INGRESO_MANUAL)
                        .mapToDouble(MovimientoCaja::getMonto)
                        .sum();

                double egresosManuales = movs.stream()
                        .filter(m -> m.getTipo() == TipoMovimientoCaja.EGRESO_MANUAL)
                        .mapToDouble(MovimientoCaja::getMonto)
                        .sum();

                for (MovimientoCaja m : movs) {
                    if (m == null) continue;

                    TipoMovimientoCaja tipoEnum = m.getTipo() != null ? m.getTipo() : TipoMovimientoCaja.INGRESO_MANUAL;
                    String tipoMovCrudo = tipoEnum.getGrupoMacro();
                    boolean esAperturaCaja = tipoEnum == TipoMovimientoCaja.APERTURA;
                    boolean esCierreCaja = tipoEnum == TipoMovimientoCaja.CIERRE;

                    String conceptoCrudo = m.getConcepto() != null ? m.getConcepto() : "";
                    String conceptoUpper = conceptoCrudo.toUpperCase();
                    String conceptoLimpio = conceptoCrudo.startsWith("Manual: ")
                            ? conceptoCrudo.substring(8)
                            : conceptoCrudo;

                    boolean esVentaAutomatica =
                            conceptoUpper.contains("LIQUIDACIÓN") ||
                                    conceptoUpper.contains("LIQUIDACION") ||
                                    conceptoUpper.contains("EXTORNO") ||
                                    conceptoUpper.contains("DELIVERY MANUAL CAJERO") ||
                                    conceptoUpper.contains("VENTA POS DIRECTO") ||
                                    tipoEnum == TipoMovimientoCaja.INGRESO_VENTA;

                    if (!esVentaAutomatica) {
                        LocalDateTime fechaMov = m.getFecha() != null ? m.getFecha() : LocalDateTime.now();

                        Map<String, Object> mMov = new HashMap<>();
                        mMov.put("id", m.getId());
                        mMov.put("comprobante", m.getComprobante() != null ? m.getComprobante() : "M-" + m.getId());
                        mMov.put("tipo", esAperturaCaja ? "APERTURA" : (esCierreCaja ? "CIERRE" : tipoMovCrudo));
                        mMov.put("concepto", esAperturaCaja ? "Fondo inicial" : (esCierreCaja ? "Cierre de caja" : conceptoLimpio));
                        mMov.put("monto", Math.abs(m.getMonto()));
                        mMov.put("hora", fechaMov.toLocalTime().toString().substring(0, 5));

                        listaMovimientosManualesHistoricos.add(mMov);

                        if (metodoFinal == null || "EFECTIVO".equals(metodoFinal)) {
                            boolean pasaFiltroServicio = servicioFinal == null
                                    || "LOCAL".equals(servicioFinal)
                                    || "SALON".equals(servicioFinal)
                                    || "MANUAL".equals(servicioFinal)
                                    || (esCierreCaja && "CIERRE_CAJA".equals(servicioFinal));

                            if (pasaFiltroServicio) {
                                Map<String, Object> movConvertido = new HashMap<>();
                                movConvertido.put("id", m.getId());
                                movConvertido.put("comprobante", m.getComprobante() != null ? m.getComprobante() : "M-" + m.getId());
                                movConvertido.put("tipoServicio", esAperturaCaja ? "APERTURA_CAJA" : (esCierreCaja ? "CIERRE_CAJA" : "MANUAL"));
                                movConvertido.put("canal", "Presencial");
                                movConvertido.put("mesa", "—");
                                movConvertido.put("cliente", esAperturaCaja ? "Fondo inicial" : (esCierreCaja ? "Cierre de caja" : conceptoLimpio));
                                movConvertido.put("fecha", fechaMov.toLocalDate().toString());
                                movConvertido.put("hora", fechaMov.toLocalTime().toString().substring(0, 5));
                                movConvertido.put("fechaHoraOrden", fechaMov.toString());
                                movConvertido.put("monto", Math.abs(m.getMonto()));
                                movConvertido.put("metodoPago", "EFECTIVO");
                                movConvertido.put("estado", esAperturaCaja ? "APERTURA_CAJA" : (esCierreCaja ? "CIERRE_CAJA" : "MOV_MANUAL"));
                                movConvertido.put("estadoPago", esAperturaCaja ? "APERTURA" : (esCierreCaja ? "CIERRE" : tipoMovCrudo));
                                movConvertido.put("isMovimientoManual", true);

                                listaUnificadaMaster.add(movConvertido);
                            }
                        }
                    }
                }

                sumaEfectivoGaveta += (turnoObjetivo.getMontoApertura() + ingresosManuales + egresosManuales);
            }


            listaUnificadaMaster = listaUnificadaMaster.stream()
                    .filter(item -> {
                        if (operacion != null && !operacion.isBlank()) {
                            String estadoPagoItem = item.get("estadoPago") != null
                                    ? item.get("estadoPago").toString().toUpperCase()
                                    : "";

                            boolean esIngreso = "INGRESO".equals(estadoPagoItem)
                                    || "APERTURA".equals(estadoPagoItem)
                                    || "LIQUIDADO".equals(estadoPagoItem)
                                    || "PAGADO".equals(estadoPagoItem);

                            boolean esEgreso = "EGRESO".equals(estadoPagoItem)
                                    || "CIERRE".equals(estadoPagoItem)
                                    || "EXTORNADO".equals(estadoPagoItem)
                                    || "ANULADO".equals(estadoPagoItem);

                            if ("INGRESO".equalsIgnoreCase(operacion) && !esIngreso) return false;
                            if ("EGRESO".equalsIgnoreCase(operacion) && !esEgreso) return false;
                        }

                        if (canal != null && !canal.isBlank()) {
                            String canalItem = item.get("canal") != null
                                    ? item.get("canal").toString().toUpperCase()
                                    : "";
                            if (!canalItem.equals(canal.toUpperCase())) return false;
                        }

                        if (estado != null && !estado.isBlank()) {
                            String estadoItem = item.get("estado") != null
                                    ? item.get("estado").toString().toUpperCase()
                                    : "";
                            String estadoPagoItem = item.get("estadoPago") != null
                                    ? item.get("estadoPago").toString().toUpperCase()
                                    : "";

                            if ("LIQUIDADO".equalsIgnoreCase(estado)) {
                                if (!"LIQUIDADO".equals(estadoItem) && !"PAGADO".equals(estadoPagoItem)) return false;
                            } else if ("ANULADO".equalsIgnoreCase(estado)) {
                                if (!"ANULADO".equals(estadoItem) && !"EXTORNADO".equals(estadoPagoItem) && !"CANCELADO".equals(estadoItem)) return false;
                            } else if (!estadoItem.equals(estado.toUpperCase())) {
                                return false;
                            }
                        }

                        if (montoMin != null || montoMax != null) {
                            double montoItem = item.get("monto") != null
                                    ? Double.parseDouble(item.get("monto").toString())
                                    : 0.0;

                            if (montoMin != null && montoItem < montoMin) return false;
                            if (montoMax != null && montoItem > montoMax) return false;
                        }

                        return true;
                    })
                    .collect(Collectors.toList());

            listaUnificadaMaster.sort((a, b) -> {
                String tiempoA = a.get("fechaHoraOrden") != null
                        ? a.get("fechaHoraOrden").toString()
                        : a.get("fecha").toString() + "T" + (a.get("hora") != null ? a.get("hora").toString() : "00:00");

                String tiempoB = b.get("fechaHoraOrden") != null
                        ? b.get("fechaHoraOrden").toString()
                        : b.get("fecha").toString() + "T" + (b.get("hora") != null ? b.get("hora").toString() : "00:00");

                int comparacionTiempo = tiempoB.compareTo(tiempoA);
                if (comparacionTiempo != 0) return comparacionTiempo;

                Long idA = Long.parseLong(a.get("id").toString());
                Long idB = Long.parseLong(b.get("id").toString());
                return idB.compareTo(idA);
            });

            Map<String, Object> respuestaExtendida = new HashMap<>();
            respuestaExtendida.put("comprobantes", listaUnificadaMaster);
            respuestaExtendida.put("paginaActual", respuestaMapeada.get("paginaActual"));
            respuestaExtendida.put("totalPaginas", respuestaMapeada.get("totalPaginas"));
            respuestaExtendida.put("totalElementos", listaUnificadaMaster.size());

            respuestaExtendida.put("metaFondoApertura", sumaFondoApertura);
            respuestaExtendida.put("metaTotalVendido", sumaVentasRealizadas);
            respuestaExtendida.put("metaEfectivoGaveta", Math.max(0.0, sumaEfectivoGaveta));
            respuestaExtendida.put("movimientosManuales", listaMovimientosManualesHistoricos);

            return ResponseEntity.ok(respuestaExtendida);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error en matriz master combinada: " + e.getMessage());
        }
    }

    @PostMapping("/api/nota-venta/extornar")
    @ResponseBody
    @Transactional
    public ResponseEntity<?> extornarNotaVenta(@RequestBody Map<String, Object> payload) {
        try {
            Long pedidoId = Long.parseLong(payload.get("pedidoId").toString());
            String motivo = payload.get("motivo").toString().trim();

            Pedido pedidoReal = pedidoService.obtenerPorId(pedidoId);
            if (pedidoReal == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "No existe la NV."));
            }

            // ── 🛡️ ADUANA FISCAL DE CONTROL: Impedir extornos de CPEs ya timbrados ──
            if (pedidoReal.getComprobanteNumero() != null && !pedidoReal.getComprobanteNumero().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Operación denegada: La Nota de Venta ya está vinculada al Comprobante Emitido " + pedidoReal.getComprobanteNumero() + ". Debe anularse desde el panel de SUNAT mediante Nota de Crédito."
                ));
            }

            if (com.web.restaurante.model.enums.EstadoPago.EXTORNADO.equals(pedidoReal.getEstadoPago())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Ya fue extornada."));
            }

            // Cambiamos los estados de facturación del Pedido Padre de forma limpia
            pedidoReal.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.EXTORNADO);
            pedidoReal.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);

            pedidoReal.setClienteCorreo("EXTORNO: " + motivo);
            pedidoService.guardar(pedidoReal);

            System.out.println("✅ [La Jama Contable] NV #" + pedidoId + " anulada de forma aislada. Vueltos manuales intactos.");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Nota de Venta #" + pedidoId + " extornada correctamente del registro de ventas."
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

}