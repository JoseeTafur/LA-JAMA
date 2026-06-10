package com.web.restaurante.controller;

import com.web.restaurante.repository.MovimientoCajaRepository;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@RequiredArgsConstructor
@Controller 
public class DashboardController {
    private final UsuarioService usuarioService;
    private final EmpleadoService empleadoService;
    private final MovimientoCajaRepository movimientoCajaRepository;

    @GetMapping("/dashboard")
    public String mostrarPagina(Model model, HttpSession session) {
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().toUpperCase()
                : "INVITADO";

        // ========================================================
        // 🔒 CONFIGURACIÓN ESTRUCTURAL DE RUTA (PERSISTENCIA F5)
        // ========================================================
        // activeUri debe coincidir exactamente con la ruta configurada en base de datos/sesión
        model.addAttribute("activeUri", "/dashboard");
        model.addAttribute("titleHeader", "Panel de Control");
        model.addAttribute("rol", rol);

        // KPIs solo para ADMIN y CAJERO
        if ("ADMIN".equals(rol) || "CAJERO".equals(rol)) {
            Double ventasHoy = movimientoCajaRepository.sumVentasHoy();
            Long platosHoy   = movimientoCajaRepository.countVentasHoy();
            model.addAttribute("totalVentasHoy",    ventasHoy  != null ? ventasHoy  : 0.0);
            model.addAttribute("platosVendidosHoy", platosHoy  != null ? platosHoy  : 0L);
        }

        // Usuarios y empleados solo para ADMIN
        if ("ADMIN".equals(rol)) {
            model.addAttribute("totalUsuarios",   usuarioService.contar());
            model.addAttribute("totalEmpleados",  empleadoService.contar());
        }

        return "dashboard";
    }

    /** Endpoint AJAX para refrescar KPIs — solo para ADMIN y CAJERO. */
    @GetMapping("/dashboard/kpis")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> obtenerKpis(HttpSession session) {
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().toUpperCase()
                : "INVITADO";

        if (!"ADMIN".equals(rol) && !"CAJERO".equals(rol)) {
            return ResponseEntity.status(403).build();
        }

        Double ventasHoy = movimientoCajaRepository.sumVentasHoy();
        Long   platosHoy = movimientoCajaRepository.countVentasHoy();
        return ResponseEntity.ok(Map.of(
                "totalVentasHoy",    ventasHoy != null ? ventasHoy : 0.0,
                "platosVendidosHoy", platosHoy != null ? platosHoy : 0L
        ));
    }
}