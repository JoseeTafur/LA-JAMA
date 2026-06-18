package com.web.restaurante.controller;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.dto.mesas.TicketDTO;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
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
        model.addAttribute("activeUri", "/admin/mesas");
        model.addAttribute("titleHeader", "Plano de Distribución de Mesas");

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
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/comanda/eliminar-item")
    @ResponseBody
    public ResponseEntity<String> eliminarItemComanda(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            mesaService.eliminarDetallePedido(pedidoId, detalleId);

            Pedido pedidoActualizado = pedidoRepository.findById(pedidoId)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

            long platosActivos = 0;
            if (pedidoActualizado.getListaDetalles() != null) {
                platosActivos = pedidoActualizado.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .count();
            }

            if (platosActivos == 0) {
                Mesa mesaAsociada = mesaRepository.findByNumero(pedidoActualizado.getNumeroMesa())
                        .orElse(null);

                if (mesaAsociada != null) {
                    mesaAsociada.setEstado("LIBRE");
                    mesaRepository.save(mesaAsociada);
                }

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

    @PostMapping("/comanda/liquidar-bloque-multiticket/{pedidoId}")
    @ResponseBody
    public ResponseEntity<String> liquidarBloqueMultiticket(
            @PathVariable Long pedidoId,
            @RequestParam Long mesaId,
            @RequestParam String matrizTickets,
            @RequestParam(required = false) String idsDetallesPagados) { // 🟩 Cambiado a String para blindar la recepción
        try {
            System.out.println("🛰️ [MESA CONTROLLER] Procesando pago masivo para Pedido #" + pedidoId);

            // 1. Transformación manual y segura de los IDs separados por comas
            List<Long> listaIdsLong = new java.util.ArrayList<>();
            if (idsDetallesPagados != null && !idsDetallesPagados.trim().isEmpty()) {
                for (String idStr : idsDetallesPagados.split(",")) {
                    if (!idStr.trim().isEmpty()) {
                        listaIdsLong.add(Long.parseLong(idStr.trim()));
                    }
                }
            }

            // 2. Parsear la matriz de tickets dinámicos enviados por el carrusel móvil
            ObjectMapper mapper = new ObjectMapper();
            List<TicketDTO> listaTickets;
            try {
                listaTickets = mapper.readValue(matrizTickets,
                        new com.fasterxml.jackson.core.type.TypeReference<List<TicketDTO>>() {});
            } catch (Exception jsonEx) {
                System.err.println("❌ Error crítico al parsear matrizTickets JSON: " + jsonEx.getMessage());
                return ResponseEntity.badRequest().body("Error en formato de tickets: " + jsonEx.getMessage());
            }

            // 3. Delegar la fragmentación y liquidación contable al Service con la lista procesada
            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, listaIdsLong);

            System.out.println("🎉 [MESA CONTROLLER] Liquidación multiticket completada con éxito.");
            return ResponseEntity.ok("Cobro multiticket procesado e independizado correctamente");

        } catch (Exception e) {
            System.err.println("💥 Falló el procesamiento de liquidación: " + e.getMessage());
            e.printStackTrace();
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
            @RequestParam Integer numeroMesaDestino,
            @RequestParam List<Long> idsDetalles) {
        try {
            Mesa mesaDestino = mesaRepository.findByNumero(numeroMesaDestino)
                    .orElseThrow(() -> new RuntimeException("La mesa N° " + numeroMesaDestino + " no existe en el plano."));

            mesaService.dividirYTrasladarPlatos(idMesaOrigen, mesaDestino.getId(), idsDetalles);
            return ResponseEntity.ok("Platos divididos correctamente");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }


    // =========================================================================
    // 🟩 MASIVO 1: MUDAR LOTE DE MESAS DESOCUPADAS AL APARTADO DE RESERVAS
    // =========================================================================
    @PostMapping("/api/trasladar-a-reserva-masivo")
    @ResponseBody
    public ResponseEntity<?> trasladarAReservaMasivo(@RequestParam("idsMesas") List<Long> idsMesas) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (idsMesas == null || idsMesas.isEmpty()) {
                response.put("success", false);
                response.put("message", "No se seleccionó ninguna mesa.");
                return ResponseEntity.badRequest().body(response);
            }

            // Delegamos la mudanza física al servicio
            mesaService.mudarMesasAReservaEnBloque(idsMesas);

            response.put("success", true);
            response.put("message", "Lote de " + idsMesas.size() + " mesas movido a reservas con éxito.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error en lote: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // =========================================================================
    // 🟩 MASIVO 2: QUITAR CUSTODIA Y DEVOLVER LOTE DE MESAS AL SALÓN ORDINARIO
    // =========================================================================
    @PostMapping("/api/quitar-de-reserva-masivo")
    @ResponseBody
    public ResponseEntity<?> quitarDeReservaMasivo(@RequestParam("idsMesas") List<Long> idsMesas) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (idsMesas == null || idsMesas.isEmpty()) {
                response.put("success", false);
                response.put("message", "No se seleccionó ninguna mesa.");
                return ResponseEntity.badRequest().body(response);
            }

            // Delegamos la liberación al servicio
            mesaService.liberarMesasDeReservaEnBloque(idsMesas);

            response.put("success", true);
            response.put("message", "Lote de " + idsMesas.size() + " mesas devuelto al salón ordinario.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al liberar lote: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}