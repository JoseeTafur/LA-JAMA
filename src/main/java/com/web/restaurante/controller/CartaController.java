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
import com.web.restaurante.service.GroqService;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.OCRService;
import com.web.restaurante.service.CloudinaryService; // 🚀 IMPORTACIÓN AÑADIDA
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final CloudinaryService cloudinaryService;
    private final GroqService groqService;

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
    @Transactional
    public ResponseEntity<?> recibirPedidoCarta(@RequestPart("pedido") Pedido pedido) {
        try {
            String metodo = pedido.getMetodoPago() != null ? pedido.getMetodoPago().name() : "EFECTIVO";

            pedido.setEstado(EstadoPedido.PENDIENTE);
            pedido.setFechaCreacion(java.time.LocalDateTime.now());
            pedido.setTicketImpresoCocina(false);

            Long idPedido = pedidoService.guardarPedidoCarta(pedido);
            Pedido pedidoGuardado = pedidoService.obtenerPorId(idPedido);

            if ("YAPE".equalsIgnoreCase(metodo) || "PLIN".equalsIgnoreCase(metodo) || "TRANSFERENCIA".equalsIgnoreCase(metodo)) {
                PagoDigital pagoDigital = new PagoDigital();
                pagoDigital.setPedido(pedidoGuardado);
                pagoDigital.setFechaPago(java.time.LocalDateTime.now());
                pagoDigital.setSituacion(com.web.restaurante.model.enums.SituacionPagoDigital.APROBADO);
                pagoDigital.setObservacion("Voucher verificado.");
                // Rescatamos la url de cloudinary que enviamos en el payload
                pagoDigital.setImgUrl(pedido.getTextoVoucherCrudo());

                pagoDigitalRepository.save(pagoDigital);
            }

            return ResponseEntity.ok(Map.of("success", true, "id", pedidoGuardado.getId()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping(value = "/carta/validar-voucher", consumes = {"multipart/form-data"})
    public ResponseEntity<?> validarVoucherEnCaliente(
            @RequestParam("metodoPago") String metodoPago,
            @RequestParam("montoEsperado") double montoTotal,
            @RequestPart("voucher") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 Falta adjuntar el voucher."));
            }

            // 1. Subida inmediata a Cloudinary para auditoría temporal
            System.out.println("📡 [Cloudinary] Subiendo voucher temporal de verificación...");
            String urlVoucherCloudinary = cloudinaryService.subirImagen(file, "vouchers-lajama");

            // 2. Llamamos a GroqService de forma segura
            Map<String, Object> datosIA = groqService.analizarImagenVoucher(urlVoucherCloudinary);

            System.out.println("🔍 [RADAR IA - DESTINO DETECTADO]: " + datosIA.get("destino"));
            System.out.println("🔍 [RADAR IA - MONTO DETECTADO]: " + datosIA.get("monto"));
            System.out.println("🔍 [RADAR IA - OPERACION DETECTADA]: " + datosIA.get("numero_operacion"));
            System.out.println("🔍 [RADAR IA - FECHA DETECTADA]: " + datosIA.get("dia") + " de " + datosIA.get("mes") + " del " + datosIA.get("anio"));

            String destinoIA = (String) datosIA.get("destino");
            String nroOperacion = (String) datosIA.get("numero_operacion");

            // 🛡️ CONTROL CONTRA IMÁGENES GENÉRICAS
            if (destinoIA == null || "null".equalsIgnoreCase(destinoIA.trim())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 La imagen subida no es un comprobante válido de Yape o Plin."));
            }

            Number montoNum = (Number) datosIA.get("monto");
            double montoIA = montoNum != null ? montoNum.doubleValue() : 0.0;

            // ── 🛡️ ADUANA CRÍTICA DE MÉTODO DE PAGO CRUZADO ──
            if ("YAPE".equalsIgnoreCase(metodoPago) && "PLIN".equalsIgnoreCase(destinoIA)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "reason", "METODO_EQUIVOCADO", "message", "Subiste un comprobante de PLIN, por favor sube el comprobante en el método de pago correcto (YAPE)."));
            }
            if ("PLIN".equalsIgnoreCase(metodoPago) && "YAPE".equalsIgnoreCase(destinoIA)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "reason", "METODO_EQUIVOCADO", "message", "Subiste un comprobante de YAPE, por favor sube el comprobante en el método de pago correcto (PLIN)."));
            }
            if (!metodoPago.equalsIgnoreCase(destinoIA) && !"TRANSFERENCIA".equalsIgnoreCase(metodoPago)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "reason", "METODO_EQUIVOCADO", "message", "El comprobante no corresponde al método de pago seleccionado."));
            }

            // ── 🛡️ ADUANA CRÍTICA DE FECHA DE SERVIDOR BLINDADA INTERANUAL ──
            java.time.LocalDateTime ahora = java.time.LocalDateTime.now();
            int diaHoy = ahora.getDayOfMonth();
            int anioHoyFull = ahora.getYear();         // Ej: 2026
            int anioHoyShort = anioHoyFull % 100;     // Ej: 2026 -> 26
            String[] mesesMap = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
            String mesHoy = mesesMap[ahora.getMonthValue() - 1];

            Number diaNum = (Number) datosIA.get("dia");
            Number anioNum = (Number) datosIA.get("anio");
            String mesIA = (String) datosIA.get("mes");

            int diaIA = diaNum != null ? diaNum.intValue() : 0;
            int anioIA = anioNum != null ? anioNum.intValue() : 0;

            // 🚀 BLINDAJE DE AÑO DEFENSIVO: Valida si la IA leyó "26" o "2026". Si no es ninguna, es fraude o voucher viejo.
            boolean añoEsCorrecto = (anioIA == anioHoyFull || anioIA == anioHoyShort);

            if (diaHoy != diaIA || mesIA == null || !mesHoy.equalsIgnoreCase(mesIA.trim()) || !añoEsCorrecto) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "El comprobante detectado es del año/fecha incorrecta (" + diaIA + " de " + (mesIA != null ? mesIA : "null") + " del " + anioIA + "). La compra requiere obligatoriamente la fecha de hoy: " + diaHoy + " de " + mesHoy + " del " + anioHoyFull + "."
                ));
            }

            // 3. Aduana de Monto Controlado (Tolerancia de 20 céntimos)
            if (Math.abs(montoIA - montoTotal) > 0.20) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 Error de Monto: El monto detectado en la captura (S/ " + montoIA + ") no coincide con el total de tu pedido (S/ " + montoTotal + ")."));
            }

            // 4. Control estricto de duplicados en el mismo día
            if (nroOperacion == null || nroOperacion.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "La IA no pudo leer con nitidez el número de operación. Intente con otra captura clara."));
            }
            if (pedidoService.existeNumeroOperationHoy(nroOperacion.trim())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 Intento de Estafa: Este número de operación (" + nroOperacion.trim() + ") ya fue registrado y aprobado el día de hoy en La Jama."));
            }

            // Si pasa todos los candados con éxito
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "numeroOperacion", nroOperacion.trim(),
                    "imgUrl", urlVoucherCloudinary
            ));

        } catch (Exception e) {
            System.err.println("💥 Error en validador de voucher: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Error interno al procesar con la IA: " + e.getMessage()));
        }
    }
}