package com.web.restaurante.service;

import com.web.restaurante.model.Pedido;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.imageio.ImageIO;

@Service
@RequiredArgsConstructor
public class OCRService {

    private final PedidoService pedidoService;

    public void procesarYValidarVoucher(Pedido pedido, MultipartFile file) throws Exception {
        String metodo = pedido.getMetodoPago() != null ? pedido.getMetodoPago().name() : "EFECTIVO";

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("🚨 Error: Falta adjuntar el voucher de pago.");
        }

        BufferedImage img = ImageIO.read(file.getInputStream());
        if (img == null) {
            throw new IllegalArgumentException("🚨 Archivo corrupto o formato de imagen inválido.");
        }

        // 1. ADUANA CROMÁTICA
        if (!validarPatronCromatico(img, metodo)) {
            throw new IllegalArgumentException("🚨 Fraude Detectado: La paleta cromática no corresponde a un voucher original de " + metodo + ".");
        }

        String textoExtraido = pedido.getTextoVoucherCrudo() != null ? pedido.getTextoVoucherCrudo().toLowerCase() : "";

        // 2. EXTRACCIÓN Y VALIDACIÓN DE FECHA
        String datoFecha = extraerFecha(textoExtraido);
        if (!validarFechaActual(textoExtraido, datoFecha)) {
            throw new IllegalArgumentException("🚨 Voucher Caducado: La fecha de la captura no corresponde al día de hoy.");
        }

        // 3. EXTRACCIÓN DEL PRECIO (S/.3 o S/.10.20)
        String datoPrecio = extraerPrecio(textoExtraido);
        boolean requiereVerificacionManual = verificarMonto(datoPrecio, pedido.getMontoTotal());

        // 4. EXTRACCIÓN DEL NÚMERO DE OPERACIÓN
        String datoOperacion = extraerNumeroOperacion(textoExtraido);
        if (!"NO DETECTADO".equals(datoOperacion)) {
            if (pedidoService.existeNumeroOperationHoy("V-" + datoOperacion)) {
                throw new IllegalArgumentException("🚨 Fraude Detectado: Este número de operación (" + datoOperacion + ") ya fue registrado hoy.");
            }
            String sufijoControl = requiereVerificacionManual ? "-CHECK-MANUAL" : "";
            pedido.setCodigoPagoOperacion("V-" + datoOperacion + sufijoControl);
        } else {
            String hashFailsafe = String.valueOf(Math.abs(file.getOriginalFilename().hashCode() + file.getOriginalFilename().length()));
            pedido.setCodigoPagoOperacion("V-HASH-" + hashFailsafe);
        }
    }

    private boolean validarPatronCromatico(BufferedImage img, String metodo) {
        int coincidencia = 0; int total = 0;
        for (int x = 0; x < img.getWidth(); x += 5) {
            for (int y = 0; y < img.getHeight(); y += 5) {
                int rgb = img.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF; int g = (rgb >> 8) & 0xFF; int b = rgb & 0xFF;
                total++;
                if ("YAPE".equalsIgnoreCase(metodo) && (r > 95 && b > 125 && g < (r * 0.72))) coincidencia++;
                else if ("PLIN".equalsIgnoreCase(metodo) && (g > 135 && b > 165 && r < (g * 0.82))) coincidencia++;
            }
        }
        return ((double) coincidencia / total) * 100 >= 7.0;
    }

    private String extraerFecha(String texto) {
        Pattern pFecha = Pattern.compile("(\\d{1,2}\\s(jun|ene|feb|mar|abr|may|jul|ago|set|oct|nov|dic))|(\\d{2}/\\d{2}/\\d{4})");
        Matcher mFecha = pFecha.matcher(texto);
        return mFecha.find() ? mFecha.group(0) : (texto.contains("hoy") ? "hoy" : "NO DETECTADO");
    }

    private boolean validarFechaActual(String texto, String datoFecha) {
        if ("NO DETECTADO".equals(datoFecha) || "hoy".equals(datoFecha)) return true;
        LocalDate hoy = LocalDate.now();
        String diaHoy = hoy.format(DateTimeFormatter.ofPattern("d"));
        String mesHoy = hoy.format(DateTimeFormatter.ofPattern("MMM")).toLowerCase();
        String slashHoy = hoy.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        return texto.contains(slashHoy) || Pattern.compile(diaHoy + ".*?" + mesHoy).matcher(texto).find();
    }

    private String extraerPrecio(String texto) {
        // Expresión regular mejorada para capturar enteros como 's/.3' o 's/. 3' y decimales
        Pattern pSoles = Pattern.compile("(s/\\.?\\s*)(\\d+(?:\\.\\d{1,2})?)");
        Matcher mSoles = pSoles.matcher(texto);
        return mSoles.find() ? mSoles.group(2) : "NO DETECTADO";
    }

    private boolean verificarMonto(String datoPrecio, Double montoTotal) {
        if ("NO DETECTADO".equals(datoPrecio)) return true;
        try {
            double precioLeido = Double.parseDouble(datoPrecio);
            return Math.abs(precioLeido - (montoTotal != null ? montoTotal : 0.0)) > 0.05;
        } catch (Exception e) {
            return true;
        }
    }

    private String extraerNumeroOperacion(String texto) {
        Pattern pOp = Pattern.compile("(operación|nro|n°|ref|constancia|transacción)\\s?:?\\s?(\\d{6,12})");
        Matcher mOp = pOp.matcher(texto);
        if (mOp.find()) return mOp.group(2);
        Matcher mOpSuelto = Pattern.compile("\\b\\d{8}\\b").matcher(texto);
        return mOpSuelto.find() ? mOpSuelto.group(0) : "NO DETECTADO";
    }
}