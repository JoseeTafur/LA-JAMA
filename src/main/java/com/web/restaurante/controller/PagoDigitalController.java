package com.web.restaurante.controller;

import com.web.restaurante.dto.pago.ObservacionDTO;
import com.web.restaurante.dto.pago.PagoDigitalSaveDTO;
import com.web.restaurante.dto.pago.PagoImagenSaveDTO;
import com.web.restaurante.model.PagoDigital;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.repository.PagoDigitalRepository; // 🚀 Asegúrate de importar tus repositorios
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.service.CloudinaryService;
import com.web.restaurante.service.PagoDigitalService;
import com.web.restaurante.util.ResponseUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/pagos-digitales")
public class PagoDigitalController {

    private final PagoDigitalService pagoDigitalService;
    private final CloudinaryService cloudinaryService;
    private final PedidoRepository pedidoRepository;
    private final PagoDigitalRepository pagoDigitalRepository;

    @GetMapping
    public String view(Model model) {
        model.addAttribute("activeUri", "/admin/pagos-digitales");

        model.addAttribute("title", "Gestión de Pagos Digitales");
        model.addAttribute("titleHeader", "Gestión de Pagos Digitales");
        model.addAttribute("imageBaseUrl", "https://res.cloudinary.com/dyjnbddit/image/upload/");
        model.addAttribute("view", "/pagodigital/pago-digital");
        model.addAttribute("css", "/css/pago-digital.css");
        model.addAttribute("js", "/js/pago-digital.js");

        return "pagodigital/pago-digital";
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

    // =========================================================================
// UBICACIÓN: Método actualizarDatosManuales en PagoDigitalController.java
// =========================================================================
    @PutMapping("/api/actualizar-datos/{id}")
    @ResponseBody
    @jakarta.transaction.Transactional
    public ResponseEntity<?> actualizarDatosManuales(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            PagoDigital pago = pagoDigitalRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pago digital no encontrado"));

            Pedido pedido = pago.getPedido();

            // 1. Corregimos el correo si cambió
            if (pedido != null) {
                pedido.setClienteCorreo(payload.get("clienteCorreo"));
                pedido.setDocumentoCliente(payload.get("numDocumento"));
                pedidoRepository.save(pedido);
            }

            // 2. Procesamos la imagen si cargaron un archivo físico desde el modal
            String imagenBase64 = payload.get("imagenBase64");
            if (imagenBase64 != null && !imagenBase64.isBlank()) {
                // Decodificamos la cadena Base64 a bytes puros
                byte[] imagenBytes = java.util.Base64.getDecoder().decode(imagenBase64);

                // 🚀 EL TRUCO: Creamos un MultipartFile en memoria utilizando una clase anónima
                MultipartFile archivoMultipartCustom = new MultipartFile() {
                    @Override
                    public String getName() { return "voucher_editado.jpg"; }
                    @Override
                    public String getOriginalFilename() { return "voucher_editado.jpg"; }
                    @Override
                    public String getContentType() { return "image/jpeg"; }
                    @Override
                    public boolean isEmpty() { return imagenBytes.length == 0; }
                    @Override
                    public long getSize() { return imagenBytes.length; }
                    @Override
                    public byte[] getBytes() throws IOException { return imagenBytes; }
                    @Override
                    public java.io.InputStream getInputStream() throws IOException {
                        return new java.io.ByteArrayInputStream(imagenBytes);
                    }
                    @Override
                    public void transferTo(java.io.File dest) throws IOException, IllegalStateException {
                        java.nio.file.Files.write(dest.toPath(), imagenBytes);
                    }
                };

                // 3. Invocamos TU método original de CloudinaryService
                String urlSeguraCloudinary = cloudinaryService.subirImagen(archivoMultipartCustom);

                // Guardamos la URL devuelta en la columna img_url de tu tabla
                pago.setImgUrl(urlSeguraCloudinary);
            }

            pagoDigitalRepository.save(pago);

            return ResponseUtil.ok("¡Datos y voucher rectificados correctamente!", null);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}