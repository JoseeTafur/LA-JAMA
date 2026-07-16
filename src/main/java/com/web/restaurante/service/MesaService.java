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
                .filter(p -> !p.isEsNotaVenta()) // 🛡️ Capa de protección añadida
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
                .filter(p -> !p.isEsNotaVenta()) // 🛡️ Filtro estructural añadido
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

            if (p.getNumeroMesa() != null) {
                mesaRepository.findByNumero(p.getNumeroMesa()).ifPresent(mesa -> {
                    Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;
                    mesaPrincipal.setEstado("OCUPADA");
                    mesaRepository.save(mesaPrincipal);
                    emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "ocupada", p.getId(), "ENTREGADO");
                });
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
                .filter(p -> !p.isEsNotaVenta()) // 🛡️ Agregado para consistencia
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO // 🛠️ Corregido el método de acceso
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            p.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);

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

    @Transactional
    public void liberarMesaManual(Integer numeroMesa) {
        List<Pedido> pedidos = pedidoRepository.findByNumeroMesa(numeroMesa).stream()
                .filter(p -> p.getEstado() != EstadoPedido.CANCELADO && !p.isEsNotaVenta())
                .toList();

        if (pedidos.isEmpty()) {
            throw new RuntimeException("No hay comanda activa registrada en esta mesa.");
        }

        for (Pedido pedidoActivo : pedidos) {
            double totalDeudaRestante = pedidoActivo.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                    .sum();
            boolean tienePlatosEnCocina = pedidoActivo.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado());
            boolean tienePlatosPorServir = pedidoActivo.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isEntregado());

            if (totalDeudaRestante > 0 || tienePlatosEnCocina || tienePlatosPorServir) {
                throw new RuntimeException("No se puede liberar: aún hay consumos pendientes o platos en producción.");
            }

            pedidoActivo.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
            pedidoActivo.setEsNotaVenta(true); // 🚀 Lo marcamos al archivar manualmente
            pedidoRepository.save(pedidoActivo);
        }

        mesaRepository.findByNumero(numeroMesa).ifPresent(mesa -> {
            Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;
            mesaPrincipal.setEstado("DISPONIBLE");
            mesaRepository.save(mesaPrincipal);
            emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "disponible", null, "NINGUNO");
        });

        System.out.println("🔓 [La Jama] Mesa N° " + numeroMesa + " liberada manualmente. Ticket resguardado.");
    }

    public Map<String, Object> generarPrecuenta(Integer numeroMesa) {
        Integer numeroMesaEfectivo = numeroMesa;
        java.util.Optional<Mesa> mesaOpt = mesaRepository.findByNumero(numeroMesa);
        if (mesaOpt.isPresent() && mesaOpt.get().getMesaPadre() != null) {
            numeroMesaEfectivo = mesaOpt.get().getMesaPadre().getNumero();
        }

        List<Pedido> pedidos = pedidoRepository.findByNumeroMesa(numeroMesaEfectivo).stream()
                .filter(p -> p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                        && !p.isEsNotaVenta()
                        && (p.getComprobanteNotaNumero() == null || p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO))
                .toList();

        if (pedidos.isEmpty()) return null;
        Pedido pedidoActivo = pedidos.get(pedidos.size() - 1);

        List<DetallePedido> detallesPrecuenta = pedidoActivo.getListaDetalles().stream()
                .filter(d -> {
                    if (d.isCanceladoPorCliente()) {
                        return !d.isPagado();
                    }
                    return !(d.isPagado() && d.isEntregado());
                })
                .toList();

        double totalDeudaRestante = pedidoActivo.getListaDetalles().stream()
                .filter(d -> !d.isPagado())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                .sum();

        double consumoTotalHistorico = pedidoActivo.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                .sum();

        boolean tienePlatosActivosRestantes = pedidoActivo.getListaDetalles().stream()
                .anyMatch(d -> {
                    if (d.isCanceladoPorCliente()) {
                        return !d.isPagado();
                    }
                    return !(d.isPagado() && d.isEntregado());
                });

        boolean mesaListaParaLiberar = false;

        if (!tienePlatosActivosRestantes) {
            System.out.println("🧹 [La Jama] Todo pagado y entregado a nivel general. Liberando mesa automáticamente.");
            mesaListaParaLiberar = true;

            pedidoActivo.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
            pedidoActivo.setEstado(com.web.restaurante.model.enums.EstadoPedido.ENTREGADO);
            pedidoActivo.setFechaEntrega(LocalDateTime.now());
            pedidoActivo.setEsNotaVenta(true); // 🚀 Consistencia total en el cierre automático
        }

        pedidoActivo.setMontoTotal(consumoTotalHistorico);
        pedidoRepository.saveAndFlush(pedidoActivo);

        if (!tienePlatosActivosRestantes) {
            mesaRepository.findByNumero(numeroMesaEfectivo).ifPresent(mesa -> {
                Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;
                mesaPrincipal.setEstado("DISPONIBLE");
                mesaRepository.save(mesaPrincipal);
                emitirCambioEstadoReactivo(mesaPrincipal.getNumero(), "disponible", null, "NINGUNO");
            });
        }

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("idPedido", pedidoActivo.getId());
        respuesta.put("mesaListaParaLiberar", mesaListaParaLiberar);
        respuesta.put("montoTotal", totalDeudaRestante == 0 ? consumoTotalHistorico : totalDeudaRestante);
        respuesta.put("detalles", detallesPrecuenta);
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

            boolean todoEntregado = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .allMatch(DetallePedido::isEntregado);

            if (todoEntregado || pedido.getEstado() == EstadoPedido.ENTREGADO) {
                pedido.setFechaEntrega(LocalDateTime.now());
                pedido.setEsNotaVenta(true); // 🚀 Consistencia al cerrar cuenta por cobro directo

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

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(padre.getNumero()).stream()
                .filter(p -> p.getMontoTotal() > 0 && p.getNumeroMesa() != null
                        && !p.isEsNotaVenta() // 🛡️ Agregado para seguridad en la disolución
                        && p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        if (padre.getMesasHijas() != null && !padre.getMesasHijas().isEmpty()) {
            for (Mesa hija : padre.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
                emitirCambioEstadoReactivo(hija.getNumero(), "disponible", null, "NINGUNO");
            }
            padre.getMesasHijas().clear();
            mesaRepository.saveAndFlush(padre);
        }

        if (!pedidosActivos.isEmpty()) {
            padre.setEstado("OCUPADA");
            mesaRepository.save(padre);
            recalcularYNotificarEstadoCocinaMesa(padre);
        } else {
            padre.setEstado("DISPONIBLE");
            mesaRepository.save(padre);
            emitirCambioEstadoReactivo(padre.getNumero(), "disponible", null, "NINGUNO");
        }
    }

    @Transactional
    public void unificarMesas(Long idMesaPrincipal, List<Long> idsMesasHijas) {
        Mesa mesaPadre = mesaRepository.findById(idMesaPrincipal)
                .orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));

        mesaPadre.setEstado("UNIFICADA");
        mesaRepository.save(mesaPadre);

        List<Pedido> pedidosPadre = pedidoRepository.findByNumeroMesa(mesaPadre.getNumero()).stream()
                .filter(p -> !p.isEsNotaVenta() && !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()))
                .toList();
        Pedido pedidoPadreActivo = pedidosPadre.isEmpty() ? null : pedidosPadre.get(pedidosPadre.size() - 1);

        for (Long idHija : idsMesasHijas) {
            Mesa hija = mesaRepository.findById(idHija).orElseThrow();

            List<Pedido> pedidosHija = pedidoRepository.findByNumeroMesa(hija.getNumero()).stream()
                    .filter(p -> !p.isEsNotaVenta() && !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()))
                    .toList();

            // 🛡️ ELIMINACIÓN DE ADUANA PROHIBITIVA: Ya no se bloquean platos pagados/pendientes.
            // El sistema procesa lotes híbridos con total soltura.

            hija.setMesaPadre(mesaPadre);
            hija.setEstado("UNIFICADA");
            mesaRepository.save(hija);

            for (Pedido pHija : pedidosHija) {
                if (pedidoPadreActivo == null) {
                    // Si la mesa principal no tenía consumo, la comanda de la hija pasa a ser la cabecera controladora
                    pHija.setNumeroMesa(mesaPadre.getNumero());
                    pedidoRepository.save(pHija);
                    pedidoPadreActivo = pHija;
                } else {
                    // 🛡️ REASIGNACIÓN BIDIRECCIONAL BLINDADA DE PLATOS MIXTOS (JPA/Hibernate friendly)
                    if (pHija.getListaDetalles() != null) {
                        List<DetallePedido> detallesAMover = new ArrayList<>(pHija.getListaDetalles());

                        for (DetallePedido detalle : detallesAMover) {
                            pHija.getListaDetalles().remove(detalle); // Desacopla de la hija
                            detalle.setPedido(pedidoPadreActivo);    // Cambia el puntero al Padre
                            pedidoPadreActivo.getListaDetalles().add(detalle); // Acopla al Padre
                        }

                        // Vaciamos, cancelamos y desvinculamos el cascarón de la mesa hija de forma limpia
                        pHija.getListaDetalles().clear();
                        pHija.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
                        pHija.setNumeroMesa(null);
                        pHija.setMontoTotal(0.0);
                        pedidoRepository.save(pHija);
                    }
                }
            }
        }

        // 📊 BALANCÍN CONTABLE CONSOLIDADO EN EL PEDIDO PADRE
        if (pedidoPadreActivo != null) {
            // El total de deuda viva de la comanda colectiva solo sumará los platos pendientes
            double nuevoTotalDeudaPadre = pedidoPadreActivo.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                    .sum();
            pedidoPadreActivo.setMontoTotal(nuevoTotalDeudaPadre);

            // Sincronizamos dinámicamente las banderas financieras macros del Pedido Padre
            boolean tienePendientesPago = pedidoPadreActivo.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());
            pedidoPadreActivo.setEstadoPago(tienePendientesPago ? EstadoPago.PENDIENTE : EstadoPago.PAGADO);

            // Sincronizamos prioridades del monitor de cocina colectiva
            boolean tienePlatosSinCocinar = pedidoPadreActivo.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado());
            if (tienePlatosSinCocinar) {
                pedidoPadreActivo.setEstado(EstadoPedido.EN_COCINA);
            }

            pedidoRepository.saveAndFlush(pedidoPadreActivo);
        }

        recalcularYNotificarEstadoCocinaMesa(mesaPadre);
        for (Long idHija : idsMesasHijas) {
            mesaRepository.findById(idHija).ifPresent(this::recalcularYNotificarEstadoCocinaMesa);
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
                .filter(p -> !p.isEsNotaVenta()) // 🛡️ Protección añadida
                .filter(p -> p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.PAGADO
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            p.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
            p.setEsNotaVenta(true); // 🚀 Asegura que muera del mapa activo al forzar
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
                .orElseThrow(() -> new RuntimeException("Mesa origen no encontrada"));
        Mesa destino = mesaRepository.findById(idMesaDestino)
                .orElseThrow(() -> new RuntimeException("Mesa destino no encontrada"));

        Pedido pedidoOrigen = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()) && !p.isEsNotaVenta())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No hay comanda activa registrada en la mesa origen"));

        // 🛡️ REFACTORIZACIÓN SMART EN CASCADA (INTEGRIDAD CONTABLE)
        // Clasificamos qué elementos pueden mudarse físicamente del balde de detalles
        List<Long> idsDetallesMovibles = pedidoOrigen.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !(d.isPagado() && d.isEntregado()))
                .map(DetallePedido::getId)
                .toList();

        boolean tienePlatosInamovibles = pedidoOrigen.getListaDetalles().stream()
                .anyMatch(d -> d.isCanceladoPorCliente() || (d.isPagado() && d.isEntregado()));

        // 🔀 BYPASS AUTOMÁTICO EN CALIENTE:
        // Si la mesa es híbrida (tiene consumos inamovibles pero también platos vivos)
        if (tienePlatosInamovibles && !idsDetallesMovibles.isEmpty()) {
            System.out.println("🔀 [La Jama Smart-Bypass] Traslado híbrido detectado. Moviendo de forma transparente solo elementos activos...");
            dividirYTrasladarPlatos(idMesaOrigen, idMesaDestino, idsDetallesMovibles);
            return; // El motor de división se encarga de todo el trabajo sucio
        }

        // 🔒 CANDADO ABSOLUTO RESIDUAL: Si literalmente TODO ya está cerrado/consumido
        if (idsDetallesMovibles.isEmpty()) {
            throw new IllegalArgumentException("La comanda seleccionada no contiene ningún plato activo o pendiente para trasladar. Proceda a 'Liberar Mesa'.");
        }

        // Caso base: Si no hay platos inamovibles, se traslada el pedido completo de forma tradicional
        Pedido pedidoDestino = pedidoRepository.findByNumeroMesa(destino.getNumero()).stream()
                .filter(p -> !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()) && !p.isEsNotaVenta())
                .findFirst()
                .orElse(null);

        if (pedidoDestino == null) {
            // Caso A: Mesa destino vacía, solo mudamos la cabecera
            pedidoOrigen.setNumeroMesa(destino.getNumero());
            pedidoOrigen.setCliente("Mesa " + destino.getNumero());
            pedidoRepository.saveAndFlush(pedidoOrigen);

            boolean esDestinoGrupo = (destino.getMesasHijas() != null && !destino.getMesasHijas().isEmpty());
            destino.setEstado(esDestinoGrupo ? "UNIFICADA" : "OCUPADA");
        } else {
            // Caso B: Fusión de comandas tradicional
            System.out.println("🔮 [La Jama] Fusionando lotes mixtos en Mesa N° " + destino.getNumero());

            List<DetallePedido> detallesOrigen = new ArrayList<>(pedidoOrigen.getListaDetalles());
            for (DetallePedido detalle : detallesOrigen) {
                detalle.setPedido(pedidoDestino);
                pedidoDestino.getListaDetalles().add(detalle);
            }

            pedidoOrigen.getListaDetalles().clear();
            pedidoOrigen.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);

            double totalConsolidado = pedidoDestino.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(DetallePedido::getSubtotal).sum();
            pedidoDestino.setMontoTotal(totalConsolidado);

            boolean tieneDestinoSinPagar = pedidoDestino.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());
            pedidoDestino.setEstadoPago(tieneDestinoSinPagar ? EstadoPago.PENDIENTE : EstadoPago.PAGADO);

            boolean tienePlatosSinCocinar = pedidoDestino.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado());

            if (tienePlatosSinCocinar) {
                pedidoDestino.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
            }

            pedidoRepository.saveAndFlush(pedidoDestino);
            pedidoRepository.saveAndFlush(pedidoOrigen);
        }

        origen.setEstado("DISPONIBLE");
        mesaRepository.saveAndFlush(origen);
        mesaRepository.saveAndFlush(destino);

        pedidoRepository.flush();
        mesaRepository.flush();

        recalcularYNotificarEstadoCocinaMesa(origen);
        recalcularYNotificarEstadoCocinaMesa(destino);
    }

    @Transactional
    public void dividirYTrasladarPlatos(Long idMesaOrigen, Long idMesaDestino, List<Long> idsDetallesAMover) {
        Mesa origen = mesaRepository.findById(idMesaOrigen)
                .orElseThrow(() -> new RuntimeException("Mesa de origen no encontrada"));
        Mesa destino = mesaRepository.findById(idMesaDestino)
                .orElseThrow(() -> new RuntimeException("Mesa de destino no encontrada"));

        List<Pedido> pedidosOrigen = pedidoRepository.findByNumeroMesa(origen.getNumero()).stream()
                .filter(p -> !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()) && !p.isEsNotaVenta())
                .toList();

        if (pedidosOrigen.isEmpty()) {
            throw new RuntimeException("No hay comanda activa en la mesa de origen.");
        }
        Pedido pedidoOrigen = pedidosOrigen.get(pedidosOrigen.size() - 1);
        List<DetallePedido> detallesAMover = new ArrayList<>();
        if (idsDetallesAMover != null) {
            for (DetallePedido d : pedidoOrigen.getListaDetalles()) {
                if (d.getId() != null) {
                    long idDetalleDb = d.getId().longValue();
                    boolean existeEnSeleccionados = idsDetallesAMover.stream()
                            .anyMatch(idMover -> idMover != null && idMover.longValue() == idDetalleDb);

                    if (existeEnSeleccionados) {
                        // 🔒 CANDADO N°1: Bloqueo de Consumos Cerrados (Ya comió y ya pagó)
                        if (d.isPagado() && d.isEntregado()) {
                            throw new IllegalArgumentException("Violación operativa: El plato '"
                                    + d.getProducto().getNombre() + "' ya fue entregado y pagado en la mesa de origen. No se puede trasladar.");
                        }

                        // 🔒 CANDADO N°2: Bloqueo de Mermas / Cancelados
                        if (d.isCanceladoPorCliente()) {
                            throw new IllegalArgumentException("Violación logística: El plato '"
                                    + d.getProducto().getNombre() + "' está marcado como merma o cancelado. Debe permanecer en la mesa de origen para auditoría.");
                        }

                        detallesAMover.add(d);
                    }
                }
            }
        }

        if (detallesAMover.isEmpty()) {
            throw new RuntimeException("No se seleccionaron platos válidos o compatibles para realizar el traslado.");
        }

        List<Pedido> pedidosDestino = pedidoRepository.findByNumeroMesa(destino.getNumero()).stream()
                .filter(p -> !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()) && !p.isEsNotaVenta())
                .toList();

        Pedido pedidoDestino;
        if (pedidosDestino.isEmpty()) {
            pedidoDestino = new Pedido();
            pedidoDestino.setCliente("Mesa " + destino.getNumero());
            pedidoDestino.setDireccion("");
            pedidoDestino.setNumeroMesa(destino.getNumero());
            pedidoDestino.setTipoPedido(com.web.restaurante.model.enums.TipoPedido.SALON);
            pedidoDestino.setEstado(pedidoOrigen.getEstado());
            pedidoDestino.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PENDIENTE);
            pedidoDestino.setMontoTotal(0.0);
            pedidoDestino.setListaDetalles(new ArrayList<>());

            pedidoDestino = pedidoRepository.saveAndFlush(pedidoDestino);

            destino.setEstado("OCUPADA");
            mesaRepository.saveAndFlush(destino);
        } else {
            pedidoDestino = pedidosDestino.get(pedidosDestino.size() - 1);
        }

        for (DetallePedido detalle : detallesAMover) {
            pedidoOrigen.getListaDetalles().remove(detalle);
            detalle.setPedido(pedidoDestino);
            pedidoDestino.getListaDetalles().add(detalle);
        }

        boolean quedanPlatosOrigen = pedidoOrigen.getListaDetalles().stream()
                .anyMatch(d -> {
                    if (d.isCanceladoPorCliente()) return !d.isPagado();
                    return !(d.isPagado() && d.isEntregado());
                });

        if (!quedanPlatosOrigen) {
            pedidoOrigen.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
            pedidoOrigen.setNumeroMesa(null);
            origen.setEstado("DISPONIBLE");
        } else {
            double totalOrigen = pedidoOrigen.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
            pedidoOrigen.setMontoTotal(totalOrigen);

            boolean tieneOrigenSinPagar = pedidoOrigen.getListaDetalles().stream()
                    .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());
            pedidoOrigen.setEstadoPago(tieneOrigenSinPagar ? EstadoPago.PENDIENTE : EstadoPago.PAGADO);
        }

        double totalDestino = pedidoDestino.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
        pedidoDestino.setMontoTotal(totalDestino);

        boolean tieneDestinoSinPagar = pedidoDestino.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isPagado());
        pedidoDestino.setEstadoPago(tieneDestinoSinPagar ? EstadoPago.PENDIENTE : EstadoPago.PAGADO);

        boolean tieneDestinoSinCocinar = pedidoDestino.getListaDetalles().stream()
                .anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado());

        if (tieneDestinoSinCocinar) {
            pedidoDestino.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
        }

        pedidoRepository.saveAndFlush(pedidoOrigen);
        pedidoRepository.saveAndFlush(pedidoDestino);
        mesaRepository.saveAndFlush(origen);
        mesaRepository.saveAndFlush(destino);

        pedidoRepository.flush();
        mesaRepository.flush();

        recalcularYNotificarEstadoCocinaMesa(origen);
        recalcularYNotificarEstadoCocinaMesa(destino);
    }

    @Transactional
    public void procesarLiquidacionMultiticket(Long pedidoId, Long mesaId, List<TicketDTO> tickets, List<Long> idsDetallesPagados) {
        System.out.println("\n🚀⚔️ [LA JAMA BLINDAJE TOTAL] >>> INICIANDO FORZADO ATÓMICO NATIVO <<<");

        Pedido pedidoPadre = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido original N° " + pedidoId + " no encontrado"));

        Mesa mesaFisica = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada con ID: " + mesaId));

        Mesa mesaPrincipal = (mesaFisica.getMesaPadre() != null) ? mesaFisica.getMesaPadre() : mesaFisica;
        final Integer numeroMesaFijoEInmutable = mesaPrincipal.getNumero();

        List<DetallePedido> detallesOriginalesGuardados = new ArrayList<>(pedidoPadre.getListaDetalles());

        double montoFinalFijoEInmutable = 0.0;
        if (idsDetallesPagados != null && !idsDetallesPagados.isEmpty()) {
            montoFinalFijoEInmutable = detallesOriginalesGuardados.stream()
                    .filter(d -> idsDetallesPagados.contains(d.getId()))
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : (d.getPrecioUnitario() != null ? d.getPrecioUnitario() * d.getCantidad() : 0.0))
                    .sum();
        }
        if (montoFinalFijoEInmutable <= 0.0) {
            montoFinalFijoEInmutable = detallesOriginalesGuardados.stream()
                    .filter(d -> !d.isCanceladoPorCliente() && !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : (d.getPrecioUnitario() != null ? d.getPrecioUnitario() * d.getCantidad() : 0.0))
                    .sum();
        }
        if (montoFinalFijoEInmutable <= 0.0 && pedidoPadre.getMontoTotal() != null) {
            montoFinalFijoEInmutable = pedidoPadre.getMontoTotal();
        }

        for (int i = 0; i < tickets.size(); i++) {
            TicketDTO t = tickets.get(i);

            Pedido pedidoComprobante = new Pedido();
            String siguienteNotaVenta = notaVentaSequenceService.generarSiguienteNota();
            pedidoComprobante.setComprobanteNotaNumero(siguienteNotaVenta);

            if (t.getNombreCliente() != null && !t.getNombreCliente().trim().isEmpty()) {
                pedidoComprobante.setCliente(t.getNombreCliente().trim().toUpperCase());
            } else {
                pedidoComprobante.setCliente(("MESA " + numeroMesaFijoEInmutable + " (TICKET)").toUpperCase());
            }
            pedidoComprobante.setDireccion("");

            if (t.getClienteCorreo() != null && !t.getClienteCorreo().trim().isEmpty()) {
                pedidoComprobante.setClienteCorreo(t.getClienteCorreo().trim());
            } else {
                pedidoComprobante.setClienteCorreo(pedidoPadre.getClienteCorreo());
            }

            pedidoComprobante.setNumeroMesa(numeroMesaFijoEInmutable);
            pedidoComprobante.setMontoTotal(montoFinalFijoEInmutable);

            pedidoComprobante.setFechaCreacion(LocalDateTime.now());
            pedidoComprobante.setFechaEntrega(LocalDateTime.now());
            pedidoComprobante.setTipoPedido(pedidoPadre.getTipoPedido() != null ? pedidoPadre.getTipoPedido() : com.web.restaurante.model.enums.TipoPedido.SALON);
            pedidoComprobante.setEstado(EstadoPedido.ENTREGADO);
            pedidoComprobante.setEstadoPago(EstadoPago.PAGADO);
            pedidoComprobante.setEsNotaVenta(true); // 🎯 Copia archivada/fiscal inmutable
            pedidoComprobante.setPreferenciaComprobante(t.getTipoDoc() != null ? t.getTipoDoc().toUpperCase() : "BOLETA");
            pedidoComprobante.setDocumentoCliente(t.getNumDoc() != null ? t.getNumDoc().trim() : "SIN DOCUMENTO");

            String metodoStr = t.getMetodoPago() != null ? t.getMetodoPago().toUpperCase() : "EFECTIVO";
            if (metodoStr.contains("PLIN")) {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.PLIN);
            } else if (metodoStr.contains("YAPE")) {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.YAPE);
            } else if (metodoStr.contains("TARJETA")) {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.TARJETA);
            } else {
                pedidoComprobante.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.EFECTIVO);
            }

            double montoDeEsteTicket = t.getConsumoFinal();
            if (montoDeEsteTicket <= 0.0 && t.getListaDetalles() != null) {
                montoDeEsteTicket = t.getListaDetalles().stream()
                        .mapToDouble(d -> d.getSubtotal())
                        .sum();
            }
            if (montoDeEsteTicket <= 0.0) {
                montoDeEsteTicket = montoFinalFijoEInmutable;
            }
            pedidoComprobante.setMontoTotal(montoDeEsteTicket);

            pedidoComprobante.setListaDetalles(new ArrayList<>());
            if (t.getListaDetalles() != null) {
                for (var detDTO : t.getListaDetalles()) {
                    String nombreBuscado = detDTO.getNombre() != null ? detDTO.getNombre().trim() : "";
                    if (nombreBuscado.contains("(MERMA)")) {
                        nombreBuscado = nombreBuscado.replace("(MERMA)", "").trim();
                    }
                    final String finalNombreBuscado = nombreBuscado;

                    com.web.restaurante.model.Producto productoReal = detallesOriginalesGuardados.stream()
                            .filter(d -> d.getProducto() != null && d.getProducto().getNombre().equalsIgnoreCase(finalNombreBuscado))
                            .map(DetallePedido::getProducto)
                            .findFirst()
                            .orElse(null);

                    DetallePedido dHijo = new DetallePedido();
                    dHijo.setPedido(pedidoComprobante);
                    dHijo.setProducto(productoReal);
                    dHijo.setCantidad(detDTO.getCantidad());
                    dHijo.setPrecioUnitario(detDTO.getPrecioUnitario());
                    dHijo.setSubtotal(detDTO.getSubtotal());
                    dHijo.setPagado(true);
                    dHijo.setEntregado(true);
                    dHijo.setCocinado(true);
                    pedidoComprobante.getListaDetalles().add(dHijo);
                }
            }

            turnoCajaService.obtenerTurnoActivo().ifPresent(pedidoComprobante::setTurnoCaja);
            Pedido guardadoHijo = pedidoRepository.saveAndFlush(pedidoComprobante);

            String conceptoCaja = "Liquidación Ticket (Mesa " + numeroMesaFijoEInmutable + ") - Nota: " + pedidoComprobante.getComprobanteNotaNumero();
            turnoCajaService.registrarVenta(conceptoCaja, montoDeEsteTicket);
        }

        if (idsDetallesPagados != null && !idsDetallesPagados.isEmpty()) {
            pedidoPadre.getListaDetalles().stream()
                    .filter(d -> idsDetallesPagados.contains(d.getId()))
                    .forEach(d -> {
                        d.setPagado(true);
                        if (d.isCanceladoPorCliente()) {
                            d.setEntregado(true);
                        }
                    });
        }

        boolean quedanPlatosPorPagar = pedidoPadre.getListaDetalles().stream().anyMatch(d -> !d.isPagado());
        boolean esUnGrupoActivo = (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty());

        if (!quedanPlatosPorPagar) {
            boolean todoEntregado = pedidoPadre.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .allMatch(DetallePedido::isEntregado);

            if (todoEntregado || pedidoPadre.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ENTREGADO) {
                System.out.println("🟢 [MASTER SHIELD] Cierre total. Todo pagado y servido. Manteniendo mesa para reportes.");

                pedidoPadre.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
                pedidoPadre.setEstado(com.web.restaurante.model.enums.EstadoPedido.ENTREGADO);
                pedidoPadre.setFechaEntrega(LocalDateTime.now());
                pedidoPadre.setEsNotaVenta(true); // 🎯 ARCHIVADO ABSOLUTO: La comanda original pasa a ser registro histórico completo

                pedidoRepository.saveAndFlush(pedidoPadre);

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
                pedidoPadre.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
                double totalHistoricoConsumo = detallesOriginalesGuardados.stream().filter(d -> !d.isCanceladoPorCliente()).mapToDouble(DetallePedido::getSubtotal).sum();
                pedidoPadre.setMontoTotal(totalHistoricoConsumo);
                pedidoRepository.saveAndFlush(pedidoPadre);
                recalcularYNotificarEstadoCocinaMesa(mesaPrincipal);
            }
        } else {
            double nuevoSaldoRestante = pedidoPadre.getListaDetalles().stream()
                    .filter(d -> !d.isPagado())
                    .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0)
                    .sum();

            pedidoPadre.setMontoTotal(nuevoSaldoRestante);
            pedidoRepository.saveAndFlush(pedidoPadre);

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
    }

    public void recalcularYNotificarEstadoCocinaMesa(Mesa mesa) {
        if ("UNIFICADA".equalsIgnoreCase(mesa.getEstado())
                || mesa.getMesaPadre() != null
                || (mesa.getMesasHijas() != null && !mesa.getMesasHijas().isEmpty())) {

            System.out.println("🛡️ [La Jama Shield] Conservando prioridad de unificación para Mesa N° " + mesa.getNumero());

            Integer numeroMesaBusqueda = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre().getNumero() : mesa.getNumero();

            List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(numeroMesaBusqueda).stream()
                    .filter(p -> p.getNumeroMesa() != null
                            && !p.isEsNotaVenta()
                            && !com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(p.getEstado()))
                    .toList();

            Long pedidoId = pedidosActivos.isEmpty() ? null : pedidosActivos.get(0).getId();
            String estadoPedido = pedidosActivos.isEmpty() ? "NINGUNO" : pedidosActivos.get(0).getEstado().name();

            mesa.setEstado("UNIFICADA");
            mesaRepository.save(mesa);

            emitirCambioEstadoReactivo(mesa.getNumero(), "unificada", pedidoId, estadoPedido);
            return;
        }

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesa.getNumero()).stream()
                .filter(p -> p.getNumeroMesa() != null
                        && !p.isEsNotaVenta()
                        && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO)
                .toList();

        boolean todoServidoYPagado = pedidosActivos.stream().allMatch(p ->
                com.web.restaurante.model.enums.EstadoPago.PAGADO.equals(p.getEstadoPago()) // 🛠️ Corregido método de acceso
                        && com.web.restaurante.model.enums.EstadoPedido.ENTREGADO.equals(p.getEstado()));

        if (pedidosActivos.isEmpty() || todoServidoYPagado) {
            mesa.setEstado("DISPONIBLE");
            mesaRepository.save(mesa);

            for (Pedido p : pedidosActivos) {
                p.setNumeroMesa(null);
                pedidoRepository.save(p);
            }
            emitirCambioEstadoReactivo(mesa.getNumero(), "disponible", null, "NINGUNO");
            return;
        }

        Pedido pedidoPrincipal = pedidosActivos.get(0);
        List<DetallePedido> platos = pedidoPrincipal.getListaDetalles() != null ? pedidoPrincipal.getListaDetalles() : new java.util.ArrayList<>();

        boolean tienePlatosPorPagar = platos.stream().anyMatch(d -> !d.isPagado());
        boolean tienePlatosPorEntregar = platos.stream().anyMatch(d -> !d.isCanceladoPorCliente() && d.isCocinado() && !d.isEntregado());
        boolean tienePlatosEnCocina = platos.stream().anyMatch(d -> !d.isCanceladoPorCliente() && !d.isCocinado());

        String estadoMesaDestino = "ocupada";
        if (tienePlatosPorEntregar) {
            estadoMesaDestino = "lista-para-recoger";
        } else if (tienePlatosEnCocina) {
            estadoMesaDestino = "ocupada";
        } else if (tienePlatosPorPagar) {
            estadoMesaDestino = "lista-para-pagar";
        }

        mesa.setEstado(estadoMesaDestino.toUpperCase().replace("-", "_"));
        mesaRepository.save(mesa);
        emitirCambioEstadoReactivo(mesa.getNumero(), estadoMesaDestino, pedidoPrincipal.getId(), pedidoPrincipal.getEstado().name());
    }

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

    @Transactional
    public void mudarMesasAReservaEnBloque(List<Long> idsMesas) {
        List<Mesa> mesasTarget = mesaRepository.findAllById(idsMesas);
        for (Mesa m : mesasTarget) {
            m.setEnReserva(true);
            m.setEstado("DISPONIBLE");
            mesaRepository.save(m);
            emitirCambioEstadoReactivo(m.getNumero(), "reservada", null, "NINGUNO");
        }
        mesaRepository.flush();
    }

    @Transactional
    public void liberarMesasDeReservaEnBloque(List<Long> idsMesas) {
        List<Mesa> mesasTarget = mesaRepository.findAllById(idsMesas);
        for (Mesa m : mesasTarget) {
            m.setEnReserva(false);
            m.setEstado("DISPONIBLE");
            mesaRepository.save(m);
            emitirCambioEstadoReactivo(m.getNumero(), "disponible", null, "NINGUNO");
        }
        mesaRepository.flush();
    }
}