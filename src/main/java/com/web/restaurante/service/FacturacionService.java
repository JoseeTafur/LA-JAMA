package com.web.restaurante.service;

import com.web.restaurante.dto.facturacion.*;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.DetallePedido;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class FacturacionService {

    @Value("${miapi.facturacion.url}")
    private String apiUrl;

    @Value("${miapi.facturacion.token}")
    private String apiToken;

    public FacturaResponse.RespuestaData emitirComprobanteSunat(Pedido pedido) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            FacturaRequest request = new FacturaRequest();

            // 1. Clave en el JSON (Validación interna del emisor)
            request.setClaveSecreta(apiToken);

            // 2. Cabecera del Comprobante (Mantiene tu lógica de negocio)
            ComprobanteDTO comp = new ComprobanteDTO();
            boolean esFactura = "FACTURA".equals(pedido.getPreferenciaComprobante());

            comp.setTipoDoc(esFactura ? "01" : "03");
            comp.setSerie(esFactura ? "F001" : "B001");
            comp.setCorrelativo(String.valueOf(pedido.getId()));
            comp.setFechaEmision(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
            comp.setHoraEmision(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
            comp.setObservacion("Consumo en Salón - La Jama");
            request.setComprobante(comp);

            // 3. Datos del Cliente
            ClienteDTO cli = new ClienteDTO();
            String doc = pedido.getDocumentoCliente();

            if (esFactura) {
                cli.setTipoDoc("6"); // RUC
                cli.setNumDoc(doc);
                cli.setRznSocial(pedido.getCliente() != null ? pedido.getCliente() : "EMPRESA SOLICITANTE");
            } else {
                cli.setTipoDoc(doc != null && doc.length() == 8 ? "1" : "0");
                cli.setNumDoc(doc != null && !doc.isEmpty() ? doc : "00000000");
                cli.setRznSocial(pedido.getCliente() != null ? pedido.getCliente() : "CLIENTES VARIOS");
            }
            cli.setDireccion("Chiclayo, Lambayeque");
            request.setCliente(cli);

            // 4. Items con desglose para SUNAT
            List<ItemDTO> items = new ArrayList<>();
            BigDecimal divisorIgv = new BigDecimal("1.18");
            BigDecimal porcentajeIgv = new BigDecimal("0.18");

            if (pedido.getListaDetalles() != null && !pedido.getListaDetalles().isEmpty()) {

                double sumaPlatosTicket = pedido.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .mapToDouble(DetallePedido::getSubtotal)
                        .sum();

                double factorProrrateo = 1.0;
                if (pedido.getMontoTotal() != null && sumaPlatosTicket > 0
                        && Math.abs(sumaPlatosTicket - pedido.getMontoTotal()) > 0.1) {
                    factorProrrateo = pedido.getMontoTotal() / sumaPlatosTicket;
                }

                for (DetallePedido detalle : pedido.getListaDetalles()) {
                    if (detalle.isCanceladoPorCliente()) continue;

                    ItemDTO item = new ItemDTO();

                    // 🛡️ ADUANA ANTI-NULL: Extraemos los datos de forma plana si el objeto Producto no se inicializó
                    if (detalle.getProducto() != null) {
                        item.setCodProducto("PROD-" + detalle.getProducto().getId());
                        item.setDescripcion(detalle.getProducto().getNombre());
                    } else {
                        // Respaldo directo desde las propiedades planas mapeadas del JSON
                        item.setCodProducto("PROD-GENERICO");
                        item.setDescripcion(detalle.getNombre() != null ? detalle.getNombre() : "Consumo de Alimentos");
                    }

                    item.setCantidad(detalle.getCantidad());

                    double subtotalFraccionado = detalle.getSubtotal() * factorProrrateo;

                    BigDecimal precioUnitario = BigDecimal.valueOf(subtotalFraccionado / detalle.getCantidad())
                            .setScale(2, RoundingMode.HALF_UP);

                    BigDecimal valorUnitario = precioUnitario.divide(divisorIgv, 4, RoundingMode.HALF_UP);

                    BigDecimal baseIgv = valorUnitario.multiply(BigDecimal.valueOf(detalle.getCantidad()))
                            .setScale(2, RoundingMode.HALF_UP);

                    BigDecimal igvItem = baseIgv.multiply(porcentajeIgv).setScale(2, RoundingMode.HALF_UP);

                    item.setMtoPrecioUnitario(precioUnitario);
                    item.setMtoValorUnitario(valorUnitario.setScale(2, RoundingMode.HALF_UP));
                    item.setMtoBaseIgv(baseIgv);
                    item.setIgv(igvItem);

                    items.add(item);
                }
            }
            request.setItems(items);

            // 🚀 5. EL REMEDIO: CONSTRUIR LAS CABECERAS HTTP FORMALES DE AUTORIZACIÓN
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            // Inyectamos el Bearer Token en el canal de transporte seguro
            headers.set("Authorization", "Bearer " + apiToken);

            // Empaquetamos la payload de La Jama junto con las llaves de acceso
            HttpEntity<FacturaRequest> entity = new HttpEntity<>(request, headers);

            // Realizamos el envío enviando el empaquetado completo (Request + Headers)
            ResponseEntity<FacturaResponse> response = restTemplate.postForEntity(apiUrl, entity, FacturaResponse.class);

            if (response.getBody() != null && response.getBody().getRespuesta() != null) {
                return response.getBody().getRespuesta();
            }

        } catch (Exception e) {
            System.err.println("💥 FAILED TO TIMBRAR COMPROBANTE SUNAT: " + e.getMessage());
        }
        return null;
    }
}