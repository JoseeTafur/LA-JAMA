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

    // =========================================================================
    // 🔄 TRASLADO COMPLETO REPARADO: CONSOLIDACIÓN DE PLATOS Y WEBSOCKETS EN VIVO
    // =========================================================================
    @Transactional
    public void trasladarComandaDeMesa(Long idMesaOrigen, Long idMesaDestino) {
        Mesa origen = mesaRepository.findById(idMesaOrigen)
                .orElseThrow(() -> new RuntimeException("Mesa origen no encontrada"));
        Mesa destino = mesaRepository.findById(idMesaDestino)
                .orElseThrow(() -> new RuntimeException("Mesa destino no encontrada"));

        // 1. Obtener la comanda viva de la mesa de origen
        Pedido pedidoOrigen = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No hay comanda activa en la mesa origen"));

        // Buscar si la mesa destino ya cuenta con una comanda activa abierta
        Pedido pedidoDestino = pedidoRepository.findByNumeroMesa(destino.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .findFirst()
                .orElse(null);

        if (pedidoDestino == null) {
            // ESCENARIO A: La mesa destino estaba vacía. Trasladamos el puntero completo de la orden.
            pedidoOrigen.setNumeroMesa(destino.getNumero());
            pedidoOrigen.setCliente("Mesa " + destino.getNumero());
            pedidoRepository.save(pedidoOrigen);

            boolean esDestinoGrupo = (destino.getMesasHijas() != null && !destino.getMesasHijas().isEmpty());
            destino.setEstado(esDestinoGrupo ? "UNIFICADA" : "OCUPADA");
        } else {
            // ESCENARIO B: La mesa destino ya tenía consumos. Fusión segura para evitar error de colección de Hibernate.
            System.out.println("🔮 [LaJama ORM] Fusionando platos en colección existente de Mesa " + destino.getNumero());

            // Clonamos la lista origen para iterar sin provocar ConcurrentModificationException
            List<DetallePedido> detallesOrigen = new ArrayList<>(pedidoOrigen.getListaDetalles());

            for (DetallePedido detalle : detallesOrigen) {
                // Desvinculamos del origen y acoplamos de forma segura rastreada al destino
                detalle.setPedido(pedidoDestino);
                pedidoDestino.getListaDetalles().add(detalle);
            }

            // Vaciamos la lista de la comanda vieja origen para activar el orphan removal sin lanzar excepciones
            pedidoOrigen.getListaDetalles().clear();
            pedidoOrigen.setEstado(EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);

            // Recalculamos el total consolidado de la mesa destino
            double totalConsolidado = pedidoDestino.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .mapToDouble(DetallePedido::getSubtotal).sum();
            pedidoDestino.setMontoTotal(totalConsolidado);

            pedidoRepository.save(pedidoDestino);
            pedidoRepository.save(pedidoOrigen);
        }

        // 3. Sincronización estructural de los estados bases en las tablas
        origen.setEstado("DISPONIBLE");
        mesaRepository.save(origen);
        mesaRepository.save(destino);

        // =========================================================================
        // 🟩 LA SOLUCIÓN ASÍNCRONA: Forzamos el recálculo real de cocina al cierre
        // =========================================================================
        System.out.println("🔄 [Traslado Completo] Despertando motor de auditoría automatizado...");

        // Libera la mesa de origen de forma reactiva en el plano web (pasa a verde 'disponible' o conserva morado)
        recalcularYNotificarEstadoCocinaMesa(origen);

        // Audita dinámicamente los platos que acaban de llegar al destino.
        // Si hay platos listos pasará a amarillo, si hay en cocina a rojo, y si es un Grupo, clavará el morado inmutable.
        recalcularYNotificarEstadoCocinaMesa(destino);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "🔄 CAMBIO DE MESA: La comanda de la Mesa " + origen.getNumero() + " se trasladó y unificó en la Mesa " + destino.getNumero());
    }

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

        // 4. Modificación de totales y estados del origen
        boolean quedanPlatosOrigen = pedidoOrigen.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());

        if (!quedanPlatosOrigen) {
            pedidoOrigen.setEstado(EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);
            origen.setEstado("DISPONIBLE"); // Consistencia interna en mayúsculas
        } else {
            double totalOrigen = pedidoOrigen.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
            pedidoOrigen.setMontoTotal(totalOrigen);
        }

        // 5. Recalculamos total de la comanda destino
        double totalDestino = pedidoDestino.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
        pedidoDestino.setMontoTotal(totalDestino);

        // 6. Persistencia física en la Base de Datos
        pedidoRepository.save(pedidoOrigen);
        pedidoRepository.save(pedidoDestino);
        mesaRepository.save(origen);
        mesaRepository.save(destino);

        // =========================================================================
        // 🟩 LA CLAVE: Forzamos la auditoría automática de cocina para ambas mesas
        // =========================================================================
        System.out.println("🔄 [Motor de Sincronización] Recalculando estados reales pos-división...");

        // Audita y libera la mesa origen si se quedó vacía, o actualiza su color si quedan platos
        recalcularYNotificarEstadoCocinaMesa(origen);

        // Audita la mesa destino, detectando de forma exacta si pasa a "Para recoger", "En cocina", etc.
        recalcularYNotificarEstadoCocinaMesa(destino);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "✂️ SPLIT DE COMANDA: Platos distribuidos entre Mesa " + origen.getNumero() + " y Mesa " + destino.getNumero());
    }

    // =========================================================================
    // 🌟 ARQUITECTURA CORE: LIQUIDACIÓN MULTITICKET OPERATIVA Y GRUPOS PERMANENTES
    // =========================================================================
    @Transactional
    public void procesarLiquidacionMultiticket(Long pedidoId, Long mesaId, List<TicketDTO> tickets, List<Long> idsDetallesPagados) {

        System.out.println("\n========================================================================");
        System.out.println("🔍 [DEBUG HIBERNATE - INDESTRUCTIBILIDAD DE GRUPOS] procesarLiquidacionMultiticket");
        System.out.println("➡️ ID Pedido Padre: " + pedidoId + " | ID Mesa: " + mesaId);
        System.out.println("========================================================================");

        Pedido pedidoPadre = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido original N° " + pedidoId + " no encontrado"));

        Mesa mesa = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;

        // Clonamos la lista original para heredar los objetos de Producto de forma fendedigna
        List<DetallePedido> detallesOriginalesGuardados = new ArrayList<>(pedidoPadre.getListaDetalles());

        // 1. PROCESAMIENTO DE SUB-TICKETS: Registramos cada ticket de pago en la base de datos
        for (int i = 0; i < tickets.size(); i++) {
            TicketDTO t = tickets.get(i);
            if (t.getConsumoFinal() <= 0) continue;

            System.out.println("👉 Generando Sub-Ticket de Pago N° " + (i + 1) + " — Monto: S/. " + t.getConsumoFinal());

            Pedido pedidoComprobante = new Pedido();
            pedidoComprobante.setCliente("Mesa " + mesaPrincipal.getNumero() + " - Ticket " + (i + 1));
            pedidoComprobante.setDireccion("Salón");
            pedidoComprobante.setTipoPedido(pedidoPadre.getTipoPedido());

            // 🟩 CORRECCIÓN DE CAJA: Mantenemos el número de la mesa controladora para que aparezca en la bandeja operativa de caja
            pedidoComprobante.setNumeroMesa(mesaPrincipal.getNumero());

            pedidoComprobante.setFechaCreacion(pedidoPadre.getFechaCreacion());
            pedidoComprobante.setFechaEntrega(LocalDateTime.now());
            pedidoComprobante.setEstado(EstadoPedido.PAGADO); // Se asienta como pagado en salón, listo para el timbrado manual en caja
            pedidoComprobante.setMontoTotal(t.getConsumoFinal());
            pedidoComprobante.setPreferenciaComprobante(t.getTipoDoc().toUpperCase());
            pedidoComprobante.setDocumentoCliente(t.getNumDoc() != null ? t.getNumDoc().trim() : "");

            // Homologación estricta de canales de dinero
            String metodoStr = t.getMetodoPago() != null ? t.getMetodoPago().toUpperCase() : "EFECTIVO";
            if (metodoStr.contains("YAPE") || metodoStr.contains("PLIN")) {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.YAPE);
            } else if (metodoStr.contains("TARJETA")) {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.TARJETA);
            } else {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.EFECTIVO);
            }

            pedidoComprobante.setListaDetalles(new ArrayList<>());

            if (t.getListaDetalles() != null) {
                for (int idxPlato = 0; idxPlato < t.getListaDetalles().size(); idxPlato++) {
                    var detalleDTO = t.getListaDetalles().get(idxPlato);

                    DetallePedido nuevoDetalle = new DetallePedido();
                    nuevoDetalle.setPedido(pedidoComprobante);
                    nuevoDetalle.setCantidad(detalleDTO.getCantidad());
                    nuevoDetalle.setPagado(true);
                    nuevoDetalle.setEntregado(true);
                    nuevoDetalle.setCocinado(true);

                    if (idxPlato < detallesOriginalesGuardados.size()) {
                        DetallePedido original = detallesOriginalesGuardados.get(idxPlato);
                        nuevoDetalle.setProducto(original.getProducto());
                    }

                    nuevoDetalle.setPrecioUnitario(detalleDTO.getPrecioUnitario());
                    nuevoDetalle.setSubtotal(detalleDTO.getSubtotal());

                    pedidoComprobante.getListaDetalles().add(nuevoDetalle);
                }
            }
            pedidoRepository.save(pedidoComprobante);
        }

        // 2. Extracción quirúrgica de los platos cobrados de la comanda activa del salón
        if (idsDetallesPagados != null && !idsDetallesPagados.isEmpty()) {
            pedidoPadre.getListaDetalles().removeIf(d -> idsDetallesPagados.contains(d.getId()));
        }

        // =========================================================================
        // 🧹 PASO 4 REPARADO: ENCLAVAMIENTO E INMUTABILIDAD ABSOLUTA DE MESAS HIJAS
        // =========================================================================
        System.out.println("\n🧹 [OPERACIÓN DE DESACOPLAMIENTO LOGÍSTICO] Evaluando persistencia de grupo...");

        // Comprobamos si queda algún plato vivo sin pagar en toda la comanda colectiva
        boolean quedanPlatosPorPagar = pedidoPadre.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());

        boolean esUnGrupoActivo = (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty());

        if (!quedanPlatosPorPagar) {
            // CASO A: Se pagó el 100% de la comanda actual de la mesa. El pedido padre se cierra.
            pedidoPadre.setEstado(EstadoPedido.PAGADO);
            pedidoPadre.setNumeroMesa(null); // Liberamos la cola contable
            pedidoRepository.save(pedidoPadre);
            System.out.println("💵 Cuenta actual liquidada en su totalidad.");

            // 🛡️ REGLA INMUTABLE DE LA JAMA: El grupo permanece unido pase lo que pase con el dinero.
            if (esUnGrupoActivo) {
                System.out.println("🔒 Enclavamiento activado. El bloque de mesas conserva su estructura unificada.");
                mesaPrincipal.setEstado("unificada");
                mesaRepository.save(mesaPrincipal);

                // Forzamos al WebSocket a emitir el estado 'unificada' para la mesa principal y todas sus hijas
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "unificada", null, "NINGUNO");

                for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                    hija.setEstado("unificada");
                    mesaRepository.save(hija);
                    emitirCambioEstadoReactivo(hija.getNumero(), "unificada", null, "NINGUNO");
                }
            } else {
                // Si era una mesa común e independiente, se libera de forma ordinaria
                mesaPrincipal.setEstado("disponible");
                mesaRepository.save(mesaPrincipal);
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "disponible", null, "NINGUNO");
            }

        } else {
            // CASO B: Pago parcial, split o mitades.
            double nuevoSaldoRestante = pedidoPadre.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                    .sum();
            pedidoPadre.setMontoTotal(nuevoSaldoRestante);
            pedidoRepository.save(pedidoPadre);
            System.out.println("✂️ Pago parcial procesado. Nuevo saldo de la comanda viva: S/. " + nuevoSaldoRestante);

            if (esUnGrupoActivo) {
                mesaPrincipal.setEstado("unificada");
                mesaRepository.save(mesaPrincipal);
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "unificada", pedidoPadre.getId(), "ATENDIDO");

                for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                    // SE CONSERVA LA LEALTAD AL PADRE: Jamás mutan a disponible ni se rompe la relación
                    hija.setEstado("unificada");
                    mesaRepository.save(hija);
                    emitirCambioEstadoReactivo(hija.getNumero(), "unificada", null, "NINGUNO");
                }
            } else {
                mesaPrincipal.setEstado("ocupada");
                mesaRepository.save(mesaPrincipal);
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "ocupada", pedidoPadre.getId(), "ATENDIDO");
            }
        }
        System.out.println("========================================================================\n");
    }

    // =========================================================================
