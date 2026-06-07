package com.web.restaurante.controller;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.service.MesaService;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.repository.ReservaRepository;
import com.web.restaurante.model.enums.EstadoReserva;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/mesas")
@RequiredArgsConstructor
public class MesaController {

    private final MesaService mesaService;
    private final PedidoService pedidoService;
    private final ReservaRepository reservaRepository;

    @GetMapping
    public String verPlanoMesas(Model model) {
        List<MesaDTO> mesasDTO = mesaService.obtenerMesasParaSalon();
        List<Pedido> pedidosActivos = mesaService.obtenerPedidosActivos();

        // Mapa: numeroMesa -> lista de otras mesas del mismo grupo de reserva
        java.util.Map<Integer, java.util.List<Integer>> gruposReserva = new java.util.HashMap<>();
        java.util.List<com.web.restaurante.model.Reserva> reservasActivas = reservaRepository
                .findByEstadoIn(java.util.List.of(EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA));
        // Agrupar por cliente+hora
        java.util.Map<String, java.util.List<com.web.restaurante.model.Reserva>> grupos = reservasActivas.stream()
                .collect(Collectors.groupingBy(r -> r.getNombreCliente() + "|" + r.getFechaHoraReserva()));
        for (java.util.List<com.web.restaurante.model.Reserva> grupo : grupos.values()) {
            if (grupo.size() > 1) {
                for (com.web.restaurante.model.Reserva r : grupo) {
                    java.util.List<Integer> otras = grupo.stream()
                            .filter(x -> !x.getNumeroMesa().equals(r.getNumeroMesa()))
                            .map(com.web.restaurante.model.Reserva::getNumeroMesa)
                            .collect(Collectors.toList());
                    gruposReserva.put(r.getNumeroMesa(), otras);
                }
            }
        }

        model.addAttribute("mesas", mesasDTO);
        model.addAttribute("pedidos", pedidosActivos);
        model.addAttribute("gruposReserva", gruposReserva);
        return "admin/mesas";
    }

    @PostMapping("/entregar-plato/{idMesa}")
    @ResponseBody
    public String entregarPlato(@PathVariable Integer idMesa) {
        mesaService.entregarPlatoEnMesa(idMesa);
        return "OK";
    }

    @PostMapping("/liberar/{idMesa}")
    @ResponseBody
    public String liberarMesa(@PathVariable Long idMesa) {
        mesaService.liberarYFacturarMesa(idMesa);
        return "OK";
    }

    @GetMapping("/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuenta(@PathVariable Integer numeroMesa) {
        Map<String, Object> precuenta = mesaService.generarPrecuenta(numeroMesa);
        if (precuenta == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(precuenta);
    }

    @PostMapping("/desagrupar-grupo/{idMesaPadre}")
    @ResponseBody
    public ResponseEntity<String> desagruparGrupoCompleto(@PathVariable Long idMesaPadre) {
        try {
            mesaService.desagruparGrupoCompleto(idMesaPadre);
            return ResponseEntity.ok("Grupo disuelto con éxito");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 🔥 CAMBIO: Ahora recibe detalleId en lugar de productoId
    @PostMapping("/comanda/eliminar-item")
    @ResponseBody
    public ResponseEntity<String> eliminarItemComanda(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            mesaService.eliminarDetallePedido(pedidoId, detalleId);
            return ResponseEntity.ok("Producto removido correctamente");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/comanda/entregar-item")
    @ResponseBody
    public ResponseEntity<String> entregarItemIndividual(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            pedidoService.entregarPlatoIndividual(pedidoId, detalleId);
            return ResponseEntity.ok("Plato servido en mesa");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al entregar el plato: " + e.getMessage());
        }
    }

    @PostMapping("/desvincular/{idMesa}")
    @ResponseBody
    public ResponseEntity<String> desvincularMesa(@PathVariable Long idMesa) {
        try {
            mesaService.desvincularMesa(idMesa);
            return ResponseEntity.ok("Mesa liberada");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/unificar")
    @ResponseBody
    public ResponseEntity<String> unificarMesas(
            @RequestParam Long idMesaPrincipal,
            @RequestParam List<Long> idsMesasHijas) {
        try {
            mesaService.unificarMesas(idMesaPrincipal, idsMesasHijas);
            return ResponseEntity.ok("Mesas unificadas con éxito");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al unificar: " + e.getMessage());
        }
    }

    /**
     * CIERRE MASIVO MULTITICKET — llamado desde caja-movil.js al presionar "PROCESAR CIERRE MASIVO"
     * Cobra el pedido, libera la mesa y sus hijas.
     */
    @PostMapping("/comanda/liquidar-bloque-multiticket/{pedidoId}")
    @ResponseBody
    public ResponseEntity<String> liquidarBloqueMultiticket(
            @PathVariable Long pedidoId,
            @RequestParam Long mesaId,
            @RequestParam String matrizTickets) {
        try {
            // 1. Marcar pedido como PAGADO
            pedidoService.cobrarPedido(pedidoId);

            // 2. Liberar la mesa y sus hijas
            mesaService.liberarMesaForzado(mesaId);

            return ResponseEntity.ok("Mesa cobrada y liberada");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

}