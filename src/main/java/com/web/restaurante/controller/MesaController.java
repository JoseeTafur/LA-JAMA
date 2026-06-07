package com.web.restaurante.controller;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.service.MesaService;
import com.web.restaurante.service.PedidoService;
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
    private final MesaRepository mesaRepository;
    private final PedidoRepository pedidoRepository;

    @GetMapping
    public String verPlanoMesas(Model model) {
        List<MesaDTO> mesasDTO = mesaService.obtenerMesasParaSalon();
        List<Pedido> pedidosActivos = mesaService.obtenerPedidosActivos();

        model.addAttribute("mesas", mesasDTO);
        model.addAttribute("pedidos", pedidosActivos);
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

    @PostMapping("/comanda/eliminar-item")
    @ResponseBody
    public ResponseEntity<String> eliminarItemComanda(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            // 1. Ejecuta la eliminación o conversión a merma original
            mesaService.eliminarDetallePedido(pedidoId, detalleId);

            // 2. Recuperamos el estado actual del pedido inmediatamente después del cambio
            Pedido pedidoActualizado = pedidoRepository.findById(pedidoId)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

            // 3. Contamos cuántos platos VÁLIDOS (no mermados) quedan en la comanda
            long platosActivos = 0;
            if (pedidoActualizado.getListaDetalles() != null) {
                platosActivos = pedidoActualizado.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .count();
            }

            // 4. INGENIERÍA DE ESTADOS: Si ya no quedan platos reales en la mesa, la limpiamos por completo
            if (platosActivos == 0) {
                // Buscamos la mesa usando el número grabado en el pedido
                Mesa mesaAsociada = mesaRepository.findByNumero(pedidoActualizado.getNumeroMesa())
                        .orElse(null);

                if (mesaAsociada != null) {
                    // Cambiamos el estado de la mesa física a LIBRE para limpiar el plano
                    mesaAsociada.setEstado("LIBRE");
                    mesaRepository.save(mesaAsociada);
                }

                // Cambiamos el estado del pedido a CANCELADO para que no altere las estadísticas de sala
                pedidoActualizado.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
                pedidoRepository.save(pedidoActualizado);

                return ResponseEntity.ok("Mesa liberada automáticamente por comanda vacía");
            }

            return ResponseEntity.ok("Producto removido correctamente");
        } catch (Exception e) {
            e.printStackTrace();
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
            @RequestParam String matrizTickets,
            @RequestParam(required = false) List<Long> idsDetallesPagados) { // 🌟 NUEVO PARAMETRO
        try {
            // Ya no llamamos a liberarMesaForzado, usamos el nuevo servicio inteligente
            mesaService.procesarCobro(pedidoId, mesaId, idsDetallesPagados);
            return ResponseEntity.ok("Cobro procesado correctamente");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
    @PostMapping("/trasladar")
    @ResponseBody
    public ResponseEntity<String> trasladarMesa(
            @RequestParam Long idMesaOrigen,
            @RequestParam Long idMesaDestino) {
        try {
            mesaService.trasladarComandaDeMesa(idMesaOrigen, idMesaDestino);
            return ResponseEntity.ok("Comanda trasladada con éxito");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al trasladar mesa: " + e.getMessage());
        }
    }

    @PostMapping("/comanda/dividir-platos-por-numero")
    @ResponseBody
    public ResponseEntity<String> dividirYTrasladarPlatosPorNumero(
            @RequestParam Long idMesaOrigen,
            @RequestParam Integer numeroMesaDestino, // 🌟 Recibe el número directo (Ej: 5)
            @RequestParam List<Long> idsDetalles) {
        try {
            // Buscamos la mesa destino por su número en la base de datos antes de operar
            Mesa mesaDestino = mesaRepository.findByNumero(numeroMesaDestino)
                    .orElseThrow(() -> new RuntimeException("La mesa N° " + numeroMesaDestino + " no existe en el plano."));

            mesaService.dividirYTrasladarPlatos(idMesaOrigen, mesaDestino.getId(), idsDetalles);
            return ResponseEntity.ok("Platos divididos correctamente");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

}