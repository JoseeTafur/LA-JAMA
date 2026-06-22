package com.web.restaurante.service;

import com.web.restaurante.model.Pedido;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value; // 🚀 IMPORTANTE
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // 🌟 INYECCIÓN DINÁMICA DEL DOMINIO ACTIVO (Localhost o Railway)
    @Value("${app.base-url}")
    private String appBaseUrl;

    @Async // 🚀 Ejecución en hilo paralelo (No bloquea la caja)
    public void enviarComprobante(String destinatario, Pedido pedido) {
        if (destinatario == null || destinatario.trim().isEmpty()) {
            System.out.println("⚠️ [EMAIL OMITIDO] El pedido #" + pedido.getId() + " no cuenta con una dirección de correo válida.");
            return;
        }

        boolean esAnulacion = com.web.restaurante.model.enums.EstadoPedido.ANULADO.equals(pedido.getEstado());

        if (!esAnulacion && (pedido.getComprobantePdfUrl() == null || pedido.getComprobantePdfUrl().trim().isEmpty())) {
            System.out.println("⚠️ [EMAIL OMITIDO] El pedido VIVO #" + pedido.getId() + " no tiene URLs de CPE generadas.");
            return;
        }

        if (esAnulacion && (pedido.getComprobanteNotaNumero() == null || pedido.getComprobanteNotaNumero().trim().isEmpty())) {
            System.out.println("⚠️ [EMAIL OMITIDO] El pedido ANULADO #" + pedido.getId() + " no registra número de Nota de Crédito.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(destinatario);

            String asunto;
            String htmlContent;

            if (esAnulacion) {
                // 🔴 FLUJO LOCAL MAPPED: USANDO TUS VISTAS NATIVAS DE LA JAMA DE THYMELEAF
                String numeroNota = pedido.getComprobanteNotaNumero();
                asunto = "🧾 Nota de Crédito Electrónica - " + numeroNota + " | La Jama";

                // 🚀 SOLUCIÓN: Concatenamos el dominio base absoluto de forma limpia
                String urlTicketAbsoluta = appBaseUrl + "/admin/comprobantes/imprimir-nota/" + pedido.getId();
                String urlA4Absoluta = appBaseUrl + "/admin/comprobantes/imprimir-nota-a4/" + pedido.getId();

                htmlContent = "<div style='font-family: Arial, sans-serif; color: #333; max-width: 600px;'>"
                        + "<h2 style='color: #dc2626;'>¡Hola, " + pedido.getCliente() + "!</h2>"
                        + "<p>Te informamos que se ha emitido una <b>Nota de Crédito Electrónica</b> para revocar la transacción contable relacionada al pedido <b>#" + pedido.getId() + "</b>.</p>"
                        + "<p>Detalles del documento de anulación interna:</p>"
                        + "<ul style='background-color: #fff5f5; padding: 15px; list-style: none; border-left: 4px solid #dc2626; border-radius: 4px; font-size: 0.9rem;'>"
                        + "  <li><b>Número de Nota de Crédito:</b> " + numeroNota + "</li>"
                        + "  <li><b>Comprobante Afectado:</b> " + pedido.getComprobanteNumero() + "</li>"
                        + "  <li><b>Monto Total Revertido:</b> S/. " + String.format("%.2f", pedido.getMontoTotal()) + "</li>"
                        + "</ul>"
                        + "<p>Puedes visualizar e imprimir tus plantillas oficiales de anulación directamente desde los servidores de La Jama:</p>"
                        + "<ul style='list-style: none; padding: 0;'>"
                        + "  <li style='margin-bottom: 12px;'><a href='" + urlTicketAbsoluta + "' style='background: #dc2626; color: #fff; padding: 8px 15px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;'>📄 Imprimir Ticket Nota (80mm)</a></li>"
                        + "  <li><a href='" + urlA4Absoluta + "' style='background: #333333; color: #fff; padding: 8px 15px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;'>🖨️ Ver Nota de Crédito Oficial (A4)</a></li>"
                        + "</ul>"
                        + "<p style='margin-top: 25px; font-size: 0.85rem; color: #666;'>Atentamente,<br><b>Área de Auditoría Contable - La Jama</b></p>"
                        + "</div>";
            } else {
                // 🟢 FLUJO EXTERNAL MAPPED: COMPROBANTES VIVOS (API SUNAT)
                String numeroDocumento = pedido.getComprobanteNumero();
                asunto = "🧾 Comprobante de Pago - Pedido #" + pedido.getId() + " | La Jama";

                htmlContent = "<div style='font-family: Arial, sans-serif; color: #333; max-width: 600px;'>"
                        + "<h2 style='color: #1B3A2C;'>¡Hola, " + pedido.getCliente() + "!</h2>"
                        + "<p>Gracias por tu compra en <b>La Jama</b>.</p>"
                        + "<p>Tu comprobante electrónico <b>" + numeroDocumento + "</b> ha sido emitido con éxito y ya está disponible para su descarga:</p>"
                        + "<ul style='list-style: none; padding: 0;'>"
                        + "  <li style='margin-bottom: 10px;'><a href='" + pedido.getComprobantePdfUrl() + "' style='background: #1B3A2C; color: #fff; padding: 8px 15px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;'>📄 Descargar Ticket Térmico</a></li>"
                        + "  <li><a href='" + pedido.getComprobanteA4Url() + "' style='background: #f3f4f6; color: #333; padding: 8px 15px; text-decoration: none; border-radius: 5px; display: inline-block; border: 1px solid #ccc;'>🖨️ Descargar PDF (A4)</a></li>"
                        + "</ul>"
                        + "<p style='margin-top: 20px; font-size: 0.9rem; color: #666;'>¡Esperamos verte pronto!</p>"
                        + "</div>";
            }

            helper.setSubject(asunto);
            helper.setText(htmlContent, true);

            mailSender.send(message);

            System.out.println("=========================================================");
            System.out.println("✅ [EMAIL ENVIADO] Despachado correctamente a: " + destinatario);
            System.out.println("🔗 URL Base acoplada con éxito: " + appBaseUrl);
            System.out.println("=========================================================");

        } catch (Exception e) {
            System.out.println("=========================================================");
            System.out.println("💥 [EMAIL ERROR] Error en la entrega hacia: " + destinatario);
            System.out.println("📝 Detalle Técnico: " + e.getMessage());
            System.out.println("=========================================================");
        }
    }
}