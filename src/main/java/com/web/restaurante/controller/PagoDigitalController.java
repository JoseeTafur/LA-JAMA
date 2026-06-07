package com.web.restaurante.controller;

import com.web.restaurante.dto.pago.ObservacionDTO;
import com.web.restaurante.dto.pago.PagoDigitalSaveDTO;
import com.web.restaurante.dto.pago.PagoImagenSaveDTO;
import com.web.restaurante.service.PagoDigitalService;
import com.web.restaurante.util.ResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/pagos-digitales")
public class PagoDigitalController {

    private final PagoDigitalService pagoDigitalService;

    @GetMapping
    public String view(Model model) {
        model.addAttribute("activeUri", "/admin/pagos-digitales");

        model.addAttribute("title", "Gestión de Pagos Digitales");
        model.addAttribute("titleHeader", "Gestión de Pagos Digitales");

        model.addAttribute("view", "/pagodigital/pago-digital");
        model.addAttribute("css", "/css/pago-digital.css");
        model.addAttribute("js", "/js/pago-digital.js");

        return "layout-gestion";
    }

    @GetMapping("/api/listar")
    public ResponseEntity<?> listarTodos() {
        return ResponseUtil.ok(
                "Pagos obtenidos correctamente",
                pagoDigitalService.listarTodos());
    }

    @GetMapping("/api/obtener/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        return ResponseUtil.ok(
                "Pago obtenido correctamente",
                pagoDigitalService.obtener(id)
        );
    }

    @PostMapping("/api/guardar")
    public ResponseEntity<?> crear(@RequestBody PagoDigitalSaveDTO dto) {
        return ResponseUtil.ok(
                "Pago guardado correctamente",
                pagoDigitalService.crear(dto)
        );
    }

    @PutMapping("/api/actualizar/{id}")
    public ResponseEntity<?> actualizar(@RequestBody PagoDigitalSaveDTO dto, @PathVariable Long id) {
        return ResponseUtil.ok(
                "Pago guardado correctamente",
                pagoDigitalService.actualizar(dto, id)
        );
    }

    @PatchMapping("/api/actualizar-imagen/{id}")
    public ResponseEntity<?> actualizarImagen(@RequestBody PagoImagenSaveDTO dto, @PathVariable Long id) {
        return ResponseUtil.ok(
                "Pago guardado correctamente",
                pagoDigitalService.actualizarImagen(dto, id)
        );
    }

    @PatchMapping("/api/aprobar/{id}")
    public ResponseEntity<?> aprobar(@RequestBody ObservacionDTO dto, @PathVariable Long id) {
        return ResponseUtil.ok(
                "Pago aprobado",
                pagoDigitalService.aprobar(dto, id)
        );
    }

    @PatchMapping("/api/anular/{id}")
    public ResponseEntity<?> anular(@RequestBody ObservacionDTO dto, @PathVariable Long id) {
        return ResponseUtil.ok(
                "Pago anulado",
                pagoDigitalService.anular(dto, id)
        );
    }

}
