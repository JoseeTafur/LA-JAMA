package com.web.restaurante.controller;

import com.web.restaurante.dto.reserva.ReservaGrupoDTO;
import com.web.restaurante.dto.reserva.ReservaSaveDTO;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Reserva;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.service.ReservaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/reservas")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;
    private final MesaRepository mesaRepository;

    @GetMapping
    public String verReservas(Model model) {
        List<Mesa> mesas = mesaRepository.findAll().stream()
                .filter(m -> m.getMesaPadre() == null)
                .sorted((a, b) -> a.getNumero().compareTo(b.getNumero()))
                .toList();

        // Agrupar: mismo cliente + misma fecha+hora truncada al minuto = una sola tarjeta
        List<Reserva> reservasActivas = reservaService.listarActivas();
        Map<String, List<Reserva>> grupos = new LinkedHashMap<>();
        for (Reserva r : reservasActivas) {
            // Truncar al minuto para que "20:00:00" y "20:00:01" sean el mismo grupo
            String fechaTruncada = r.getFechaHoraReserva()
                    .truncatedTo(java.time.temporal.ChronoUnit.MINUTES)
                    .toString();
            String clave = r.getNombreCliente().trim().toLowerCase() + "|" + fechaTruncada;
            grupos.computeIfAbsent(clave, k -> new ArrayList<>()).add(r);
        }
        List<ReservaGrupoDTO> reservasAgrupadas = grupos.values().stream()
                .map(ReservaGrupoDTO::new)
                .toList();

        model.addAttribute("reservas", reservasAgrupadas);
        model.addAttribute("mesas", mesas);
        model.addAttribute("reservaForm", new ReservaSaveDTO());
        return "admin/reservas";
    }

    @PostMapping("/crear")
    public String crearReserva(@ModelAttribute("reservaForm") ReservaSaveDTO dto,
                                RedirectAttributes ra) {
        try {
            List<Reserva> creadas = reservaService.crearReserva(dto);
            String mesasTxt = creadas.stream()
                    .map(r -> "N° " + r.getNumeroMesa())
                    .collect(java.util.stream.Collectors.joining(" y "));
            ra.addFlashAttribute("mensajeExito",
                    "Reserva de " + dto.getNombreCliente() + " registrada para Mesa(s) " + mesasTxt);
        } catch (Exception e) {
            ra.addFlashAttribute("mensajeError", e.getMessage());
        }
        return "redirect:/admin/reservas";
    }

    // Confirmar llegada: confirma TODAS las reservas del grupo de una vez
    @PostMapping("/{id}/confirmar")
    public ResponseEntity<?> confirmarLlegada(@PathVariable Long id,
                                               @RequestParam(required = false) List<Long> otrosIds) {
        try {
            reservaService.confirmarLlegada(id);
            if (otrosIds != null) {
                for (Long otroId : otrosIds) {
                    if (!otroId.equals(id)) {
                        try { reservaService.confirmarLlegada(otroId); } catch (Exception ignored) {}
                    }
                }
            }
            return ResponseEntity.ok(Map.of("mensaje", "Cliente registrado. Mesas marcadas como OCUPADAS."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Cancelar: cancela TODAS las reservas del grupo de una vez
    @PostMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelarReserva(@PathVariable Long id,
                                              @RequestParam(required = false) List<Long> otrosIds) {
        try {
            reservaService.cancelarReserva(id);
            if (otrosIds != null) {
                for (Long otroId : otrosIds) {
                    if (!otroId.equals(id)) {
                        try { reservaService.cancelarReserva(otroId); } catch (Exception ignored) {}
                    }
                }
            }
            return ResponseEntity.ok(Map.of("mensaje", "Reserva cancelada correctamente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/extender")
    public ResponseEntity<?> extenderReserva(@PathVariable Long id,
                                              @RequestParam Integer minutos) {
        try {
            reservaService.extenderReserva(id, minutos);
            return ResponseEntity.ok(Map.of("mensaje", "Tiempo extendido " + minutos + " minutos."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}