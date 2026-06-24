package com.web.restaurante.controller;

import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.PagoDigital;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Producto;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.CategoriaRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.PagoDigitalRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.OCRService;
import com.web.restaurante.service.CloudinaryService; // 🚀 IMPORTACIÓN AÑADIDA
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class CartaController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PedidoService pedidoService;
    private final InsumoProductoRepository insumoProductoRepository;
    private final OCRService ocrService;
    private final PagoDigitalRepository pagoDigitalRepository;
    private final CloudinaryService cloudinaryService; // 🚀 INYECTADO PARA EL PROCESAMIENTO MULTIMEDIA

    @GetMapping("/carta")
    public String verCarta(Model model) {
        List<Producto> listaProductos = productoRepository.findByEstado(1);
        Map<Long, Boolean> productosAgotados = new HashMap<>();

        for (Producto p : listaProductos) {
            boolean agotado = insumoProductoRepository.findByProductoId(p.getId()).stream()
                    .anyMatch(ip -> ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria())
                            && (ip.getInsumo().getStockActual() != null ? ip.getInsumo().getStockActual() : 0.0) < (ip.getCantidadUsada() != null ? ip.getCantidadUsada() : 0.0));
            productosAgotados.put(p.getId(), agotado);
        }

        model.addAttribute("categorias", categoriaRepository.findAll());
        model.addAttribute("productos", listaProductos);
        model.addAttribute("productosAgotados", productosAgotados);
        return "entregas/carta";
    }

    @PostMapping(value = "/carta/pedido", consumes = {"multipart/form-data"})
    @jakarta.transaction.Transactional // 🚀 ATÓMICO: Si falla la subida a Cloudinary, no se guarda el pedido en base de datos
    public ResponseEntity<?> recibirPedidoCarta(
            @RequestPart("pedido") Pedido pedido,
            @RequestPart(value = "voucher", required = false) MultipartFile file) {
        try {
            String metodo = pedido.getMetodoPago() != null ? pedido.getMetodoPago().name() : "EFECTIVO";

            // Ejecución de OCR
            if ("YAPE".equalsIgnoreCase(metodo) || "PLIN".equalsIgnoreCase(metodo)) {
                ocrService.procesarYValidarVoucher(pedido, file);
            }

            pedido.setEstado(EstadoPedido.PENDIENTE);
            pedido.setFechaCreacion(java.time.LocalDateTime.now());
            pedido.setTicketImpresoCocina(false);

            Long idPedido = pedidoService.guardarPedidoCarta(pedido);
            Pedido pedidoGuardado = pedidoService.obtenerPorId(idPedido);

            // ── 🛡️ INYECTAMOS EL ENLACE OBLIGATORIO DE PAGO DIGITAL ──
            if ("YAPE".equalsIgnoreCase(metodo) || "PLIN".equalsIgnoreCase(metodo)) {
                PagoDigital pagoDigital = new PagoDigital();
                pagoDigital.setPedido(pedidoGuardado); // Enlace relacional id_pedido
                pagoDigital.setFechaPago(java.time.LocalDateTime.now());
                pagoDigital.setSituacion(com.web.restaurante.model.enums.SituacionPagoDigital.PENDIENTE);
                pagoDigital.setObservacion("Voucher registrado desde Carta Web.");

                // 🚀 TRABAJO DE CLOUDINARY INTEGRADO ASOCIANDO TU NUEVO MÉTODO
                if (file != null && !file.isEmpty()) {
                    System.out.println("📡 [Cloudinary] Subiendo voucher a la carpeta vouchers-lajama...");
                    // Invocamos el método sobrecargado indicando la carpeta exacta
                    String urlSeguraHttps = cloudinaryService.subirImagen(file, "vouchers-lajama");
                    pagoDigital.setImgUrl(urlSeguraHttps);
                } else {
                    pagoDigital.setImgUrl("sin_imagen.jpg");
                }

                pagoDigitalRepository.save(pagoDigital);
                System.out.println("🚀 [PAGOS DIGITALES] Enlace atómico y voucher almacenados exitosamente.");
            }

            return ResponseEntity.ok(Map.of("success", true, "id", pedidoGuardado.getId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            System.err.println("💥 ERROR EN REGISTRO DE PEDIDO: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Error: " + e.getMessage()));
        }
    }
}