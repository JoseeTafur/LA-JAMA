package com.web.restaurante.controller;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.dto.MovimientoInsumoDTO;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.InsumoService;
import com.web.restaurante.util.ValidationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@RequestMapping("/insumos")
public class InsumoController {

    private final InsumoService insumoService;
    private final ProductoRepository productoRepository;

    @GetMapping
    public String listarInsumos(@RequestParam(value = "tab", required = false, defaultValue = "proteinas") String tab, Model model) {
        model.addAttribute("activeUri", "/insumos");
        model.addAttribute("titleHeader", "Gestión de Almacén e Insumos");

        model.addAttribute("insumos", insumoService.listarInsumos());
        model.addAttribute("insumosArchivados", insumoService.listarInsumosArchivados());

        model.addAttribute("productos", productoRepository.findAll());
        model.addAttribute("insumosProductos", insumoService.listarTodosLosInsumosProducto());
        model.addAttribute("activeTab", tab);
        return "insumos";
    }

    @PostMapping("/editar")
    public String editarInsumo(@ModelAttribute InsumoDTO dto, RedirectAttributes redirectAttrs) {
        if (dto.getNombre() == null || dto.getNombre().isBlank() || !ValidationUtil.soloLetras(dto.getNombre())) {
            redirectAttrs.addFlashAttribute("errorInsumo", "El nombre del insumo es obligatorio y solo puede contener letras.");
            return "redirect:/insumos?tab=catalogo&error";
        }
        if (dto.getStockMinimo() != null && dto.getStockMinimo() < 0) {
            redirectAttrs.addFlashAttribute("errorInsumo", "El stock mínimo no puede ser un número negativo.");
            return "redirect:/insumos?tab=catalogo&error";
        }
        insumoService.guardarInsumo(dto);
        return "redirect:/insumos?tab=catalogo";
    }

    @PostMapping("/guardar")
    public String guardarInsumo(@ModelAttribute InsumoDTO dto,
                                @RequestParam(value = "originTab", defaultValue = "catalogo") String originTab,
                                RedirectAttributes redirectAttrs) {
        if (dto.getNombre() == null || dto.getNombre().isBlank() || !ValidationUtil.soloLetras(dto.getNombre())) {
            redirectAttrs.addFlashAttribute("errorInsumo", "El nombre del insumo es obligatorio y solo puede contener letras.");
            return "redirect:/insumos?tab=" + originTab + "&error";
        }
        if (dto.getStockMinimo() != null && dto.getStockMinimo() < 0) {
            redirectAttrs.addFlashAttribute("errorInsumo", "El stock mínimo no puede ser un número negativo.");
            return "redirect:/insumos?tab=" + originTab + "&error";
        }
        insumoService.guardarInsumo(dto);
        return "redirect:/insumos?tab=" + originTab;
    }

    @PostMapping("/reactivar/{id}")
    public String reactivarInsumo(@PathVariable Long id) {
        insumoService.reactivarInsumo(id);
        return "redirect:/insumos?tab=catalogo";
    }

    @PostMapping("/eliminar/{id}")
    @ResponseBody
    public ResponseEntity<?> eliminarInsumoAsincrono(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            insumoService.eliminarInsumo(id);
            response.put("success", true);
            response.put("message", "Insumo archivado correctamente y desvinculado de las recetas.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/purgar/{id}")
    @ResponseBody
    public ResponseEntity<?> purgarInsumoDefinitivoAsincrono(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();

        String rol = session.getAttribute("rol") != null ? session.getAttribute("rol").toString() : "INVITADO";
        if (!"SUPER_ADMIN".equals(rol)) {
            response.put("success", false);
            response.put("message", "Acceso denegado: Solo el Super Administrador puede purgar físicamente los registros.");
            return ResponseEntity.status(403).body(response);
        }

        try {
            insumoService.purgarInsumoDefinitivo(id);
            response.put("success", true);
            response.put("message", "El insumo ha sido purgado permanentemente del sistema de forma segura.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/producto/{idProducto}")
    @ResponseBody
    public List<InsumoProductoDTO> insumosPorProducto(@PathVariable Long idProducto) {
        return insumoService.listarInsumosPorProducto(idProducto);
    }

    @PostMapping("/producto/{idProducto}/agregar")
    public String agregarInsumoAProducto(@PathVariable Long idProducto,
                                         @RequestParam Long idInsumo,
                                         @RequestParam Double cantidad) {
        insumoService.agregarInsumoAProducto(idProducto, idInsumo, cantidad);
        return "redirect:/insumos?tab=recetas";
    }

    @PostMapping("/producto/receta/eliminar/{id}")
    public String eliminarInsumoDeReceta(@PathVariable Long id) {
        insumoService.eliminarInsumoDeReceta(id);
        return "redirect:/insumos?tab=recetas";
    }

    @GetMapping("/kardex/{id}")
    @ResponseBody
    public List<MovimientoInsumoDTO> obtenerKardex(@PathVariable Long id) {
        return insumoService.obtenerKardexPorInsumo(id);
    }

    @PostMapping("/producto/receta/guardar-matriz")
    public String guardarMatrizReceta(@RequestParam Long idProductoSelect,
                                      @RequestParam(required = false) List<Long> insumosSeleccionados,
                                      jakarta.servlet.http.HttpServletRequest request) {
        insumoService.limpiarRecetaDeProducto(idProductoSelect);

        if (insumosSeleccionados != null && !insumosSeleccionados.isEmpty()) {
            for (Long idInsumo : insumosSeleccionados) {
                String porcionesStr = request.getParameter("porciones-" + idInsumo);
                Double cantidadPorciones = (porcionesStr != null && !porcionesStr.isEmpty())
                        ? Double.valueOf(porcionesStr)
                        : 1.0;
                insumoService.agregarInsumoAProducto(idProductoSelect, idInsumo, cantidadPorciones);
            }
        }
        return "redirect:/insumos?tab=recetas";
    }

    @PostMapping("/lote/registrar")
    @ResponseBody
    public ResponseEntity<?> registrarLoteGeneral(@RequestBody java.util.Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        try {
            insumoService.registrarLote(payload);
            response.put("success", true);
            response.put("message", "Lote general registrado correctamente");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}