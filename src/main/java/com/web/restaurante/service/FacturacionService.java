package com.web.restaurante.service;

import com.web.restaurante.dto.facturacion.*;
import com.web.restaurante.dto.notacredito.*;
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

    // 🌟 INYECCIÓN DINÁMICA DESDE EL PROPERTIES
    @Value("${miapi.facturacion.url.comprobante}")
    private String urlComprobante;

    @Value("${miapi.facturacion.url.nota}")
    private String urlNota;

    @Value("${miapi.facturacion.token}")
    private String apiToken;

    // ── CANAL 1: EMISIÓN DE COMPROBANTES ESTÁNDAR ──
    public FacturaResponse.RespuestaData emitirComprobanteSunat(Pedido pedido, String correlativoPuro) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            FacturaRequest request = new FacturaRequest();

            request.setClaveSecreta(apiToken);

            ComprobanteDTO comp = new ComprobanteDTO();
            boolean esFactura = "FACTURA".equalsIgnoreCase(pedido.getPreferenciaComprobante());

            comp.setTipoDoc(esFactura ? "01" : "03");
            comp.setSerie(esFactura ? "F001" : "B001");
            comp.setCorrelativo(correlativoPuro);

            comp.setFechaEmision(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
            comp.setHoraEmision(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
            comp.setObservacion("Consumo en Salon - La Jama");
            request.setComprobante(comp);

            ClienteDTO cli = new ClienteDTO();
            String doc = pedido.getDocumentoCliente();

            if (esFactura) {
                cli.setTipoDoc("6");
                cli.setNumDoc(doc);
                cli.setRznSocial(pedido.getCliente() != null ? pedido.getCliente() : "EMPRESA SOLICITANTE");
            } else {
                cli.setTipoDoc(doc != null && doc.length() == 8 ? "1" : "0");
                cli.setNumDoc(doc != null && !doc.isEmpty() ? doc : "00000000");
                cli.setRznSocial(pedido.getCliente() != null ? pedido.getCliente() : "CLIENTES VARIOS");
            }
            cli.setDireccion("Chiclayo, Lambayeque");
            request.setCliente(cli);

            List<ItemDTO> items = new ArrayList<>();
            BigDecimal divisorIgv = new BigDecimal("1.18");

            if (pedido.getListaDetalles() != null && !pedido.getListaDetalles().isEmpty()) {
                List<DetallePedido> detallesActivos = pedido.getListaDetalles().stream()
                        .filter(d -> !d.isCanceladoPorCliente())
                        .toList();

                int totalItems = detallesActivos.size();
                BigDecimal totalComprobanteReal = BigDecimal.valueOf(pedido.getMontoTotal()).setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalBaseTeorico = totalComprobanteReal.divide(divisorIgv, 2, RoundingMode.HALF_UP);
                BigDecimal totalIgvTeorico = totalComprobanteReal.subtract(totalBaseTeorico).setScale(2, RoundingMode.HALF_UP);

                BigDecimal acumuladoBaseIgv = BigDecimal.ZERO;
                BigDecimal acumuladoIgv = BigDecimal.ZERO;
                BigDecimal acumuladoPrecioVenta = BigDecimal.ZERO;

                double sumaPlatosTicket = detallesActivos.stream().mapToDouble(DetallePedido::getSubtotal).sum();
                BigDecimal totalBrutoPlatos = BigDecimal.valueOf(sumaPlatosTicket).setScale(2, RoundingMode.HALF_UP);

                for (int i = 0; i < totalItems; i++) {
                    DetallePedido detalle = detallesActivos.get(i);
                    boolean esElUltimoItem = (i == totalItems - 1);

                    ItemDTO item = new ItemDTO();

                    if (detalle.getProducto() != null) {
                        item.setCodProducto("PROD-" + detalle.getProducto().getId());
                        item.setDescripcion(detalle.getProducto().getNombre());
                    } else {
                        item.setCodProducto("PROD-GENERICO");
                        item.setDescripcion(detalle.getNombre() != null ? detalle.getNombre() : "Consumo de Alimentos");
                    }

                    BigDecimal cantidad = BigDecimal.valueOf(detalle.getCantidad());
                    item.setCantidad(detalle.getCantidad());

                    BigDecimal subtotalPlato = BigDecimal.valueOf(detalle.getSubtotal()).setScale(4, RoundingMode.HALF_UP);
                    if (totalBrutoPlatos.compareTo(BigDecimal.ZERO) > 0 && totalBrutoPlatos.subtract(totalComprobanteReal).abs().doubleValue() > 0.1) {
                        subtotalPlato = subtotalPlato.multiply(totalComprobanteReal).divide(totalBrutoPlatos, 4, RoundingMode.HALF_UP);
                    }

                    BigDecimal precioVentaItem;
                    BigDecimal baseIgvItem;
                    BigDecimal igvItem;
                    BigDecimal precioUnitario;
                    BigDecimal valorUnitario;

                    if (esElUltimoItem) {
                        precioVentaItem = totalComprobanteReal.subtract(acumuladoPrecioVenta).setScale(2, RoundingMode.HALF_UP);
                        baseIgvItem = totalBaseTeorico.subtract(acumuladoBaseIgv).setScale(2, RoundingMode.HALF_UP);
                        igvItem = totalIgvTeorico.subtract(acumuladoIgv).setScale(2, RoundingMode.HALF_UP);
                    } else {
                        precioVentaItem = subtotalPlato.setScale(2, RoundingMode.HALF_UP);
                        baseIgvItem = precioVentaItem.divide(divisorIgv, 2, RoundingMode.HALF_UP);
                        igvItem = precioVentaItem.subtract(baseIgvItem).setScale(2, RoundingMode.HALF_UP);

                        acumuladoPrecioVenta = acumuladoPrecioVenta.add(precioVentaItem);
                        acumuladoBaseIgv = acumuladoBaseIgv.add(baseIgvItem);
                        acumuladoIgv = acumuladoIgv.add(igvItem);
                    }

                    precioUnitario = precioVentaItem.divide(cantidad, 2, RoundingMode.HALF_UP);
                    valorUnitario = baseIgvItem.divide(cantidad, 4, RoundingMode.HALF_UP);

                    item.setMtoPrecioUnitario(precioUnitario);
                    item.setMtoValorUnitario(valorUnitario.setScale(2, RoundingMode.HALF_UP));
                    item.setMtoBaseIgv(baseIgvItem);
                    item.setIgv(igvItem);

                    items.add(item);
                }
            }
            request.setItems(items);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiToken);

            HttpEntity<FacturaRequest> entity = new HttpEntity<>(request, headers);
            // 🌟 USAMOS LA URL DEL PROPERTIES
            ResponseEntity<FacturaResponse> response = restTemplate.postForEntity(urlComprobante, entity, FacturaResponse.class);

            if (response.getBody() != null && response.getBody().getRespuesta() != null) {
                return response.getBody().getRespuesta();
            }

        } catch (Exception e) {
            System.err.println("💥 FAILED TO TIMBRAR COMPROBANTE SUNAT: " + e.getMessage());
        }
        return null;
    }

    // ── CANAL 2: GESTIÓN DE NOTAS DE CRÉDITO ──
    public String obtenerClaveSecretaConfigurada() {
        return this.apiToken;
    }

    public NotaCreditoResponse emitirNotaCreditoSunat(NotaCreditoRequest request) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + this.apiToken);

            HttpEntity<NotaCreditoRequest> entity = new HttpEntity<>(request, headers);

            // 1. Recibimos la respuesta como un String crudo
            ResponseEntity<String> response = restTemplate.postForEntity(urlNota, entity, String.class);
            String rawResponse = response.getBody();

            if (rawResponse == null || rawResponse.trim().isEmpty()) {
                NotaCreditoResponse errorRes = new NotaCreditoResponse();
                errorRes.setOkey(false);
                errorRes.setMensaje("La pasarela devolvió una respuesta vacía.");
                return errorRes;
            }

            // 🌟 DEPURACIÓN DE ADVERTENCIAS PHP (Quirúrgica):
            // Buscamos dónde inicia verdaderamente el objeto JSON '{' ignorando los Warnings de miapi.cloud
            int jsonStartIndex = rawResponse.indexOf("{");
            if (jsonStartIndex == -1) {
                System.err.println("❌ RESPUESTA SIN FORMATO JSON VÁLIDO: " + rawResponse);
                NotaCreditoResponse errorRes = new NotaCreditoResponse();
                errorRes.setOkey(false);
                errorRes.setMensaje("No se encontró una estructura JSON válida en la respuesta.");
                return errorRes;
            }

            // Recortamos el String para quedarnos puramente con las llaves del JSON
            String cleanJson = rawResponse.substring(jsonStartIndex);
            System.out.println("🟢 JSON SANEADO Y FILTRADO CON ÉXITO: " + cleanJson);

            // 2. Parseo inteligente usando ObjectMapper
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(cleanJson);

            NotaCreditoResponse respuestaCalibrada = new NotaCreditoResponse();

            // miapi.cloud te devuelve el nodo "respuesta" directamente
            if (root.has("respuesta")) {
                com.fasterxml.jackson.databind.JsonNode respNode = root.get("respuesta");

                // Verificamos éxito por el código HTTP status 200 o bandera success que vino en tu log
                boolean ok = (respNode.has("status") && respNode.get("status").asInt() == 200)
                        || (respNode.has("success") && respNode.get("success").asBoolean());

                respuestaCalibrada.setOkey(ok);

                if (ok) {
                    // Extraemos los nombres reales de los enlaces con guiones del log oficial
                    String xmlFirmadoUrl = respNode.has("xml-firmado") ? respNode.get("xml-firmado").asText() : "";

                    // Extraemos el número correlativo deduciéndolo del nombre del archivo XML (Ej: 20000000001-07-BC01-00000005.XML)
                    String numeroNotaDetectado = "NC-EMITIDA";
                    if (!xmlFirmadoUrl.isEmpty()) {
                        String[] segmentos = xmlFirmadoUrl.split("-");
                        if (segmentos.length >= 4) {
                            String serieNC = segmentos[2]; // BC01
                            String correlativoNC = segmentos[3].toUpperCase().replace(".XML", ""); // 00000005
                            numeroNotaDetectado = serieNC + "-" + correlativoNC;
                        }
                    }

                    respuestaCalibrada.setNumeroNota(numeroNotaDetectado);
                    respuestaCalibrada.setPdfTicket(respNode.has("pdf-ticket") ? respNode.get("pdf-ticket").asText() : "");
                    respuestaCalibrada.setPdfA4(respNode.has("pdf-a4") ? respNode.get("pdf-a4").asText() : "");
                    respuestaCalibrada.setXmlFirmado(xmlFirmadoUrl); // Guardamos la URL directa del XML

                } else {
                    respuestaCalibrada.setMensaje(respNode.has("mensaje") ? respNode.get("mensaje").asText() : "Error en proceso.");
                }
            } else {
                respuestaCalibrada.setOkey(false);
                respuestaCalibrada.setMensaje("Estructura de respuesta desconocida.");
            }

            return respuestaCalibrada;

        } catch (Exception e) {
            System.err.println("💥 FAILED TO MAP NOTA DE CREDITO: " + e.getMessage());
            NotaCreditoResponse errorRes = new NotaCreditoResponse();
            errorRes.setOkey(false);
            errorRes.setMensaje("Error en mapeo de datos: " + e.getMessage());
            return errorRes;
        }
    }
}