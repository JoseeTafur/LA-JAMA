package com.web.restaurante.controller;

import com.web.restaurante.model.*;
import com.web.restaurante.model.enums.EstadoPago;
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
    private final MovimientoCajaRepository movimientoCajaRepository;

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

        // 🚀 CONSTRUCCIÓN DE LA BITÁCORA PURA SIN DUPLICADOS
        List<Map<String, Object>> movimientosBitacoraLimpia = new ArrayList<>();

        // RECORREMOS LA LISTA: No agregamos la apertura a la fuerza, dejamos que pase el filtro si viene en la lista
        for (MovimientoCaja m : movimientosCrudos) {
            if (m == null) continue;
            String tipoMovCrudo = m.getTipo() != null ? m.getTipo().toUpperCase().trim() : "INGRESO";
            String conceptoCrudo = m.getConcepto() != null ? m.getConcepto() : "";
            String conceptoUpper = conceptoCrudo.toUpperCase();

            // Filtrar tajantemente solo lo automático, permitiendo APERTURA, INGRESO y EGRESO manual
            if (!(conceptoUpper.contains("LIQUIDACIÓN") ||
                    conceptoUpper.contains("LIQUIDACION") ||
                    conceptoUpper.contains("EXTORNO") ||
                    tipoMovCrudo.equals("VENTA") ||
                    tipoMovCrudo.equals("CIERRE"))) {

                Map<String, Object> mMov = new HashMap<>();
                mMov.put("id", m.getId());

                // Si el concepto contiene "FONDO INICIAL" o el tipo es APERTURA, aseguramos que se marque como tal
                if (conceptoUpper.contains("FONDO INICIAL") || tipoMovCrudo.equals("APERTURA")) {
                    mMov.put("tipo", "APERTURA");
                    mMov.put("concepto", "Fondo inicial");
                } else {
                    mMov.put("tipo", tipoMovCrudo);
                    mMov.put("concepto", conceptoCrudo.startsWith("Manual: ") ? conceptoCrudo.substring(8) : conceptoCrudo);
                }

                mMov.put("monto", Math.abs(m.getMonto())); // Absoluto positivo

                LocalDateTime fechaMov = m.getFecha() != null ? m.getFecha() : LocalDateTime.now();
                mMov.put("hora", fechaMov.toLocalTime().toString().substring(0, 5));
                mMov.put("origen", "👤 HISTÓRICO");

                movimientosBitacoraLimpia.add(mMov);
            }
        }

        // 🔄 ORDEN CRONOLÓGICO INVERSO PERFECTO:
        // Ordenamos de mayor a menor ID. Al ser #M-7 el ID más alto, irá ARRIBA.
        // Como la Apertura (#M-2) tiene el ID más bajo, por lógica matemática quedará al ÚLTIMO (ABAJO).
        movimientosBitacoraLimpia.sort((a, b) -> {
            Long idA = Long.parseLong(a.get("id").toString());
            Long idB = Long.parseLong(b.get("id").toString());
            return idB.compareTo(idA); // Mayor a menor
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

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<com.web.restaurante.dto.mesas.TicketDTO> listaTickets = mapper.readValue(
                    matrizTickets, new com.fasterxml.jackson.core.type.TypeReference<>() {}
            );

            // 1. Ejecutamos la liquidación nativa (Genera el pedido histórico y las notas de venta clonadas)
            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, idsDetalles);

            // 2. 🛡️ REPARACIÓN POST-LIQUIDACIÓN ANTI-NULL:
            try {
                turnoCajaService.obtenerTurnoActivo().ifPresent(turnoActivo -> {
                    mesaRepository.findById(mesaId).ifPresent(mesa -> {
                        List<Pedido> notasVentaHuerfanas = pedidoRepository.findAll().stream()
                                .filter(p -> p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.PAGADO)
                                .filter(p -> p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ENTREGADO) // 🟢 ¡AÑADE ESTA LÍNEA!
                                .filter(p -> p.getTurnoCaja() == null)
                                .collect(Collectors.toList());

                        for (Pedido nv : notasVentaHuerfanas) {
                            nv.setTurnoCaja(turnoActivo);
                            pedidoRepository.save(nv);
                            System.out.println("🚀 [ESCUDO CONTABLE] Nota de Venta #" + nv.getId() + " asociada al turno: " + turnoActivo.getId());
                        }
                    });
                });
            } catch (Exception ex) {
                System.out.println("⚠️ No se pudo realizar el barrido anti-null: " + ex.getMessage());
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
            // Parseamos de forma segura las fechas provenientes del frontend
            LocalDate inicio = LocalDate.parse(fechaInicio);
            LocalDate fin = LocalDate.parse(fechaFin);

            LocalDateTime inicioDT = inicio.atStartOfDay();
            LocalDateTime finDT = fin.atTime(LocalTime.MAX);

            // Buscamos los turnos cerrados en tu TurnoCajaRepository usando el rango calculado
            List<TurnoCaja> turnos = turnoCajaRepository.findTurnosCerradosEnRangoHorario(inicioDT, finDT);

            List<Map<String, Object>> respuesta = new ArrayList<>();

            for (TurnoCaja t : turnos) {
                if (t == null) continue;

                // Forzamos mayúsculas para evitar fallos de coincidencia ("DIA" vs "DÍA")
                String turnoCalculado = (t.getTipoTurno() != null) ? t.getTipoTurno().toUpperCase().trim() : "DIA";
                if ("DIA".equals(turnoCalculado)) {
                    turnoCalculado = "DÍA"; // Mantener compatibilidad estética con el frontend
                }

                // Filtro selectivo por tipo de turno
                if (!"TODOS".equalsIgnoreCase(turno) && !turnoCalculado.equalsIgnoreCase(turno)) {
                    continue;
                }

                Map<String, Object> dto = new HashMap<>();
                dto.put("id", t.getId());
                dto.put("turnoCalculado", turnoCalculado);
                dto.put("fechaApertura", t.getFechaApertura() != null ? t.getFechaApertura().toString() : "");
                dto.put("fechaCierre", t.getFechaCierre() != null ? t.getFechaCierre().toString() : "null");

                dto.put("montoApertura", t.getMontoApertura() != null ? t.getMontoApertura() : 0.0);
                dto.put("totalVendido", t.getTotalVendido() != null ? t.getTotalVendido() : 0.0);
                dto.put("montoCierre", t.getMontoCierre() != null ? t.getMontoCierre() : 0.0);
                dto.put("diferencia", t.getDiferencia() != null ? t.getDiferencia() : 0.0);
                dto.put("observaciones", t.getObservaciones() != null ? t.getObservaciones() : "");

                respuesta.add(dto);
            }

            return ResponseEntity.ok(respuesta);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error al procesar la bitácora de turnos cerrados: " + e.getMessage());
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
            @RequestParam(required = false) String turno) {
        try {
            Pageable pageable = PageRequest.of(pagina, 20);

            // 1. Límites cronológicos estándar para pedidos
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

            // 2. Extraemos el mapa base original de pedidos que ya calcula el Service
            Map<String, Object> respuestaMapeada = cajaService.obtenerHistorialComprobantesFiltrosAvanzados(
                    horaInicioCalculada, horaFinCalculada, metodoFinal, servicioFinal, turno, pageable
            );

            // Lista unificada para el Buscador Global
            List<Map<String, Object>> listaUnificadaMaster = new ArrayList<>();

            List<Map<String, Object>> comprobantesOriginales = (List<Map<String, Object>>) respuestaMapeada.get("comprobantes");
            if (comprobantesOriginales != null) {
                for (Map<String, Object> comp : comprobantesOriginales) {
                    Map<String, Object> item = new HashMap<>(comp);
                    item.put("isMovimientoManual", false);
                    listaUnificadaMaster.add(item);
                }
            }

            // 3. 🚀 CORRECCIÓN CLAVE: Buscamos los turnos reales que calzan estrictamente con el rango
            double sumaFondoApertura = 0.0;
            double sumaVentasRealizadas = 0.0;
            double sumaEfectivoGaveta = 0.0;
            List<Map<String, Object>> listaMovimientosManualesHistoricos = new ArrayList<>();

            // Rango amplio de búsqueda física de turnos
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

                // Verificación estricta del tipo de turno para que el de hoy ("DIA") no entre en la consulta de ayer ("NOCHE")
                String tipoTurnoReal = turnoObjetivo.getTipoTurno() != null ? turnoObjetivo.getTipoTurno().toUpperCase().trim() : "DIA";
                if (!"TODOS".equals(turnoFiltroUpper) && !tipoTurnoReal.equals(turnoFiltroUpper)) {
                    continue; // Descarta de inmediato turnos no correspondientes
                }

                sumaFondoApertura += turnoObjetivo.getMontoApertura() != null ? turnoObjetivo.getMontoApertura() : 0.0;
                sumaVentasRealizadas += turnoObjetivo.getTotalVendido() != null ? turnoObjetivo.getTotalVendido() : 0.0;

                List<MovimientoCaja> movs = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(turnoObjetivo.getId());

                double ingresosManuales = movs.stream().filter(m -> "INGRESO".equals(m.getTipo().toUpperCase().trim())).mapToDouble(MovimientoCaja::getMonto).sum();
                double egresosManuales = movs.stream().filter(m -> "EGRESO".equals(m.getTipo().toUpperCase().trim())).mapToDouble(MovimientoCaja::getMonto).sum();

                for (MovimientoCaja m : movs) {
                    if (m == null) continue;
                    String tipoMovCrudo = m.getTipo() != null ? m.getTipo().toUpperCase().trim() : "INGRESO";
                    String conceptoCrudo = m.getConcepto() != null ? m.getConcepto() : "";
                    String conceptoUpper = conceptoCrudo.toUpperCase();

                    if (!(conceptoUpper.contains("LIQUIDACIÓN") ||
                            conceptoUpper.contains("LIQUIDACION") ||
                            conceptoUpper.contains("EXTORNO") ||
                            tipoMovCrudo.equals("VENTA") ||
                            tipoMovCrudo.equals("CIERRE"))) {

                        Map<String, Object> mMov = new HashMap<>();
                        mMov.put("id", m.getId());
                        mMov.put("tipo", tipoMovCrudo);
                        mMov.put("concepto", m.getConcepto().startsWith("Manual: ") ? m.getConcepto().substring(8) : m.getConcepto());
                        mMov.put("monto", Math.abs(m.getMonto()));

                        LocalDateTime fechaMov = m.getFecha() != null ? m.getFecha() : LocalDateTime.now();
                        mMov.put("hora", fechaMov.toLocalTime().toString().substring(0, 5));

                        listaMovimientosManualesHistoricos.add(mMov);

                        // Inyección controlada al Buscador Global (Solo efectivo y local)
                        if (metodoFinal == null || "EFECTIVO".equals(metodoFinal)) {
                            if (servicioFinal == null || "LOCAL".equals(servicioFinal) || "SALON".equals(servicioFinal)) {
                                Map<String, Object> movConvertido = new HashMap<>();
                                movConvertido.put("id", m.getId());
                                movConvertido.put("comprobante", "M-" + m.getId());
                                movConvertido.put("tipoServicio", "-");
                                movConvertido.put("mesa", "-");
                                movConvertido.put("cliente", m.getConcepto().startsWith("Manual: ") ? m.getConcepto().substring(8) : m.getConcepto());
                                movConvertido.put("fecha", fechaMov.toLocalDate().toString());
                                movConvertido.put("hora", fechaMov.toLocalTime().toString().substring(0, 5));
                                movConvertido.put("monto", Math.abs(m.getMonto()));
                                movConvertido.put("metodoPago", "EFECTIVO");
                                movConvertido.put("estado", "MOV_MANUAL");
                                movConvertido.put("estadoPago", tipoMovCrudo);
                                movConvertido.put("isMovimientoManual", true);

                                listaUnificadaMaster.add(movConvertido);
                            }
                        }
                    }
                }
                sumaEfectivoGaveta += (turnoObjetivo.getMontoApertura() + ingresosManuales + egresosManuales);
            }

            // 4. Ordenamos la lista combinada del Buscador Global de forma descendente (Más nuevos arriba)
            listaUnificadaMaster.sort((a, b) -> {
                Long idA = Long.parseLong(a.get("id").toString());
                Long idB = Long.parseLong(b.get("id").toString());
                return idB.compareTo(idA);
            });

            // 5. Empaquetamos la respuesta final
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

            if (com.web.restaurante.model.enums.EstadoPago.EXTORNADO.equals(pedidoReal.getEstadoPago())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Ya fue extornada."));
            }

            // 1. Cambiamos los estados de facturación del Pedido Padre de forma limpia
            pedidoReal.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.EXTORNADO);
            pedidoReal.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);

            // 🛡️ Guardamos la justificación del extorno en la auditoría del propio pedido
            pedidoReal.setClienteCorreo("EXTORNO: " + motivo);
            pedidoService.guardar(pedidoReal);

            // 2. 🚨 LA CORRECCIÓN SUPREMA:
            // NO HACEMOS: turnoCajaService.registrarEgreso(...);
            // Al NO registrar un movimiento manual de EGRESO, la gaveta física no restará dinero fantasma,
            // y la bitácora de movimientos manuales se quedará limpia solo para tus vueltos de 20 soles.

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