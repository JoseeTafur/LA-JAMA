package com.web.restaurante.controller;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.dto.MovimientoInsumoDTO;
import com.web.restaurante.model.MovimientoInsumo;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.repository.MovimientoRepository;
import com.web.restaurante.service.InsumoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/insumos")
public class InsumoController {

    private final InsumoService insumoService;
    private final ProductoRepository productoRepository;
    private final MovimientoRepository movimientoRepository;

    // 🌟 Mantenemos el método intacto, pero capturamos el "tab" opcional para la vista
    @GetMapping
    public String listarInsumos(@RequestParam(value = "tab", required = false, defaultValue = "proteinas") String tab, Model model) {
        model.addAttribute("insumos", insumoService.listarInsumos());
        model.addAttribute("productos", productoRepository.findAll());
        model.addAttribute("insumosProductos", insumoService.listarTodosLosInsumosProducto());

        // Enviamos la pestaña activa a Thymeleaf para que sepa cuál pintar al cargar
        model.addAttribute("activeTab", tab);
        return "insumos";
    }

    @PostMapping("/editar")
    public String editarInsumo(@ModelAttribute InsumoDTO dto) {
        insumoService.guardarInsumo(dto);
        // Regresa a la raíz, forzando a abrir la pestaña de catálogo general
        return "redirect:/insumos?tab=catalogo";
    }

    @PostMapping("/reactivar/{id}")
    public String reactivarInsumo(@PathVariable Long id) {
        insumoService.reactivarInsumo(id);
        return "redirect:/insumos?tab=catalogo";
    }

    @PostMapping("/guardar")
    public String guardarInsumo(@ModelAttribute InsumoDTO dto, @RequestParam(value = "originTab", defaultValue = "catalogo") String originTab) {
        insumoService.guardarInsumo(dto);
        // Redirecciona a la pestaña desde donde se invocó el modal
        return "redirect:/insumos?tab=" + originTab;
    }

    @PostMapping("/eliminar/{id}")
    @ResponseBody
    public ResponseEntity<?> eliminarInsumoAsincrono(@PathVariable Long id) {
        try {
            // Invocamos la coreografía de baja que implementamos en el Service
            insumoService.ejecutarBajaLogicaAvanzada(id);

            // Retornamos éxito en un formato JSON limpio que leerá JavaScript
            return ResponseEntity.ok()
                    .body("{\"success\": true, \"message\": \"Insumo archivado correctamente y recetas desvinculadas.\"}");
        } catch (RuntimeException e) {
            // Si ocurre algún fallo imprevisto, respondemos con código 400 y el error
            return ResponseEntity.badRequest().body(e.getMessage());
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
        try {
            insumoService.registrarLote(payload);
            return ResponseEntity.ok().body("{\"success\": true, \"message\": \"Lote general registrado correctamente\"}");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}