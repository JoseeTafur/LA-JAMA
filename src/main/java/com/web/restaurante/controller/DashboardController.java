package com.web.restaurante.controller;

import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@RequiredArgsConstructor
@Controller
public class DashboardController {
    private final UsuarioService usuarioService;
    private final EmpleadoService empleadoService;

    @GetMapping("/dashboard")
    public String mostrarPagina(Model model) {
        long totalUsuarios = usuarioService.contar();
        model.addAttribute("totalUsuarios", totalUsuarios);

        long totalEmpleados = empleadoService.contar();
        model.addAttribute("totalEmpleados", totalEmpleados);

        return "dashboard";
    }
}
