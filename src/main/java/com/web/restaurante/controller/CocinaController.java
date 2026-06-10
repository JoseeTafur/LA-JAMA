package com.web.restaurante.controller;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Usuario;
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

            // ========================================================
            // 🔒 CONFIGURACIÓN ESTRUCTURAL DE RUTA (PERSISTENCIA F5)
            // ========================================================
            model.addAttribute("activeUri", "/admin/cocina/caliente");
            model.addAttribute("titleHeader", "Monitor de Cocina Caliente");

            model.addAttribute("pedidos", pedidosCalientes);
            model.addAttribute("estacion", "Cocina Caliente");
            model.addAttribute("tipoEstacion", "caliente");
            return "admin/cocina_caliente";
        } else if ("fria".equals(tipoLimpio)) {
            List<Pedido> pedidosFrios = pedidoService.listarPedidosFrios();

            // ========================================================
            // 🔒 CONFIGURACIÓN ESTRUCTURAL DE RUTA (PERSISTENCIA F5)
            // ========================================================
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

        // 1. Filtramos SOLO los platos que NO se han impreso, que NO son mermas y que son de esta estación
        List<DetallePedido> detallesAImprimir = pedido.getListaDetalles().stream()
                .filter(d -> !d.isCanceladoPorCliente() && !d.isImpresoEnCocina())
                .filter(d -> {
                    String nombreCat = d.getProducto().getCategoria().getNombre().toUpperCase();
                    if ("caliente".equalsIgnoreCase(tipo)) return nombreCat.contains("CALIENTE");
                    else return nombreCat.contains("FRI") || nombreCat.contains("FRÍ");
                })
                .toList();

        // 2. Si no hay nada nuevo (el chef le dio a reimprimir por si acaso), le mandamos todos los activos
        if (detallesAImprimir.isEmpty()) {
            detallesAImprimir = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .filter(d -> {
                        String cat = d.getProducto().getCategoria().getNombre().toUpperCase();
                        return "caliente".equalsIgnoreCase(tipo) ? cat.contains("CALIENTE") : (cat.contains("FRI") || cat.contains("FRÍ"));
                    }).toList();
        } else {
            // 3. Si SÍ había platos nuevos, los marcamos como impresos para que nunca más vuelvan a salir en un ticket nuevo
            for (DetallePedido d : detallesAImprimir) {
                d.setImpresoEnCocina(true);
            }
            pedidoService.guardar(pedido); // Guarda los cambios en BD
        }

        model.addAttribute("pedido", pedido);
        model.addAttribute("detalles", detallesAImprimir);
        model.addAttribute("tipoCocina", tipo.toUpperCase());
        return "admin/cocina/ticket_pdf";
    }

    @PostMapping("/completar")
    public String completarPedido(@RequestParam Long pedidoId, @RequestParam String tipoEstacion) {
        System.out.println("DEBUG: Completando estación " + tipoEstacion + " para pedido ID: " + pedidoId);
        pedidoService.completarEstacion(pedidoId, tipoEstacion);

        Pedido p = pedidoService.obtenerPorId(pedidoId);
        String identificadorMesa = (p != null && p.getNumeroMesa() != null) ? "N° " + p.getNumeroMesa() : String.valueOf(pedidoId);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "Mesa " + identificadorMesa + " tiene su lote de cocina " + tipoEstacion + " listo.");

        return "redirect:/admin/cocina/" + tipoEstacion + "?success";
    }

    // =========================================================================
    // 🔥 NUEVO: DESPACHAR ÍTEM INDIVIDUAL POR AJAX DESDE MONITOR DEL CHEF
    // =========================================================================
    @PostMapping("/completar-item")
    @ResponseBody
    public String completarItemIndividual(@RequestParam Long pedidoId, @RequestParam Long detalleId, @RequestParam String tipoEstacion) {
        System.out.println("DEBUG: Despachando fila exacta ID: " + detalleId + " de la comanda: " + pedidoId);
        pedidoService.despacharPlatoIndividual(pedidoId, detalleId);

        Pedido p = pedidoService.obtenerPorId(pedidoId);
        String identificadorMesa = (p != null && p.getNumeroMesa() != null) ? "N° " + p.getNumeroMesa() : "Carta/Delivery";

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "Un plato de la Mesa " + identificadorMesa + " está listo en barra.");

        return "OK";
    }
}