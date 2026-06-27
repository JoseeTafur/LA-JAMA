package com.web.restaurante.service;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.dto.mesas.TicketDTO;
import com.web.restaurante.mapper.MesaMapper;
import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPago;
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

    private final NotaVentaSequenceService notaVentaSequenceService;
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

            dto.setEnReserva(mesa.isEnReserva());

            return dto;
        }).toList();
    }

    public List<Pedido> obtenerPedidosActivos() {
        return pedidoRepository.findAll().stream()
                .filter(p -> p.getNumeroMesa() != null)
                .filter(p -> !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()))
                .filter(p -> {
                    boolean yaPagado = com.web.restaurante.model.enums.EstadoPago.PAGADO.equals(p.getEstadoPago());
                    boolean yaEntregado = com.web.restaurante.model.enums.EstadoPedido.ENTREGADO.equals(p.getEstado());

                    return !(yaPagado && yaEntregado);
                })
                .toList();
    }

    @Transactional
    public void entregarPlatoEnMesa(Integer idMesa) {
        List<Pedido> pedidosPendientes = pedidoRepository.findByNumeroMesa(idMesa).stream()
                .filter(p -> p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.EN_COCINA
                        || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.PREPARADO)
                .toList();

        if (pedidosPendientes.isEmpty()) throw new RuntimeException("No se encontró pedido activo para esta mesa");
        Pedido p = pedidosPendientes.get(pedidosPendientes.size() - 1);
        p.setEstado(com.web.restaurante.model.enums.EstadoPedido.ENTREGADO);
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

        boolean todosEntregados = p.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .allMatch(DetallePedido::isEntregado);

        if (todosEntregados) {
            p.setEstado(EstadoPedido.ENTREGADO);
            p.setFechaEntrega(LocalDateTime.now());

            // 🛡️ RESPALDO CRÍTICO: Guardamos el número de mesa antes de limpiarlo
            Integer numeroMesaRespaldo = p.getNumeroMesa();

            if (EstadoPago.PAGADO.equals(p.getEstadoPago())) {
                p.setNumeroMesa(null); // Ahora sí lo desvinculamos de forma segura

                if (numeroMesaRespaldo != null) {
                    mesaRepository.findByNumero(numeroMesaRespaldo).ifPresent(mesa -> {
                        Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;
                        mesaPrincipal.setEstado("DISPONIBLE");
                        mesaRepository.save(mesaPrincipal);

                        // 🚀 Mandamos la ráfaga al WebSocket para que el plano la pinte de verde al instante
                        emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "disponible", null, "NINGUNO");
                    });
                }
            } else {
                // Si no está pagado, se queda en el plano esperando cobro
                if (numeroMesaRespaldo != null) {
                    mesaRepository.findByNumero(numeroMesaRespaldo).ifPresent(mesa -> {
                        Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;
                        mesaPrincipal.setEstado("OCUPADA");
                        mesaRepository.save(mesaPrincipal);
                        emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "ocupada", p.getId(), "ENTREGADO");
                    });
                }
            }
        } else {
            mesaRepository.findByNumero(p.getNumeroMesa()).ifPresent(this::recalcularYNotificarEstadoCocinaMesa);
        }

        pedidoRepository.save(p);
    }

    @Transactional
    public void liberarYFacturarMesa(Long idMesa) {
        Mesa mesaClickeada = mesaRepository.findById(idMesa)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        Mesa mesaPrincipal = (mesaClickeada.getMesaPadre() != null) ? mesaClickeada.getMesaPadre() : mesaClickeada;

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesaPrincipal.getNumero()).stream()
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            p.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO); // 🚀 Asignación financiera blindada

            // Si el mesero ya sirvió todo, archivamos la vinculación física
            if (p.getListaDetalles().stream().filter(d -> !d.isCanceladoPorCliente()).allMatch(DetallePedido::isEntregado)
                    || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ENTREGADO) {
                p.setNumeroMesa(null);
                p.setFechaEntrega(LocalDateTime.now());
            }
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
        // 🚀 Buscamos pedidos que no estén explícitamente CANCELADOS y que sigan asignados a la mesa
        List<Pedido> pedidos = pedidoRepository.findByNumeroMesa(numeroMesa).stream()
                .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                        && p.getCliente() != null && !p.getCliente().contains("(Ticket"))
                .toList();

        if (pedidos.isEmpty()) return null;
        Pedido pedidoActivo = pedidos.get(pedidos.size() - 1);

        // 🍔 ADUANA OPERATIVA: Enviamos absolutamente TODOS los platos activos a la vista.
        // El JavaScript de tu modal-mesa.js ya está programado para discriminar y pintar en gris
        // los que ya tienen d.isPagado() == true. ¡No debemos escondérselos!
        List<DetallePedido> detallesPrecuenta = pedidoActivo.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .toList();

        // Calculamos el saldo real que todavía se debe (Traditional Flow)
        double totalDeudaRestante = pedidoActivo.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                .sum();

        // Seteamos el monto total dinámico en caliente para que el modal pinte la deuda correcta
        pedidoActivo.setMontoTotal(totalDeudaRestante);
        pedidoRepository.save(pedidoActivo);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("idPedido", pedidoActivo.getId());
        respuesta.put("montoTotal", totalDeudaRestante);
        respuesta.put("detalles", detallesPrecuenta); // ◄ Retorna la lista completa (activos + prepagados)
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
            pedido.setEstadoPago(EstadoPago.PAGADO);

            // Solo desaparece si YA está entregado
            boolean todoEntregado = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .allMatch(DetallePedido::isEntregado);

            if (todoEntregado || pedido.getEstado() == EstadoPedido.ENTREGADO) {
                pedido.setNumeroMesa(null);
                pedido.setFechaEntrega(LocalDateTime.now());

                Mesa mesaPrincipal = mesaRepository.findById(mesaId)
                        .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

                if (mesaPrincipal.getMesaPadre() != null) {
                    mesaPrincipal = mesaPrincipal.getMesaPadre();
                }

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
            // Si NO está entregado, no tocamos mesa ni numeroMesa — sigue en el plano
            pedidoRepository.save(pedido);
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
        Mesa padre = mesaRepository.findById(idMesaPadre)
                .orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));

        // 🧠 Paso 1: Evaluamos si quedan pedidos reales activos
        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(padre.getNumero()).stream()
                .filter(p -> p.getMontoTotal() > 0 && p.getNumeroMesa() != null
                        && p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        // 🟩 Paso 2: LIMPIAMOS LAS HIJAS PRIMERO (Rompe el enclavamiento antes de recalcular cocina)
        if (padre.getMesasHijas() != null && !padre.getMesasHijas().isEmpty()) {
            for (Mesa hija : padre.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE"); // Vuelven a color verde tradicional
                mesaRepository.save(hija);

                // Notificamos reactivamente al WebSocket de inmediato para las hijas
                emitirCambioEstadoReactivo(hija.getNumero(), "disponible", null, "NINGUNO");
            }

            // Limpiamos la colección mutable de Hibernate para que no afecte el cálculo posterior
            padre.getMesasHijas().clear();
            mesaRepository.saveAndFlush(padre); // <-- Forzamos el vaciado a las tablas reales YA
        }

        // 🎨 Paso 3: Sincronizamos el estado de la mesa principal (Ahora sí, libre de hijas)
        if (!pedidosActivos.isEmpty()) {
            padre.setEstado("OCUPADA");
            mesaRepository.save(padre);

            // Ahora la máquina de estados sabrá que NO tiene hijas y le asignará
            // legítimamente su color de cocina (Rojo, Amarillo, etc.) enviándolo por el WebSocket
            recalcularYNotificarEstadoCocinaMesa(padre);
        } else {
            padre.setEstado("DISPONIBLE"); // Si no tenía consumos, vuelve a estar libre (verde)
            mesaRepository.save(padre);
            emitirCambioEstadoReactivo(padre.getNumero(), "disponible", null, "NINGUNO");
        }

        System.out.println("🔓 [LaJama ORM] Bloque disuelto con éxito. Todos los platos consolidados en la Mesa #" + padre.getNumero());
    }

    @Transactional
    public void unificarMesas(Long idMesaPrincipal, List<Long> idsMesasHijas) {
        Mesa mesaPadre = mesaRepository.findById(idMesaPrincipal).orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));

        // 🚀 CORREGIDO PADRE:
        List<Pedido> pedidosPadre = pedidoRepository.findByNumeroMesa(mesaPadre.getNumero()).stream()
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO).toList();
        Pedido pedidoPadreActivo = pedidosPadre.isEmpty() ? null : pedidosPadre.get(pedidosPadre.size() - 1);

        mesaPadre.setEstado("UNIFICADA");
        mesaRepository.save(mesaPadre);

        for (Long idHija : idsMesasHijas) {
            Mesa hija = mesaRepository.findById(idHija).orElseThrow();
            hija.setMesaPadre(mesaPadre);
            hija.setEstado("UNIFICADA");
            mesaRepository.save(hija);

            // 🚀 CORREGIDO HIJAS:
            List<Pedido> pedidosHija = pedidoRepository.findByNumeroMesa(hija.getNumero()).stream()
                    .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO).toList();

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
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            p.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO); // 🚀 Corrección de Enum Financiero
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

        // 🚀 1. Obtener la comanda viva de la mesa de origen (Filtrado por EstadoPago)
        Pedido pedidoOrigen = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No hay comanda activa en la mesa origen"));

        // 🚀 2. Buscar si la mesa destino ya cuenta con una comanda activa abierta (Filtrado por EstadoPago)
        Pedido pedidoDestino = pedidoRepository.findByNumeroMesa(destino.getNumero()).stream()
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
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
            // ESCENARIO B: La mesa destino ya tenía consumos. Fusión segura.
            System.out.println("🔮 [LaJama ORM] Fusionando platos en colección existente de Mesa " + destino.getNumero());

            List<DetallePedido> detallesOrigen = new ArrayList<>(pedidoOrigen.getListaDetalles());

            for (DetallePedido detalle : detallesOrigen) {
                detalle.setPedido(pedidoDestino);
                pedidoDestino.getListaDetalles().add(detalle);
            }

            pedidoOrigen.getListaDetalles().clear();
            pedidoOrigen.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);

            double totalConsolidado = pedidoDestino.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .mapToDouble(DetallePedido::getSubtotal).sum();
            pedidoDestino.setMontoTotal(totalConsolidado);

            pedidoRepository.save(pedidoDestino);
            pedidoRepository.save(pedidoOrigen);
        }

        origen.setEstado("DISPONIBLE");
        mesaRepository.save(origen);
        mesaRepository.save(destino);

        System.out.println("🔄 [Traslado Completo] Despertando motor de auditoría automatizado...");
        recalcularYNotificarEstadoCocinaMesa(origen);
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

        // 🚀 1. Obtener la comanda activa real (Filtrado por EstadoPago)
        List<Pedido> pedidosOrigen = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();
        if (pedidosOrigen.isEmpty()) {
            throw new RuntimeException("No hay comanda activa en la mesa de origen.");
        }
        Pedido pedidoOrigen = pedidosOrigen.get(pedidosOrigen.size() - 1);

        // 🚀 2. Buscar comanda activa destino (Filtrado por EstadoPago)
        List<Pedido> pedidosDestino = pedidoRepository.findByNumeroMesa(destino.getNumero()).stream()
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        Pedido pedidoDestino;
        if (pedidosDestino.isEmpty()) {
            pedidoDestino = new Pedido();
            pedidoDestino.setCliente("Mesa " + destino.getNumero());
            pedidoDestino.setDireccion("Salón");
            pedidoDestino.setNumeroMesa(destino.getNumero());
            pedidoDestino.setTipoPedido(pedidoOrigen.getTipoPedido());
            pedidoDestino.setEstado(com.web.restaurante.model.enums.EstadoPedido.PENDIENTE);
            pedidoDestino.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PENDIENTE); // 🚀 Nace esperando pago
            pedidoDestino.setMontoTotal(0.0);
            pedidoDestino.setListaDetalles(new ArrayList<>());
            destino.setEstado("OCUPADA");
            mesaRepository.save(destino);
        } else {
            pedidoDestino = pedidosDestino.get(pedidosDestino.size() - 1);
        }

        List<DetallePedido> detallesAMover = new ArrayList<>();
        for (DetallePedido d : pedidoOrigen.getListaDetalles()) {
            if (idsDetallesAMover.contains(d.getId())) {
                detallesAMover.add(d);
            }
        }

        pedidoOrigen.getListaDetalles().removeIf(d -> idsDetallesAMover.contains(d.getId()));

        for (DetallePedido detalle : detallesAMover) {
            detalle.setPedido(pedidoDestino);
            pedidoDestino.getListaDetalles().add(detalle);
        }

        boolean quedanPlatosOrigen = pedidoOrigen.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());

        if (!quedanPlatosOrigen) {
            pedidoOrigen.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);
            origen.setEstado("DISPONIBLE");
        } else {
            double totalOrigen = pedidoOrigen.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
            pedidoOrigen.setMontoTotal(totalOrigen);
        }

        double totalDestino = pedidoDestino.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
        pedidoDestino.setMontoTotal(totalDestino);

        pedidoRepository.save(pedidoOrigen);
        pedidoRepository.save(pedidoDestino);
        mesaRepository.save(origen);
        mesaRepository.save(destino);

        System.out.println("🔄 [Motor de Sincronización] Recalculando estados reales pos-división...");
        recalcularYNotificarEstadoCocinaMesa(origen);
        recalcularYNotificarEstadoCocinaMesa(destino);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "✂️ SPLIT DE COMANDA: Platos distribuidos entre Mesa " + origen.getNumero() + " y Mesa " + destino.getNumero());
    }

    @Transactional
    public void procesarLiquidacionMultiticket(Long pedidoId, Long mesaId, List<TicketDTO> tickets, List<Long> idsDetallesPagados) {
        System.out.println("\n🚀🔍 [BUG-HUNT] >>> INICIANDO procesarLiquidacionMultiticket <<<");
        System.out.println("🚀🔍 [BUG-HUNT] Parámetros recibidos -> pedidoId: " + pedidoId + " | mesaId: " + mesaId);
        System.out.println("🚀🔍 [BUG-HUNT] Cantidad de tickets enviados desde el front: " + (tickets != null ? tickets.size() : 0));
        System.out.println("🚀🔍 [BUG-HUNT] IDs de detalles que se marcan como pagados: " + idsDetallesPagados);

        Pedido pedidoPadre = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido original N° " + pedidoId + " no encontrado"));

        Mesa mesa = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;
        System.out.println("🚀🔍 [BUG-HUNT] Mesa Principal detectada: N° " + mesaPrincipal.getNumero() + " | Estado BD actual: " + mesaPrincipal.getEstado());

        List<DetallePedido> detallesOriginalesGuardados = new ArrayList<>(pedidoPadre.getListaDetalles());
        System.out.println("🚀🔍 [BUG-HUNT] Pedido Padre ID: " + pedidoPadre.getId() + " | EstadoPedido: " + pedidoPadre.getEstado() + " | EstadoPago: " + pedidoPadre.getEstadoPago() + " | Total Platos en comanda: " + detallesOriginalesGuardados.size());

        // 1. PROCESAMIENTO HISTÓRICO DE TICKETS LIQUIDADOS
        for (int i = 0; i < tickets.size(); i++) {
            TicketDTO t = tickets.get(i);
            if (t.getConsumoFinal() <= 0) {
                System.out.println("⚠️ [BUG-HUNT] Ticket " + (i + 1) + " ignorado por consumo <= 0 (" + t.getConsumoFinal() + ")");
                continue;
            }

            Pedido pedidoComprobante = new Pedido();
            String siguienteNotaVenta = notaVentaSequenceService.generarSiguienteNota();
            pedidoComprobante.setComprobanteNotaNumero(siguienteNotaVenta);

            pedidoComprobante.setCliente(pedidoPadre.getCliente() + " (Ticket " + (i + 1) + ")");
            pedidoComprobante.setDireccion("Salón");
            pedidoComprobante.setTipoPedido(pedidoPadre.getTipoPedido());

            // 🚨 SOLUCIÓN: El clon contable NO debe vincularse al plano físico de la mesa
            // para no romper las búsquedas de cocina y salón del pedido padre en producción.
            pedidoComprobante.setNumeroMesa(null);

            pedidoComprobante.setFechaCreacion(LocalDateTime.now());
            pedidoComprobante.setFechaEntrega(LocalDateTime.now());

            pedidoComprobante.setEstado(EstadoPedido.ENTREGADO);
            pedidoComprobante.setEstadoPago(EstadoPago.PAGADO);
            pedidoComprobante.setMontoTotal(t.getConsumoFinal());

            pedidoComprobante.setPreferenciaComprobante(t.getTipoDoc().toUpperCase());
            pedidoComprobante.setDocumentoCliente(t.getNumDoc() != null ? t.getNumDoc().trim() : "");

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

                    String nombreBuscado = detalleDTO.getNombre() != null ? detalleDTO.getNombre().trim() : "";

                    com.web.restaurante.model.Producto productoMatch = detallesOriginalesGuardados.stream()
                            .filter(d -> d.getProducto() != null && d.getProducto().getNombre().equalsIgnoreCase(nombreBuscado))
                            .map(DetallePedido::getProducto)
                            .findFirst()
                            .orElse(null);

                    if (productoMatch == null && idxPlato < detallesOriginalesGuardados.size()) {
                        productoMatch = detallesOriginalesGuardados.get(idxPlato).getProducto();
                    }

                    nuevoDetalle.setProducto(productoMatch);
                    nuevoDetalle.setPrecioUnitario(detalleDTO.getPrecioUnitario());
                    nuevoDetalle.setSubtotal(detalleDTO.getSubtotal());
                    pedidoComprobante.getListaDetalles().add(nuevoDetalle);
                }
            }

            turnoCajaService.obtenerTurnoActivo().ifPresent(pedidoComprobante::setTurnoCaja);
            Pedido guardadoHijo = pedidoRepository.save(pedidoComprobante);
            System.out.println("💳 [BUG-HUNT] Ticket Clon Guardado con Éxito -> ID Generado: " + guardadoHijo.getId() + " | Nombre: " + guardadoHijo.getCliente() + " | EstadoPago: " + guardadoHijo.getEstadoPago() + " | NumeroMesa asignado: " + guardadoHijo.getNumeroMesa());

            String conceptoCaja = "Liquidación Ticket " + (i + 1) + " (Mesa " + mesaPrincipal.getNumero() + ") - Comanda #" + pedidoPadre.getId();
            turnoCajaService.registrarVenta(conceptoCaja, t.getConsumoFinal());
        }

        if (idsDetallesPagados != null && !idsDetallesPagados.isEmpty()) {
            pedidoPadre.getListaDetalles().stream()
                    .filter(d -> idsDetallesPagados.contains(d.getId()))
                    .forEach(d -> {
                        d.setPagado(true);
                        System.out.println("✅ [BUG-HUNT] Plato ID " + d.getId() + " (" + d.getProducto().getNombre() + ") marcado internamente como PAGADO en el Padre.");
                    });
        }

        boolean quedanPlatosPorPagar = pedidoPadre.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());

        System.out.println("🚀🔍 [BUG-HUNT] ¿Quedan platos físicos sin pagar en la comanda Padre?: " + quedanPlatosPorPagar);

        boolean esUnGrupoActivo = (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty());

        if (!quedanPlatosPorPagar) {
            System.out.println("🎯 [BUG-HUNT] >>> ENTRANDO AL BLOQUE: SALDO CUBIERTO TOTALMENTE (!quedanPlatosPorPagar) <<<");

            boolean todoEntregado = pedidoPadre.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .allMatch(DetallePedido::isEntregado);

            System.out.println("🚀🔍 [BUG-HUNT] Verificación Física -> ¿Están TODOS los platos de la comanda en estado ENTREGADO?: " + todoEntregado);

            if (todoEntregado || pedidoPadre.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ENTREGADO) {
                System.out.println("🟢 [BUG-HUNT] FLUJO A: CIERRE TOTAL. Todo pagado y todo servido. Liberando salón...");

                pedidoPadre.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
                pedidoPadre.setNumeroMesa(null);
                pedidoPadre.setFechaEntrega(LocalDateTime.now());
                pedidoRepository.save(pedidoPadre);

                if (esUnGrupoActivo) {
                    mesaPrincipal.setEstado("UNIFICADA");
                    mesaRepository.save(mesaPrincipal);
                    emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "unificada", null, "NINGUNO");
                    for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                        hija.setMesaPadre(null);
                        hija.setEstado("UNIFICADA");
                        mesaRepository.save(hija);
                        emitirCambioEstadoReactivo(hija.getNumero(), "unificada", null, "NINGUNO");
                    }
                    mesaPrincipal.getMesasHijas().clear();
                    mesaRepository.save(mesaPrincipal);
                } else {
                    mesaPrincipal.setEstado("DISPONIBLE");
                    mesaRepository.save(mesaPrincipal);
                    emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "disponible", null, "NINGUNO");
                }
            } else {
                System.out.println("🍔 [BUG-HUNT] FLUJO B (PREPAGO DETECTADO): Dinero cubierto pero la comida SIGUE EN PRODUCCIÓN.");

                pedidoPadre.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PENDIENTE);
                pedidoPadre.setMontoTotal(0.0);
                pedidoRepository.save(pedidoPadre);

                // 🔥 RESTAURACIÓN ASÍNCRONA backend: Forzamos el recálculo y envío inmediato de la ráfaga WebSocket
                recalcularYNotificarEstadoCocinaMesa(mesaPrincipal);
            }
        } else {
            System.out.println("📊 [BUG-HUNT] >>> ENTRANDO AL BLOQUE: PAGO PARCIAL (Aún quedan saldos deudores) <<<");
            double nuevoSaldoRestante = pedidoPadre.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                    .sum();

            System.out.println("📊 [BUG-HUNT] Nuevo saldo restante calculado para el Padre: S/. " + nuevoSaldoRestante);
            pedidoPadre.setMontoTotal(nuevoSaldoRestante);
            pedidoRepository.save(pedidoPadre);

            if (esUnGrupoActivo) {
                mesaPrincipal.setEstado("UNIFICADA");
                mesaRepository.save(mesaPrincipal);
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "unificada", pedidoPadre.getId(), "ATENDIDO");
            } else {
                mesaPrincipal.setEstado("OCUPADA");
                mesaRepository.save(mesaPrincipal);
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "ocupada", pedidoPadre.getId(), "ATENDIDO");
            }
        }
        System.out.println("🚀🔍 [BUG-HUNT] >>> FIN DE procesarLiquidacionMultiticket <<< \n");
    }

    public void recalcularYNotificarEstadoCocinaMesa(Mesa mesa) {
        // Traemos los pedidos vinculados que no estén cancelados
        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesa.getNumero()).stream()
                .filter(p -> p.getNumeroMesa() != null
                        && p.getCliente() != null && !p.getCliente().contains("(Ticket")
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        // 🛡️ REGLA SUPREMA DE AUTO-LIMPIEZA ASÍNCRONA:
        // Si la lista está vacía, O si todos los pedidos vinculados ya están PAGADOS y ENTREGADOS
        boolean todoServidoYPagado = pedidosActivos.stream().allMatch(p ->
                com.web.restaurante.model.enums.EstadoPago.PAGADO.equals(p.getEstadoPago())
                        && com.web.restaurante.model.enums.EstadoPedido.ENTREGADO.equals(p.getEstado()));

        if (pedidosActivos.isEmpty() || todoServidoYPagado) {
            System.out.println("🧹 [La Jama Shield] Detectado estado neutro. Forzando liberación de Mesa N° " + mesa.getNumero());

            mesa.setEstado("DISPONIBLE");
            mesaRepository.save(mesa);

            // Archivamos limpiamente los pedidos quitándoles el número de mesa física
            for (Pedido p : pedidosActivos) {
                p.setNumeroMesa(null);
                pedidoRepository.save(p);
            }

            // Emitimos la señal limpia para limpiar el plano web sin F5
            emitirCambioEstadoReactivo(mesa.getNumero(), "disponible", null, "NINGUNO");
            return;
        }

        // --- (El resto de tu lógica tradicional de colores sigue abajo) ---
        Pedido pedidoPrincipal = pedidosActivos.get(0);
        EstadoPedido estadoCocina = pedidoPrincipal.getEstado();

        String nuevoEstadoMesa = "ocupada";
        if (estadoCocina == EstadoPedido.PREPARADO) {
            nuevoEstadoMesa = "lista-para-pagar";
        }

        mesa.setEstado("OCUPADA");
        mesaRepository.save(mesa);

        emitirCambioEstadoReactivo(mesa.getNumero(), nuevoEstadoMesa, pedidoPrincipal.getId(), estadoCocina.name());
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

    // =========================================================================
    // LÓGICA DE MUDANZA TRANSACCIONAL DE MESAS
    // =========================================================================

    @Transactional
    public void mudarMesasAReservaEnBloque(List<Long> idsMesas) {
        List<Mesa> mesasTarget = mesaRepository.findAllById(idsMesas);
        for (Mesa m : mesasTarget) {
            m.setEnReserva(true);
            m.setEstado("DISPONIBLE"); // Forzamos un estado limpio base
            mesaRepository.save(m);

            // Avisamos al plano que se mude de entorno bajo la señal limpia
            emitirCambioEstadoReactivo(m.getNumero(), "reservada", null, "NINGUNO");
        }
        // 🟩 CLAVE ASÍNCRONA: Obligamos a Hibernate a asentar las tablas antes de cerrar el hilo
        mesaRepository.flush();
    }

    @Transactional
    public void liberarMesasDeReservaEnBloque(List<Long> idsMesas) {
        List<Mesa> mesasTarget = mesaRepository.findAllById(idsMesas);
        for (Mesa m : mesasTarget) {
            m.setEnReserva(false);
            m.setEstado("DISPONIBLE"); // Limpiamos la columna de raíz en BD
            mesaRepository.save(m);

            // Avisamos al plano que regrese libre al salón
            emitirCambioEstadoReactivo(m.getNumero(), "disponible", null, "NINGUNO");
        }
        // 🟩 CLAVE ASÍNCRONA: Obligamos a Hibernate a asentar las tablas antes de cerrar el hilo
        mesaRepository.flush();
    }
}