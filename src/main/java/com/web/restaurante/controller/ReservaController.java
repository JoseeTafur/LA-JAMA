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

        // Cada reserva ya es individual — se envuelve en lista de 1 para ReservaGrupoDTO
        List<Reserva> reservasActivas = reservaService.listarActivas();
        List<ReservaGrupoDTO> reservasAgrupadas = reservasActivas.stream()
                .map(r -> new ReservaGrupoDTO(List.of(r)))
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
            Reserva creada = reservaService.crearReserva(dto);
            String mesasTxt = creada.getMesasAsignadas() != null
                    ? creada.getMesasAsignadas().replace(",", " y N° ")
                    : creada.getNumeroMesa().toString();
            ra.addFlashAttribute("mensajeExito",
                    "Reserva de " + dto.getNombreCliente() + " registrada para Mesa(s) N° " + mesasTxt);
        } catch (Exception e) {
            ra.addFlashAttribute("mensajeError", e.getMessage());
        }
        return "redirect:/admin/reservas";
    }

    @PostMapping("/{id}/confirmar")
    public ResponseEntity<?> confirmarLlegada(@PathVariable Long id,
                                               @RequestParam(required = false) List<Long> otrosIds) {
        try {
            reservaService.confirmarLlegada(id);
            return ResponseEntity.ok(Map.of("mensaje", "Cliente registrado. Mesas marcadas como OCUPADAS."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelarReserva(@PathVariable Long id,
                                              @RequestParam(required = false) List<Long> otrosIds) {
        try {
            reservaService.cancelarReserva(id);
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