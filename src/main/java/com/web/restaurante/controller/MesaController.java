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
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/comanda/eliminar-item")
    @ResponseBody
    public ResponseEntity<String> eliminarItemComanda(
            @RequestParam Long pedidoId,
            @RequestParam Long detalleId,
            @RequestParam(value = "esMerma", defaultValue = "false") boolean esMerma) {
        try {
            pedidoService.eliminarItemComanda(pedidoId, detalleId, esMerma);

            Pedido pedidoActualizado = pedidoRepository.findById(pedidoId)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

            long platosActivos = 0;
            long mermasPorPagar = 0;

            if (pedidoActualizado.getListaDetalles() != null) {
                platosActivos = pedidoActualizado.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .count();

                mermasPorPagar = pedidoActualizado.getListaDetalles().stream()
                        .filter(d -> d.isCanceladoPorCliente() && !d.isPagado())
                        .count();
            }

            if (platosActivos == 0 && mermasPorPagar == 0) {
                Mesa mesaAsociada = mesaRepository.findByNumero(pedidoActualizado.getNumeroMesa()).orElse(null);
                if (mesaAsociada != null) {
                    mesaAsociada.setEstado("DISPONIBLE");
                    mesaRepository.save(mesaAsociada);
                }
                pedidoActualizado.setEstado(com.web.restaurante.model.enums.EstadoPedido.CANCELADO);
                pedidoRepository.save(pedidoActualizado);

                return ResponseEntity.ok("Mesa liberada automáticamente por comanda vacía");
            }

            return ResponseEntity.ok("Producto removido correctamente y transformado en merma cobrable");

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/comanda/entregar-item")
    @ResponseBody
    public ResponseEntity<String> entregarItemIndividual(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            mesaService.entregarPlatoIndividual(pedidoId, detalleId);
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
            @RequestParam("idMesaPrincipal") Long idMesaPrincipal,
            @RequestParam(value = "idsMesasHijas[]", required = false) List<String> idsMesasHijas) {
        try {
            if (idsMesasHijas == null || idsMesasHijas.isEmpty()) {
                return ResponseEntity.badRequest().body("Error: No se seleccionaron mesas hijas para realizar la unificación.");
            }

            List<Long> idsMesasHijasLong = idsMesasHijas.stream()
                    .map(id -> Long.parseLong(id.trim()))
                    .toList();

            mesaService.unificarMesas(idMesaPrincipal, idsMesasHijasLong);

            return ResponseEntity.ok("Mesas unificadas con éxito");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
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
            @RequestParam(required = false) String idsDetallesPagados) {
        try {
            List<Long> listaIdsLong = new java.util.ArrayList<>();
            if (idsDetallesPagados != null && !idsDetallesPagados.trim().isEmpty()) {
                for (String idStr : idsDetallesPagados.split(",")) {
                    if (!idStr.trim().isEmpty()) {
                        listaIdsLong.add(Long.parseLong(idStr.trim()));
                    }
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            List<TicketDTO> listaTickets;
            try {
                listaTickets = mapper.readValue(matrizTickets,
                        new com.fasterxml.jackson.core.type.TypeReference<List<TicketDTO>>() {});
            } catch (Exception jsonEx) {
                return ResponseEntity.badRequest().body("Error en formato de tickets: " + jsonEx.getMessage());
            }

            mesaService.procesarLiquidacionMultiticket(pedidoId, mesaId, listaTickets, listaIdsLong);

            return ResponseEntity.ok("Cobro multiticket procesado e independizado correctamente");

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
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al trasladar mesa: " + e.getMessage());
        }
    }

    @PostMapping("/comanda/dividir-platos-por-numero")
    @ResponseBody
    public ResponseEntity<String> dividirYTrasladarPlatosPorNumero(
            @RequestParam("idMesaOrigen") Long idMesaOrigen,
            @RequestParam("numeroMesaDestino") Integer numeroMesaDestino,
            @RequestParam("idsDetalles") List<String> idsDetalles) {
        try {
            if (idsDetalles == null || idsDetalles.isEmpty()) {
                return ResponseEntity.badRequest().body("Error: No se recibieron identificadores de platos.");
            }

            List<Long> idsDetallesLong = idsDetalles.stream()
                    .map(id -> Long.parseLong(id.trim()))
                    .toList();

            Mesa mesaDestino = mesaRepository.findByNumero(numeroMesaDestino)
                    .orElseThrow(() -> new RuntimeException("La mesa N° " + numeroMesaDestino + " no existe en el plano."));

            mesaService.dividirYTrasladarPlatos(idMesaOrigen, mesaDestino.getId(), idsDetallesLong);

            return ResponseEntity.ok("Platos divididos correctamente");
        } catch (NumberFormatException nfe) {
            return ResponseEntity.badRequest().body("Error: Formato de ID de plato inválido.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

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

    @PostMapping("/liberar-manual/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> liberarMesaManual(@PathVariable Integer numeroMesa) {
        try {
            mesaService.liberarMesaManual(numeroMesa);
            return ResponseEntity.ok(Map.of("success", true, "message", "Mesa liberada con éxito"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}