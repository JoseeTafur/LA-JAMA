package com.web.restaurante.controller;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Producto;
import com.web.restaurante.model.Reserva;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.EstadoReserva;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.ReservaRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Controller
@RequestMapping("/admin/mesero")
@RequiredArgsConstructor
public class MeseroController {

    private final ProductoRepository productoRepository;
    private final PedidoService pedidoService;
    private final MesaRepository mesaRepository;
    private final PedidoRepository pedidoRepository;
    private final ReservaRepository reservaRepository;

    @GetMapping("/nuevo")
    public String nuevoPedido(Model model, HttpSession session,
                              @RequestParam(required = false) Long mesaId,
                              @RequestParam(required = false) Long pedidoId) {
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";
        if (mesaId == null) return "redirect:/admin/mesas";

        model.addAttribute("productos", productoRepository.findAll());
        model.addAttribute("mesaId", mesaId);
        if (pedidoId != null) model.addAttribute("pedidoId", pedidoId);

        return "admin/mesero_pedido";
    }

    @PostMapping("/guardar")
    @ResponseBody
    public String guardarPedido(@RequestBody Pedido pedidoDeFrontend,
                                @RequestParam(required = false) Long mesaId,
                                HttpSession session) {
        try {
            System.out.println("\n===== [DEBUG RESTAURANTE: INICIO GUARDAR COMANDA] =====");

            Pedido pedidoFinal;

            if (pedidoDeFrontend.getId() != null) {
                pedidoFinal = pedidoRepository.findById(pedidoDeFrontend.getId())
                        .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
                pedidoFinal.setEstado(EstadoPedido.EN_COCINA);
                pedidoFinal.setCliente(pedidoDeFrontend.getCliente());
                pedidoFinal.setDireccion(pedidoDeFrontend.getDireccion());

                if (pedidoDeFrontend.getListaDetalles() != null) {
                    for (DetallePedido nuevoDetalle : pedidoDeFrontend.getListaDetalles()) {
                        Producto productoCompleto = productoRepository.findById(nuevoDetalle.getProducto().getId())
                                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                        nuevoDetalle.setProducto(productoCompleto);
                        nuevoDetalle.setPedido(pedidoFinal);
                        nuevoDetalle.setCocinado(false);
                        pedidoFinal.getListaDetalles().add(nuevoDetalle);
                    }
                }
            } else {
                pedidoFinal = pedidoDeFrontend;
                pedidoFinal.setEstado(EstadoPedido.EN_COCINA);
                pedidoFinal.setFechaCreacion(LocalDateTime.now());
                pedidoFinal.setFechaSalida(null);
                pedidoFinal.setFechaEntrega(null);

                if (pedidoFinal.getListaDetalles() != null) {
                    for (DetallePedido d : pedidoFinal.getListaDetalles()) {
                        Producto productoCompleto = productoRepository.findById(d.getProducto().getId())
                                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                        d.setProducto(productoCompleto);
                        d.setCocinado(false);
                    }
                }
            }

            // ── ASIGNAR MESA Y OCUPAR TODAS LAS MESAS DE LA RESERVA ──────────────
            if (mesaId != null) {
                Mesa mesa = mesaRepository.findById(mesaId).orElseThrow();
                Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;

                pedidoFinal.setNumeroMesa(mesaPrincipal.getNumero());
                mesaPrincipal.setEstado("OCUPADA");
                mesaRepository.save(mesaPrincipal);

                if (mesa.getMesaPadre() != null) {
                    mesa.setEstado("OCUPADA");
                    mesaRepository.save(mesa);
                }

                // Buscar reserva activa para esta mesa (puede ser la principal o cualquiera del grupo)
                // y ocupar TODAS sus mesas vinculadas
                ocuparMesasDeReserva(mesaPrincipal.getNumero());

            } else if (pedidoDeFrontend.getId() == null) {
                System.out.println("DEBUG MESA -> ALERTA: No se recibió mesaId.");
            }

            // ── KPI COCINA ────────────────────────────────────────────────────────
            boolean hayFrioPendiente = false;
            boolean hayCalientePendiente = false;

            if (pedidoFinal.getListaDetalles() != null) {
                for (DetallePedido d : pedidoFinal.getListaDetalles()) {
                    if (d.getProducto() != null && d.getProducto().getCategoria() != null) {
                        String cat = d.getProducto().getCategoria().getNombre().toUpperCase();
                        if ((cat.contains("FRI") || cat.contains("FRÍ")) && !d.isCocinado()) hayFrioPendiente = true;
                        if (cat.contains("CALIENTE") && !d.isCocinado()) hayCalientePendiente = true;
                    }
                }
            }

            pedidoFinal.setFrioListo(!hayFrioPendiente);
            pedidoFinal.setCalienteListo(!hayCalientePendiente);

            if (!hayFrioPendiente && !hayCalientePendiente) {
                if (pedidoFinal.getFechaSalida() == null) pedidoFinal.setFechaSalida(LocalDateTime.now());
            } else {
                pedidoFinal.setFechaSalida(null);
            }

            double totalAcumulado = 0;
            if (pedidoFinal.getListaDetalles() != null) {
                for (DetallePedido detalle : pedidoFinal.getListaDetalles()) {
                    detalle.setPedido(pedidoFinal);
                    totalAcumulado += detalle.getSubtotal();
                }
            }
            pedidoFinal.setMontoTotal(totalAcumulado);

            pedidoService.guardarPedido(pedidoFinal);

            if (pedidoFinal.getId() != null) {
                pedidoRepository.actualizarEstadoJPQL(pedidoFinal.getId(), EstadoPedido.EN_COCINA);
            }

            System.out.println("===== [DEBUG RESTAURANTE: FIN GUARDAR COMANDA] =====\n");
            return "OK";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error: " + e.getMessage();
        }
    }

