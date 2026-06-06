package com.web.restaurante.controller;

import com.web.restaurante.model.Perfil;
import com.web.restaurante.service.PerfilService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Controller
@RequestMapping("/perfiles")
public class PerfilController {
    private final PerfilService perfilService;

    @GetMapping
    public String mostrarPagina(){
        return "perfiles";
    }

    @GetMapping("/api/listar")
    @ResponseBody
    public ResponseEntity<?> listarPerfilesApi() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", perfilService.listar());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/obtener/{id}")
    @ResponseBody
    public ResponseEntity<?> obtenerPerfil(@PathVariable Long id) {
        return perfilService.obtenerPorId(id)
                .map(perfil -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    Map<String, Object> perfilData = new HashMap<>();
                    perfilData.put("id", perfil.getId());
                    perfilData.put("nombre", perfil.getNombre());
                    perfilData.put("descripcion", perfil.getDescripcion());
                    perfilData.put("estado", perfil.getEstado());
                    perfilData.put("opciones",
                            perfil.getOpciones().stream().map(op -> op.getId()).collect(Collectors.toSet()));

                    response.put("data", perfilData);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/api/guardar")
    @ResponseBody
    public ResponseEntity<?> guardarPerfil(@RequestBody Perfil perfil) {
        Map<String, Object> response = new HashMap<>();
        try {
            Perfil perfilGuardado = perfilService.guardar(perfil);
            response.put("success", true);
            response.put("message", perfil.getId() != null ? "Perfil actualizado" : "Perfil creado");
            response.put("perfil", perfilGuardado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al guardar el perfil: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/api/cambiar-estado/{id}")
    @ResponseBody
    public ResponseEntity<?> cambiarEstadoPerfil(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Perfil perfil = perfilService.alternarEstado(id);

            response.put("success", true);
            response.put("message", "Estado del perfil actualizado");
            response.put("data", perfil);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @GetMapping("/api/opciones")
    @ResponseBody
    public ResponseEntity<?> listarOpcionesApi() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", perfilService.listarOpciones());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/api/eliminar/{id}")
    @ResponseBody
    public ResponseEntity<?> eliminarPerfil(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            perfilService.eliminar(id);
            response.put("success", true);
            response.put("message", "Perfil eliminado correctamente");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al eliminar el perfil: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
