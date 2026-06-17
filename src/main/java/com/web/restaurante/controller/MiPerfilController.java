package com.web.restaurante.controller;

import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Usuario;
import com.web.restaurante.service.EmpleadoService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import java.util.Optional;

@RequiredArgsConstructor
@Controller
@RequestMapping("/admin")
public class MiPerfilController {

    private final EmpleadoService empleadoService;

    @GetMapping("/MiPerfil")
    public String verPerfil(HttpSession session, Model model) {
        // 1. Recuperamos el usuario real que el LoginController guardó en sesión
        Usuario usuarioLogueado = (Usuario) session.getAttribute("usuarioLogueado");
        String rol = (String) session.getAttribute("rol");

        if (usuarioLogueado == null) {
            return "redirect:/login"; // Seguridad perimetral básica
        }

        // 2. Buscamos su empleado asociado si existe
        Optional<Empleado> empOpt = empleadoService.obtenerPorUsuario(usuarioLogueado);

        // 3. Enviamos los datos reales directo a la plantilla
        model.addAttribute("usuario", usuarioLogueado);
        model.addAttribute("rol", rol);
        model.addAttribute("empleado", empOpt.orElse(null));

        return "mi_perfil";
    }
}