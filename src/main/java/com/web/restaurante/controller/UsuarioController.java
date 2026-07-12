package com.web.restaurante.controller;

import com.web.restaurante.model.Usuario;
import com.web.restaurante.service.PerfilService;
import com.web.restaurante.service.UsuarioService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RequiredArgsConstructor
@Controller
@RequestMapping("/usuarios")
public class UsuarioController {
    private final UsuarioService usuarioService;
    private final PerfilService perfilService;

    @GetMapping
    public String mostrarPagina(Model model) {
        // ========================================================
        // 🔒 CONFIGURACIÓN ESTRUCTURAL DE RUTA (PERSISTENCIA F5)
        // ========================================================
        model.addAttribute("activeUri", "/usuarios");
        model.addAttribute("titleHeader", "Gestión de Usuarios de Sistema");

        List<Usuario> usuarios = usuarioService.listar();
        model.addAttribute("usuarios", usuarios);
        model.addAttribute("formUsuario", new Usuario());
        return "usuarios";
    }

    @GetMapping("/api/listar")
    @ResponseBody
    public ResponseEntity<?> listarUsuariosApi() {
        Map<String, Object> response = new HashMap<>();
        List<Usuario> usuarios = usuarioService.listar();
        response.put("success", true);
        response.put("data", usuarios);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/perfiles")
    @ResponseBody
    public ResponseEntity<?> listarPerfilesApi() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", perfilService.listar());
        return ResponseEntity.ok(response);
    }

