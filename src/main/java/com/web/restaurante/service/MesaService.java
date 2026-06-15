package com.web.restaurante.service;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.dto.mesas.TicketDTO;
import com.web.restaurante.mapper.MesaMapper;
import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MesaService {

    private final MesaRepository mesaRepository;
    private final PedidoRepository pedidoRepository;
    private final MesaMapper mesaMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final TurnoCajaService turnoCajaService;


    public List<MesaDTO> obtenerMesasParaSalon() {
        List<Mesa> mesasEntidad = mesaRepository.findAll();

        return mesasEntidad.stream().map(mesa -> {
            MesaDTO dto = mesaMapper.toDTO(mesa);
            if (mesa.getMesaPadre() != null) dto.setIdMesaPadre(mesa.getMesaPadre().getId());
            if (mesa.getMesasHijas() != null && !mesa.getMesasHijas().isEmpty()) {
                dto.setNumerosMesasHijas(mesa.getMesasHijas().stream().map(Mesa::getNumero).toList());
            }
            return dto;
        }).toList();
    }

    public List<Pedido> obtenerPedidosActivos() {
        return pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();
    }

    @Transactional
    public void entregarPlatoEnMesa(Integer idMesa) {
        List<Pedido> pedidosPendientes = pedidoRepository.findByNumeroMesaAndEstado(idMesa, EstadoPedido.PENDIENTE);
        if (pedidosPendientes.isEmpty()) throw new RuntimeException("No se encontró pedido pendiente para esta mesa");
        Pedido p = pedidosPendientes.get(pedidosPendientes.size() - 1);
        p.setEstado(EstadoPedido.ENTREGADO);
        pedidoRepository.save(p);
    }

    @Transactional
    public void entregarPlatoIndividual(Long pedidoId, Long detalleId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Plato no mapeado en comanda"));

        detalleTarget.setEntregado(true);

        boolean todosEntregados = p.getListaDetalles().stream().allMatch(DetallePedido::isEntregado);
        if (todosEntregados) {
            p.setEstado(EstadoPedido.ASIGNADO);
        }

        pedidoRepository.save(p);
    }

    @Transactional
    public void liberarYFacturarMesa(Long idMesa) {
        Mesa mesaClickeada = mesaRepository.findById(idMesa)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        Mesa mesaPrincipal = (mesaClickeada.getMesaPadre() != null) ? mesaClickeada.getMesaPadre() : mesaClickeada;

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesaPrincipal.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            boolean todosEntregados = p.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .allMatch(DetallePedido::isEntregado);

            if (!todosEntregados) {
                throw new RuntimeException("No se puede facturar la Mesa N° " + mesaPrincipal.getNumero()
                        + ". Aún hay platos pendientes de entregar en salón.");
            }
        }

        for (Pedido p : pedidosActivos) {
            p.setEstado(EstadoPedido.PAGADO);
            p.setNumeroMesa(null);
            p.setFechaEntrega(LocalDateTime.now());
            pedidoRepository.save(p);
        }

        mesaPrincipal.setEstado("DISPONIBLE");
        mesaRepository.save(mesaPrincipal);

        if (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty()) {
            for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
            }
            mesaPrincipal.getMesasHijas().clear();
            mesaRepository.save(mesaPrincipal);
        }
    }

    public Map<String, Object> generarPrecuenta(Integer numeroMesa) {
        List<Pedido> pedidos = pedidoRepository.findByNumeroMesa(numeroMesa).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO).toList();

        if (pedidos.isEmpty()) return null;
        Pedido pedidoActivo = pedidos.get(pedidos.size() - 1);

        List<DetallePedido> detallesPendientes = pedidoActivo.getListaDetalles().stream()
                .filter(d -> !d.isPagado())
                .toList();

        double totalReal = detallesPendientes.stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();

        pedidoActivo.setMontoTotal(totalReal);
        pedidoRepository.save(pedidoActivo);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("idPedido", pedidoActivo.getId());
        respuesta.put("montoTotal", totalReal);
        respuesta.put("detalles", detallesPendientes);
        return respuesta;
    }

    @Transactional
    public void procesarCobro(Long pedidoId, Long mesaId, List<Long> idsDetallesPagados) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (idsDetallesPagados != null && !idsDetallesPagados.isEmpty()) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                if (idsDetallesPagados.contains(detalle.getId())) {
                    detalle.setPagado(true);
                }
            }
        }

        boolean quedanPendientes = pedido.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());

        if (quedanPendientes) {
            double nuevoTotal = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                    .sum();
            pedido.setMontoTotal(nuevoTotal);
            pedidoRepository.save(pedido);
        } else {
            pedido.setEstado(EstadoPedido.PAGADO);
            pedido.setNumeroMesa(null);
            pedido.setFechaEntrega(LocalDateTime.now());
            pedidoRepository.save(pedido);

            Mesa mesaPrincipal = mesaRepository.findById(mesaId)
                    .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

            if (mesaPrincipal.getMesaPadre() != null) {
                mesaPrincipal = mesaPrincipal.getMesaPadre();
            }

            // ⚙️ REPARADO: Removemos el registro prematuro para que la mesa espere su comprobante fiscal en la caja
            // String conceptoCobro = "Liquidación Comanda #" + pedidoId + " - Mesa N° " + mesaPrincipal.getNumero();
            // turnoCajaService.registrarVenta(conceptoCobro, pedido.getMontoTotal());

            // Tu lógica de liberación de salón se mantiene intacta abajo
            mesaPrincipal.setEstado("DISPONIBLE");

            if (mesaPrincipal.getMesasHijas() != null) {
                for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                    hija.setMesaPadre(null);
                    hija.setEstado("DISPONIBLE");
                    mesaRepository.save(hija);
                }
                mesaPrincipal.getMesasHijas().clear();
            }
            mesaRepository.save(mesaPrincipal);
        }
    }

    @Transactional
    public void desvincularMesa(Long idMesa) {
        Mesa mesa = mesaRepository.findById(idMesa).orElseThrow(() -> new RuntimeException("Mesa no encontrada"));
        mesa.setMesaPadre(null);
        mesa.setEstado("DISPONIBLE");
        mesaRepository.save(mesa);
    }

    @Transactional
    public void desagruparGrupoCompleto(Long idMesaPadre) {
        Mesa padre = mesaRepository.findById(idMesaPadre).orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));
        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(padre.getNumero()).stream()
                .filter(p -> p.getEstado() == EstadoPedido.EN_COCINA || p.getEstado() == EstadoPedido.PENDIENTE).toList();

        if (!pedidosActivos.isEmpty()) throw new RuntimeException("No se puede desagrupar. Hay pedidos activos en cocina.");

        if (padre.getMesasHijas() != null) {
            for (Mesa hija : padre.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
            }
        }
    }

    @Transactional
    public void unificarMesas(Long idMesaPrincipal, List<Long> idsMesasHijas) {
        Mesa mesaPadre = mesaRepository.findById(idMesaPrincipal).orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));
        List<Pedido> pedidosPadre = pedidoRepository.findByNumeroMesa(mesaPadre.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO).toList();
        Pedido pedidoPadreActivo = pedidosPadre.isEmpty() ? null : pedidosPadre.get(pedidosPadre.size() - 1);

        for (Long idHija : idsMesasHijas) {
            Mesa hija = mesaRepository.findById(idHija).orElseThrow();
            hija.setMesaPadre(mesaPadre);
            hija.setEstado("UNIFICADA");
            mesaRepository.save(hija);

            List<Pedido> pedidosHija = pedidoRepository.findByNumeroMesa(hija.getNumero()).stream()
                    .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO).toList();

            for (Pedido pHija : pedidosHija) {
                if (pedidoPadreActivo == null) {
                    pHija.setNumeroMesa(mesaPadre.getNumero());
                    pedidoRepository.save(pHija);
                    pedidoPadreActivo = pHija;
                } else {
                    if (pHija.getListaDetalles() != null) {
                        for (DetallePedido detalle : pHija.getListaDetalles()) {
                            detalle.setPedido(pedidoPadreActivo);
                            pedidoPadreActivo.getListaDetalles().add(detalle);
                            pedidoPadreActivo.setMontoTotal(pedidoPadreActivo.getMontoTotal() + detalle.getSubtotal());
                        }
                    }
                    pHija.setEstado(EstadoPedido.CANCELADO);
                    pedidoRepository.save(pHija);
                    pedidoRepository.save(pedidoPadreActivo);
                }
            }
        }
    }

    @Transactional
    public void eliminarDetallePedido(Long pedidoId, Long detalleId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        DetallePedido detalle = pedido.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId) && !d.isCanceladoPorCliente())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("El producto no está en la comanda o ya fue cancelado"));

        if (!detalle.isImpresoEnCocina()) {
            pedido.getListaDetalles().remove(detalle);
            double nuevoTotal = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
            pedido.setMontoTotal(nuevoTotal);
        } else {
            detalle.setCanceladoPorCliente(true);
            String nombrePlato = detalle.getProducto().getNombre().toUpperCase();
            String mesaAviso = (pedido.getNumeroMesa() != null) ? "MESA " + pedido.getNumeroMesa() : "DELIVERY";
            messagingTemplate.convertAndSend("/topic/notificaciones", "🚨 ALERTA DE MERMA: ¡DETENER " + nombrePlato + " DE LA " + mesaAviso + "!");
        }
        pedidoRepository.save(pedido);
    }

    public void liberarMesaForzado(Long idMesa) {
        Mesa mesaClickeada = mesaRepository.findById(idMesa)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        Mesa mesaPrincipal = (mesaClickeada.getMesaPadre() != null) ? mesaClickeada.getMesaPadre() : mesaClickeada;

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesaPrincipal.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            p.setEstado(EstadoPedido.PAGADO);
            p.setNumeroMesa(null);
            p.setFechaEntrega(LocalDateTime.now());
            pedidoRepository.save(p);
        }

        mesaPrincipal.setEstado("DISPONIBLE");
        mesaRepository.save(mesaPrincipal);

        if (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty()) {
            for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
            }
            mesaPrincipal.getMesasHijas().clear();
            mesaRepository.save(mesaPrincipal);
        }
    }

    @Transactional
    public void trasladarComandaDeMesa(Long idMesaOrigen, Long idMesaDestino) {
        Mesa origen = mesaRepository.findById(idMesaOrigen)
                .orElseThrow(() -> new RuntimeException("Mesa de origen no encontrada"));
        Mesa destino = mesaRepository.findById(idMesaDestino)
                .orElseThrow(() -> new RuntimeException("Mesa de destino no encontrada"));

        if (!"DISPONIBLE".equals(destino.getEstado()) || destino.getMesaPadre() != null) {
            throw new RuntimeException("La mesa de destino N° " + destino.getNumero() + " no está disponible.");
        }

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        if (pedidosActivos.isEmpty()) {
            throw new RuntimeException("No se encontró una comanda activa en la Mesa N° " + origen.getNumero());
        }

        Pedido pedido = pedidosActivos.get(pedidosActivos.size() - 1);

        pedido.setNumeroMesa(destino.getNumero());
        pedidoRepository.save(pedido);

        origen.setEstado("DISPONIBLE");
        destino.setEstado("OCUPADA");

        mesaRepository.save(origen);
        mesaRepository.save(destino);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "🔄 CAMBIO DE MESA: La comanda de la Mesa " + origen.getNumero() + " se trasladó a la Mesa " + destino.getNumero());
    }

    // 🌟 MÉTODO CORREGIDO Y ENFOCADO A LA CONSISTENCIA DE HIBERNATE (SPLIT DE COMANDA)
    @Transactional
    public void dividirYTrasladarPlatos(Long idMesaOrigen, Long idMesaDestino, List<Long> idsDetallesAMover) {
        Mesa origen = mesaRepository.findById(idMesaOrigen)
                .orElseThrow(() -> new RuntimeException("Mesa de origen no encontrada"));
        Mesa destino = mesaRepository.findById(idMesaDestino)
                .orElseThrow(() -> new RuntimeException("Mesa de destino no encontrada"));

        // 1. Obtener la comanda activa de la mesa origen
        List<Pedido> pedidosOrigen = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();
        if (pedidosOrigen.isEmpty()) {
            throw new RuntimeException("No hay comanda activa en la mesa de origen.");
        }
        Pedido pedidoOrigen = pedidosOrigen.get(pedidosOrigen.size() - 1);

        // 2. Buscar o crear la comanda en la mesa de destino
        List<Pedido> pedidosDestino = pedidoRepository.findByNumeroMesa(destino.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        Pedido pedidoDestino;
        if (pedidosDestino.isEmpty()) {
            pedidoDestino = new Pedido();
            pedidoDestino.setCliente("Mesa " + destino.getNumero());
            pedidoDestino.setDireccion("Salón");
            pedidoDestino.setNumeroMesa(destino.getNumero());
            pedidoDestino.setTipoPedido(pedidoOrigen.getTipoPedido());
            pedidoDestino.setEstado(EstadoPedido.PENDIENTE);
            pedidoDestino.setMontoTotal(0.0);
            pedidoDestino.setListaDetalles(new ArrayList<>()); // Inicializado correctamente como mutable
            destino.setEstado("OCUPADA");
            mesaRepository.save(destino);
        } else {
            pedidoDestino = pedidosDestino.get(pedidosDestino.size() - 1);
        }

        // 3. 🛡️ AJUSTE SEGURO: Filtrar los platos a mover y removerlos de manera segura usando removeIf
        List<DetallePedido> detallesAMover = new ArrayList<>();

        // Buscamos y guardamos las referencias de los platos correspondientes
        for (DetallePedido d : pedidoOrigen.getListaDetalles()) {
            if (idsDetallesAMover.contains(d.getId())) {
                detallesAMover.add(d);
            }
        }

        // Removemos de forma segura del origen sin romper la iteración interna de Hibernate
        pedidoOrigen.getListaDetalles().removeIf(d -> idsDetallesAMover.contains(d.getId()));

        // Vinculamos de forma segura a la comanda destino
        for (DetallePedido detalle : detallesAMover) {
            detalle.setPedido(pedidoDestino);
            pedidoDestino.getListaDetalles().add(detalle);
        }

        // 4. Si la mesa de origen se quedó sin ningún plato vivo, la liberamos automáticamente
        boolean quedanPlatosOrigen = pedidoOrigen.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());

        if (!quedanPlatosOrigen) {
            pedidoOrigen.setEstado(EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);
            origen.setEstado("DISPONIBLE");
            mesaRepository.save(origen);
        } else {
            double totalOrigen = pedidoOrigen.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
            pedidoOrigen.setMontoTotal(totalOrigen);
        }

        // 5. Recalculamos total de la mesa destino
        double totalDestino = pedidoDestino.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
        pedidoDestino.setMontoTotal(totalDestino);

        // 6. Guardar cambios en la base de datos
        pedidoRepository.save(pedidoOrigen);
        pedidoRepository.save(pedidoDestino);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "✂️ SPLIT DE COMANDA: Platos movidos de la Mesa " + origen.getNumero() + " a la Mesa " + destino.getNumero());
    }

    // =========================================================================
    // 🌟 LIQUIDACIÓN MULTITICKET SIN ERRORES DE DEREFERENCIACIÓN DE HIBERNATE
    // =========================================================================
    @Transactional
    public void procesarLiquidacionMultiticket(Long pedidoId, Long mesaId, List<TicketDTO> tickets, List<Long> idsDetallesPagados) {

        Pedido pedidoPadre = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido original N° " + pedidoId + " no encontrado"));

        Mesa mesa = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;

        // 1. Desvinculamos o limpiamos de forma segura las referencias físicas viejas del pedido padre
        // para evitar conflictos de claves primarias duplicadas si Jackson intenta sobrescribir
        List<DetallePedido> detallesOriginalesGuardados = new ArrayList<>(pedidoPadre.getListaDetalles());

        // 2. Procesamos secuencialmente cada ticket enviado por la caja móvil
        for (int i = 0; i < tickets.size(); i++) {
            TicketDTO t = tickets.get(i);

            if (t.getConsumoFinal() <= 0) continue;

            Pedido pedidoDestino;
            if (i == 0) {
                pedidoDestino = pedidoPadre;
                pedidoDestino.getListaDetalles().clear(); // Mantiene el proxy de Hibernate intacto
            } else {
                pedidoDestino = new Pedido();
                pedidoDestino.setCliente("Mesa " + mesaPrincipal.getNumero() + " - Ticket " + (i + 1));
                pedidoDestino.setDireccion("Salón");
                pedidoDestino.setTipoPedido(pedidoPadre.getTipoPedido());
                pedidoDestino.setNumeroMesa(mesaPrincipal.getNumero());
                pedidoDestino.setFechaCreacion(pedidoPadre.getFechaCreacion());
                pedidoDestino.setListaDetalles(new ArrayList<>());
            }

            pedidoDestino.setPreferenciaComprobante(t.getTipoDoc().toUpperCase());
            pedidoDestino.setDocumentoCliente(t.getNumDoc() != null ? t.getNumDoc().trim() : "");
            pedidoDestino.setMontoTotal(t.getConsumoFinal());
            pedidoDestino.setEstado(EstadoPedido.PAGADO);
            pedidoDestino.setFechaEntrega(LocalDateTime.now());

            // Asignación de métodos de pago homologados
            String metodoStr = t.getMetodoPago() != null ? t.getMetodoPago().toUpperCase() : "EFECTIVO";
            if (metodoStr.contains("YAPE") || metodoStr.contains("PLIN")) {
                pedidoDestino.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.YAPE);
            } else if (metodoStr.contains("TARJETA")) {
                pedidoDestino.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.TARJETA);
            } else {
                pedidoDestino.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.EFECTIVO);
            }

            // 🚀 LA INYECCIÓN CLAVE: Leemos la 'listaDetalles' procesada por el JS dentro del TicketDTO
            if (t.getListaDetalles() != null && !t.getListaDetalles().isEmpty()) {
                for (var detalleDTO : t.getListaDetalles()) {

                    // Buscamos cuál era el plato original en la comanda de la mesa para heredar sus datos core
                    DetallePedido nuevoDetalle = new DetallePedido();
                    nuevoDetalle.setPedido(pedidoDestino);
                    nuevoDetalle.setCantidad(detalleDTO.getCantidad());
                    nuevoDetalle.setPagado(true);
                    nuevoDetalle.setEntregado(true);
                    nuevoDetalle.setCocinado(true);

                    // Recuperamos la entidad Producto real mapeando el ID
                    DetallePedido coincidenciaOriginal = detallesOriginalesGuardados.stream()
                            .filter(d -> d.getId().equals(detalleDTO.getProductoId()) ||
                                    (d.getProducto() != null && d.getProducto().getId().equals(detalleDTO.getProductoId())))
                            .findFirst().orElse(null);

                    if (coincidenciaOriginal != null) {
                        nuevoDetalle.setProducto(coincidenciaOriginal.getProducto());
                    }

                    // Seteamos el precio prorrateado o individual real calculado en JS
                    nuevoDetalle.setPrecioUnitario(detalleDTO.getPrecioUnitario());
                    nuevoDetalle.setSubtotal(detalleDTO.getSubtotal());

                    // Lo insertamos físicamente en la comanda procesada
                    pedidoDestino.getListaDetalles().add(nuevoDetalle);
                }
            }

            // Guardamos el pedido con sus filas reales mapeadas en la tabla 'pedido_detalle'
            pedidoRepository.save(pedidoDestino);
        }

        // 4. Liberar la mesa en el salón
        mesaPrincipal.setEstado("DISPONIBLE");
        if (mesaPrincipal.getMesasHijas() != null) {
            for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
            }
            mesaPrincipal.getMesasHijas().clear();
        }
        mesaRepository.save(mesaPrincipal);
    }
}