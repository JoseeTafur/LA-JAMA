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

            // 2. Cabecera del Comprobante
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

            // 4. Items con desglose estricto y control de céntimos para SUNAT
            List<ItemDTO> items = new ArrayList<>();
            BigDecimal divisorIgv = new BigDecimal("1.18");
            BigDecimal porcentajeIgv = new BigDecimal("0.18");

            if (pedido.getListaDetalles() != null && !pedido.getListaDetalles().isEmpty()) {

                // Filtramos y calculamos los ítems activos
                List<DetallePedido> detallesActivos = pedido.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .toList();

                int totalItems = detallesActivos.size();

                // 🎯 PASO METÓDICO: Definimos los totales globales inquebrantables del ticket (Vienen de la caja móvil)
                BigDecimal totalComprobanteReal = BigDecimal.valueOf(pedido.getMontoTotal()).setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalBaseTeorico = totalComprobanteReal.divide(divisorIgv, 2, RoundingMode.HALF_UP);
                BigDecimal totalIgvTeorico = totalComprobanteReal.subtract(totalBaseTeorico).setScale(2, RoundingMode.HALF_UP);

                // Variables de control de asignación acumulada
                BigDecimal acumuladoBaseIgv = BigDecimal.ZERO;
                BigDecimal acumuladoIgv = BigDecimal.ZERO;
                BigDecimal acumuladoPrecioVenta = BigDecimal.ZERO;

                // Calculamos la suma bruta para el factor de prorrateo si fuera necesario
                double sumaPlatosTicket = detallesActivos.stream().mapToDouble(DetallePedido::getSubtotal).sum();
                BigDecimal totalBrutoPlatos = BigDecimal.valueOf(sumaPlatosTicket).setScale(2, RoundingMode.HALF_UP);

                for (int i = 0; i < totalItems; i++) {
                    DetallePedido detalle = detallesActivos.get(i);
                    boolean esElUltimoItem = (i == totalItems - 1);

                    ItemDTO item = new ItemDTO();

                    // Identificación de producto
                    if (detalle.getProducto() != null) {
                        item.setCodProducto("PROD-" + detalle.getProducto().getId());
                        item.setDescripcion(detalle.getProducto().getNombre());
                    } else {
                        item.setCodProducto("PROD-GENERICO");
                        item.setDescripcion(detalle.getNombre() != null ? detalle.getNombre() : "Consumo de Alimentos");
                    }

                    BigDecimal cantidad = BigDecimal.valueOf(detalle.getCantidad());
                    item.setCantidad(detalle.getCantidad());

                    // Calcular subtotal de este plato considerando prorrateo
                    BigDecimal subtotalPlato = BigDecimal.valueOf(detalle.getSubtotal()).setScale(4, RoundingMode.HALF_UP);
                    if (totalBrutoPlatos.compareTo(BigDecimal.ZERO) > 0 && totalBrutoPlatos.subtract(totalComprobanteReal).abs().doubleValue() > 0.1) {
                        subtotalPlato = subtotalPlato.multiply(totalComprobanteReal).divide(totalBrutoPlatos, 4, RoundingMode.HALF_UP);
                    }

                    // Declaramos las variables financieras por ítem
                    BigDecimal precioVentaItem;
                    BigDecimal baseIgvItem;
                    BigDecimal igvItem;
                    BigDecimal precioUnitario;
                    BigDecimal valorUnitario;

                    if (esElUltimoItem) {
                        // 🛡️ ADUANA FISCAL: El último plato absorbe la diferencia exacta de los céntimos huérfanos
                        precioVentaItem = totalComprobanteReal.subtract(acumuladoPrecioVenta).setScale(2, RoundingMode.HALF_UP);
                        baseIgvItem = totalBaseTeorico.subtract(acumuladoBaseIgv).setScale(2, RoundingMode.HALF_UP);
                        igvItem = totalIgvTeorico.subtract(acumuladoIgv).setScale(2, RoundingMode.HALF_UP);
                    } else {
                        // Cálculos normales para los platos iniciales
                        precioVentaItem = subtotalPlato.setScale(2, RoundingMode.HALF_UP);
                        baseIgvItem = precioVentaItem.divide(divisorIgv, 2, RoundingMode.HALF_UP);
                        igvItem = precioVentaItem.subtract(baseIgvItem).setScale(2, RoundingMode.HALF_UP);

                        // Acumulamos para el control del último ítem
                        acumuladoPrecioVenta = acumuladoPrecioVenta.add(precioVentaItem);
                        acumuladoBaseIgv = acumuladoBaseIgv.add(baseIgvItem);
                        acumuladoIgv = acumuladoIgv.add(igvItem);
                    }

                    // Derivamos los precios unitarios de forma segura para evitar divisiones por cero infinitas
                    precioUnitario = precioVentaItem.divide(cantidad, 2, RoundingMode.HALF_UP);
                    valorUnitario = baseIgvItem.divide(cantidad, 4, RoundingMode.HALF_UP);

                    // Seteamos las propiedades financieras del DTO de timbrado
                    item.setMtoPrecioUnitario(precioUnitario);
                    item.setMtoValorUnitario(valorUnitario.setScale(2, RoundingMode.HALF_UP));
                    item.setMtoBaseIgv(baseIgvItem);
                    item.setIgv(igvItem);

                    items.add(item);
                }
            }
            request.setItems(items);

            // 🚀 5. ENVIÓ CON CABECERAS HTTP FORMALES
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiToken);

            HttpEntity<FacturaRequest> entity = new HttpEntity<>(request, headers);
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