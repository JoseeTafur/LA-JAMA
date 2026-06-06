package com.web.restaurante.controller;

import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.CategoriaRepository;
import com.web.restaurante.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Controller
@RequestMapping("/admin/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;

    private final String RUTA_IMAGENES = "C://restaurante//imagenes";

    @GetMapping
    public String listar(Model model) {
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
                          @RequestParam("archivoImagen") MultipartFile archivo) {

        if (!archivo.isEmpty()) {
            try {
                String nombreImagen = UUID.randomUUID().toString() + "_" + archivo.getOriginalFilename();
                byte[] bytesImg = archivo.getBytes();
                Path rutaCompleta = Paths.get(RUTA_IMAGENES + "//" + nombreImagen);

                if (!Files.exists(Paths.get(RUTA_IMAGENES))) {
                    Files.createDirectories(Paths.get(RUTA_IMAGENES));
                }

                Files.write(rutaCompleta, bytesImg);
                producto.setImagen(nombreImagen);
            } catch (IOException e) {
                e.printStackTrace();
            }
        } else if (producto.getId() != null) {
            productoRepository.findById(producto.getId()).ifPresent(p -> producto.setImagen(p.getImagen()));
        }

        if (producto.getEstado() == null) producto.setEstado(1);

        productoRepository.save(producto);
        return "redirect:/admin/productos";
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
        productoRepository.deleteById(id);
        return "redirect:/admin/productos?deleted";
    }
}