    @PostMapping("/marcar-en-mesa/{id}")
    @ResponseBody
    public ResponseEntity<String> marcarPedidoEnMesa(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
            pedido.setFechaSalida(LocalDateTime.now());
            pedido.setEstado(EstadoPedido.ASIGNADO);
            pedidoRepository.save(pedido);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/finalizar-atencion/{id}")
    @ResponseBody
    public ResponseEntity<String> finalizarPedidoLocal(@PathVariable Long id,
                                                        @RequestParam(required = false) Long mesaId) {
        try {
            Pedido pedido = pedidoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
            pedido.setFechaEntrega(LocalDateTime.now());
            pedido.setEstado(EstadoPedido.PAGADO);
            pedidoRepository.save(pedido);

            if (mesaId != null) {
                Mesa mesa = mesaRepository.findById(mesaId).orElseThrow();
                Mesa mesaPrincipal = (mesa.getMesaPadre() != null) ? mesa.getMesaPadre() : mesa;

                // Liberar TODAS las mesas de la reserva vinculada (busca por cualquier mesa del grupo)
                liberarMesasDeReserva(mesaPrincipal.getNumero());

                // Liberar la mesa principal siempre
                mesaPrincipal.setEstado("LIBRE");
                mesaRepository.save(mesaPrincipal);
            }

            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/preparar-cuenta/{id}")
    @ResponseBody
    public ResponseEntity<String> prepararCuenta(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
            pedido.setEstado(EstadoPedido.PREPARADO);
            pedidoRepository.save(pedido);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ── HELPERS: ocupar/liberar todas las mesas de una reserva ───────────────

    /**
     * Busca la reserva activa donde la mesa indicada participa (como mesa principal
     * o como cualquier otra mesa del grupo en mesasAsignadas) y ocupa TODAS las mesas
     * del grupo. Así si la familia está en Mesa 1 y Mesa 2, al pedir desde cualquiera
     * de las dos se ocupan ambas.
     */
    private void ocuparMesasDeReserva(Integer numeroMesa) {
        reservaRepository
                .findByMesaEnGrupoAndEstadoIn(
                        numeroMesa,
                        String.valueOf(numeroMesa),
                        List.of(EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA))
                .stream().findFirst()
                .ifPresent(reserva -> {
                    for (Integer numMesa : reserva.getListaMesas()) {
                        mesaRepository.findAll().stream()
                                .filter(m -> m.getNumero().equals(numMesa))
                                .findFirst()
                                .ifPresent(m -> {
                                    m.setEstado("OCUPADA");
                                    mesaRepository.save(m);
                                    System.out.println("DEBUG RESERVA -> Mesa N° " + numMesa + " marcada OCUPADA");
                                });
                    }
                });
    }

    /**
     * Busca la reserva activa donde la mesa indicada participa (como mesa principal
     * o como cualquier otra mesa del grupo en mesasAsignadas) y libera TODAS las mesas
     * del grupo. Así si la familia pagó desde cualquiera de las dos mesas, ambas se liberan.
     */
    private void liberarMesasDeReserva(Integer numeroMesa) {
        reservaRepository
                .findByMesaEnGrupoAndEstadoIn(
                        numeroMesa,
                        String.valueOf(numeroMesa),
                        List.of(EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE))
                .stream().findFirst()
                .ifPresent(reserva -> {
                    for (Integer numMesa : reserva.getListaMesas()) {
                        mesaRepository.findAll().stream()
                                .filter(m -> m.getNumero().equals(numMesa))
                                .findFirst()
                                .ifPresent(m -> {
                                    m.setEstado("LIBRE");
                                    mesaRepository.save(m);
                                    System.out.println("DEBUG RESERVA -> Mesa N° " + numMesa + " liberada");
                                });
                    }
                });
    }
}