// 🔄 MOTOR CORE REPARADO: MÁQUINA DE ESTADOS FINITOS CON ENCLAVAMIENTO MORADO
// =========================================================================
    private void recalcularYNotificarEstadoCocinaMesa(Mesa mesaTarget) {
        if (mesaTarget == null) return;

        Mesa mesaPrincipal = (mesaTarget.getMesaPadre() != null) ? mesaTarget.getMesaPadre() : mesaTarget;

        // 1. Extraemos las comandas vivas vigentes en el salón
        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesaPrincipal.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        boolean esUnGrupoFisicoActivo = (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty());

        // Si la mesa se quedó con 0 platos vivos por traslado completo
        if (pedidosActivos.isEmpty()) {
            // 🛡️ REGLA INMUTABLE: Si es un grupo, se queda morado ('unificada') pase lo que pase con la comida
            String estadoFinal = esUnGrupoFisicoActivo ? "unificada" : "disponible";

            mesaPrincipal.setEstado(estadoFinal.toUpperCase());
            mesaRepository.save(mesaPrincipal);

            emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), estadoFinal, null, "NINGUNO");
            return;
        }

        Pedido comandaViva = pedidosActivos.get(pedidosActivos.size() - 1);

        // 2. Evaluamos el avance logístico real en las líneas de fuego de la cocina
        boolean tienePlatosEnCocina = comandaViva.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado() && !d.isCocinado());

        boolean tienePlatosListosBarra = comandaViva.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado() && d.isCocinado() && !d.isEntregado());

        // 3. MÁQUINA DE DECISIONES CON PRIORIDAD DE JERARQUÍA (Tu Caso Único Solucionado)
        String nuevoEstadoCromatico = "ocupada";
        EstadoPedido nuevoEstadoPedido = EstadoPedido.PENDIENTE;

        if (esUnGrupoFisicoActivo) {
            // 👑 PRIORIDAD ABSOLUTA DE LA JAMA: Si la mesa es Padre, ¡EL ESTADO MORADO TIENE PODER SUPREMO!
            // No importa el estado de los platos de cocina, la mesa permanece 'unificada' en el plano general
            System.out.println("🔒 [Enclavamiento Morado] Protegiendo color de Mesa Controladora N° " + mesaPrincipal.getNumero());
            nuevoEstadoCromatico = "unificada";

            // Sincronizamos el estado interno de la comanda según el avance real para los mozos
            if (tienePlatosEnCocina) {
                nuevoEstadoPedido = EstadoPedido.PENDIENTE;
            } else if (tienePlatosListosBarra) {
                nuevoEstadoPedido = EstadoPedido.ASIGNADO;
            } else {
                nuevoEstadoPedido = EstadoPedido.ASIGNADO;
            }
        } else {
            // Si es una mesa ordinaria e independiente de salón, corre el algoritmo regular
            if (tienePlatosEnCocina) {
                nuevoEstadoCromatico = "ocupada"; // Rojo "En Cocina"
                nuevoEstadoPedido = EstadoPedido.PENDIENTE;
            } else if (tienePlatosListosBarra) {
                nuevoEstadoCromatico = "lista-para-recoger"; // Amarillo "Para Recoger"
                nuevoEstadoPedido = EstadoPedido.ASIGNADO;
            } else {
                nuevoEstadoCromatico = "lista-para-pagar"; // Verde "Listo para pagar"
                nuevoEstadoPedido = EstadoPedido.ASIGNADO;
            }
        }

        // 4. Consistencia atómica en la persistencia de la Base de Datos
        comandaViva.setEstado(nuevoEstadoPedido);
        pedidoRepository.save(comandaViva);

        mesaPrincipal.setEstado(nuevoEstadoCromatico.toUpperCase());
        mesaRepository.save(mesaPrincipal);

        // 🚀 INYECCIÓN REACTIVA: Empujamos el veredicto real al WebSocket al instante
        emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), nuevoEstadoCromatico, comandaViva.getId(), nuevoEstadoPedido.name());
    }

    // 🛰️ Helper encapsulado para la mensajería asíncrona reactiva hacia el plano
    private void emitirCambioEstadoReactivo(Integer numeroMesa, String estado, Long pedidoId, String pedidoEstado) {
        try {
            String jsonEvent = String.format(
                    "{\"numeroMesa\": %d, \"nuevoEstado\": \"%s\", \"pedidoId\": %s, \"pedidoEstado\": \"%s\"}",
                    numeroMesa, estado, (pedidoId != null ? pedidoId : "null"), pedidoEstado
            );
            messagingTemplate.convertAndSend("/topic/mesas/estados", jsonEvent);
        } catch(Exception e) {
            System.err.println("⚠️ Canal WebSocket ocupado temporalmente.");
        }
    }
}