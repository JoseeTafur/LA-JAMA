package com.web.restaurante.service;

import com.web.restaurante.model.Pedido;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

//@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Async // 🚀 Esto hace que el correo no bloquee la pantalla del cajero
    public void enviarComprobante(String destinatario, Pedido pedido) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setSubject("🧾 Comprobante Fiscal - Pedido #" + pedido.getId());

            String htmlContent = "<h2>¡Hola, " + pedido.getCliente() + "!</h2>"
                    + "<p>Gracias por tu compra en <b>La Jama</b>.</p>"
                    + "<p>Tu comprobante ha sido emitido con éxito:</p>"
                    + "<ul>"
                    + "<li><a href='" + pedido.getComprobantePdfUrl() + "'>Descargar Ticket Térmico</a></li>"
                    + "<li><a href='" + pedido.getComprobanteA4Url() + "'>Descargar PDF A4</a></li>"
                    + "</ul>"
                    + "<p>¡Esperamos verte pronto!</p>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("❌ Error enviando email: " + e.getMessage());
        }
    }
}