package com.web.restaurante.controller;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Producto;
import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.enums.EstadoPago;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.TurnoCajaService; // 🚀 INYECTADO
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/mesero")
@RequiredArgsConstructor
public class MeseroController {

    private final ProductoRepository productoRepository;
    private final PedidoService pedidoService;
    private final MesaRepository mesaRepository;
    private final PedidoRepository pedidoRepository;
    private final InsumoProductoRepository insumoProductoRepository;
    private final TurnoCajaService turnoCajaService; // 🚀 Guardian Contable inyectado

    // =========================================================================
    // 🛡️ NÚCLEO OPERATIVO: CONTROL DE ENTRADA CON TRADUCTOR DE ENTORNO ANTI-NULL
    // =========================================================================
    @GetMapping("/nuevo")
    public String nuevoPedido(Model model, HttpSession session,
                              @RequestParam(required = false) Long mesaId,
                              @RequestParam(required = false) String pedidoId) {

        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        Long pedidoIdCorrecto = null;
        if (pedidoId != null && !pedidoId.trim().isEmpty() && !"null".equalsIgnoreCase(pedidoId.trim())) {
            try {
                pedidoIdCorrecto = Long.parseLong(pedidoId.trim());
            } catch (NumberFormatException e) {
                System.out.println("⚠️ [COMANDERA] Formato de comanda corrupto interceptado: " + pedidoId);
            }
        }

        model.addAttribute("activeUri", "/admin/mesas");
        model.addAttribute("titleHeader", "Comandera / Mesa N° " + (mesaId != null ? mesaId : ""));

        if (mesaId == null) {
            return "redirect:/admin/mesas";
        }

        List<Producto> listaProductos = productoRepository.findAll();
        Map<Long, Boolean> productosAgotados = new HashMap<>();

        for (Producto p : listaProductos) {
            boolean agotado = false;
            List<InsumoProducto> receta = insumoProductoRepository.findByProductoId(p.getId());

            for (InsumoProducto ip : receta) {
                if (ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria())) {
                    double stockActual = ip.getInsumo().getStockActual() != null ? ip.getInsumo().getStockActual() : 0.0;
                    double cantidadRequerida = ip.getCantidadUsada() != null ? ip.getCantidadUsada() : 0.0;

                    if (stockActual < cantidadRequerida) {
                        agotado = true;
                        break;
                    }
                }
            }
            productosAgotados.put(p.getId(), agotado);
        }

        model.addAttribute("productos", listaProductos);
        model.addAttribute("productosAgotados", productosAgotados);
        model.addAttribute("mesaId", mesaId);

        if (pedidoIdCorrecto != null) {
            model.addAttribute("pedidoId", pedidoIdCorrecto);
        }

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
                pedidoFinal.setEstadoPago(EstadoPago.PENDIENTE);
                pedidoFinal.setCliente(pedidoDeFrontend.getCliente());
                pedidoFinal.setDireccion(pedidoDeFrontend.getDireccion());

                if (pedidoDeFrontend.getListaDetalles() != null) {
                    for (DetallePedido nuevoDetalle : pedidoDeFrontend.getListaDetalles()) {
                        Producto productoCompleto = productoRepository.findById(nuevoDetalle.getProducto().getId())
                                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + nuevoDetalle.getProducto().getId()));

                        nuevoDetalle.setProducto(productoCompleto);
                        nuevoDetalle.setPedido(pedidoFinal);
                        nuevoDetalle.setCocinado(false);

