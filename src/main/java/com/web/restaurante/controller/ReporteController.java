package com.web.restaurante.controller;

import com.web.restaurante.service.ReporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/admin/reportes")
public class ReporteController {

    @Autowired
    private ReporteService reporteService;

    @GetMapping("/caja/liquidados/{formato}")
    public ResponseEntity<byte[]> liquidados(
            @PathVariable String formato,
            @RequestParam(required = false, defaultValue = "") String texto,
            @RequestParam(required = false, defaultValue = "TODOS") String metodo,
            @RequestParam(required = false, defaultValue = "TODOS") String origen) {

        byte[] data = reporteService.generarReporteLiquidados(formato, texto, metodo, origen);
        return crearResponseBinario(data, "reporte_liquidados_turno", formato);
    }

    @GetMapping("/caja/movimientos-turno/{formato}")
    public ResponseEntity<byte[]> movimientos(@PathVariable String formato) {
        byte[] data = reporteService.generarReporteBitacoraCaja(formato);
        return crearResponseBinario(data, "reporte_bitacora_caja", formato);
    }

    @GetMapping("/caja/historial/{formato}")
    public ResponseEntity<byte[]> historial(
            @PathVariable String formato,
            @RequestParam String inicio,
            @RequestParam String fin) {

        byte[] data = reporteService.generarReporteHistorialCompleto(formato, inicio, fin, "", "");
        return crearResponseBinario(data, "reporte_historial_cierres", formato);
    }

    @GetMapping("/caja/historial-completo/{formato}")
    public ResponseEntity<byte[]> historialCompleto(
            @PathVariable String formato,
            @RequestParam String inicio,
            @RequestParam String fin,
            @RequestParam(required = false, defaultValue = "") String metodo,
            @RequestParam(required = false, defaultValue = "") String origen) {

        byte[] data = reporteService.generarReporteHistorialCompleto(formato, inicio, fin, metodo, origen);
        return crearResponseBinario(data, "reporte_buscador_global", formato);
    }

    private ResponseEntity<byte[]> crearResponseBinario(byte[] data, String nombreBase, String formato) {
        String extension = "pdf";
        MediaType mediaType = MediaType.APPLICATION_PDF;

        if (formato.equalsIgnoreCase("excel") || formato.equalsIgnoreCase("csv")) {
            extension = "csv";
            // 💡 Indispensable forzar UTF-8 en la descarga binaria
            mediaType = MediaType.parseMediaType("text/csv;charset=UTF-8");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + nombreBase + "_" + LocalDate.now() + "." + extension)
                .contentType(mediaType)
                .body(data);
    }
}