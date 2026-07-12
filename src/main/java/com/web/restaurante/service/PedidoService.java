package com.web.restaurante.service;

import com.web.restaurante.model.*;
import com.web.restaurante.model.enums.EstadoPago;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.TipoPedido;
import com.web.restaurante.repository.EmpleadoRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final EmpleadoRepository empleadoRepository;
    private final ProteinaService proteinaService;
    private final InsumoService insumoService;
    private final InsumoProductoRepository insumoProductoRepository;
    private final TurnoCajaService turnoCajaService;
    private final NotaVentaSequenceService notaVentaSequenceService;
    private final MesaRepository mesaRepository;

    private final double LAT_LOCAL = -6.787382;
    private final double LON_LOCAL = -79.842961;

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosFrios() {
        return pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() == EstadoPedido.EN_COCINA ||
                        (p.getEstado() == EstadoPedido.PENDIENTE && p.getNumeroMesa() != null))
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream()
                        .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado() && d.getProducto() != null && d.getProducto().getCategoria() != null
                                && (d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRI")
                                || d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRÍ"))))
                .sorted(Comparator.comparing(Pedido::getFechaCreacion))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosCalientes() {
        return pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() == EstadoPedido.EN_COCINA ||
                        (p.getEstado() == EstadoPedido.PENDIENTE && p.getNumeroMesa() != null))
                .filter(p -> p.getListaDetalles() != null && p.getListaDetalles().stream()
                        .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado() && d.getProducto() != null && d.getProducto().getCategoria() != null
                                && d.getProducto().getCategoria().getNombre().toUpperCase().contains("CALIENTE")))
                .sorted(Comparator.comparing(Pedido::getFechaCreacion))
                .toList();
    }

    @Transactional
    public void actualizarEstadoPedido(Long id, EstadoPedido nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró el pedido con ID: " + id));

        pedido.setEstado(nuevoEstado);
        pedidoRepository.save(pedido);
        System.out.println("Pedido " + id + " actualizado a: " + nuevoEstado);
    }

    @Transactional
    public Pedido guardar(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setFechaCreacion(LocalDateTime.now());
        }
        return pedidoRepository.save(pedido);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPreparados() {
        return pedidoRepository.findByEstado(EstadoPedido.PREPARADO);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPreparadosParaDespacho() {
        return pedidoRepository.findByEstado(EstadoPedido.PREPARADO)
                .stream()
                .filter(p -> p.getTipoPedido() == TipoPedido.DELIVERY)
                .collect(Collectors.toList());
    }

    @Transactional
    public void guardarPedido(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setEstado(EstadoPedido.EN_COCINA);
            pedido.setFechaCreacion(LocalDateTime.now());

            if (pedido.getTipoPedido() == null) {
                System.out.println("⚠️ [SERVICE] Pedido detectado sin Tipo. Seteando TipoPedido.LOCAL de forma automática.");
                pedido.setTipoPedido(TipoPedido.SALON);
            }
        }

        if (pedido.getEstadoPago() == null) {
            pedido.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PENDIENTE);
        }

        // 🚀 CANDADO ADICIONAL: Si el pedido no viene con turno (como los de salón nuevos), le asignamos el activo
        if (pedido.getTurnoCaja() == null) {
            turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
        }

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                detalle.setPedido(pedido);
                detalle.setCocinado(detalle.isCocinado());
                detalle.setEntregado(detalle.isEntregado());
                detalle.setCanceladoPorCliente(detalle.isCanceladoPorCliente());

                if (detalle.getId() == null && !detalle.isCanceladoPorCliente()) {
                    comprometerStockPorReceta(detalle);
                }
            }
        }
        pedidoRepository.save(pedido);
    }

    @Transactional
    public Long guardarPedidoCarta(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setEstado(EstadoPedido.PENDIENTE);
            pedido.setFechaCreacion(LocalDateTime.now());
        }

        // 🚀 CANDADO ADICIONAL: Aseguramos el turno de caja de entrada para el flujo QR
        if (pedido.getTurnoCaja() == null) {
            turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
        }

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                detalle.setPedido(pedido);
                detalle.setCocinado(false);
                detalle.setEntregado(false);
                detalle.setCanceladoPorCliente(false);

                if (detalle.getId() == null) {
                    comprometerStockPorReceta(detalle);
                }
            }
        }

        // 🚀 RESTAURACIÓN: Mantenemos el estado PENDIENTE puro para que aparezca en Aprobación de Caja
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PENDIENTE);

        pedido.setFechaCreacion(java.time.LocalDateTime.now());
        pedido.setTicketImpresoCocina(false);

        Pedido guardado = pedidoRepository.save(pedido);
        return guardado.getId();
    }

    @Transactional
    public void despacharPlatoIndividual(Long pedidoId, Long detalleId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() == null) return;

        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Fila de detalle no encontrada"));

        if (!detalleTarget.isImpresoEnCocina()) {
            throw new IllegalStateException("¡Bloqueado! No puedes despachar '"
                    + detalleTarget.getProducto().getNombre() + "' porque aún no ha sido impreso del ticket.");
        }

        if (!detalleTarget.isCocinado()) {
            detalleTarget.setCocinado(true);

            insumoProductoRepository.findByProductoId(detalleTarget.getProducto().getId()).forEach(ip -> {
                if (ip.getInsumo() != null && ip.getInsumo().getCategoria() != null) {
                    Insumo insumo = ip.getInsumo();
                    double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
                    double totalTeorico = cantidadUsada * detalleTarget.getCantidad();

                    double comprometidoActual = (insumo.getStockComprometido() != null) ? insumo.getStockComprometido() : 0.0;
                    insumo.setStockComprometido(Math.max(0.0, comprometidoActual - totalTeorico));

                    if (insumo.getCategoria().toUpperCase().contains("PROTEIN")) {
                        proteinaService.registrarKardexPorVenta(insumo.getId(), detalleTarget.getCantidad(), p.getId());
                    } else {
                        String detalleVenta = "Despacho a cocina (Gasto Real): " + detalleTarget.getCantidad() + "x " + detalleTarget.getProducto().getNombre();
                        insumoService.registrarMovimientoPorId(insumo.getId(), totalTeorico, "EGRESO", detalleVenta);
                    }
                }
            });
        }

        // 🛡️ RECUENTOS CORREGIDOS: Se ignora explícitamente a las mermas
        boolean tieneFrioPendiente = p.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado() && (d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRI")
                        || d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRÍ")));

        boolean tieneCalientePendiente = p.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado() && d.getProducto().getCategoria().getNombre().toUpperCase().contains("CALIENTE"));

        p.setFrioListo(!tieneFrioPendiente);
        p.setCalienteListo(!tieneCalientePendiente);

        if (!tieneFrioPendiente && !tieneCalientePendiente) {
            p.setEstado(EstadoPedido.PREPARADO);
        }

        pedidoRepository.save(p);
    }

    @Transactional
    public void entregarPlatoIndividual(Long pedidoId, Long detalleId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() == null) return;

        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Plato no mapeado en comanda"));

        detalleTarget.setEntregado(true);

        System.out.println("DEBUG SALÓN -> Entregado conforme en mesa: " + detalleTarget.getProducto().getNombre());

        boolean todosEntregados = p.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .allMatch(DetallePedido::isEntregado);

        if (todosEntregados) {
            p.setEstado(EstadoPedido.ENTREGADO);

            // 🛡️ RESPALDO DE SEGURIDAD CONTABLE:
            // Si el estado de pago ya es PAGADO (Prepago/Adelantado), procedemos a desvincular
            // y a liberar la entidad Mesa físicamente en las tablas de MySQL
            if (EstadoPago.PAGADO.equals(p.getEstadoPago())) {
                Integer numeroMesaRespaldo = p.getNumeroMesa();

                p.setNumeroMesa(null); // Desvinculamos el pedido de la mesa física
                p.setFechaEntrega(LocalDateTime.now());

                if (numeroMesaRespaldo != null) {
                    mesaRepository.findByNumero(numeroMesaRespaldo).ifPresent(mesa -> {
                        // Si la mesa es parte de una unificación, liberamos la principal
                        Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;

                        // 🚀 LA INYECCIÓN PERSISTENTE:
                        // Forzamos el cambio de estado de la entidad física a DISPONIBLE en disco duro
                        mesaPrincipal.setEstado("DISPONIBLE");
                        mesaRepository.save(mesaPrincipal);
                        System.out.println("🧹 [La Jama BD] Mesa N° " + numeroMesaRespaldo + " guardada en BD como DISPONIBLE pos-entrega final.");
                    });
                }
            }
        }
        pedidoRepository.save(p);
    }

    public List<Pedido> optimizarTrayectoBurbuja(List<Pedido> pedidos) {
        int n = pedidos.size();
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                double distA = calcularDistancia(pedidos.get(j));
                double distB = calcularDistancia(pedidos.get(j + 1));
                if (distA > distB) {
                    Pedido temp = pedidos.get(j);
                    pedidos.set(j, pedidos.get(j + 1));
                    pedidos.set(j + 1, temp);
                }
            }
        }
        return pedidos;
    }

    private double calcularDistancia(Pedido p) {
        return Math.sqrt(Math.pow(p.getLatitud() - LAT_LOCAL, 2) + Math.pow(p.getLongitud() - LON_LOCAL, 2));
    }

    public List<List<Pedido>> generarSugerenciasDeRuta() {
        List<Pedido> preparados = listarPreparados();
        preparados.sort(Comparator.comparingDouble(p -> Math.atan2(p.getLatitud() - LAT_LOCAL, p.getLongitud() - LON_LOCAL)));
        List<List<Pedido>> grupos = new ArrayList<>();
        for (int i = 0; i < preparados.size(); i += 3) {
            List<Pedido> subLista = new ArrayList<>(preparados.subList(i, Math.min(i + 3, preparados.size())));
            grupos.add(optimizarTrayectoBurbuja(subLista));
        }
        return grupos;
    }

    @Transactional
    public void asignarRutaARepartidor(List<Long> pedidosIds, Long empleadoId) {
        Empleado repartidor = empleadoRepository.findById(empleadoId)
                .orElseThrow(() -> new IllegalArgumentException("El repartidor no existe."));
        for (Long id : pedidosIds) {
            Pedido p = pedidoRepository.findById(id).orElseThrow();
            p.setRepartidor(repartidor);
            p.setEstado(EstadoPedido.ASIGNADO);
            pedidoRepository.save(p);
        }
    }

    @Transactional
    public void completarEstacion(Long pedidoId, String tipoEstacion) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() != null) {
            for (DetallePedido d : p.getListaDetalles()) {
                if (d.getProducto() != null && d.getProducto().getCategoria() != null) {
                    String catNombre = d.getProducto().getCategoria().getNombre().toUpperCase();

                    boolean esFriaCorrespondiente = "fria".equalsIgnoreCase(tipoEstacion) && (catNombre.contains("FRI") || catNombre.contains("FRÍ"));
                    boolean esCalienteCorrespondiente = "caliente".equalsIgnoreCase(tipoEstacion) && catNombre.contains("CALIENTE");

                    if ((esFriaCorrespondiente || esCalienteCorrespondiente) && !d.isCocinado()) {
                        d.setCocinado(true);

                        insumoProductoRepository.findByProductoId(d.getProducto().getId()).forEach(ip -> {
                            if (ip.getInsumo() != null && ip.getInsumo().getCategoria() != null) {

                                if (ip.getInsumo().getCategoria().toUpperCase().contains("PROTEIN")) {
                                    proteinaService.registrarKardexPorVenta(ip.getInsumo().getId(), d.getCantidad(), p.getId());
                                } else {
                                    double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
                                    double totalTeorico = cantidadUsada * d.getCantidad();
                                    String detalleVenta = "Despacho a cocina: " + d.getCantidad() + "x " + d.getProducto().getNombre();

                                    insumoService.registrarMovimientoPorId(ip.getInsumo().getId(), totalTeorico, "EGRESO", detalleVenta);
                                }
                            }
                        });
                    }
                }
            }
        }

        if ("fria".equalsIgnoreCase(tipoEstacion)) p.setFrioListo(true);
        else if ("caliente".equalsIgnoreCase(tipoEstacion)) p.setCalienteListo(true);

        boolean tieneFrio = p.getListaDetalles().stream().anyMatch(d -> d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRI") || d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRÍ"));
        boolean tieneCaliente = p.getListaDetalles().stream().anyMatch(d -> d.getProducto().getCategoria().getNombre().toUpperCase().contains("CALIENTE"));

        if ((!tieneFrio || p.isFrioListo()) && (!tieneCaliente || p.isCalienteListo())) {
            p.setEstado(EstadoPedido.PREPARADO);
        }
        pedidoRepository.save(p);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosPorCobrar() {
        return pedidoRepository.listarPedidosPorCobrar();
    }

    @Transactional
    public void cobrarPedido(Long id) {
        // 1. Buscamos el pedido completo en la base de datos
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró el pedido con ID: " + id));

        // 2. Le inyectamos el estado cobrado
        pedido.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);

        // 3. 🛡️ CANDADO CONTABLE: Amarramos el pedido al turno de caja activo en este microsegundo
        try {
            turnoCajaService.obtenerTurnoActivo().ifPresent(turnoActivo -> {
                pedido.setTurnoCaja(turnoActivo);
            });
        } catch (Exception e) {
            System.out.println("⚠️ [ERROR CONTABLE] No se pudo amarrar el turno de caja al cobrar la mesa: " + e.getMessage());
        }

        // 4. Guardamos el pedido actualizado de forma íntegra
        pedidoRepository.save(pedido);
        System.out.println("✅ [CAJA] Pedido #" + id + " cobrado con éxito y asociado al turno correspondiente.");
    }

    @Transactional
    public void asignarRepartidor(Long pedidoId, Empleado repartidor) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setRepartidor(repartidor);
        pedido.setEstado(EstadoPedido.ASIGNADO);
        pedidoRepository.save(pedido);
    }

    @Transactional
    public void iniciarRuta(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(EstadoPedido.EN_CAMINO);
        pedido.setFechaSalida(LocalDateTime.now());
        pedidoRepository.save(pedido);
    }

    @Transactional
    public void marcarComoEntregado(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(EstadoPedido.ENTREGADO);

        if (com.web.restaurante.model.enums.EstadoPago.PAGADO.equals(pedido.getEstadoPago())) {
            pedido.setNumeroMesa(null);
            if (pedido.getNumeroMesa() != null) {
                Mesa mesa = mesaRepository.findByNumero(pedido.getNumeroMesa()).orElse(null);
                if (mesa != null) {
                    mesa.setEstado("DISPONIBLE");
                    mesaRepository.save(mesa);
                }
            }
        }

        pedido.setFechaEntrega(LocalDateTime.now());
        pedidoRepository.save(pedido);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosPorRepartidor(Long idEmpleado) { return pedidoRepository.buscarPedidosActivosPorRepartidor(idEmpleado); }

    public Pedido obtenerPorId(Long id) { return pedidoRepository.findById(id).orElse(null); }

    @Transactional(readOnly = true)
    public List<Pedido> listarDeliveryPendientesConCoordenadas() { return pedidoRepository.findDeliveryPendientesConCoordenadas(); }

    @Transactional(readOnly = true)
    public List<Pedido> listarPendientesDeCarta() { return pedidoRepository.findPedidosPendientesDeCarta(); }

    @Transactional
    public void aprobarPedidoACocina(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con ID: " + pedidoId));

        pedido.setEstado(EstadoPedido.EN_COCINA);

        pedido.setFechaEntrega(LocalDateTime.now());

        if (pedido.getComprobanteNotaNumero() == null || pedido.getComprobanteNotaNumero().isEmpty()) {
            String siguienteNota = notaVentaSequenceService.generarSiguienteNota();
            pedido.setComprobanteNotaNumero(siguienteNota);
            System.out.println("🔥 [SERVICE] Secuencia formal interna asignada: " + siguienteNota);
        }

        if (pedido.getMontoTotal() != null && pedido.getMontoTotal() > 0) {
            String conceptoVenta = "Carta QR (" + pedido.getMetodoPago() + ") - " + pedido.getComprobanteNotaNumero();
            turnoCajaService.registrarVenta(conceptoVenta, pedido.getMontoTotal());
            System.out.println("💰 [SERVICE] Venta registrada en caja para comprobante: " + pedido.getComprobanteNotaNumero());
        }

        pedido.setEstadoPago(EstadoPago.PAGADO);
        pedidoRepository.save(pedido);
        System.out.println("✅ [SERVICE] Pedido de carta #" + pedidoId + " aprobado con marcas temporales, financieras y secuenciales.");
    }

    public List<DetallePedido> obtenerDetallesPorTipo(Long pedidoId, String tipoCocina) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElse(new Pedido());
        return pedido.getListaDetalles().stream()
                .filter(d -> {
                    String nombreCat = d.getProducto().getCategoria().getNombre().toUpperCase();
                    if ("caliente".equalsIgnoreCase(tipoCocina)) return nombreCat.contains("CALIENTE");
                    else return nombreCat.contains("FRI") || nombreCat.contains("FRÍ");
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void eliminarItemComanda(Long pedidoId, Long detalleId, boolean forzarMerma) {
        System.out.println("📡 [RADAR CRÍTICO] ¡Llegó la petición al Service! Pedido: " + pedidoId + " | Detalle: " + detalleId + " | ForzarMerma: " + forzarMerma);
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con ID: " + pedidoId));

        if (pedido.getListaDetalles() == null) return;

        // Localizamos la fila exacta del plato que se desea remover
        DetallePedido detalleTarget = pedido.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Línea de comanda no encontrada ID: " + detalleId));

        boolean esMermaReal = forzarMerma || detalleTarget.isImpresoEnCocina();

        if (esMermaReal) {
            System.out.println("🔥 [La Jama] Ítem calificado como MERMA. Cambiando estado operativo.");
            detalleTarget.setCanceladoPorCliente(true);
            detalleTarget.setImpresoEnCocina(true);
        } else {
            System.out.println("🧹 [La Jama] Ítem NO impreso. Borrando por completo de la comanda de forma limpia.");
            pedido.getListaDetalles().remove(detalleTarget);
            detalleTarget.setPedido(null);
        }

        // CONTROL DE INVENTARIO ABSOLUTO
        if (!detalleTarget.isCocinado()) {
            insumoProductoRepository.findByProductoId(detalleTarget.getProducto().getId()).forEach(ip -> {
                if (ip.getInsumo() != null) {
                    Insumo insumo = ip.getInsumo();
                    double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
                    double totalInsumo = cantidadUsada * detalleTarget.getCantidad();

                    // 1. Siempre liberamos la porción del stock comprometido
                    double comprometidoActual = (insumo.getStockComprometido() != null) ? insumo.getStockComprometido() : 0.0;
                    insumo.setStockComprometido(Math.max(0.0, comprometidoActual - totalInsumo));

                    // 2. 🛡️ FILTRADO DE PROTEÍNAS ATÓMICO CORREGIDO:
                    if (esMermaReal) {
                        if (insumo.getCategoria() != null && insumo.getCategoria().toUpperCase().contains("PROTEIN")) {
                            // 🎯 CORRECCIÓN: Eliminamos el 'insumo.setStockActual(...)' manual de aquí
                            // porque registrarKardexPorVenta ya disminuye el Stock Actual de forma nativa en la BD.
                            proteinaService.registrarKardexPorVenta(insumo.getId(), detalleTarget.getCantidad(), pedido.getId());
                            System.out.println("🥩 [KARDEX CONFORME] Reduciendo stock por merma de proteína únicamente a través de la transacción: " + insumo.getNombre());
                        } else {
                            System.out.println("🥫 [La Jama Insumos] Se ignora descuento de '" + insumo.getNombre() + "' (No es proteína).");
                        }
                    }
                }
            });
            detalleTarget.setCocinado(true);
        }

        recalcularTotalesPedido(pedido);

        // Auto-cierre operativo de comandas vacías
        boolean tienePlatosActivosPendientes = pedido.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado());

        if (!tienePlatosActivosPendientes) {
            pedido.setFrioListo(true);
            pedido.setCalienteListo(true);
            pedido.setEstado(EstadoPedido.PREPARADO);
            System.out.println("🧹 Comanda #" + pedidoId + " sin ítems pendientes. Pasando a PREPARADO.");
        }

        pedidoRepository.save(pedido);
    }

    private void recalcularTotalesPedido(Pedido pedido) {
        // 🚀 LA CORRECCIÓN CONTABLE DEFENSIVA:
        // Sumamos los platos activos normales Y TAMBIÉN las mermas impresas que NO han sido pagadas.
        // De esta forma, el total del Pedido nunca baja a 0 si hay mermas deudoras,
        // impidiendo que el frontend o el controller disuelvan la mesa.
        double nuevoTotal = pedido.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() || (d.isCanceladoPorCliente() && !d.isPagado()))
                .mapToDouble(d -> d.getPrecioUnitario() * d.getCantidad())
                .sum();

        // Seteamos el valor de auditoría real mapeado en tu entidad
        pedido.setMontoTotal(nuevoTotal);
        System.out.println("📊 [La Jama ORM] Recalculando comanda #" + pedido.getId() + " con mermas por cobrar. Nuevo total: S/. " + nuevoTotal);
    }

    @Transactional
    public void cambiarEstadoA(EstadoPedido estado, Long id) {
        Pedido pedido = requerirPedidoPorId(id);
        pedido.setEstado(estado);
        pedidoRepository.save(pedido);
    }

    @Transactional(readOnly = true)
    public Pedido requerirPedidoPorId(Long id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("No se encontró pedido con esa ID"));
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarAbsolutamenteTodoParaDebug() {
        return pedidoRepository.findAll(); // Trae todo sin filtros de estado ni tipo
    }

    @Transactional(readOnly = true)
    public boolean existeNumeroOperationHoy(String firmaVoucher) {
        LocalDateTime inicioHoy = java.time.LocalDate.now().atStartOfDay();
        // Buscamos si existe algún pedido registrado hoy con este hash estructural único
        return pedidoRepository.findAll().stream()
                .filter(p -> p.getFechaCreacion() != null && p.getFechaCreacion().isAfter(inicioHoy))
                .anyMatch(p -> firmaVoucher.equalsIgnoreCase(p.getDocumentoCliente()));
    }

    @Transactional(readOnly = true)
    public List<Pedido> obtenerPedidosParaCajaHoy() {
        java.util.Optional<TurnoCaja> turnoOpt = turnoCajaService.obtenerTurnoActivo();
        java.time.LocalDateTime inicioRangoContable = (turnoOpt.isPresent() && turnoOpt.get().getFechaApertura() != null)
                ? turnoOpt.get().getFechaApertura()
                : java.time.LocalDate.now().atStartOfDay();

        System.out.println("🛰️ [SQL REPOSITORY] Extrayendo estrictamente comprobantes validados desde: " + inicioRangoContable);

        // 🚀 Invocación indexada a MySQL: Retorna únicamente la data exacta a pintar en la interfaz
        List<Pedido> comprobantesValidos = pedidoRepository.findPedidosParaComprobantesHoy(inicioRangoContable);

        System.out.println("📦 [SERVICE] Elementos cargados directamente en memoria: " + comprobantesValidos.size());
        return comprobantesValidos;
    }

    public List<Pedido> obtenerPedidosPorRango(LocalDate inicio, LocalDate fin) {
        LocalDateTime desde = inicio.atStartOfDay();
        LocalDateTime hasta = fin.atTime(23, 59, 59);
        return pedidoRepository.findByFechaCreacionBetweenOrderByFechaCreacionDesc(desde, hasta);
    }

    private void comprometerStockPorReceta(DetallePedido detalle) {
        if (detalle.getProducto() != null) {
            insumoProductoRepository.findByProductoId(detalle.getProducto().getId()).forEach(ip -> {
                if (ip.getInsumo() != null) {
                    Insumo insumo = ip.getInsumo();
                    double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
                    double totalAComprometer = cantidadUsada * detalle.getCantidad();

                    double actualComprometido = (insumo.getStockComprometido() != null) ? insumo.getStockComprometido() : 0.0;
                    insumo.setStockComprometido(actualComprometido + totalAComprometer);
                    System.out.println("🛡️ [ESCUDO] Insumo '" + insumo.getNombre() + "' comprometido en +" + totalAComprometer);
                }
            });
        }
    }

    public List<Pedido> obtenerPedidosPorRangoEmision(LocalDate inicio, LocalDate fin) {
        LocalDateTime desde = inicio.atStartOfDay();
        LocalDateTime hasta = fin.atTime(23, 59, 59);

        return pedidoRepository.findAll().stream()
                .filter(p -> {
                    // 🎯 Fecha efectiva: si ya es un comprobante emitido, usamos cuándo se timbró (fechaEntrega).
                    // Si sigue siendo solo Nota de Venta, usamos cuándo se creó (fechaCreacion).
                    LocalDateTime fechaEfectiva = (p.getComprobanteNumero() != null && p.getFechaEntrega() != null)
                            ? p.getFechaEntrega()
                            : p.getFechaCreacion();
                    return fechaEfectiva != null && !fechaEfectiva.isBefore(desde) && !fechaEfectiva.isAfter(hasta);
                })
                .sorted(Comparator.comparing(Pedido::getFechaCreacion).reversed())
                .toList();
    }
}