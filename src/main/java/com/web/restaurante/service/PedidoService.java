package com.web.restaurante.service;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.TipoPedido;
import com.web.restaurante.repository.EmpleadoRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final double LAT_LOCAL = -6.787382;
    private final double LON_LOCAL = -79.842961;

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosFrios() {
        return pedidoRepository.buscarPedidosPorCocina("FRI");
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosCalientes() {
        return pedidoRepository.buscarPedidosPorCocina("CALIENTE");
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
            pedido.setEstado(EstadoPedido.EN_COCINA); // O el estado EN_COCINA / PENDIENTE que manejes al inicio
            pedido.setFechaCreacion(LocalDateTime.now());
        }

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                detalle.setPedido(pedido);

                // 🌟 CORREGIDO: Usamos la sintaxis correcta de Lombok para tipos boolean primitivos
                // Si por alguna razón necesitas forzar el reinicio al guardar:
                detalle.setCocinado(detalle.isCocinado());
                detalle.setEntregado(detalle.isEntregado());
                detalle.setCanceladoPorCliente(detalle.isCanceladoPorCliente());
            }
        }
        pedidoRepository.save(pedido);
    }

    @Transactional
    public Long guardarPedidoCarta(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setEstado(EstadoPedido.EN_REVISION);
            pedido.setFechaCreacion(LocalDateTime.now());
        }

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                detalle.setPedido(pedido);

                // Inicialización limpia usando los setters normales
                detalle.setCocinado(false);
                detalle.setEntregado(false);
                detalle.setCanceladoPorCliente(false);
            }
        }
        pedidoRepository.save(pedido);
        return pedido.getId();
    }

    // =========================================================================
    // 🔥 CONTROL MICROSCOPIO: DESPACHAR PLATO INDIVIDUAL EN COCINA
    // =========================================================================
    @Transactional
    public void despacharPlatoIndividual(Long pedidoId, Long detalleId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() == null) return;

        // 🔥 BÚSQUEDA EXACTA: Apuntamos directo al ID de la fila (El Mondonguito específico)
        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Fila de detalle no encontrada"));

        // 🚨 CANDADO OPERATIVO INDESTRUCTIBLE: Aborta si el plato no se ha mandado a la tiquetera física
        if (!detalleTarget.isImpresoEnCocina()) {
            throw new IllegalStateException("¡Bloqueado! No puedes despachar '"
                    + detalleTarget.getProducto().getNombre() + "' porque aún no ha sido impreso en el ticket.");
        }

        if (!detalleTarget.isCocinado()) {
            detalleTarget.setCocinado(true);
            insumoService.descontarInsumosPorPedido(detalleTarget.getProducto().getId(), detalleTarget.getCantidad());

            insumoProductoRepository.findByProductoId(detalleTarget.getProducto().getId()).stream()
                    .filter(ip -> ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria()))
                    .findFirst()
                    .ifPresent(ip -> proteinaService.descontarPorcionesPorVenta(ip.getInsumo().getId(), detalleTarget.getCantidad()));
        }

        // LÓGICA DE SEMÁFORO GLOBAL RECALCULADA:
        boolean tieneFrioPendiente = p.getListaDetalles().stream()
                .anyMatch(d -> !d.isCocinado() && (d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRI")
                        || d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRÍ")));

        boolean tieneCalientePendiente = p.getListaDetalles().stream()
                .anyMatch(d -> !d.isCocinado() && d.getProducto().getCategoria().getNombre().toUpperCase().contains("CALIENTE"));

        p.setFrioListo(!tieneFrioPendiente);
        p.setCalienteListo(!tieneCalientePendiente);

        if (!tieneFrioPendiente && !tieneCalientePendiente) {
            p.setEstado(EstadoPedido.PREPARADO);
        }

        pedidoRepository.save(p);
    }

    // =========================================================================
    // 🔥 CONTROL MICROSCOPIO: ENTREGAR PLATO INDIVIDUAL EN MESA
    // =========================================================================
    @Transactional
    public void entregarPlatoIndividual(Long pedidoId, Long detalleId) { // 💡 Cambiado de productoId a detalleId
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() == null) return;

        // 💡 SOLUCIÓN: Buscamos usando d.getId() (ID de la fila 67) igual que en cocina
        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Plato no mapeado en comanda"));

        // Activamos la bandera de entregado para reflejar el estado en la base de datos
        detalleTarget.setEntregado(true);

        System.out.println("DEBUG SALÓN -> Entregado conforme en mesa: " + detalleTarget.getProducto().getNombre());

        // Tu lógica original de semáforo global para el lote mantenida intacta:
        boolean todosEntregados = p.getListaDetalles().stream().allMatch(DetallePedido::isCocinado);
        if (todosEntregados) {
            p.setEstado(EstadoPedido.ASIGNADO);
        }

        pedidoRepository.save(p);
    }

    // --- FLUJOS DE LOGÍSTICA DE TRASLADO MANTENIDOS INTEGRALMENTE ---
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
                    if ("fria".equalsIgnoreCase(tipoEstacion) && (catNombre.contains("FRI") || catNombre.contains("FRÍ"))) {
                        d.setCocinado(true);
                        insumoService.descontarInsumosPorPedido(d.getProducto().getId(), d.getCantidad());

                        insumoProductoRepository.findByProductoId(d.getProducto().getId()).stream()
                                .filter(ip -> ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria()))
                                .findFirst()
                                .ifPresent(ip -> proteinaService.descontarPorcionesPorVenta(ip.getInsumo().getId(), d.getCantidad()));
                    }
                    if ("caliente".equalsIgnoreCase(tipoEstacion) && catNombre.contains("CALIENTE")) {
                        d.setCocinado(true);
                        insumoService.descontarInsumosPorPedido(d.getProducto().getId(), d.getCantidad());

                        insumoProductoRepository.findByProductoId(d.getProducto().getId()).stream()
                                .filter(ip -> ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria()))
                                .findFirst()
                                .ifPresent(ip -> proteinaService.descontarPorcionesPorVenta(ip.getInsumo().getId(), d.getCantidad()));
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
        pedidoRepository.actualizarEstadoJPQL(id, EstadoPedido.PAGADO);
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
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(EstadoPedido.EN_COCINA);
        pedidoRepository.save(pedido);
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
    public void eliminarItemComanda(Long pedidoId, Long detalleId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con ID: " + pedidoId));

        if (pedido.getListaDetalles() == null) return;

        // Localizamos la fila exacta del plato que se desea remover
        DetallePedido detalleTarget = pedido.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Línea de comanda no encontrada ID: " + detalleId));

        if (detalleTarget.isImpresoEnCocina()) {
            // CASO A: El ticket YA se imprimió -> Se vuelve MERMA
            System.out.println("DEBUG OPERATIVO -> Ítem impreso. Cambiando estado a MERMA.");
            detalleTarget.setCanceladoPorCliente(true);

        } else {
            // CASO B: El ticket NO se ha impreso -> ELIMINACIÓN LIMPIA (Remoción física)
            System.out.println("DEBUG OPERATIVO -> Ítem NO impreso. Borrando por completo de la comanda.");

            // Lo quitamos de la lista. Gracias a orphanRemoval=true, JPA ejecutará el DELETE SQL
            pedido.getListaDetalles().remove(detalleTarget);
            detalleTarget.setPedido(null);
        }

        // En ambos casos recalculamos el monto total usando tu método correcto: setMontoTotal
        recalcularTotalesPedido(pedido);

        pedidoRepository.save(pedido);
    }

    private void recalcularTotalesPedido(Pedido pedido) {
        // Sumamos solo los platos activos (que NO son merma ni cancelación)
        double nuevoTotal = pedido.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .mapToDouble(d -> d.getPrecioUnitario() * d.getCantidad())
                .sum();

        // Seteamos el valor usando tu atributo real mapeado en la entidad
        pedido.setMontoTotal(nuevoTotal);
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


}