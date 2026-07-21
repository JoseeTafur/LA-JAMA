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
        Usuario usuarioLogueado = (Usuario) session.getAttribute("usuarioLogueado");
        String rol = (String) session.getAttribute("rol");

        if (usuarioLogueado == null) {
            return "redirect:/login";
        }

        Optional<Empleado> empOpt = empleadoService.obtenerPorUsuario(usuarioLogueado);

        model.addAttribute("usuario", usuarioLogueado);
        model.addAttribute("rol", rol);
        model.addAttribute("empleado", empOpt.orElse(null));

        return "mi_perfil";
    }
}