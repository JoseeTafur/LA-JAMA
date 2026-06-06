package com.web.restaurante.controller;

import com.web.restaurante.model.Empleado;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
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
    public String mostrarPagina() {
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
    public ResponseEntity<?> guardar(@RequestBody Empleado empleado) {
        Map<String, Object> response = new HashMap<>();
        try {
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
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Empleado emp = empleadoService.alternarEstado(id);
            response.put("success", true);
            response.put("message", "Estado actualizado correctamente");
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
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            empleadoService.eliminar(id);
            response.put("success", true);
            response.put("message", "Empleado eliminado correctamente");
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
