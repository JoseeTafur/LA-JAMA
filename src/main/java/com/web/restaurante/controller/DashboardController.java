package com.web.restaurante.controller;

import com.web.restaurante.repository.MovimientoCajaRepository;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.UsuarioService;
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
    public String mostrarPagina(Model model) {
        long totalUsuarios = usuarioService.contar();
        model.addAttribute("totalUsuarios", totalUsuarios);

        long totalEmpleados = empleadoService.contar();
        model.addAttribute("totalEmpleados", totalEmpleados);

        // Ingresos de hoy (suma de ventas del día)
        Double ventasHoy = movimientoCajaRepository.sumVentasHoy();
        model.addAttribute("totalVentasHoy", ventasHoy != null ? ventasHoy : 0.0);

        // Platos vendidos hoy (número de ventas del día)
        Long platosHoy = movimientoCajaRepository.countVentasHoy();
        model.addAttribute("platosVendidosHoy", platosHoy != null ? platosHoy : 0L);

        return "dashboard";
    }

    /** Endpoint AJAX para refrescar los KPIs sin recargar la página. */
    @GetMapping("/dashboard/kpis")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> obtenerKpis() {
        Double ventasHoy = movimientoCajaRepository.sumVentasHoy();
        Long platosHoy   = movimientoCajaRepository.countVentasHoy();
        return ResponseEntity.ok(Map.of(
                "totalVentasHoy",    ventasHoy  != null ? ventasHoy  : 0.0,
                "platosVendidosHoy", platosHoy  != null ? platosHoy  : 0L
        ));
    }
}