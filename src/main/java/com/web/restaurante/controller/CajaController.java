package com.web.restaurante.controller;

import com.web.restaurante.dto.reserva.ReservaSaveDTO;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.ReservaService;
import com.web.restaurante.service.TurnoCajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Map;
import java.util.Optional;

@Controller
@RequestMapping("/admin/caja")
@RequiredArgsConstructor
public class CajaController {

    private final PedidoService pedidoService;
    private final ProductoRepository productoRepository;
    private final PedidoRepository pedidoRepository;
    private final MesaRepository mesaRepository;
    private final TurnoCajaService turnoCajaService;
    private final ReservaService reservaService;

    @GetMapping
    public String verCaja(Model model) {
        Optional<TurnoCaja> turnoActivo = turnoCajaService.obtenerTurnoActivo();

        if (turnoActivo.isEmpty()) {
            model.addAttribute("montoSugerido", turnoCajaService.obtenerMontoAperturaSugerido());
            return "admin/caja_apertura";
        }

        model.addAttribute("turno", turnoActivo.get());
        model.addAttribute("pedidos", pedidoService.listarPedidosPorCobrar());
        model.addAttribute("pedidosPendientes", pedidoService.listarPendientesDeCarta());
        model.addAttribute("movimientos", turnoCajaService.obtenerMovimientosDelTurnoActivo());
        // ── RESERVAS ──
        model.addAttribute("reservas", reservaService.listarActivas());
        model.addAttribute("reservaForm", new ReservaSaveDTO());
        model.addAttribute("todasLasMesas", mesaRepository.findAll().stream()
                .filter(m -> m.getMesaPadre() == null)
                .sorted((a, b) -> a.getNumero().compareTo(b.getNumero()))
                .toList());
        return "admin/caja";
    }

    // ── APERTURA ──────────────────────────────────────────────────────────────
    @PostMapping("/apertura")
    public String abrirTurno(@RequestParam Double montoApertura, RedirectAttributes ra) {
        try {
            turnoCajaService.abrirTurno(montoApertura);
            ra.addFlashAttribute("mensajeExito", "Caja abierta con S/ " + String.format("%.2f", montoApertura));
        } catch (IllegalStateException e) {
            ra.addFlashAttribute("mensajeError", e.getMessage());
        }
        return "redirect:/admin/caja";
    }

    // ── CIERRE ────────────────────────────────────────────────────────────────
    @PostMapping("/cierre")
    public String cerrarTurno(@RequestParam Double montoCierre,
                              @RequestParam(required = false) String observaciones,
                              RedirectAttributes ra) {
        try {
            TurnoCaja turno = turnoCajaService.cerrarTurno(montoCierre, observaciones);
            ra.addFlashAttribute("turnoCerrado", turno);
        } catch (IllegalStateException e) {
            ra.addFlashAttribute("mensajeError", e.getMessage());
        }
        return "redirect:/admin/caja/resumen-cierre";
    }

    @GetMapping("/resumen-cierre")
    public String resumenCierre(Model model) {
        return "admin/caja_cierre";
    }

    // ── PEDIDOS ───────────────────────────────────────────────────────────────
    @PostMapping("/aprobar/{id}")
    public String aprobarPedido(@PathVariable Long id) {
        pedidoService.aprobarPedidoACocina(id);
        return "redirect:/admin/caja?aprobado";
    }

    @PostMapping("/rechazar/{id}")
    public String rechazarPedido(@PathVariable Long id) {
        pedidoService.actualizarEstadoPedido(id, EstadoPedido.CANCELADO);
        return "redirect:/admin/caja?rechazado";
    }

    @PostMapping("/liquidar")
    public String liquidarPedido(@RequestParam Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + pedidoId));

        pedidoService.cobrarPedido(pedidoId);

        if (pedido.getNumeroMesa() != null) {
            mesaRepository.findAll().stream()
                    .filter(m -> m.getNumero().equals(pedido.getNumeroMesa()))
                    .findFirst()
                    .ifPresent(mesa -> {
                        mesa.setEstado("LIBRE");
                        mesaRepository.save(mesa);
                    });
        }

        return "redirect:/admin/caja?success";
    }

    // ── EGRESO MANUAL ─────────────────────────────────────────────────────────
    @PostMapping("/egreso")
    public String registrarEgreso(@RequestParam String concepto,
                                   @RequestParam Double monto,
                                   RedirectAttributes ra) {
        try {
            turnoCajaService.registrarEgreso(concepto, monto);
            ra.addFlashAttribute("mensajeExito", "Egreso registrado correctamente.");
        } catch (IllegalStateException e) {
            ra.addFlashAttribute("mensajeError", e.getMessage());
        }
        return "redirect:/admin/caja";
    }

    // ── DELIVERY ──────────────────────────────────────────────────────────────
    @GetMapping("/delivery/nuevo")
    public String nuevaComandaDelivery(Model model) {
        model.addAttribute("productos", productoRepository.findAll());
        return "admin/cajero_delivery";
    }

    @PostMapping("/delivery/guardar")
    @ResponseBody
    public ResponseEntity<?> guardarDelivery(@RequestBody Pedido pedido) {
        pedidoService.guardarPedido(pedido);
        if (pedido.getId() != null) {
            pedidoService.actualizarEstadoPedido(pedido.getId(), EstadoPedido.EN_COCINA);
        }
        return ResponseEntity.ok().build();
    }

    // ── RESERVAS ──────────────────────────────────────────────────────────────
    @PostMapping("/reservas/crear")
    public String crearReserva(@ModelAttribute("reservaForm") ReservaSaveDTO dto,
                                RedirectAttributes ra) {
        try {
            reservaService.crearReserva(dto);
            ra.addFlashAttribute("mensajeExitoReserva",
                    "✅ Reserva de " + dto.getNombreCliente() + " registrada para Mesa N° " + dto.getNumeroMesa());
        } catch (Exception e) {
            ra.addFlashAttribute("mensajeErrorReserva", "⚠️ " + e.getMessage());
        }
        return "redirect:/admin/caja#reservas";
    }

    @PostMapping("/reservas/{id}/confirmar")
    @ResponseBody
    public ResponseEntity<?> confirmarReserva(@PathVariable Long id) {
        try {
            reservaService.confirmarLlegada(id);
            return ResponseEntity.ok(Map.of("mensaje", "Mesa marcada como OCUPADA."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reservas/{id}/cancelar")
    @ResponseBody
    public ResponseEntity<?> cancelarReserva(@PathVariable Long id) {
        try {
            reservaService.cancelarReserva(id);
            return ResponseEntity.ok(Map.of("mensaje", "Reserva cancelada."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reservas/{id}/extender")
    @ResponseBody
    public ResponseEntity<?> extenderReserva(@PathVariable Long id, @RequestParam Integer minutos) {
        try {
            reservaService.extenderReserva(id, minutos);
            return ResponseEntity.ok(Map.of("mensaje", "Tiempo extendido " + minutos + " minutos."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}