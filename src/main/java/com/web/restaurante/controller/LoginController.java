package com.web.restaurante.controller;

import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Opcion;
import com.web.restaurante.model.Usuario;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
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
                                RedirectAttributes redirectAttributes) {

        Optional<Usuario> existente = usuarioService.encontrarPorUsuario(usuario);

        if (existente.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Usuario no encontrado.");
            return "redirect:/login";
        }

        Usuario usuarioEncontrado = existente.get();

        if (usuarioEncontrado.getEstado() != 1) {
            redirectAttributes.addFlashAttribute("error", "Este usuario se encuentra inactivo.");
            return "redirect:/login";
        }

        if (usuarioService.verificarClave(clave, usuarioEncontrado.getClave())) {
            session.setAttribute("usuarioLogueado", usuarioEncontrado);

            String nombrePerfil = usuarioEncontrado.getPerfil().getNombre().toUpperCase();
            Optional<Empleado> empOpt = empleadoService.obtenerPorUsuario(usuarioEncontrado);

            String rolParaSesion = "INVITADO";

            if (nombrePerfil.contains("ADMIN")) {
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

            List<Opcion> opcionesMenu = usuarioEncontrado.getPerfil().getOpciones().stream()
                    .sorted(Comparator.comparing(Opcion::getId))
                    .collect(Collectors.toList());

            if ("REPARTIDOR".equals(rolParaSesion)) {
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> op.getRuta().equals("/dashboard") || op.getRuta().contains("/entregas"))
                        .collect(Collectors.toList());
            } else if ("CAJERO".equals(rolParaSesion)) {
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> op.getRuta().equals("/dashboard") ||
                                op.getRuta().contains("/caja") ||
                                op.getRuta().contains("/delivery") ||
                                op.getRuta().contains("/despacho"))
                        .collect(Collectors.toList());
            } else if ("MESERO".equals(rolParaSesion)) {
                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> op.getRuta().equals("/dashboard") ||
                                op.getRuta().equals("/admin/mesas") ||
                                op.getRuta().contains("/mesero"))
                        .collect(Collectors.toList());
            } else if ("COCINA".equals(rolParaSesion) && empOpt.isPresent()) {
                String cargoExacto = empOpt.get().getCargo().getNombre().toUpperCase();

                opcionesMenu = opcionesMenu.stream()
                        .filter(op -> {
                            if (op.getRuta().equals("/dashboard")) return true;
                            if (cargoExacto.contains("FRÍO") || cargoExacto.contains("FRIO")) {
                                return op.getRuta().equals("/admin/cocina/fria");
                            }
                            if (cargoExacto.contains("CALIENTE")) {
                                return op.getRuta().equals("/admin/cocina/caliente");
                            }
                            return false;
                        })
                        .collect(Collectors.toList());
            } else if ("ADMIN".equals(rolParaSesion)) {
                opcionesMenu = usuarioEncontrado.getPerfil().getOpciones().stream()
                        .sorted(Comparator.comparing(Opcion::getId))
                        .collect(Collectors.toList());
            }

            Map<String, List<Opcion>> menuAgrupado = new LinkedHashMap<>();
            List<Opcion> opcionesIndependientes = new ArrayList<>();

            for (Opcion opcion : opcionesMenu) {
                String ruta = opcion.getRuta();
                String[] partesRuta = ruta.split("/");

                if (partesRuta.length > 2) {
                    String grupo;
                    if(ruta.contains("/cocina")) {
                        grupo = "cocina";
                    } else if(ruta.contains("/mesero")) {
                        grupo = "mesero";
                    } else if(ruta.contains("/productos")) {
                        grupo = "almacen";
                    } else {
                        grupo = partesRuta[1];
                    }

                    String nombreGrupo = grupo.substring(0, 1).toUpperCase() + grupo.substring(1).toLowerCase();
                    menuAgrupado.computeIfAbsent(nombreGrupo, k -> new ArrayList<>()).add(opcion);
                } else {
                    opcionesIndependientes.add(opcion);
                }
            }

            session.setAttribute("menuAgrupado", menuAgrupado);
            session.setAttribute("opcionesIndependientes", opcionesIndependientes);
            session.setAttribute("menuOpciones", opcionesMenu);

            if ("MESERO".equals(rolParaSesion)) {
                return "redirect:/admin/mesas";
            }

            if ("COCINA".equals(rolParaSesion) && empOpt.isPresent()) {
                String cargoExacto = empOpt.get().getCargo().getNombre().toUpperCase();
                if (cargoExacto.contains("FRÍO") || cargoExacto.contains("FRIO")) {
                    return "redirect:/admin/cocina/fria";
                }
                if (cargoExacto.contains("CALIENTE")) {
                    return "redirect:/admin/cocina/caliente";
                }
            }

            if ("REPARTIDOR".equals(rolParaSesion)) {
                return "redirect:/admin/entregas/mis-pedidos";
            }

            if ("CAJERO".equals(rolParaSesion)) {
                return "redirect:/admin/despacho";
            }

            return "redirect:/dashboard";

        } else {
            redirectAttributes.addFlashAttribute("error", "Contraseña incorrecta.");
            return "redirect:/login";
        }
    }
}