package com.web.restaurante.controller;

import com.web.restaurante.dto.KardexProteinaDTO;
import com.web.restaurante.dto.LoteInsumoDTO;
import com.web.restaurante.dto.MovimientoPorcionesDTO;
import com.web.restaurante.dto.ProduccionPorcionesDTO;
import com.web.restaurante.service.ProteinaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/proteinas")
public class ProteinaController {

    private final ProteinaService proteinaService;

    @GetMapping
    public String vistaProteinas(Model model) {
        return "proteinas";
    }

    // ─── LOTES ───────────────────────────────────────────────

    @GetMapping("/lotes/{idInsumo}")
    @ResponseBody
    public List<LoteInsumoDTO> listarLotes(@PathVariable Long idInsumo) {
        return proteinaService.listarLotesPorInsumo(idInsumo);
    }

    @PostMapping("/lotes/registrar")
    @ResponseBody
    public ResponseEntity<LoteInsumoDTO> registrarLote(@RequestBody LoteInsumoDTO dto) {
        return ResponseEntity.ok(proteinaService.registrarLote(dto));
    }

    // ─── PRODUCCIÓN ───────────────────────────────────────────

    @GetMapping("/produccion/{idInsumo}")
    @ResponseBody
    public List<ProduccionPorcionesDTO> listarProduccion(@PathVariable Long idInsumo) {
        return proteinaService.listarProduccionPorInsumo(idInsumo);
    }

    @PostMapping("/produccion/registrar")
    @ResponseBody
    public ResponseEntity<ProduccionPorcionesDTO> registrarProduccion(@RequestBody ProduccionPorcionesDTO dto) {
        return ResponseEntity.ok(proteinaService.registrarProduccion(dto));
    }

    // ─── MOVIMIENTOS ─────────────────────────────────────────

    @GetMapping("/movimientos/{idInsumo}")
    @ResponseBody
    public List<MovimientoPorcionesDTO> listarMovimientos(@PathVariable Long idInsumo) {
        return proteinaService.listarMovimientosPorInsumo(idInsumo);
    }

    @PostMapping("/movimientos/ajustar")
    @ResponseBody
    public ResponseEntity<?> ajustarPorciones(
            @RequestParam Long idInsumo,
            @RequestParam Integer cantidad,
            @RequestParam String tipo,
            @RequestParam String motivo) {
        try {
            MovimientoPorcionesDTO dto = proteinaService.ajustarPorciones(idInsumo, cantidad, tipo, motivo);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/kardex/{idInsumo}")
    @ResponseBody
    public List<KardexProteinaDTO> obtenerKardex(@PathVariable Long idInsumo) {
        return proteinaService.obtenerKardexUnificado(idInsumo);
    }
}