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

                // ── 🛰️ EXTRACCIÓN DE TEXTO DESDE EL FRONTEND ──
                String textoExtraido = pedido.getTextoVoucherCrudo() != null ? pedido.getTextoVoucherCrudo().toLowerCase() : "";
                System.out.println("🛰️ [AUDITORÍA EN RAILWAY] Texto recibido desde el cliente:\n" + textoExtraido);

                Double montoRealPedido = pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0;

                String datoPrecio = "NO DETECTADO";
                String datoFecha = "NO DETECTADO";
                String datoOperacion = "NO DETECTADO";

                String[] lineas = textoExtraido.split("\\n");

                // 1. 💰 EXTRACCIÓN DEL PRECIO (Línea inmediata inferior a "yapeaste")
                for (int i = 0; i < lineas.length; i++) {
                    String lineaActual = lineas[i].trim();
                    if (lineaActual.contains("yapeaste") || lineaActual.contains("¡yapeaste!")) {
                        if ((i + 1) < lineas.length) {
                            String posibleMonto = lineas[i + 1].replaceAll("[^0-9\\.]", "").trim();
                            // Filtramos ruidos comunes como el año o textos vacíos
                            if (!posibleMonto.isEmpty() && !posibleMonto.equals("2026") && posibleMonto.length() < 6) {
                                datoPrecio = posibleMonto;
                            }
                        }
                        break;
                    }
                }

                // Fallback por si el símbolo S/. se leyó en la misma línea
                if ("NO DETECTADO".equals(datoPrecio)) {
                    java.util.regex.Pattern pSoles = java.util.regex.Pattern.compile("(s/\\.?|s/\\s?)\\s?(\\d{1,4}(\\.\\d{2})?)");
                    java.util.regex.Matcher mSoles = pSoles.matcher(textoExtraido);
                    if (mSoles.find()) {
                        datoPrecio = mSoles.group(2);
                    }
                }

                // 2. 📅 EXTRACCIÓN DE LA FECHA
                java.util.regex.Pattern pFecha = java.util.regex.Pattern.compile("(\\d{1,2}\\s(jun|ene|feb|mar|abr|may|jul|ago|set|oct|nov|dic|may\\.?))|(\\d{2}/\\d{2}/\\d{4})");
                java.util.regex.Matcher mFecha = pFecha.matcher(textoExtraido);
                if (mFecha.find()) {
                    datoFecha = mFecha.group(0);
                } else if (textoExtraido.contains("hoy")) {
                    datoFecha = "hoy";
                }

                // 3. 🔢 EXTRACCIÓN DEL NÚMERO DE OPERACIÓN
                java.util.regex.Pattern pOp = java.util.regex.Pattern.compile("(operación|nro|n°|ref|constancia|transacción)\\s?:?\\s?(\\d{6,12})");
                java.util.regex.Matcher mOp = pOp.matcher(textoExtraido);
                if (mOp.find()) {
                    datoOperacion = mOp.group(2);
                } else {
                    java.util.regex.Pattern pOpSuelto = java.util.regex.Pattern.compile("\\b\\d{8}\\b");
                    java.util.regex.Matcher mOpSuelto = pOpSuelto.matcher(textoExtraido);
                    if (mOpSuelto.find()) {
                        datoOperacion = mOpSuelto.group(0);
                    }
                }

                // 🖨️ MONITOR EXPLICITO SOLICITADO
                System.out.println("=====================================");
                System.out.println("Precio: " + datoPrecio);
                System.out.println("Fecha: " + datoFecha);
                System.out.println("nroOperacion: " + datoOperacion);
                System.out.println("=====================================");

                java.time.LocalDate hoy = java.time.LocalDate.now();
                String diaHoy = hoy.format(java.time.format.DateTimeFormatter.ofPattern("d")); // "20"
                String mesHoy = hoy.format(java.time.format.DateTimeFormatter.ofPattern("MMM")).toLowerCase(); // "jun"
                String fechaSlashHoy = hoy.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                java.util.regex.Pattern patternFechaFlexible = java.util.regex.Pattern.compile(diaHoy + ".*?" + mesHoy);
                java.util.regex.Matcher matcherFechaFlexible = patternFechaFlexible.matcher(textoExtraido);

                boolean contieneFechaHoy = textoExtraido.contains(fechaSlashHoy) ||
                        matcherFechaFlexible.find() ||
                        textoExtraido.contains("hoy") ||
                        "NO DETECTADO".equals(datoFecha);

                // 🚨 CANDADO 1: Si detecta una fecha antigua (como el 11 de mayo), se tumba el pedido inmediatamente
                if (!"NO DETECTADO".equals(datoFecha) && !contieneFechaHoy) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "🚨 Voucher Caducado: La fecha identificada en la captura (" + datoFecha + ") no corresponde al día de hoy. Por favor, use un voucher actual."));
                }

                // ── 🛡️ ADUANA 2: VALIDACIÓN INTELIGENTE DE PRECIO (LA JAMA) ──
                boolean requiereVerificacionManual = false;

                if (!"NO DETECTADO".equals(datoPrecio)) {
                    try {
                        double precioLeido = Double.parseDouble(datoPrecio);
                        if (Math.abs(precioLeido - montoRealPedido) > 0.05) {
                            // 🌟 En lugar de rebotar por las alucinaciones del OCR (como el 723.50),
                            // activamos la bandera de verificación para que el cajero lo revise manualmente en su panel.
                            requiereVerificacionManual = true;
                        }
                    } catch (Exception e) {
                        requiereVerificacionManual = true;
                    }
                } else {
                    requiereVerificacionManual = true;
                }

                // ── 🛡️ ADUANA 4: NÚMERO DE OPERACIÓN Y REUTILIZACIÓN ──
                if (!"NO DETECTADO".equals(datoOperacion)) {
                    boolean yaSeUsoHoy = pedidoService.existeNumeroOperationHoy("V-" + datoOperacion);
                    if (yaSeUsoHoy) {
                        // 🚨 CANDADO 2: Intentan reutilizar el mismo voucher dos veces (Bloqueo absoluto)
                        return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                                "🚨 Fraude Detectado: Este número de operación (" + datoOperacion + ") ya fue registrado hoy. No se permiten duplicados."));
                    }

                    // Si el OCR falló o alucinó con el precio, le metemos el sufijo de control visual para la caja
                    String sufijoControl = requiereVerificacionManual ? "-CHECK-MANUAL" : "";
                    pedido.setCodigoPagoOperacion("V-" + datoOperacion + sufijoControl);
                } else {
                    String hashFailsafe = String.valueOf(Math.abs(file.getOriginalFilename().hashCode() + file.getSize()));
                    pedido.setCodigoPagoOperacion("V-HASH-" + hashFailsafe);
                }
            }

            // 🧾 CONTROL DE NOTA DE VENTA
            pedido.setEstado(com.web.restaurante.model.enums.EstadoPedido.PENDIENTE);

            Long id = pedidoService.guardarPedidoCarta(pedido);
            return ResponseEntity.ok(Map.of("success", true, "id", id));

        } catch (Exception e) {
            System.err.println("💥 Error general en pasarela: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Error al procesar el pedido de la carta: " + e.getMessage()));
        }
    }
}