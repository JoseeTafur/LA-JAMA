package com.web.restaurante.controller;

import com.web.restaurante.model.Reserva;
import com.web.restaurante.service.ReservaService;
import com.web.restaurante.util.ValidationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/admin/reservas")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;

    @GetMapping
    public String mostrarReservas(Model model) {
        model.addAttribute("reservas", reservaService.listarTodas());
        return "admin/reservas";
    }

    @GetMapping("/api/listar")
    @ResponseBody
    public ResponseEntity<?> listar() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", reservaService.listarTodas());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/crear")
    @ResponseBody
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String nombreCliente = body.get("nombreCliente") != null ? body.get("nombreCliente").toString().trim() : "";
            String telefono      = body.get("telefono") != null ? body.get("telefono").toString().trim() : "";
            int numeroPersonas   = body.get("numeroPersonas") != null ? Integer.parseInt(body.get("numeroPersonas").toString()) : 0;
            String fechaHoraStr  = body.get("fechaHora") != null ? body.get("fechaHora").toString() : "";
            String observacion   = body.get("observacion") != null ? body.get("observacion").toString().trim() : "";

            if (!ValidationUtil.soloLetras(nombreCliente)) {
                response.put("success", false);
                response.put("message", "El nombre solo puede contener letras.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!ValidationUtil.telefonoValido(telefono)) {
                response.put("success", false);
                response.put("message", "El teléfono debe tener exactamente 9 dígitos.");
                return ResponseEntity.badRequest().body(response);
            }
            if (numeroPersonas < 1) {
                response.put("success", false);
                response.put("message", "El número de personas debe ser mayor a 0.");
                return ResponseEntity.badRequest().body(response);
            }

            LocalDateTime fechaHora = LocalDateTime.parse(fechaHoraStr);
            if (fechaHora.isBefore(LocalDateTime.now())) {
                response.put("success", false);
                response.put("message", "La fecha y hora no puede ser en el pasado.");
                return ResponseEntity.badRequest().body(response);
            }

            Reserva reserva = new Reserva();
            reserva.setNombreCliente(nombreCliente);
            reserva.setTelefono(telefono);
            reserva.setNumeroPersonas(numeroPersonas);
            reserva.setFechaHoraReserva(fechaHora);
            reserva.setObservacion(observacion.isEmpty() ? null : observacion);

            Reserva creada = reservaService.crearReserva(reserva);
            response.put("success", true);
            response.put("message", "Reserva creada. Mesas asignadas: " + creada.getMesasAsignadas());
            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/api/confirmar-llegada/{id}")
    @ResponseBody
    public ResponseEntity<?> confirmarLlegada(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            String rol = session.getAttribute("rol") != null ? session.getAttribute("rol").toString() : "";
            if (!"CAJERO".equals(rol) && !"ADMIN".equals(rol) && !"SUPER_ADMIN".equals(rol)) {
                response.put("success", false);
                response.put("message", "Solo el cajero o admin puede confirmar la llegada.");
                return ResponseEntity.status(403).body(response);
            }
            reservaService.confirmarLlegada(id);
            response.put("success", true);
            response.put("message", "Llegada confirmada. Mesas ahora en estado OCUPADA.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/api/cancelar/{id}")
    @ResponseBody
    public ResponseEntity<?> cancelar(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            reservaService.cancelarReserva(id);
            response.put("success", true);
            response.put("message", "Reserva cancelada correctamente.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/api/editar/{id}")
    @ResponseBody
    public ResponseEntity<?> editar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String nombreCliente = body.get("nombreCliente") != null ? body.get("nombreCliente").toString().trim() : "";
            String telefono      = body.get("telefono") != null ? body.get("telefono").toString().trim() : "";
            int numeroPersonas   = body.get("numeroPersonas") != null ? Integer.parseInt(body.get("numeroPersonas").toString()) : 0;
            String fechaHoraStr  = body.get("fechaHora") != null ? body.get("fechaHora").toString() : "";
            String observacion   = body.get("observacion") != null ? body.get("observacion").toString().trim() : "";

            if (!ValidationUtil.soloLetras(nombreCliente)) {
                response.put("success", false);
                response.put("message", "El nombre solo puede contener letras.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!ValidationUtil.telefonoValido(telefono)) {
                response.put("success", false);
                response.put("message", "El teléfono debe tener exactamente 9 dígitos.");
                return ResponseEntity.badRequest().body(response);
            }
            if (numeroPersonas < 1) {
                response.put("success", false);
                response.put("message", "El número de personas debe ser mayor a 0.");
                return ResponseEntity.badRequest().body(response);
            }

            LocalDateTime fechaHora = LocalDateTime.parse(fechaHoraStr);
            if (fechaHora.isBefore(LocalDateTime.now())) {
                response.put("success", false);
                response.put("message", "La fecha y hora no puede ser en el pasado.");
                return ResponseEntity.badRequest().body(response);
            }

            reservaService.editarReserva(id, nombreCliente, telefono, numeroPersonas, fechaHora, observacion);
            response.put("success", true);
            response.put("message", "Reserva actualizada correctamente.");
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/api/eliminar/{id}")
    @ResponseBody
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            reservaService.eliminarReserva(id);
            response.put("success", true);
            response.put("message", "Reserva eliminada correctamente.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}