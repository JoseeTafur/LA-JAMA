package com.web.restaurante.controller;

import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.service.CajaService;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.TurnoCajaService;
import com.web.restaurante.service.UsuarioService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@Controller
public class DashboardController {
    private final UsuarioService usuarioService;
    private final EmpleadoService empleadoService;
    private final TurnoCajaService turnoCajaService; // 🛡️ Conexión al estado operativo del turno
    private final CajaService cajaService;           // 📊 Acceso a los cálculos dinámicos de ventas

    @GetMapping("/dashboard")
    public String mostrarPagina(Model model, HttpSession session) {
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().toUpperCase()
                : "INVITADO";

        model.addAttribute("activeUri", "/dashboard");
        model.addAttribute("titleHeader", "Panel de Control Principal");
        model.addAttribute("rol", rol);

        // 📊 KPIs COMERCIALES CONECTADOS AL TURNO ACTIVO
        if ("SUPER_ADMIN".equals(rol) || "ADMIN".equals(rol) || "CAJERO".equals(rol)) {
            Optional<TurnoCaja> turnoActivoOpt = turnoCajaService.obtenerTurnoActivo();

            double totalVendidoTurno = 0.0;
            long platosVendidosTurno = 0L;

            if (turnoActivoOpt.isPresent()) {
                TurnoCaja turno = turnoActivoOpt.get();
                // 🚀 Extraemos el total acumulado de ventas del turno usando la lógica que ya calcula caja
                totalVendidoTurno = turno.getTotalVendido() != null ? turno.getTotalVendido() : 0.0;

                // Si tu CajaService calcula la cantidad de órdenes o platos del turno, lo mapeamos aquí.
                // Por ahora, usaremos una consulta rápida filtrando por el ID del turno activo.
                platosVendidosTurno = cajaService.contarItemsVendidosEnTurno(turno.getId());
            }

            model.addAttribute("totalVentasHoy",    totalVendidoTurno);
            model.addAttribute("platosVendidosHoy", platosVendidosTurno);
            model.addAttribute("turnoAbierto",      turnoActivoOpt.isPresent());
        }

        // 👥 KPIS DE AUDITORÍA DE PERSONAL
        if ("SUPER_ADMIN".equals(rol) || "ADMIN".equals(rol)) {
            model.addAttribute("totalUsuarios",   usuarioService.contar());
            model.addAttribute("totalEmpleados",  empleadoService.contar());
        }

        return "dashboard";
    }

    /** 🔄 Endpoint AJAX reactivo conectado al Turno de Caja */
    @GetMapping("/dashboard/kpis")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> obtenerKpis(HttpSession session) {
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().toUpperCase()
                : "INVITADO";

        if (!"SUPER_ADMIN".equals(rol) && !"ADMIN".equals(rol) && !"CAJERO".equals(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<TurnoCaja> turnoActivoOpt = turnoCajaService.obtenerTurnoActivo();
        double totalVendidoTurno = 0.0;
        long platosVendidosTurno = 0L;

        if (turnoActivoOpt.isPresent()) {
            TurnoCaja turno = turnoActivoOpt.get();
            totalVendidoTurno = turno.getTotalVendido() != null ? turno.getTotalVendido() : 0.0;
            platosVendidosTurno = cajaService.contarItemsVendidosEnTurno(turno.getId());
        }

        return ResponseEntity.ok(Map.of(
                "totalVentasHoy",    totalVendidoTurno,
                "platosVendidosHoy", platosVendidosTurno,
                "turnoAbierto",      turnoActivoOpt.isPresent()
        ));
    }
}