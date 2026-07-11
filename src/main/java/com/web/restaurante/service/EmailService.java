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

    @Async
    public void enviarComprobante(String destinatario, Pedido pedido) {
        if (destinatario == null || destinatario.trim().isEmpty()) {
            System.out.println("⚠️ [EMAIL OMITIDO] El pedido #" + pedido.getId() + " no cuenta con una dirección de correo válida.");
            return;
        }

        boolean esAnulacion = com.web.restaurante.model.enums.EstadoPago.EXTORNADO.equals(pedido.getEstadoPago())
                || com.web.restaurante.model.enums.EstadoPedido.CANCELADO.equals(pedido.getEstado());

        if (!esAnulacion && (pedido.getComprobantePdfUrl() == null || pedido.getComprobantePdfUrl().trim().isEmpty())) {
            System.out.println("⚠️ [EMAIL OMITIDO] El pedido VIVO #" + pedido.getId() + " no tiene URLs de CPE generadas.");
            return;
        }

        if (esAnulacion && (pedido.getComprobanteNotaNumero() == null || pedido.getComprobanteNotaNumero().trim().isEmpty())) {
            System.out.println("⚠️ [EMAIL OMITIDO] El pedido ANULADO #" + pedido.getId() + " no registra número de Nota de Crédito.");
            return;
        }

        // ── 🛡️ INICIO DE MONITOR CRONOMETRADO ASÍNCRONO ──
        System.out.println("=========================================================");
        System.out.println("📧 [La Jama Email] >>> INICIANDO PROCESO DE ENVÍO <<<");
        System.out.println("📬 Destinatario: " + destinatario + " | NV #" + pedido.getId());
        System.out.println("=========================================================");

        // Bandera atómica para detener el contador cuando termine el envío
        java.util.concurrent.atomic.AtomicBoolean envioTerminado = new java.util.concurrent.atomic.AtomicBoolean(false);
        long tiempoInicio = System.currentTimeMillis();

        // Creamos un hilo de asistencia temporal exclusivo para el conteo de segundos
        java.util.concurrent.ScheduledExecutorService cronometro = java.util.concurrent.Executors.newSingleThreadScheduledExecutor();
        cronometro.scheduleAtFixedRate(() -> {
            if (!envioTerminado.get()) {
                long transcurrido = (System.currentTimeMillis() - tiempoInicio) / 1000;
                System.out.println("⏳ [La Jama Crono] El correo de la NV #" + pedido.getId() + " sigue en tránsito... Tiempo transcurrido: " + transcurrido + " segundos.");
            }
        }, 5, 5, java.util.concurrent.TimeUnit.SECONDS); // Ejecuta cada 5 segundos

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(destinatario);

            String asunto;
            String htmlContent;

            if (esAnulacion) {
                String numeroNota = pedido.getComprobanteNotaNumero();
                asunto = "Nota de Crédito Electrónica - " + numeroNota + " | La Jama";

                String urlTicketAbsoluta = appBaseUrl + "/admin/comprobantes/imprimir-nota/" + pedido.getId();
                String urlA4Absoluta = appBaseUrl + "/admin/comprobantes/imprimir-nota-a4/" + pedido.getId();

                htmlContent = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#F4F1EC;padding:32px 0;'>"
                        + "<tr><td align='center'>"
                        + "<table role='presentation' width='600' cellpadding='0' cellspacing='0' style='background-color:#FBF9F4;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(27,58,44,0.08);'>"

                        // HEADER
                        + "<tr><td style='background-color:#1B3A2C;padding:28px 40px;border-bottom:3px solid #8C3B3B;'>"
                        + "<span style='color:#FBF9F4;font-size:22px;font-weight:bold;letter-spacing:1px;'>LA JAMA</span><br>"
                        + "<span style='color:#EAD9C9;font-size:12px;letter-spacing:2px;text-transform:uppercase;'>Nota de Crédito Electrónica</span>"
                        + "</td></tr>"

                        // BODY
                        + "<tr><td style='padding:36px 40px 24px 40px;'>"
                        + "<p style='margin:0 0 4px 0;color:#1B3A2C;font-size:18px;font-weight:bold;'>Hola, " + pedido.getCliente() + "</p>"
                        + "<p style='margin:0 0 24px 0;color:#4a4a4a;font-size:14px;line-height:1.6;'>"
                        + "Te informamos que se ha emitido una <b>Nota de Crédito Electrónica</b> para revocar la transacción contable relacionada al pedido <b>#" + pedido.getId() + "</b>."
                        + "</p>"

                        // DETAILS BOX
                        + "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#F3E4E4;border-radius:8px;margin-bottom:28px;border-left:4px solid #8C3B3B;'>"
                        + "<tr><td style='padding:18px 22px;'>"
                        + "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>"
                        + "<tr><td style='color:#8a6b6b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;'>Número de nota de crédito</td></tr>"
                        + "<tr><td style='color:#6b2222;font-size:16px;font-weight:bold;padding-bottom:12px;'>" + numeroNota + "</td></tr>"
                        + "<tr><td style='color:#8a6b6b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;'>Comprobante afectado</td></tr>"
                        + "<tr><td style='color:#6b2222;font-size:16px;font-weight:bold;padding-bottom:12px;'>" + pedido.getComprobanteNumero() + "</td></tr>"
                        + "<tr><td style='color:#8a6b6b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;'>Monto total revertido</td></tr>"
                        + "<tr><td style='color:#6b2222;font-size:16px;font-weight:bold;'>S/. " + String.format("%.2f", pedido.getMontoTotal()) + "</td></tr>"
                        + "</table>"
                        + "</td></tr>"
                        + "</table>"

                        // BUTTONS
                        + "<table role='presentation' cellpadding='0' cellspacing='0'>"
                        + "<tr>"
                        + "<td style='padding-right:10px;'><a href='" + urlTicketAbsoluta + "' style='background-color:#8C3B3B;color:#FBF9F4;font-size:13px;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;'>Imprimir Ticket Nota (80mm)</a></td>"
                        + "<td><a href='" + urlA4Absoluta + "' style='background-color:transparent;color:#1B3A2C;font-size:13px;font-weight:bold;text-decoration:none;padding:11px 22px;border-radius:6px;display:inline-block;border:1.5px solid #1B3A2C;'>Ver Nota Oficial (A4)</a></td>"
                        + "</tr>"
                        + "</table>"

                        + "</td></tr>"

                        // FOOTER
                        + "<tr><td style='background-color:#F4F1EC;padding:22px 40px;border-top:1px solid #EAD9C9;'>"
                        + "<p style='margin:0;color:#8a8a8a;font-size:11.5px;line-height:1.6;'>"
                        + "Área de Auditoría Contable · La Jama<br>"
                        + "Este es un correo automático, por favor no respondas a esta dirección."
                        + "</p>"
                        + "</td></tr>"

                        + "</table>"
                        + "</td></tr>"
                        + "</table>";
            } else {
                String numeroDocumento = pedido.getComprobanteNumero();
                asunto = "Comprobante de Pago - Pedido #" + pedido.getId() + " | La Jama";

                htmlContent = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#F4F1EC;padding:32px 0;'>"
                        + "<tr><td align='center'>"
                        + "<table role='presentation' width='600' cellpadding='0' cellspacing='0' style='background-color:#FBF9F4;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(27,58,44,0.08);'>"

                        // HEADER
                        + "<tr><td style='background-color:#1B3A2C;padding:28px 40px;border-bottom:3px solid #D4A373;'>"
                        + "<span style='color:#FBF9F4;font-size:22px;font-weight:bold;letter-spacing:1px;'>LA JAMA</span><br>"
                        + "<span style='color:#EAD9C9;font-size:12px;letter-spacing:2px;text-transform:uppercase;'>Comprobante Electrónico</span>"
                        + "</td></tr>"

                        // BODY
                        + "<tr><td style='padding:36px 40px 24px 40px;'>"
                        + "<p style='margin:0 0 4px 0;color:#1B3A2C;font-size:18px;font-weight:bold;'>Hola, " + pedido.getCliente() + "</p>"
                        + "<p style='margin:0 0 24px 0;color:#4a4a4a;font-size:14px;line-height:1.6;'>"
                        + "Gracias por tu compra en <b>La Jama</b>. Tu comprobante electrónico ha sido emitido con éxito y ya está disponible para su descarga."
                        + "</p>"

                        // DETAILS BOX
                        + "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#EAD9C9;border-radius:8px;margin-bottom:28px;'>"
                        + "<tr><td style='padding:18px 22px;'>"
                        + "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>"
                        + "<tr><td style='color:#6b5b4d;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;'>Número de comprobante</td></tr>"
                        + "<tr><td style='color:#1B3A2C;font-size:16px;font-weight:bold;padding-bottom:12px;'>" + numeroDocumento + "</td></tr>"
                        + "<tr><td style='color:#6b5b4d;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;'>Pedido</td></tr>"
                        + "<tr><td style='color:#1B3A2C;font-size:16px;font-weight:bold;'>#" + pedido.getId() + "</td></tr>"
                        + "</table>"
                        + "</td></tr>"
                        + "</table>"

                        // BUTTONS
                        + "<table role='presentation' cellpadding='0' cellspacing='0'>"
                        + "<tr>"
                        + "<td style='padding-right:10px;'><a href='" + pedido.getComprobantePdfUrl() + "' style='background-color:#1B3A2C;color:#FBF9F4;font-size:13px;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;'>Descargar Ticket Térmico</a></td>"
                        + "<td><a href='" + pedido.getComprobanteA4Url() + "' style='background-color:transparent;color:#1B3A2C;font-size:13px;font-weight:bold;text-decoration:none;padding:11px 22px;border-radius:6px;display:inline-block;border:1.5px solid #1B3A2C;'>Descargar PDF (A4)</a></td>"
                        + "</tr>"
                        + "</table>"

                        + "</td></tr>"

                        // FOOTER
                        + "<tr><td style='background-color:#F4F1EC;padding:22px 40px;border-top:1px solid #EAD9C9;'>"
                        + "<p style='margin:0;color:#8a8a8a;font-size:11.5px;line-height:1.6;'>"
                        + "Este es un correo automático, por favor no respondas a esta dirección.<br>"
                        + "La Jama · Chiclayo, Perú"
                        + "</p>"
                        + "</td></tr>"

                        + "</table>"
                        + "</td></tr>"
                        + "</table>";
            }

            helper.setSubject(asunto);
            helper.setText(htmlContent, true);

            // 📦 GATILLO SMTP DE GMAIL (Bloquea el hilo secundario asíncrono hasta completar la subida)
            mailSender.send(message);

            // 🏁 FINALIZACIÓN EXITOSA: Detenemos el cronómetro de inmediato
            envioTerminado.set(true);
            cronometro.shutdown();
            long tiempoTotal = (System.currentTimeMillis() - tiempoInicio) / 1000;

            System.out.println("=========================================================");
            System.out.println("✅ [EMAIL ENTREGADO] Correo entregado correctamente a: " + destinatario);
            System.out.println("⏱️ Tiempo Total de Respuesta SMTP: " + tiempoTotal + " segundos.");
            System.out.println("=========================================================");

        } catch (Exception e) {
            envioTerminado.set(true);
            cronometro.shutdown();
            System.out.println("=========================================================");
            System.out.println("💥 [EMAIL ERROR] Error en la entrega hacia: " + destinatario);
            System.out.println("📝 Detalle Técnico: " + e.getMessage());
            System.out.println("=========================================================");
        }
    }
}