package com.web.restaurante.controller;

import com.web.restaurante.service.MetricasService;
import com.web.restaurante.service.TurnoCajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/metricas")
@RequiredArgsConstructor
public class MetricasApiController {

    private final MetricasService metricasService;
    private final TurnoCajaService turnoCajaService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> obtenerEstructuraDashboard() {
        return ResponseEntity.ok(metricasService.obtenerKpisGlobalesDashboard());
    }

    @GetMapping("/caja-activa")
    public ResponseEntity<Boolean> comprobarCajaActiva() {
        return ResponseEntity.ok(turnoCajaService.obtenerTurnoActivo().isPresent());
    }
}