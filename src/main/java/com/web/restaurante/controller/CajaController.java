package com.web.restaurante.controller;

import com.web.restaurante.model.Pedido;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin/caja")
@RequiredArgsConstructor
public class CajaController {

    private final PedidoService pedidoService;
    private final ProductoRepository productoRepository;

    @GetMapping
    public String verCaja(Model model) {
        model.addAttribute("pedidos", pedidoService.listarPedidosPorCobrar());
        model.addAttribute("pedidosPendientes", pedidoService.listarPendientesDeCarta());
        return "admin/caja";
    }

    @PostMapping("/aprobar/{id}")
    public String aprobarPedido(@PathVariable Long id) {
        pedidoService.aprobarPedidoACocina(id);
        return "redirect:/admin/caja?aprobado";
    }

    @PostMapping("/rechazar/{id}")
    public String rechazarPedido(@PathVariable Long id) {
        pedidoService.actualizarEstadoPedido(id, com.web.restaurante.model.enums.EstadoPedido.PAGADO);
        return "redirect:/admin/caja?rechazado";
    }

    @PostMapping("/liquidar")
    public String liquidarPedido(@RequestParam Long pedidoId) {
        pedidoService.cobrarPedido(pedidoId);
        return "redirect:/admin/caja?success";
    }
    @GetMapping("/delivery/nuevo")
    public String nuevaComandaDelivery(Model model) {
        model.addAttribute("productos", productoRepository.findAll());

        return "admin/cajero_delivery";
    }

    @PostMapping("/delivery/guardar")
    @ResponseBody
    public ResponseEntity<?> guardarDelivery(@RequestBody Pedido pedido) {
        pedidoService.guardarPedido(pedido);

        // El cajero ya aprobó el pedido al tomarlo manualmente
        // tanto DELIVERY como LOCAL van directo a EN_COCINA
        if (pedido.getId() != null) {
            pedidoService.actualizarEstadoPedido(pedido.getId(),
                com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
        }

        return ResponseEntity.ok().build();
    }
}