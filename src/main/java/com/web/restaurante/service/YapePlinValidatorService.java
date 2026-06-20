/*package com.web.restaurante.service;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class YapePlinValidatorService {

    // 🔬 MOTOR CROMÁTICO
    private boolean verificarColorPredominante(BufferedImage img, String metodoPago) {
        int ancho = img.getWidth();
        int alto = img.getHeight();
        int pixelesCoincidentes = 0; int muestraTotal = 0;

        for (int x = 0; x < ancho; x += 4) {
            for (int y = 0; y < alto; y += 4) {
                int rgb = img.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                muestraTotal++;

                if ("YAPE".equalsIgnoreCase(metodoPago)) {
                    if (r > 95 && b > 125 && g < (r * 0.72) && g < (b * 0.72)) pixelesCoincidentes++;
                } else if ("PLIN".equalsIgnoreCase(metodoPago)) {
                    if (g > 135 && b > 165 && r < (g * 0.82)) pixelesCoincidentes++;
                }
            }
        }
        double porcentaje = ((double) pixelesCoincidentes / muestraTotal) * 100;
        return porcentaje >= 7.0;
    }

    public Map<String, Object> validarVoucher(MultipartFile file, Double montoEsperado, String metodoPago, PedidoService pedidoService) {
        Map<String, Object> resultado = new HashMap<>();
        resultado.put("valido", false);

        try {
            // ── CANAL 1: FILTRO CROMÁTICO ──
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) {
                resultado.put("message", "🚨 Archivo corrupto o formato de imagen inválido.");
                return resultado;
            }

            if (!verificarColorPredominante(image, metodoPago)) {
                resultado.put("message", "🚨 Fraude Detectado: La paleta cromática no corresponde a un voucher original de " + metodoPago + ".");
                return resultado;
            }

            // ── 🔥 ENHANCER ÓPTICO ──
            BufferedImage grayImage = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
            Graphics2D g2d = grayImage.createGraphics();
            g2d.drawImage(image, 0, 0, null);
            g2d.dispose();

            // ── PREPARACIÓN OCR TESSERACT PORTABLE ──
            Tesseract tesseract = new Tesseract();
            try {
                org.springframework.core.io.Resource resource = new org.springframework.core.io.ClassPathResource("tessdata");
                tesseract.setDatapath(resource.getFile().getAbsolutePath());
            } catch (Exception ex) {
                tesseract.setDatapath("src/main/resources/tessdata");
            }
            tesseract.setLanguage("spa");

            String textoExtraido = tesseract.doOCR(grayImage).toLowerCase();
            System.out.println("🛰️ [OCR LA JAMA] Texto Detectado:\n" + textoExtraido);

            // ── 💰 CANAL 2: RECONOCIMIENTO DE PRECIO CON CANDADO ESTRICTO ──
            Double montoDetectado = -1.0;

            // 🎯 REGEX INVIOLABLE: Solo atrapa números que tengan OBLIGATORIAMENTE un punto y dos decimales (ej: 0.10, 3.00)
            // Esto aniquila el error del "7" fantasma del código de seguridad.
            Pattern patternMontoStrict = Pattern.compile("\\b([0-9]{1,4}\\.[0-9]{2})\\b");
            Matcher matcherMontoStrict = patternMontoStrict.matcher(textoExtraido);

            boolean matchPerfecto = false;
            while (matcherMontoStrict.find()) {
                try {
                    double valorConstatado = Double.parseDouble(matcherMontoStrict.group(1));
                    if (valorConstatado > 0.0 && valorConstatado != 2026.0) {
                        montoDetectado = valorConstatado;
                        if (Math.abs(montoDetectado - montoEsperado) <= 0.05) {
                            matchPerfecto = true;
                            break;
                        }
                    }
                } catch (Exception e) {}
            }

            // 🚨 ESCUDO ANTI-FRAUDE: Si leyó un monto real de dinero (0.10) y no cuadra, BLOQUEO FULMINANTE.
            if (montoDetectado > 0.0 && !matchPerfecto) {
                resultado.put("message", "⚠️ Alerta de Fraude: El monto leído ópticamente (S/. " + montoDetectado + ") no coincide con tu pedido (S/. " + montoEsperado + ").");
                return resultado;
            }

            // ── 📅 CANAL 3: VALIDACIÓN DE FECHA HOY ──
            LocalDate hoy = LocalDate.now();
            String diaHoy = hoy.format(DateTimeFormatter.ofPattern("d"));
            String mesHoy = hoy.format(DateTimeFormatter.ofPattern("MMM")).toLowerCase();
            String fechaSlashHoy = hoy.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

            Pattern patternFechaFlexible = Pattern.compile(diaHoy + ".*?" + mesHoy);
            Matcher matcherFechaFlexible = patternFechaFlexible.matcher(textoExtraido);

            boolean contieneFechaHoy = textoExtraido.contains(fechaSlashHoy) ||
                    matcherFechaFlexible.find() ||
                    textoExtraido.contains("hoy");

            if (!contieneFechaHoy) {
                resultado.put("message", "🚨 Voucher Caducado: La fecha identificada en la imagen no corresponde al día de hoy.");
                return resultado;
            }

            // ── 🔢 CANAL 4: NÚMERO DE OPERACIÓN Y AUDITORÍA ──
            // ── CANAL 4: NÚMERO DE OPERACIÓN Y AUDITORÍA ──
            Pattern patternOp = Pattern.compile("(operación|nro|n°|ref\\.?|constancia)\\s?:?\\s?(\\d{6,12})");
            Matcher matcherOp = patternOp.matcher(textoExtraido);
            String idTransaccionReal = null;

            if (matcherOp.find()) {
                idTransaccionReal = matcherOp.group(2);
            } else {
                Pattern patternSuelto = Pattern.compile("\\b\\d{7,11}\\b");
                Matcher matcherSuelto = patternSuelto.matcher(textoExtraido);
                if (matcherSuelto.find()) idTransaccionReal = matcherSuelto.group();
            }

            if (idTransaccionReal != null) {
                boolean yaSeUsoHoy = pedidoService.existeNumeroOperationHoy("V-" + idTransaccionReal);
                if (yaSeUsoHoy) {
                    resultado.put("message", "🚨 Fraude Detectado: Este número de operación (" + idTransaccionReal + ") ya fue registrado hoy.");
                    return resultado;
                }

                // Guardamos en el mapa con la clave asociada al nuevo destino financiero
                resultado.put("codigoPagoOperacion", "V-" + idTransaccionReal + (matchPerfecto ? "" : "-CHECK-MANUAL"));
            } else {
                String hashFailsafe = String.valueOf(Math.abs(file.getOriginalFilename().hashCode() + file.getSize()));
                resultado.put("codigoPagoOperacion", "V-HASH-" + hashFailsafe);
            }

            resultado.put("valido", true);

        } catch (IOException | TesseractException e) {
            resultado.put("message", "Error mecánico en la lectura del archivo digital: " + e.getMessage());
        }

        return resultado;
    }
}*/