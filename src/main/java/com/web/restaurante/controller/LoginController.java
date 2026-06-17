package com.web.restaurante.controller;

import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Opcion;
import com.web.restaurante.model.Usuario;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Controller
public class LoginController {

    private final UsuarioService usuarioService;
    private final EmpleadoService empleadoService;

    @GetMapping("/logout")
    public String logout(HttpSession session, RedirectAttributes redirectAttributes) {
        session.invalidate();
        redirectAttributes.addFlashAttribute("logout", "Has cerrado sesión exitosamente.");
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String mostrarFormularioLogin(HttpSession session) {
        if (session.getAttribute("usuarioLogueado") != null) {
            return "redirect:/dashboard";
        }
        return "login";
    }

    @PostMapping("/login")
    public String procesarLogin(@RequestParam String usuario, @RequestParam String clave, HttpSession session,
                                Model model, RedirectAttributes redirectAttributes) {

        Optional<Usuario> existente = usuarioService.encontrarPorUsuario(usuario);

        // 🟩 OPTIMIZADO: Retorno directo de vista con error (Evita el Status 302 y duplicación de tokens)
        if (existente.isEmpty()) {
            model.addAttribute("error", "Usuario no encontrado.");
            return "login";
        }

        Usuario usuarioEncontrado = existente.get();

        // 🟩 OPTIMIZADO: Retorno directo sin redirección externa
        if (usuarioEncontrado.getEstado() != 1) {
            model.addAttribute("error", "Este usuario se encuentra inactivo.");
            return "login";
        }

        if (usuarioService.verificarClave(clave, usuarioEncontrado.getClave())) {
            session.setAttribute("usuarioLogueado", usuarioEncontrado);

            String nombrePerfil = usuarioEncontrado.getPerfil().getNombre().toUpperCase();
            Optional<Empleado> empOpt = empleadoService.obtenerPorUsuario(usuarioEncontrado);

            String rolParaSesion = "INVITADO";

            // 🛡️ ADUANA ORDENADA: Validamos primero SUPER_ADMIN para evitar falsos positivos con contains("ADMIN")
            if (nombrePerfil.contains("SUPER_ADMIN")) {
                rolParaSesion = "SUPER_ADMIN";
            } else if (nombrePerfil.contains("ADMIN")) {
                rolParaSesion = "ADMIN";
            } else if (empOpt.isPresent()) {
                String nombreCargo = empOpt.get().getCargo().getNombre().toUpperCase();

                if (nombreCargo.contains("REPARTIDOR")) {
                    rolParaSesion = "REPARTIDOR";
                } else if (nombreCargo.contains("COCINA") || nombreCargo.contains("COCINERO") || nombreCargo.contains("FRIO") || nombreCargo.contains("FRÍO")) {
                    rolParaSesion = "COCINA";
                } else if (nombreCargo.contains("CAJA") || nombreCargo.contains("CAJERO")) {
                    rolParaSesion = "CAJERO";
                } else if (nombreCargo.contains("MESERO")) {
                    rolParaSesion = "MESERO";
                }
            } else {
                rolParaSesion = nombrePerfil;
            }

            session.setAttribute("rol", rolParaSesion);
            empOpt.ifPresent(empleado -> session.setAttribute("empleadoLogueado", empleado));

            // Carga inicial completa de opciones mapeadas en la BD
            List<Opcion> opcionesMenu = usuarioEncontrado.getPerfil().getOpciones().stream()
                    .sorted(Comparator.comparing(Opcion::getId))
                    .collect(Collectors.toList());

            // Filtros de seguridad según el rol de la sesión
            if ("REPARTIDOR".equals(rolParaSesion)) {
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> op.getRuta().equals("/dashboard") || op.getRuta().contains("/entregas") || op.getRuta().contains("/MiPerfil"))
                        .collect(Collectors.toList());

// 🟩 2. FILTRO PARA CAJERO
            } else if ("CAJERO".equals(rolParaSesion)) {
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> op.getRuta().equals("/dashboard") ||
                                op.getRuta().contains("/caja") ||
                                op.getRuta().contains("/delivery") ||
                                op.getRuta().contains("/despacho") ||
                                op.getRuta().contains("/productos") ||
                                op.getRuta().contains("/pagos-digitales") ||
                                op.getRuta().contains("/MiPerfil")) // ➔ Luz verde para el perfil
                        .collect(Collectors.toList());

// 🟩 3. FILTRO PARA MESERO
            } else if ("MESERO".equals(rolParaSesion)) {
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> op.getRuta().equals("/dashboard") ||
                                op.getRuta().equals("/admin/mesas") ||
                                op.getRuta().contains("/mesero") ||
                                op.getRuta().contains("/MiPerfil")) // ➔ Luz verde para el perfil
                        .collect(Collectors.toList());
            } else if ("COCINA".equals(rolParaSesion) && empOpt.isPresent()) {
                String cargoExacto = empOpt.get().getCargo().getNombre().toUpperCase();
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> {
                            String ruta = op.getRuta();

                            // 1. Siempre permitimos el acceso al Dashboard base
                            if (ruta.equals("/dashboard")) return true;

                            // 2. Filtro restrictivo por subtipo de cocina (Caliente / Fría)
                            if (ruta.contains("/cocina/")) {
                                if (cargoExacto.contains("FRÍO") || cargoExacto.contains("FRIO")) {
                                    return ruta.equals("/admin/cocina/fria");
                                }
                                if (cargoExacto.contains("CALIENTE")) {
                                    return ruta.equals("/admin/cocina/caliente");
                                }
                                return false;
                            }

                            // 3. ✨ LA LLAVE MAESTRA: Si tiene cualquier otra ruta asignada en la BD
                            // (como /insumos, /inventarios, etc.), la dejamos pasar limpia.
                            return true;
                        })
                        .collect(Collectors.toList());
            } else if ("ADMIN".equals(rolParaSesion) || "SUPER_ADMIN".equals(rolParaSesion)) {
                opcionesMenu = usuarioEncontrado.getPerfil().getOpciones().stream()
                        .sorted(Comparator.comparing(Opcion::getId))
                        .collect(Collectors.toList());
            }

            Map<String, List<Opcion>> menuAgrupado = new LinkedHashMap<>();
            List<Opcion> opcionesIndependientes = new ArrayList<>();

            // 🔄 SISTEMA DE AGRUPACIÓN ADAPTATIVO CON CAPTURA DE RUTAS MAESTRAS
            for (Opcion opcion : opcionesMenu) {
                String ruta = opcion.getRuta();
                String[] partesRuta = ruta.split("/");

                if (partesRuta.length > 2) {
                    String grupo;
                    if (ruta.contains("/cocina")) {
                        grupo = "cocina";
                    } else if (ruta.contains("/mesero")) {
                        grupo = "mesero";
                    } else if (ruta.contains("/productos")) {
                        grupo = "almacen";
                    } else {
                        grupo = partesRuta[1];
                    }

                    String nombreGrupo = grupo.substring(0, 1).toUpperCase() + grupo.substring(1).toLowerCase();
                    menuAgrupado.computeIfAbsent(nombreGrupo, k -> new ArrayList<>()).add(opcion);
                } else {
                    if (ruta.equals("/usuarios") || ruta.equals("/perfiles") || ruta.equals("/empleados")) {
                        menuAgrupado.computeIfAbsent("Seguridad", k -> new ArrayList<>()).add(opcion);
                    } else if (ruta.equals("/insumos")) {
                        menuAgrupado.computeIfAbsent("Logística", k -> new ArrayList<>()).add(opcion);
                    } else {
                        opcionesIndependientes.add(opcion);
                    }
                }
            }

            session.setAttribute("menuAgrupado", menuAgrupado);
            session.setAttribute("opcionesIndependientes", opcionesIndependientes);
            session.setAttribute("menuOpciones", opcionesMenu);

            // Redirecciones dinámicas lícitas de entrada
            if ("MESERO".equals(rolParaSesion)) return "redirect:/admin/mesas";
            if ("REPARTIDOR".equals(rolParaSesion)) return "redirect:/admin/entregas/mis-pedidos";
            if ("CAJERO".equals(rolParaSesion)) return "redirect:/admin/despacho";
            if ("COCINA".equals(rolParaSesion) && empOpt.isPresent()) {
                String cargoExacto = empOpt.get().getCargo().getNombre().toUpperCase();
                if (cargoExacto.contains("FRÍO") || cargoExacto.contains("FRIO")) return "redirect:/admin/cocina/fria";
                if (cargoExacto.contains("CALIENTE")) return "redirect:/admin/cocina/caliente";
            }

            return "redirect:/dashboard";

        } else {
            // 🟩 OPTIMIZADO: Contraseña incorrecta controlada en el mismo hilo de petición
            model.addAttribute("error", "Contraseña incorrecta.");
            return "login";
        }
    }
}