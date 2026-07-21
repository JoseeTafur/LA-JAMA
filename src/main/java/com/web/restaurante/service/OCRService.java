package com.web.restaurante.service;

import com.web.restaurante.model.Pedido;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OCRService {

    private final PedidoService pedidoService;
    private final GroqService groqService;

    public void procesarYValidarVoucherIA(Pedido pedido, String urlImagenVoucher) throws Exception {
        String metodoEsperado = pedido.getMetodoPago() != null ? pedido.getMetodoPago().name() : "EFECTIVO";

        Map<String, Object> datosIA = groqService.analizarImagenVoucher(urlImagenVoucher);
        System.out.println("🎯 [OCR SERVICE - IA DATA] === " + datosIA);

        String destinoIA = (String) datosIA.get("destino");
        String nroOperacion = (String) datosIA.get("numero_operacion");

        Number montoNum = (Number) datosIA.get("monto");
        double montoIA = montoNum != null ? montoNum.doubleValue() : 0.0;

        Number diaNum = (Number) datosIA.get("dia");
        Number anioNum = (Number) datosIA.get("anio");
        String mesIA = (String) datosIA.get("mes");

        double totalEsperado = pedido.getMontoTotal();
        if (Math.abs(montoIA - totalEsperado) > 0.20) {
            throw new IllegalArgumentException("🚨 Fraude/Error: El monto del voucher (S/ " + montoIA + ") no coincide con el total del pedido (S/ " + totalEsperado + ").");
        }

        if ("YAPE".equalsIgnoreCase(metodoEsperado) && !"YAPE".equalsIgnoreCase(destinoIA)) {
            throw new IllegalArgumentException("🚨 Validación fallida: Seleccionaste YAPE pero el voucher analizado no corresponde a Yape.");
        }
        if ("PLIN".equalsIgnoreCase(metodoEsperado) && !"PLIN".equalsIgnoreCase(destinoIA)) {
            throw new IllegalArgumentException("🚨 Validación fallida: Seleccionaste PLIN pero el voucher analizado no corresponde a Plin.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        int diaHoy = ahora.getDayOfMonth();
        int anioHoyShort = ahora.getYear() % 100;
        String[] mesesMap = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
        String mesHoy = mesesMap[ahora.getMonthValue() - 1];

        int diaIA = diaNum != null ? diaNum.intValue() : 0;
        int anioIA = anioNum != null ? anioNum.intValue() : 0;

        if (diaHoy != diaIA || !mesHoy.equalsIgnoreCase(mesIA) || anioHoyShort != anioIA) {
            throw new IllegalArgumentException("🚨 Fraude Detectado: El voucher no pertenece a la fecha de hoy (" + diaHoy + "-" + mesHoy + "-" + anioHoyShort + ").");
        }

        if (nroOperacion == null || nroOperacion.trim().isEmpty()) {
            throw new IllegalArgumentException("🚨 Error de Lectura: La IA no pudo detectar de forma nítida el número de operación.");
        }

        if (pedidoService.existeNumeroOperationHoy(nroOperacion.trim())) {
            throw new IllegalArgumentException("🚨 Fraude Mapeado: Este número de operación (" + nroOperacion + ") ya fue registrado y aprobado el día de hoy.");
        }

        pedido.setCodigoPagoOperacion(nroOperacion.trim());
        System.out.println("🛡️ [ADUANA BACKEND PASADA]: Voucher aprobado de forma legítima.");
    }
}