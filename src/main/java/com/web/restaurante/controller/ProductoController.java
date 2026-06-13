package com.web.restaurante.controller;

import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.CategoriaRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.InsumoService;
import com.web.restaurante.service.CloudinaryService; // 🚀 Conexión con la nube
import com.web.restaurante.util.ValidationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/admin/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final InsumoService insumoService;
    private final CloudinaryService cloudinaryService; // 🚀 Inyectado de forma limpia

    @GetMapping
    public String listar(Model model) {
        // ========================================================
        // 🔒 CONFIGURACIÓN ESTRUCTURAL DE RUTA (PERSISTENCIA F5)
        // ========================================================
        model.addAttribute("activeUri", "/admin/productos");
        model.addAttribute("titleHeader", "Catálogo de Productos y Platos");

        model.addAttribute("productos", productoRepository.findAll());
        model.addAttribute("categorias", categoriaRepository.findAll());
        return "admin/productos_lista";
    }

    @GetMapping("/api/{id}")
    @ResponseBody
    public ResponseEntity<Producto> obtenerProductoApi(@PathVariable Long id) {
        return productoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/guardar")
    public String guardar(@ModelAttribute Producto producto,
                          @RequestParam("archivoImagen") MultipartFile archivo,
                          RedirectAttributes redirectAttrs) {

        // ========================================================
        // 🛡️ ADUANA DE VALIDACIONES DEL MENÚ (LA JAMA)
        // ========================================================

        // 1. Nombre obligatorio y limpio
        if (producto.getNombre() == null || producto.getNombre().isBlank()) {
            redirectAttrs.addFlashAttribute("errorProducto", "El nombre del plato o producto es obligatorio.");
            return "redirect:/admin/productos?error";
        }
        if (!ValidationUtil.soloLetras(producto.getNombre())) {
            redirectAttrs.addFlashAttribute("errorProducto", "El nombre del plato solo puede contener letras (sin números ni emojis).");
            return "redirect:/admin/productos?error";
        }
        if (!ValidationUtil.longitudValida(producto.getNombre(), 50)) {
            redirectAttrs.addFlashAttribute("errorProducto", "El nombre del plato no puede superar los 50 caracteres.");
            return "redirect:/admin/productos?error";
        }

        // 2. Descripción con límite de longitud
        if (producto.getDescripcion() != null && !ValidationUtil.longitudValida(producto.getDescripcion(), 200)) {
            redirectAttrs.addFlashAttribute("errorProducto", "La descripción del plato no puede superar los 200 caracteres.");
            return "redirect:/admin/productos?error";
        }

        // 3. Precio coherente con la rentabilidad (Configurado en tu utilitario)
        if (producto.getPrecio() == null || !ValidationUtil.precioValido(producto.getPrecio())) {
            redirectAttrs.addFlashAttribute("errorProducto", "El precio del plato debe estar en el rango permitido de S/ "
                    + ValidationUtil.PRECIO_MIN + " a S/ " + ValidationUtil.PRECIO_MAX + ".");
            return "redirect:/admin/productos?error";
        }

        // ========================================================
        // ☁️ ALMACENAMIENTO DE IMÁGENES RE-DIRECCIONADO A CLOUDINARY
        // ========================================================
        if (!archivo.isEmpty()) {
            // 🛡️ REGLA A: Validar Peso Máximo (2MB)
            long pesoMaximo = 2 * 1024 * 1024;
            if (archivo.getSize() > pesoMaximo) {
                redirectAttrs.addFlashAttribute("errorProducto", "La imagen es muy pesada. El tamaño máximo permitido es de 2MB.");
                return "redirect:/admin/productos?error";
            }

            // 🛡️ REGLA B: Validar Formatos Permitidos
            String tipoArchivo = archivo.getContentType();
            if (tipoArchivo == null ||
                    (!tipoArchivo.equals("image/jpeg") &&
                            !tipoArchivo.equals("image/png") &&
                            !tipoArchivo.equals("image/webp"))) {

                redirectAttrs.addFlashAttribute("errorProducto", "Formato de archivo no válido. Solo se permiten imágenes JPG, PNG o WEBP.");
                return "redirect:/admin/productos?error";
            }

            try {
                // ➔ Mandamos los bytes directo a la nube y guardamos la URL HTTP segura en la BD
                String urlSeguraNube = cloudinaryService.subirImagen(archivo);
                producto.setImagen(urlSeguraNube);
                System.out.println("[La Jama - Media] Imagen subida de manera conforme a Cloudinary: " + urlSeguraNube);

            } catch (IOException e) {
                e.printStackTrace();
                redirectAttrs.addFlashAttribute("errorProducto", "Error al conectar con los servidores de Cloudinary. Inténtelo de nuevo.");
                return "redirect:/admin/productos?error";
            }
        } else if (producto.getId() != null) {
            // Si no se sube un nuevo archivo al editar, mantenemos la URL actual en la BD
            productoRepository.findById(producto.getId()).ifPresent(p -> producto.setImagen(p.getImagen()));
        }

        if (producto.getEstado() == null) producto.setEstado(1);

        productoRepository.save(producto);
        return "redirect:/admin/productos?success";
    }

    @PostMapping("/estado/{id}")
    @ResponseBody
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestParam Integer estado) {
        return productoRepository.findById(id).map(p -> {
            p.setEstado(estado);
            productoRepository.save(p);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/eliminar/{id}")
    public String eliminar(@PathVariable Long id) {
        // Ejecuta la cascada manual que armamos para no dejar registros huérfanos
        insumoService.eliminarProductoYDesvincularInsumos(id);
        return "redirect:/admin/productos?deleted";
    }

    /** 📊 Endpoint AJAX complementario para validación reactiva en el cliente */
    @PostMapping("/api/validar")
    @ResponseBody
    public ResponseEntity<?> validarProducto(@RequestBody Map<String, Object> datos) {
        Map<String, String> errores = new HashMap<>();

        String nombre = datos.get("nombre") != null ? datos.get("nombre").toString().trim() : "";
        if (nombre.isEmpty()) {
            errores.put("nombre", "El nombre es obligatorio.");
        } else if (!ValidationUtil.soloLetras(nombre)) {
            errores.put("nombre", "Solo letras, no se permiten números ni emojis.");
        } else if (!ValidationUtil.longitudValida(nombre, 50)) {
            errores.put("nombre", "El nombre no puede superar 50 caracteres.");
        }

        Object precioObj = datos.get("precio");
        if (precioObj == null || precioObj.toString().isBlank()) {
            errores.put("precio", "El precio es obligatorio.");
        } else {
            try {
                double precio = Double.parseDouble(precioObj.toString());
                if (!ValidationUtil.precioValido(precio)) {
                    errores.put("precio", "El precio debe estar entre S/ " + ValidationUtil.PRECIO_MIN + " y S/ " + ValidationUtil.PRECIO_MAX + ".");
                }
            } catch (NumberFormatException e) {
                errores.put("precio", "Ingresa un número de precio válido.");
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("valido", errores.isEmpty());
        if (!errores.isEmpty()) response.put("errores", errores);
        return ResponseEntity.ok(response);
    }
}