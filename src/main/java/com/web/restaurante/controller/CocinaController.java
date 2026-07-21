package com.web.restaurante.controller;

import com.web.restaurante.model.*;
import com.web.restaurante.repository.NotificacionRepository;
import com.web.restaurante.service.PedidoService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/admin/cocina")
@RequiredArgsConstructor
public class CocinaController {

    private final PedidoService pedidoService;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificacionRepository notificacionRepository;

    @GetMapping("/{tipo}")
    public String verMonitor(@PathVariable("tipo") String tipo, HttpSession session, Model model) {
        System.out.println("==== DEBUG COCINA START ====");
        Usuario user = (Usuario) session.getAttribute("usuarioLogueado");
        Empleado emp = (Empleado) session.getAttribute("empleadoLogueado");

        if (user == null) {
            System.out.println("DEBUG: No hay usuario en sesión.");
            return "redirect:/login";
        }

        String perfil = user.getPerfil().getNombre().toUpperCase();
        String tipoLimpio = tipo.trim().toLowerCase();
        System.out.println("DEBUG: Usuario: " + user.getUsuario() + " | Perfil: " + perfil + " | Estación: " + tipoLimpio);

        if (!perfil.contains("ADMIN")) {
            if (emp == null) {
                System.out.println("DEBUG: Error - Empleado es NULL");
                return "redirect:/dashboard?error=no_employee_data";
            }
            String cargo = emp.getCargo().getNombre().toUpperCase();
            System.out.println("DEBUG: Cargo del empleado: " + cargo);

            if ("caliente".equals(tipoLimpio) && !cargo.contains("CALIENTE")) {
                System.out.println("DEBUG: Bloqueado - No es cocina caliente");
                return "redirect:/dashboard?error=unauthorized";
            }
            if ("fria".equals(tipoLimpio) && (!cargo.contains("FRIO") && !cargo.contains("FRÍO"))) {
                System.out.println("DEBUG: Bloqueado - No es cocina fría");
                return "redirect:/dashboard?error=unauthorized";
            }
        }

        if ("caliente".equals(tipoLimpio)) {
            List<Pedido> pedidosCalientes = pedidoService.listarPedidosCalientes();

            model.addAttribute("activeUri", "/admin/cocina/caliente");
            model.addAttribute("titleHeader", "Monitor de Cocina Caliente");

            model.addAttribute("pedidos", pedidosCalientes);
            model.addAttribute("estacion", "Cocina Caliente");
            model.addAttribute("tipoEstacion", "caliente");
            return "admin/cocina_caliente";
        } else if ("fria".equals(tipoLimpio)) {
            List<Pedido> pedidosFrios = pedidoService.listarPedidosFrios();

            model.addAttribute("activeUri", "/admin/cocina/fria");
            model.addAttribute("titleHeader", "Monitor de Cocina Fría / Frescos");

            model.addAttribute("pedidos", pedidosFrios);
            model.addAttribute("estacion", "Cocina Fría / Frescos");
            model.addAttribute("tipoEstacion", "fria");
            return "admin/cocina_fria";
        }

        return "redirect:/dashboard";
    }

    @GetMapping("/ticket/{pedidoId}/{tipo}")
    public String verTicketPDF(@PathVariable Long pedidoId, @PathVariable String tipo, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(pedidoId);

        List<DetallePedido> detallesAImprimir = pedido.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isImpresoEnCocina())
                .filter(d -> {
                    if (d.getProducto() == null ||
                            d.getProducto().getCategoria() == null ||
                            d.getProducto().getCategoria().getNombre() == null) {
                        return false;
                    }
                    String nombreCat = d.getProducto().getCategoria().getNombre().toUpperCase();
                    if ("caliente".equalsIgnoreCase(tipo)) return nombreCat.contains("CALIENTE");
                    else return nombreCat.contains("FRI") || nombreCat.contains("FRÍ");
                })
                .toList();

        if (detallesAImprimir.isEmpty()) {
            detallesAImprimir = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .filter(d -> {
                        if (d.getProducto() == null ||
                                d.getProducto().getCategoria() == null ||
                                d.getProducto().getCategoria().getNombre() == null) {
                            return false;
                        }
                        String cat = d.getProducto().getCategoria().getNombre().toUpperCase();
                        return "caliente".equalsIgnoreCase(tipo) ? cat.contains("CALIENTE") : (cat.contains("FRI") || cat.contains("FRÍ"));
                    }).toList();
        } else {
            for (DetallePedido d : detallesAImprimir) {
                d.setImpresoEnCocina(true);
            }
        }

        pedido.setTicketImpresoCocina(true);

        if (pedido.getEstado() == com.web.restaurante.model.enums.EstadoPedido.ENVIADO) {
            pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
            System.out.println("DEBUG COCINA: El pedido #" + pedidoId + " cambió de ENVIADO a EN_COCINA por impresión.");
        } else {
            System.out.println("DEBUG COCINA: Se reimprimió el ticket del pedido #" + pedidoId + " manteniendo su estado actual: " + pedido.getEstado());
        }

        pedidoService.guardar(pedido);

        model.addAttribute("pedido", pedido);
        model.addAttribute("detalles", detallesAImprimir);
        model.addAttribute("tipoCocina", tipo.toUpperCase());
        return "admin/cocina/ticket_pdf";
    }

    @PostMapping("/completar")
    public String completarPedido(@RequestParam Long pedidoId, @RequestParam String tipoEstacion) {
        pedidoService.completarEstacion(pedidoId, tipoEstacion);

        Pedido p = pedidoService.obtenerPorId(pedidoId);
        String identificadorMesa = (p != null && p.getNumeroMesa() != null) ? "Mesa N° " + p.getNumeroMesa() : String.valueOf(pedidoId);

        String msgNotif = "🔔 ¡Lote Completo! La " + identificadorMesa + " tiene su sección de cocina " + tipoEstacion.toUpperCase() + " en barra.";

        Notificacion n = new Notificacion();
        n.setMensaje(msgNotif);
        n.setTipo("SUCCESS");
        n.setDestinoPerfil("MESERO");
        n.setLeido(false);
        notificacionRepository.save(n);

        messagingTemplate.convertAndSend("/topic/notificaciones/mozos", msgNotif);

        return "redirect:/admin/cocina/" + tipoEstacion + "?success";
    }

    @PostMapping("/completar-item")
    @ResponseBody
    public String completarItemIndividual(@RequestParam Long pedidoId, @RequestParam Long detalleId, @RequestParam String tipoEstacion) {
        System.out.println("DEBUG: Despachando fila exacta ID: " + detalleId + " de la comanda: " + pedidoId);
        pedidoService.despacharPlatoIndividual(pedidoId, detalleId);

        Pedido p = pedidoService.obtenerPorId(pedidoId);

        String nombrePlato = p.getListaDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .map(d -> d.getProducto().getNombre())
                .findFirst().orElse("Un plato");

        String identificadorMesa = (p.getNumeroMesa() != null) ? "Mesa N° " + p.getNumeroMesa() : "Carta/Delivery";

        String msgNotif = "🍳 ¡Listo para servir! " + nombrePlato + " asignado a la " + identificadorMesa;

        Notificacion n = new Notificacion();
        n.setMensaje(msgNotif);
        n.setTipo("SUCCESS");
        n.setDestinoPerfil("MESERO");
        n.setLeido(false);
        notificacionRepository.save(n);

        messagingTemplate.convertAndSend("/topic/notificaciones/mozos", msgNotif);

        return "OK";
    }
}