package com.web.restaurante.controller;

import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.CategoriaRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;

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

    @GetMapping("/carta")
    public String verCarta(Model model) {
        List<Producto> listaProductos = productoRepository.findByEstado(1);
        Map<Long, Boolean> productosAgotados = new HashMap<>();

        for (Producto p : listaProductos) {
            boolean agotado = false;
            List<InsumoProducto> receta = insumoProductoRepository.findByProductoId(p.getId());

            for (InsumoProducto ip : receta) {
                if (ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria())) {
                    double stockActual = ip.getInsumo().getStockActual() != null ? ip.getInsumo().getStockActual() : 0.0;
                    double cantidadRequerida = ip.getCantidadUsada() != null ? ip.getCantidadUsada() : 0.0;

                    if (stockActual < cantidadRequerida) {
                        agotado = true;
                        break;
                    }
                }
            }
            productosAgotados.put(p.getId(), agotado);
        }

        model.addAttribute("categorias", categoriaRepository.findAll());
        model.addAttribute("productos", listaProductos);
        model.addAttribute("productosAgotados", productosAgotados);

        return "entregas/carta";
    }

    @PostMapping(value = "/carta/pedido", consumes = {"multipart/form-data"})
    public ResponseEntity<?> recibirPedidoCarta(
            @RequestPart("pedido") Pedido pedido,
            @RequestPart(value = "voucher", required = false) org.springframework.web.multipart.MultipartFile file) {
        try {
            String metodo = pedido.getMetodoPago() != null ? pedido.getMetodoPago().name() : "EFECTIVO";

            if ("YAPE".equalsIgnoreCase(metodo) || "PLIN".equalsIgnoreCase(metodo)) {
                if (file == null || file.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 Error: Falta adjuntar el voucher de pago."));
                }

                // ── 🌈 ADUANA 1: PATRÓN CROMÁTICO (RECONOCIMIENTO DE MARCA RÁPIDO) ──
                java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(file.getInputStream());
                if (img == null) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 Archivo corrupto o formato de imagen inválido."));
                }

                int width = img.getWidth();
                int height = img.getHeight();
                int pixelesCoincidentes = 0; int totalMuestras = 0;

                for (int x = 0; x < width; x += 4) {
                    for (int y = 0; y < height; y += 4) {
                        int rgb = img.getRGB(x, y);
                        int r = (rgb >> 16) & 0xFF;
                        int g = (rgb >> 8) & 0xFF;
                        int b = rgb & 0xFF;
                        totalMuestras++;

                        if ("YAPE".equalsIgnoreCase(metodo)) {
                            if (r > 95 && b > 125 && g < (r * 0.72) && g < (b * 0.72)) pixelesCoincidentes++;
                        } else if ("PLIN".equalsIgnoreCase(metodo)) {
                            if (g > 135 && b > 165 && r < (g * 0.82)) pixelesCoincidentes++;
                        }
                    }
                }

                double porcentajeColor = ((double) pixelesCoincidentes / totalMuestras) * 100;
                if (porcentajeColor < 7.0) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "🚨 Fraude Detectado: La paleta cromática no corresponde a un voucher original de " + metodo + "."));
                }

                // ── 🛰️ EXTRACCIÓN DE TEXTO DESDE EL FRONTEND (CERO CONSUMO RAM) ──
                String textoExtraido = pedido.getTextoVoucherCrudo() != null ? pedido.getTextoVoucherCrudo().toLowerCase() : "";
                System.out.println("🛰️ [AUDITORÍA EN RAILWAY] Texto recibido desde el cliente:\n" + textoExtraido);

                // ── 💰 ADUANA 2: RECONOCIMIENTO DE PRECIO CON CANDADO ESTRICTO ──
                Double montoRealPedido = pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0;
                Double montoDetectado = -1.0;

                java.util.regex.Pattern patternMontoStrict = java.util.regex.Pattern.compile("\\b([0-9]{1,4}\\.[0-9]{2})\\b");
                java.util.regex.Matcher matcherMontoStrict = patternMontoStrict.matcher(textoExtraido);

                boolean matchPerfecto = false;
                while (matcherMontoStrict.find()) {
                    try {
                        double valorConstatado = Double.parseDouble(matcherMontoStrict.group(1));
                        if (valorConstatado > 0.0 && valorConstatado != 2026.0) {
                            montoDetectado = valorConstatado;
                            if (Math.abs(montoDetectado - montoRealPedido) <= 0.05) {
                                matchPerfecto = true;
                                break;
                            }
                        }
                    } catch (Exception e) {}
                }

                // ESCUDO ANTI-FRAUDE: Si el OCR leyó un monto real decimal y este difiere del pedido, bloqueo fulminante
                if (montoDetectado > 0.0 && !matchPerfecto) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "⚠️ Alerta de Fraude: El monto leído ópticamente en tu voucher (S/. " + montoDetectado + ") no coincide con el total real de tu pedido (S/. " + montoRealPedido + ")."));
                }

                // ── 📅 ADUANA 3: RECONOCIMIENTO DE FECHA LEGÍTIMA ──
                java.time.LocalDate hoy = java.time.LocalDate.now();
                String diaHoy = hoy.format(java.time.format.DateTimeFormatter.ofPattern("d"));
                String mesHoy = hoy.format(java.time.format.DateTimeFormatter.ofPattern("MMM")).toLowerCase();
                String fechaSlashHoy = hoy.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                java.util.regex.Pattern patternFechaFlexible = java.util.regex.Pattern.compile(diaHoy + ".*?" + mesHoy);
                java.util.regex.Matcher matcherFechaFlexible = patternFechaFlexible.matcher(textoExtraido);

                boolean contieneFechaHoy = textoExtraido.contains(fechaSlashHoy) ||
                        matcherFechaFlexible.find() ||
                        textoExtraido.contains("hoy") ||
                        textoExtraido.isEmpty(); // Si el OCR en el cliente vino vacío por error del Worker, pasa por resguardo visual

                if (!contieneFechaHoy) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "🚨 Voucher Caducado: La fecha identificada en la imagen no corresponde al día de hoy. Suba una captura actual."));
                }

                // ── 🔢 ADUANA 4: NÚMERO DE OPERACIÓN Y AUDITORÍA ANTI-REUTILIZACIÓN ──
                java.util.regex.Pattern patternOp = java.util.regex.Pattern.compile("(operación|nro|n°|ref\\.?|constancia)\\s?:?\\s?(\\d{6,12})");
                java.util.regex.Matcher matcherOp = patternOp.matcher(textoExtraido);
                String idTransaccionReal = null;

                if (matcherOp.find()) {
                    idTransaccionReal = matcherOp.group(2);
                } else {
                    java.util.regex.Pattern patternSuelto = java.util.regex.Pattern.compile("\\b\\d{7,11}\\b");
                    java.util.regex.Matcher matcherSuelto = patternSuelto.matcher(textoExtraido);
                    if (matcherSuelto.find()) idTransaccionReal = matcherSuelto.group();
                }

                if (idTransaccionReal != null) {
                    boolean yaSeUsoHoy = pedidoService.existeNumeroOperationHoy("V-" + idTransaccionReal);
                    if (yaSeUsoHoy) {
                        return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                                "🚨 Fraude Detectado: Este número de operación (" + idTransaccionReal + ") ya fue registrado hoy. No se permite duplicar capturas."));
                    }
                    // Si el monto no fue detectado por brillo, asignamos el sufijo de control visual para el panel de caja
                    pedido.setCodigoPagoOperacion("V-" + idTransaccionReal + (matchPerfecto ? "" : "-CHECK-MANUAL"));
                } else {
                    String hashFailsafe = String.valueOf(Math.abs(file.getOriginalFilename().hashCode() + file.getSize()));
                    pedido.setCodigoPagoOperacion("V-HASH-" + hashFailsafe);
                }
            }

            // 🧾 CONTROL DE NOTA DE VENTA: Nace en estado PENDIENTE, congelado hasta aprobación del cajero
            pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.PENDIENTE);

            Long id = pedidoService.guardarPedidoCarta(pedido);
            return ResponseEntity.ok(Map.of("success", true, "id", id));

        } catch (Exception e) {
            System.err.println("💥 Error general en pasarela: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Error al procesar el pedido de la carta: " + e.getMessage()));
        }
    }
}