    /** 🔑 API para que el Javascript del cliente conozca los límites del usuario en sesión */
    @GetMapping("/api/rol-sesion")
    @ResponseBody
    public ResponseEntity<?> getRolSesion(HttpSession session) {
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().trim().toUpperCase() : "";
        Map<String, Object> response = new HashMap<>();
        response.put("rol", rol);
        response.put("esSuperAdmin", "SUPER_ADMIN".equals(rol));
        response.put("esAdmin", "ADMIN".equals(rol));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/guardar")
    @ResponseBody
    public ResponseEntity<?> guardarUsuarioAjax(@RequestBody Usuario usuario, BindingResult bindingResult, HttpSession session) {
        Map<String, Object> response = new HashMap<>();

        // 🛡️ 1. ADUANA DE DATOS ESTRUCTURALES (Spring Validation)
        if (bindingResult.hasErrors()) {
            Map<String, String> errores = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error -> errores.put(error.getField(), error.getDefaultMessage()));
            response.put("success", false);
            response.put("message", "Datos inválidos en el formulario.");
            response.put("errors", errores);
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // 🛡️ 2. ADUANA DE CONTROL DE ACCESOS (Seguridad de Jerarquías de La Jama)
            String rol = session.getAttribute("rol") != null
                    ? session.getAttribute("rol").toString().trim().toUpperCase() : "";
            boolean esSuperAdmin = "SUPER_ADMIN".equals(rol);
            boolean esAdmin = "ADMIN".equals(rol);

            if (usuario.getId() != null) {
                // Edición de un usuario existente
                Usuario existente = usuarioService.obtenerPorId(usuario.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado en el sistema."));

                String perfilExistente = existente.getPerfil() != null
                        ? existente.getPerfil().getNombre().toUpperCase().replace(" ", "_") : "";
                boolean objetivoEsAdmin = perfilExistente.contains("ADMIN") || perfilExistente.contains("ADMINISTRADOR");

                if (esSuperAdmin) {
                    // El Super Admin tiene control total de los hilos de personal
                } else if (esAdmin) {
                    if (objetivoEsAdmin) {
                        // Un ADMIN no puede sabotear ni alterar a otro ADMIN o SUPER_ADMIN
                        response.put("success", false);
                        response.put("message", "Operación rechazada: No tienes permisos para modificar cuentas administradoras.");
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                    }

                    // 🛡️ CONTROL ADAPTATIVO PARA EL ADMIN PLANO:
                    // Si un ADMIN altera datos de operarios, forzamos la preservación de clave y perfil originales
                    usuario.setClave(existente.getClave());
                    usuario.setPerfil(existente.getPerfil());
                } else {
                    response.put("success", false);
                    response.put("message", "Acceso denegado: Tu rango no permite realizar modificaciones.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                }
            }

            // 🛡️ 3. BLOQUEO DE AUTO-ESCALACIÓN: Evitamos el casteo conflictivo de Long.valueOf()
            if (!esSuperAdmin && usuario.getPerfil() != null && usuario.getPerfil().getId() != null) {
                // Extraemos el ID como Long nativo directamente sin envoltorios redundantes
                perfilService.obtenerPorId(usuario.getPerfil().getId()).ifPresent(p -> {
                    if (p.getNombre().toUpperCase().replace(" ", "_").contains("SUPER_ADMIN")) {
                        throw new IllegalArgumentException("Violación de seguridad: No puedes asignar rangos del tipo SUPER_ADMIN.");
                    }
                });
            }

            // 🛡️ 4. LIMPIEZA DE ENTRADA: Si la clave viene vacía en una edición, la seteamos a null
            // para que la lógica adaptativa de tu UsuarioService la ignore y conserve la de la BD
            if (usuario.getId() != null && (usuario.getClave() == null || usuario.getClave().trim().isEmpty())) {
                usuario.setClave(null);
            }

            // Delegamos la persistencia final al Service
            Usuario usuarioGuardado = usuarioService.guardar(usuario);

            response.put("success", true);
            response.put("usuario", usuarioGuardado);
            response.put("message", usuario.getId() != null ? "Usuario actualizado correctamente" : "Usuario creado correctamente");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        } catch (Exception e) {
            System.err.println("💥 COLLAPSE AT GUARDAR_USUARIO: " + e.getMessage());
            e.printStackTrace(); // Pintamos el árbol de fallos real en la consola de tu IDE
            response.put("success", false);
            response.put("message", "Error interno del servidor: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/api/obtener/{id}")
    @ResponseBody
    public ResponseEntity<?> obtenerUsuario(@PathVariable Long id) {
        try {
            return usuarioService.obtenerPorId(id).map(usuario -> {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("data", usuario);
                return ResponseEntity.ok(response);
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error al obtener usuario: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/api/cambiar-estado/{id}")
    @ResponseBody
    public ResponseEntity<?> cambiarEstadoUsuarioAjax(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            Usuario usuarioLogueado = (Usuario) session.getAttribute("usuarioLogueado");
            String rolSesion = session.getAttribute("rol") != null
                    ? session.getAttribute("rol").toString().trim().toUpperCase() : "";

            // 🛡️ Autoprotección: Bloquea el intento de apagarse a uno mismo
            if (Objects.equals(usuarioLogueado.getId(), id)) {
                response.put("success", false);
                response.put("message", "Operación no permitida: No puedes desactivar tu propia cuenta.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // 🛡️ Jerarquía: Bloquea si un Admin plano intenta tumbar a otro Administrador o SuperAdmin
            Usuario objetivo = usuarioService.obtenerPorId(id).orElse(null);
            if (objetivo != null && objetivo.getPerfil() != null) {
                String perfilObjetivo = objetivo.getPerfil().getNombre().toUpperCase().replace(" ", "_");
                if ((perfilObjetivo.contains("ADMIN") || perfilObjetivo.contains("ADMINISTRADOR")) && !"SUPER_ADMIN".equals(rolSesion)) {
                    response.put("success", false);
                    response.put("message", "Operación denegada: Solo el Super Admin del restaurante puede suspender cuentas administradoras.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                }
            }

            Usuario usuario = usuarioService.alternarEstado(id);
            if (usuario != null) {
                response.put("success", true);
                response.put("message", "Estado del usuario actualizado correctamente");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Usuario no encontrado en la base de datos.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al cambiar estado: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/api/eliminar/{id}")
    @ResponseBody
    public ResponseEntity<?> eliminarUsuarioAjax(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            Usuario usuarioLogueado = (Usuario) session.getAttribute("usuarioLogueado");
            String rolSesion = session.getAttribute("rol") != null
                    ? session.getAttribute("rol").toString().trim().toUpperCase() : "";

            Usuario objetivo = usuarioService.obtenerPorId(id).orElse(null);
            if (objetivo == null) {
                response.put("success", false);
                response.put("message", "Usuario no encontrado.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            // 🛡️ 1. Autoprotección: Bloquea el harakiri informático
            if (Objects.equals(usuarioLogueado.getId(), id)) {
                response.put("success", false);
                response.put("message", "Operación inválida: No puedes eliminar la cuenta con la que estás firmado.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            if (objetivo.getPerfil() != null) {
                String perfilObjetivo = objetivo.getPerfil().getNombre().toUpperCase().replace(" ", "_");

                // 🛡️ 2. ESCUDO ABSOLUTO: Nadie (absolutamente nadie, ni otro admin) puede borrar la cuenta maestra SUPER_ADMIN
                if (perfilObjetivo.contains("SUPER_ADMIN")) {
                    response.put("success", false);
                    response.put("message", "Violación de jerarquía: La cuenta maestra SUPER_ADMIN es inmutable y no puede ser removida.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                }

                // 🛡️ 3. REGLA OPERATIVA DE ADMISTRADORES: Un Admin plano NO borra a otro Administrador, pero el SUPER_ADMIN sí puede
                if ((perfilObjetivo.contains("ADMIN") || perfilObjetivo.contains("ADMINISTRADOR")) && !"SUPER_ADMIN".equals(rolSesion)) {
                    response.put("success", false);
                    response.put("message", "Operación denegada: Solo el rango SUPER_ADMIN posee privilegios para purgar cuentas administradoras.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                }
            }

            // Si pasa todas las aduanas de rango, se ejecuta el borrado lógico
            usuarioService.eliminar(id);
            response.put("success", true);
            response.put("message", "Usuario eliminado correctamente de los registros.");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error interno del servidor al eliminar el usuario.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
}