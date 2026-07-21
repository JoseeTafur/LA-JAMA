package com.web.restaurante.controller;

import com.web.restaurante.model.Empleado;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
import com.web.restaurante.util.ValidationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Controller
@RequestMapping("/empleados")
public class EmpleadoController {

    private final EmpleadoService empleadoService;
    private final UsuarioService usuarioService;

    @GetMapping
    public String mostrarPagina(Model model) {
        model.addAttribute("activeUri", "/empleados");
        model.addAttribute("titleHeader", "Control de Empleados y Planillas");

        return "empleados";
    }

    @GetMapping("/api/listar")
    @ResponseBody
    public ResponseEntity<?> listar() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", empleadoService.listar());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/cargos")
    @ResponseBody
    public ResponseEntity<?> listarCargos() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", empleadoService.listarCargos());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/usuarios-disponibles")
    @ResponseBody
    public ResponseEntity<?> listarUsuariosDisponibles() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", usuarioService.listar());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/obtener/{id}")
    @ResponseBody
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        return empleadoService.obtenerPorId(id)
                .map(emp -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("data", emp);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/buscar")
    @ResponseBody
    public ResponseEntity<?> buscar(@RequestParam(required = false) String termino,
                                    @RequestParam(required = false) String turno) {
        Map<String, Object> response = new HashMap<>();
        List<Empleado> resultado;

        if (turno != null && !turno.isBlank()) {
            resultado = empleadoService.buscarPorTurno(turno);
        } else {
            resultado = empleadoService.buscarPorTermino(termino);
        }

        response.put("success", true);
        response.put("data", resultado);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/guardar")
    @ResponseBody
    public ResponseEntity<?> guardar(@RequestBody Empleado empleado, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            String rol = session.getAttribute("rol") != null ? session.getAttribute("rol").toString().toUpperCase() : "";
            if (!"SUPER_ADMIN".equals(rol) && !"ADMIN".equals(rol)) {
                response.put("success", false);
                response.put("message", "Acceso denegado: Rango insuficiente para alterar el registro de personal.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            if (empleado.getNombre() == null || empleado.getNombre().isBlank()) {
                response.put("success", false);
                response.put("message", "El nombre del empleado es obligatorio.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!ValidationUtil.soloLetras(empleado.getNombre())) {
                response.put("success", false);
                response.put("message", "El nombre solo puede contener letras, sin números ni caracteres especiales.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!ValidationUtil.longitudValida(empleado.getNombre(), ValidationUtil.NOMBRE_MAX)) {
                response.put("success", false);
                response.put("message", "El nombre no puede superar los " + ValidationUtil.NOMBRE_MAX + " caracteres.");
                return ResponseEntity.badRequest().body(response);
            }

            if (empleado.getApellido() == null || empleado.getApellido().isBlank()) {
                response.put("success", false);
                response.put("message", "El apellido del empleado es obligatorio.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!ValidationUtil.soloLetras(empleado.getApellido())) {
                response.put("success", false);
                response.put("message", "El apellido solo puede contener letras, sin números ni caracteres especiales.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!ValidationUtil.longitudValida(empleado.getApellido(), ValidationUtil.APELLIDO_MAX)) {
                response.put("success", false);
                response.put("message", "El apellido no puede superar los " + ValidationUtil.APELLIDO_MAX + " caracteres.");
                return ResponseEntity.badRequest().body(response);
            }

            if (empleado.getTelefono() == null || empleado.getTelefono().isBlank()) {
                response.put("success", false);
                response.put("message", "El número de teléfono es obligatorio.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!empleado.getTelefono().trim().matches("^[0-9]{" + ValidationUtil.TELEFONO_EXACTO + "}$")) {
                response.put("success", false);
                response.put("message", "El teléfono debe tener exactamente " + ValidationUtil.TELEFONO_EXACTO + " dígitos numéricos.");
                return ResponseEntity.badRequest().body(response);
            }

            if (empleado.getFechaIngreso() != null && !ValidationUtil.fechaDentroDeRango(empleado.getFechaIngreso())) {
                response.put("success", false);
                response.put("message", "La fecha de ingreso no es válida. No puede ser una fecha futura.");
                return ResponseEntity.badRequest().body(response);
            }

            Empleado guardado = empleadoService.guardar(empleado);
            response.put("success", true);
            response.put("data", guardado);
            response.put("message", empleado.getId() != null
                    ? "Empleado actualizado correctamente"
                    : "Empleado registrado correctamente");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error interno del servidor: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/api/cambiar-estado/{id}")
    @ResponseBody
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            String rol = session.getAttribute("rol") != null ? session.getAttribute("rol").toString().toUpperCase() : "";
            if (!"SUPER_ADMIN".equals(rol)) {
                response.put("success", false);
                response.put("message", "Operación denegada: Solo el rango SUPER_ADMIN puede alterar la disponibilidad de personal.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            Empleado emp = empleadoService.alternarEstado(id);
            response.put("success", true);
            response.put("message", "Estado del empleado actualizado correctamente");
            response.put("data", emp);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al cambiar estado: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/api/eliminar/{id}")
    @ResponseBody
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            String rol = session.getAttribute("rol") != null ? session.getAttribute("rol").toString().toUpperCase() : "";
            if (!"SUPER_ADMIN".equals(rol)) {
                response.put("success", false);
                response.put("message", "Operación denegada: Privilegio exclusivo de la cuenta maestra SUPER_ADMIN.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            empleadoService.eliminar(id);
            response.put("success", true);
            response.put("message", "Empleado purgado correctamente de los registros de planilla.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al eliminar: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}