                        pedidoFinal.getListaDetalles().add(nuevoDetalle);
                    }
                }

            } else {
                pedidoFinal = pedidoDeFrontend;
                pedidoFinal.setEstado(EstadoPedido.EN_COCINA);
                pedidoFinal.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PENDIENTE);
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

            // 🛡️ CANDADO A: Asegurar turno de caja en la creación de comandas de salón
            if (pedidoFinal.getTurnoCaja() == null) {
                turnoCajaService.obtenerTurnoActivo().ifPresent(pedidoFinal::setTurnoCaja);
            }

            if (mesaId != null) {
                Mesa mesa = mesaRepository.findById(mesaId).orElseThrow();
                pedidoFinal.setNumeroMesa(mesa.getNumero());
                mesa.setEstado("OCUPADA");
                mesaRepository.save(mesa);
            }

            boolean hayFrioPendiente = false;
            boolean hayCalientePendiente = false;

            if (pedidoFinal.getListaDetalles() != null) {
                for (DetallePedido d : pedidoFinal.getListaDetalles()) {
                    if (d.getProducto() != null && d.getProducto().getCategoria() != null) {
                        String cat = d.getProducto().getCategoria().getNombre().toUpperCase();
                        if ((cat.contains("FRI") || cat.contains("FRÍ")) && !d.isCocinado()) {
                            hayFrioPendiente = true;
                        }
                        if (cat.contains("CALIENTE") && !d.isCocinado()) {
                            hayCalientePendiente = true;
                        }
                    }
                }
            }

            pedidoFinal.setFrioListo(!hayFrioPendiente);
            pedidoFinal.setCalienteListo(!hayCalientePendiente);

            if (!hayFrioPendiente && !hayCalientePendiente) {
                if (pedidoFinal.getFechaSalida() == null) {
                    pedidoFinal.setFechaSalida(LocalDateTime.now());
                }
            } else {
                pedidoFinal.setFechaSalida(null);
            }

            double totalAcumulado = 0;
            if (pedidoFinal.getListaDetalles() != null) {
                for (DetallePedido detalle : pedidoFinal.getListaDetalles()) {
                    detalle.setPedido(pedidoFinal);
                    if (detalle.getPrecioUnitario() == null && detalle.getProducto() != null) {
                        detalle.setPrecioUnitario(detalle.getProducto().getPrecio());
                    }
                    totalAcumulado += detalle.getSubtotal();
                }
            }
            pedidoFinal.setMontoTotal(totalAcumulado);

            // Guardamos a través del service de forma completa
            pedidoService.guardarPedido(pedidoFinal);

            // 🛡️ CANDADO B: Si es adición, volvemos a asegurar que no se limpie el turno en cascada
            if (pedidoFinal.getId() != null) {
                Pedido pedidoSeguro = pedidoRepository.findById(pedidoFinal.getId()).orElse(pedidoFinal);
                turnoCajaService.obtenerTurnoActivo().ifPresent(pedidoSeguro::setTurnoCaja);
                pedidoRepository.save(pedidoSeguro);
            }

            return "OK";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error: " + e.getMessage();
        }
    }

    @PostMapping("/comanda/eliminar-item")
    @ResponseBody
    public ResponseEntity<String> eliminarItemDesdeSalon(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            pedidoService.eliminarItemComanda(pedidoId, detalleId);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
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

            // 🛡️ CANDADO CONTABLE MANTENIDO
            if (pedido.getTurnoCaja() == null) {
                turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
            }

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

            pedido.setEstado(EstadoPedido.ENTREGADO);
            pedido.setFechaEntrega(LocalDateTime.now());

            if (pedido.getTurnoCaja() == null) {
                turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
            }

            // Solo libera si ya está pagado
            if (EstadoPago.PAGADO.equals(pedido.getEstadoPago())) {
                pedido.setNumeroMesa(null);
                if (mesaId != null) {
                    Mesa mesa = mesaRepository.findById(mesaId).orElseThrow();
                    mesa.setEstado("DISPONIBLE");
                    mesaRepository.save(mesa);
                }
            }
            // Si NO está pagado, sigue en el plano con estado ENTREGADO esperando cobro

            pedidoRepository.save(pedido);
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

            if (pedido.getTurnoCaja() == null) {
                turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
            }

            pedidoRepository.save(pedido);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}