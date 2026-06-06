package com.web.restaurante.service;

import com.web.restaurante.dto.mesas.MesaDTO;
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
                .filter(d -> d.getId().equals(detalleId)) // Búsqueda microscópica
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

        // 💡 1. DETERMINAR LA MESA PRINCIPAL (Por si clickean una mesa hija unificada)
        Mesa mesaPrincipal = (mesaClickeada.getMesaPadre() != null) ? mesaClickeada.getMesaPadre() : mesaClickeada;

        // 💡 2. BUSCAR EL PEDIDO ACTIVO DE LA CUENTA UNIFICADA
        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(mesaPrincipal.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        // 💡 3. CANDADO DE SEGURIDAD OPERATIVA (Mismo control que usas en salón)
        for (Pedido p : pedidosActivos) {
            boolean todosEntregados = p.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente()) // Ignoramos las mermas anuladas
                    .allMatch(DetallePedido::isEntregado);

            if (!todosEntregados) {
                throw new RuntimeException("No se puede facturar la Mesa N° " + mesaPrincipal.getNumero()
                        + ". Aún hay platos pendientes de entregar en salón.");
            }
        }

        // 💡 4. PROCESAR EL PAGO DE LOS PEDIDOS VALIDADOS
        for (Pedido p : pedidosActivos) {
            p.setEstado(EstadoPedido.PAGADO);
            p.setNumeroMesa(null);
            p.setFechaEntrega(LocalDateTime.now());
            pedidoRepository.save(p);
        }

        // 💡 5. LIBERACIÓN COMPLETA DEL GRUPO EN EL PLANO DE MESAS
        // Liberamos a la mesa principal
        mesaPrincipal.setEstado("DISPONIBLE");
        mesaRepository.save(mesaPrincipal);

        // Liberamos recursivamente a todas las mesas hijas que estaban acopladas a ella
        if (mesaPrincipal.getMesasHijas() != null && !mesaPrincipal.getMesasHijas().isEmpty()) {
            for (Mesa hija : mesaPrincipal.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
            }
            // Limpiamos la colección del padre en memoria
            mesaPrincipal.getMesasHijas().clear();
            mesaRepository.save(mesaPrincipal);
        }
    }
    public Map<String, Object> generarPrecuenta(Integer numeroMesa) {
        List<Pedido> pedidos = pedidoRepository.findByNumeroMesa(numeroMesa).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO).toList();

        if (pedidos.isEmpty()) return null;
        Pedido pedidoActivo = pedidos.get(pedidos.size() - 1);

        // RE-CALCULO EN VIVO: Si el subtotal es null, lo arreglamos. NO restamos mermas (el cliente las paga).
        double totalReal = pedidoActivo.getListaDetalles().stream()
                .mapToDouble(d -> d.getSubtotal() != null ? d.getSubtotal() : 0.0).sum();
        pedidoActivo.setMontoTotal(totalReal);
        pedidoRepository.save(pedidoActivo); // Guardamos la corrección por si acaso

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("idPedido", pedidoActivo.getId());
        respuesta.put("montoTotal", pedidoActivo.getMontoTotal());
        respuesta.put("detalles", pedidoActivo.getListaDetalles());
        return respuesta;
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
                .filter(d -> d.getId().equals(detalleId) && !d.isCanceladoPorCliente()) // Búsqueda microscópica
                .findFirst()
                .orElseThrow(() -> new RuntimeException("El producto no está en la comanda o ya fue cancelado"));

        if (!detalle.isImpresoEnCocina()) { // <-- Ajustado a la nueva variable que hicimos antes
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
}