package com.web.restaurante.controller;

import com.web.restaurante.dto.notacredito.*;
import com.web.restaurante.model.AuditoriaAnulacion;
import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.service.ComprobanteSequenceService;
import com.web.restaurante.service.FacturacionService;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.EmailService; // 🚀 IMPORTACIÓN DEL SERVICIO DE CORREO
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import com.web.restaurante.repository.AuditoriaAnulacionRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class ComprobanteAdminController {

    private final PedidoService pedidoService;
    private final ComprobanteSequenceService comprobanteSequenceService;
    private final FacturacionService facturacionService;
    private final AuditoriaAnulacionRepository auditoriaRepository;
    private final EmailService emailService; // 🚀 INYECCIÓN AUTOMÁTICA POR LOMBOK

    @GetMapping("/comprobantes")
    public String listarComprobantesCaja(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            Model model) {

        List<Pedido> historialCaja;

        if (fechaInicio != null || fechaFin != null) {
            LocalDate inicio = fechaInicio != null ? fechaInicio : LocalDate.now();
            LocalDate fin    = fechaFin    != null ? fechaFin    : LocalDate.now();
            historialCaja = pedidoService.obtenerPedidosPorRango(inicio, fin);
        } else {
            historialCaja = pedidoService.obtenerPedidosParaCajaHoy();
        }

        List<Pedido> pendientes = historialCaja.stream()
                .filter(p -> p.getComprobanteNumero() == null)
                .collect(Collectors.toList());

        List<Pedido> emitidos = historialCaja.stream()
                .filter(p -> p.getComprobanteNumero() != null)
                .collect(Collectors.toList());

        double totalFacturadoTurno = emitidos.stream()
                .filter(p -> p.getEstado() != EstadoPedido.CANCELADO)
                .mapToDouble(Pedido::getMontoTotal)
                .sum();

        model.addAttribute("listaComprobantes", historialCaja);
        model.addAttribute("amountPendientes", pendientes.size());
        model.addAttribute("amountEmitidos", emitidos.size());
        model.addAttribute("montoTotalTimbrado", totalFacturadoTurno);
        model.addAttribute("activeUri", "/admin/comprobantes");
        model.addAttribute("fechaInicioParam", fechaInicio != null ? fechaInicio.toString() : "");
        model.addAttribute("fechaFinParam",    fechaFin    != null ? fechaFin.toString()    : "");

        return "admin/comprobantes/lista";
    }

    @PostMapping("/pedido/aprobar")
    @ResponseBody
    public ResponseEntity<?> aprobarYFacturarPedido(@RequestParam("idPedido") Long idPedido) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(idPedido);
            if (pedido == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Pedido no encontrado."));
            }

            if (pedido.getComprobanteNumero() != null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Este pedido ya cuenta con un comprobante emitido."));
            }

            String tipoSolicitado = pedido.getPreferenciaComprobante() != null ? pedido.getPreferenciaComprobante() : "BOLETA";

            String comprobanteOficial = comprobanteSequenceService.generarSiguienteNumero(tipoSolicitado);
            String[] partes = comprobanteOficial.split("-");
            String correlativoPuro = partes[1];

            var respuestaSunat = facturacionService.emitirComprobanteSunat(pedido, correlativoPuro);

            if (respuestaSunat != null) {
                pedido.setComprobanteNumero(comprobanteOficial);
                pedido.setComprobantePdfUrl(respuestaSunat.getPdfTicket());
                pedido.setComprobanteA4Url(respuestaSunat.getPdfA4());
                pedido.setComprobanteXmlContenido(respuestaSunat.getXmlFirmado());

                pedido.setEstado(EstadoPedido.PAGADO);
                pedidoService.guardar(pedido);

                // 📧 DISPARO ASÍNCRONO DE CORREO ELECTRONICO AL CLIENTE ORIGINAL
                emailService.enviarComprobante(pedido.getClienteCorreo(), pedido);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "¡Comprobante electrónico emitido con éxito! Número: " + comprobanteOficial
                ));
            } else {
                return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "message", "Error de comunicación con miapi.cloud. No se obtuvo respuesta de SUNAT."
                ));
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Fallo al procesar el timbrado contable: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/comprobantes/anular/{id}")
    @ResponseBody
    public ResponseEntity<?> anularComprobante(@PathVariable Long id, @RequestParam String motivo) {
        Pedido pedidoOriginal = pedidoService.obtenerPorId(id);

        if (pedidoOriginal == null || pedidoOriginal.getComprobanteNumero() == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "El pedido no cuenta con un comprobante emitido."));
        }

        try {
            NotaCreditoRequest request = new NotaCreditoRequest();
            request.setClaveSecreta(facturacionService.obtenerClaveSecretaConfigurada());

            ComprobanteNotaDTO compDto = new ComprobanteNotaDTO();
            String[] partesCpe = pedidoOriginal.getComprobanteNumero().split("-");
            String serieOriginal = partesCpe[0];
            String correlativoOriginal = partesCpe[1];

            String tipoSolicitadoNota = serieOriginal.startsWith("F") ? "FC01" : "BC01";
            compDto.setSerie(tipoSolicitadoNota);

            String numeroNotaCompleto = comprobanteSequenceService.generarSiguienteNumero(tipoSolicitadoNota);
            compDto.setCorrelativo(numeroNotaCompleto.split("-")[1]);

            compDto.setCodmotivo("01");
            compDto.setDescripcion(motivo.toUpperCase());

            compDto.setSerieRef(serieOriginal);
            compDto.setCorrelativoRef(correlativoOriginal);
            compDto.setTipoCompRef(serieOriginal.startsWith("F") ? "01" : "03");

            double total = pedidoOriginal.getMontoTotal();
            double subtotal = total / 1.18;
            double igv = total - subtotal;

            compDto.setTotal(total);
            compDto.setMtoOperGravadas(Math.round(subtotal * 100.0) / 100.0);
            compDto.setMtoIGV(Math.round(igv * 100.0) / 100.0);

            compDto.setTotalTexto("SON " + String.format("%.2f", total) + " SOLES");
            compDto.setFechaEmision(LocalDate.now().toString());
            compDto.setHoraEmision(LocalTime.now().toString().substring(0, 8));
            request.setComprobante(compDto);

            ClienteNotaDTO clienteDto = new ClienteNotaDTO();
            String doc = pedidoOriginal.getDocumentoCliente();
            clienteDto.setNumDoc(doc != null ? doc : "00000000");
            clienteDto.setTipoDoc(doc != null && doc.length() == 11 ? "6" : "1");
            clienteDto.setRznSocial(pedidoOriginal.getCliente() != null ? pedidoOriginal.getCliente().toUpperCase() : "CLIENTE VARIOS");
            clienteDto.setDireccion("CHICLAYO");
            request.setCliente(clienteDto);

            List<ItemNotaDTO> itemsDto = new ArrayList<>();
            ItemNotaDTO itemGlobal = new ItemNotaDTO();
            itemGlobal.setCodProducto("PREST");
            itemGlobal.setDescripcion("ANULACION TOTAL DE LA ORDEN DE SERVICIO NV-" + pedidoOriginal.getId());
            itemGlobal.setCantidad(1);
            itemGlobal.setMtoPrecioUnitario(total);
            itemGlobal.setMtoValorUnitario(compDto.getMtoOperGravadas());
            itemGlobal.setIgv(compDto.getMtoIGV());
            itemsDto.add(itemGlobal);
            request.setItems(itemsDto);

            NotaCreditoResponse respuesta = facturacionService.emitirNotaCreditoSunat(request);

            if (respuesta != null && respuesta.isOkey()) {
                pedidoOriginal.setComprobanteNotaNumero(respuesta.getNumeroNota());
                pedidoOriginal.setNotaPdfUrl(respuesta.getPdfTicket());
                pedidoOriginal.setNotaA4Url(respuesta.getPdfA4());
                pedidoOriginal.setNotaXmlContenido(respuesta.getXmlFirmado());

                pedidoOriginal.setEstado(EstadoPedido.ANULADO);
                pedidoService.guardar(pedidoOriginal);

                emailService.enviarComprobante(pedidoOriginal.getClienteCorreo(), pedidoOriginal);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Nota de Crédito " + respuesta.getNumeroNota() + " autorizada correctamente."
                ));
            } else {
                String errorSunat = (respuesta != null) ? respuesta.getMensaje() : "Sin respuesta de la pasarela.";
                return ResponseEntity.status(500).body(Map.of("success", false, "message", "SUNAT indicó: " + errorSunat));
            }

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Fallo crítico: " + e.getMessage()));
        }
    }

    @GetMapping("/comprobantes/xml/{id}")
    public ResponseEntity<?> verXmlEnLineaOficial(@PathVariable("id") Long idPedido) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(idPedido);
            if (pedido == null || pedido.getComprobanteXmlContenido() == null || pedido.getComprobanteXmlContenido().isEmpty()) {
                return ResponseEntity.badRequest().body("El contenido del XML no se encuentra disponible para esta orden.");
            }

            String contenidoXml = pedido.getComprobanteXmlContenido().trim();

            if (contenidoXml.startsWith("http://") || contenidoXml.startsWith("https://")) {
                return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.FOUND)
                        .location(java.net.URI.create(contenidoXml))
                        .build();
            }

            byte[] xmlBytes = contenidoXml.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_XML);
            headers.setContentDisposition(org.springframework.http.ContentDisposition.inline().build());

            return new ResponseEntity<>(xmlBytes, headers, org.springframework.http.HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al procesar la visualización: " + e.getMessage());
        }
    }

    @GetMapping("/comprobantes/xml-nota/{id}")
    public ResponseEntity<?> verXmlNotaEnLineaOficial(@PathVariable("id") Long idPedido) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(idPedido);
            if (pedido == null || pedido.getNotaXmlContenido() == null || pedido.getNotaXmlContenido().isEmpty()) {
                return ResponseEntity.badRequest().body("El contenido del XML de la Nota de Crédito no está disponible.");
            }

            String contenidoXml = pedido.getNotaXmlContenido().trim();

            if (contenidoXml.startsWith("http://") || contenidoXml.startsWith("https://")) {
                return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.FOUND)
                        .location(java.net.URI.create(contenidoXml))
                        .build();
            }

            byte[] xmlBytes = contenidoXml.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_XML);
            headers.setContentDisposition(org.springframework.http.ContentDisposition.inline().build());

            return new ResponseEntity<>(xmlBytes, headers, org.springframework.http.HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al procesar la visualización del XML: " + e.getMessage());
        }
    }

    @GetMapping("/comprobantes/imprimir-nota/{id}")
    public String renderizarTicketNotaLocal(@PathVariable("id") Long id, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(id);

        if (pedido == null || !"ANULADO".equals(pedido.getEstado().name())) {
            return "redirect:/admin/comprobantes?errorContable=El+pedido+no+esta+anulado";
        }

        double total = pedido.getMontoTotal();
        double subtotal = total / 1.18;
        double igv = total - subtotal;

        model.addAttribute("pedido", pedido);
        model.addAttribute("subtotal", subtotal);
        model.addAttribute("igv", igv);

        return "admin/comprobantes/ticket_nota_print";
    }

    @GetMapping("/comprobantes/imprimir-nota-a4/{id}")
    public String renderizarNotaA4Local(@PathVariable("id") Long id, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(id);

        if (pedido == null || !"ANULADO".equals(pedido.getEstado().name())) {
            return "redirect:/admin/comprobantes?errorContable=El+pedido+no+esta+anulado";
        }

        double total = pedido.getMontoTotal();
        double subtotal = total / 1.18;
        double igv = total - subtotal;

        model.addAttribute("pedido", pedido);
        model.addAttribute("subtotal", subtotal);
        model.addAttribute("igv", igv);

        return "admin/comprobantes/nota_a4_print";
    }

    @GetMapping("/comprobantes/pedido/{id}/detalles")
    @ResponseBody
    public ResponseEntity<?> obtenerDetallesParaAnulacion(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoService.obtenerPorId(id);
            if (pedido == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Pedido no encontrado"));
            }

            List<Map<String, Object>> detallesDTO = pedido.getListaDetalles().stream()
                    .filter(d -> !d.isCanceladoPorCliente())
                    .map(d -> {
                        Map<String, Object> item = new java.util.HashMap<>();
                        item.put("id", d.getId());
                        item.put("productoNombre", d.getProducto() != null ? d.getProducto().getNombre() : "Plato Desconocido");
                        item.put("cantidad", d.getCantidad());
                        item.put("precioUnitario", d.getPrecioUnitario());
                        item.put("total", d.getPrecioUnitario() * d.getCantidad());
                        return item;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("success", true, "detalles", detallesDTO));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/comprobantes/api/pedido/procesar-anulacion")
    @ResponseBody
    @Transactional
    public ResponseEntity<?> procesarAnulacionCpe(@RequestBody Map<String, Object> payload) {
        try {
            Long pedidoId = Long.parseLong(payload.get("pedidoId").toString());
            String motivo = payload.get("motivo").toString();
            String sustento = payload.get("sustento").toString();

            Pedido pedidoOriginal = pedidoService.obtenerPorId(pedidoId);
            if (pedidoOriginal == null || pedidoOriginal.getComprobanteNumero() == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "El pedido no cuenta con un comprobante emitido."));
            }

            NotaCreditoRequest request = new NotaCreditoRequest();
            request.setClaveSecreta(facturacionService.obtenerClaveSecretaConfigurada());

            ComprobanteNotaDTO compDto = new ComprobanteNotaDTO();
            String[] partesCpe = pedidoOriginal.getComprobanteNumero().split("-");
            String serieOriginal = partesCpe[0];
            String correlativoOriginal = partesCpe[1];

            String tipoSolicitadoNota = serieOriginal.startsWith("F") ? "FC01" : "BC01";
            compDto.setSerie(tipoSolicitadoNota);

            String numeroNotaCompleto = comprobanteSequenceService.generarSiguienteNumero(tipoSolicitadoNota);
            compDto.setCorrelativo(numeroNotaCompleto.split("-")[1]);

            compDto.setCodmotivo("01");
            compDto.setDescripcion(sustento.toUpperCase());

            compDto.setSerieRef(serieOriginal);
            compDto.setCorrelativoRef(correlativoOriginal);
            compDto.setTipoCompRef(serieOriginal.startsWith("F") ? "01" : "03");

            double total = pedidoOriginal.getMontoTotal();
            double subtotal = total / 1.18;
            double igv = total - subtotal;

            compDto.setTotal(total);
            compDto.setMtoOperGravadas(Math.round(subtotal * 100.0) / 100.0);
            compDto.setMtoIGV(Math.round(igv * 100.0) / 100.0);

            compDto.setTotalTexto("SON " + String.format("%.2f", total) + " SOLES");
            compDto.setFechaEmision(LocalDate.now().toString());
            compDto.setHoraEmision(LocalTime.now().toString().substring(0, 8));
            request.setComprobante(compDto);

            ClienteNotaDTO clienteDto = new ClienteNotaDTO();
            String doc = pedidoOriginal.getDocumentoCliente();
            clienteDto.setNumDoc(doc != null && !doc.isEmpty() ? doc : "00000000");
            clienteDto.setTipoDoc(doc != null && doc.length() == 11 ? "6" : "1");
            clienteDto.setRznSocial(pedidoOriginal.getCliente() != null ? pedidoOriginal.getCliente().toUpperCase() : "CLIENTE VARIOS");
            clienteDto.setDireccion("CHICLAYO");
            request.setCliente(clienteDto);

            List<ItemNotaDTO> itemsDto = new ArrayList<>();
            ItemNotaDTO itemGlobal = new ItemNotaDTO();
            itemGlobal.setCodProducto("PREST");
            itemGlobal.setDescripcion("ANULACION TOTAL DE LA ORDEN DE SERVICIO NV-" + pedidoOriginal.getId());
            itemGlobal.setCantidad(1);
            itemGlobal.setMtoPrecioUnitario(total);
            itemGlobal.setMtoValorUnitario(compDto.getMtoOperGravadas());
            itemGlobal.setIgv(compDto.getMtoIGV());
            itemsDto.add(itemGlobal);
            request.setItems(itemsDto);

            NotaCreditoResponse respuesta = facturacionService.emitirNotaCreditoSunat(request);

            if (respuesta != null && respuesta.isOkey()) {
                String numeroNotaFinal = (respuesta.getNumeroNota() != null && !respuesta.getNumeroNota().isEmpty())
                        ? respuesta.getNumeroNota()
                        : numeroNotaCompleto;

                pedidoOriginal.setComprobanteNotaNumero(numeroNotaFinal);
                pedidoOriginal.setNotaPdfUrl(respuesta.getPdfTicket());
                pedidoOriginal.setNotaA4Url(respuesta.getPdfA4());
                pedidoOriginal.setNotaXmlContenido(respuesta.getXmlFirmado());

                pedidoOriginal.setEstado(EstadoPedido.ANULADO);
                pedidoService.guardar(pedidoOriginal);

                AuditoriaAnulacion auditoria = new AuditoriaAnulacion();
                auditoria.setPedido(pedidoOriginal);
                auditoria.setMotivo(motivo);
                auditoria.setTipoNota("TOTAL");
                auditoria.setSustento(sustento);
                auditoria.setGenerarNuevoComprobante(false);
                auditoriaRepository.save(auditoria);

                emailService.enviarComprobante(pedidoOriginal.getClienteCorreo(), pedidoOriginal);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Nota de Crédito " + numeroNotaFinal + " autorizada y homologada por SUNAT."
                ));
            } else {
                String errorSunat = (respuesta != null) ? respuesta.getMensaje() : "Sin respuesta de la pasarela de timbrado.";
                return ResponseEntity.status(500).body(Map.of("success", false, "message", "SUNAT indicó: " + errorSunat));
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Fallo crítico en el proceso contable: " + e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/comprobantes/api/pedido/reemitir-corregido")
    @ResponseBody
    @Transactional
    public ResponseEntity<?> reemitirComprobanteCorregido(@RequestBody Map<String, Object> payload) {
        try {
            Long pedidoId = Long.parseLong(payload.get("pedidoId").toString());
            String nuevoCliente = payload.get("clienteNombre").toString().toUpperCase();
            String nuevoDoc = payload.get("documento").toString().trim();
            String nuevoTipoCpe = payload.get("comprobanteTipo").toString().toUpperCase();
            String nuevoMetodo = payload.get("metodoPago").toString();

            String nuevoCorreo = payload.get("clienteCorreo") != null ? payload.get("clienteCorreo").toString().trim() : null;

            Pedido pedidoOriginal = pedidoService.obtenerPorId(pedidoId);
            if (pedidoOriginal == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Pedido origen no encontrado."));
            }

            if (nuevoCorreo == null || nuevoCorreo.isEmpty()) {
                nuevoCorreo = pedidoOriginal.getClienteCorreo(); // Respaldo contable
            }

            Pedido nuevoPedido = new Pedido();
            nuevoPedido.setCliente(nuevoCliente);
            nuevoPedido.setDocumentoCliente(nuevoDoc.isEmpty() ? null : nuevoDoc);
            nuevoPedido.setClienteCorreo(nuevoCorreo); // 🚀 SETEADO EN EL NUEVO CLONfresh
            nuevoPedido.setPreferenciaComprobante(nuevoTipoCpe);
            nuevoPedido.setDireccion(pedidoOriginal.getDireccion() != null ? pedidoOriginal.getDireccion() : "Chiclayo, Lambayeque");
            nuevoPedido.setNumeroMesa(pedidoOriginal.getNumeroMesa());
            nuevoPedido.setTipoPedido(pedidoOriginal.getTipoPedido());

            nuevoPedido.setFechaCreacion(java.time.LocalDateTime.now());
            nuevoPedido.setFechaEntrega(java.time.LocalDateTime.now());

            try {
                nuevoPedido.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.valueOf(nuevoMetodo));
            } catch(Exception ex) {
                nuevoPedido.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.EFECTIVO);
            }

            List<Map<String, Object>> detallesModificados = (List<Map<String, Object>>) payload.get("detallesModificados");
            List<DetallePedido> nuevosDetalles = new ArrayList<>();
            double nuevoTotalAcumulado = 0.0;

            if (detallesModificados != null) {
                for (Map<String, Object> detMod : detallesModificados) {
                    Long detId = Long.parseLong(detMod.get("id").toString());
                    int nuevaCantidad = Integer.parseInt(detMod.get("cantidad").toString());

                    if (nuevaCantidad > 0) {
                        var detalleOriginal = pedidoOriginal.getListaDetalles().stream()
                                .filter(d -> d.getId().equals(detId))
                                .findFirst()
                                .orElse(null);

                        if (detalleOriginal != null) {
                            DetallePedido nuevoDetalle = new DetallePedido();
                            nuevoDetalle.setPedido(nuevoPedido);
                            nuevoDetalle.setProducto(detalleOriginal.getProducto());
                            nuevoDetalle.setPrecioUnitario(detalleOriginal.getPrecioUnitario());
                            nuevoDetalle.setCantidad(nuevaCantidad);
                            nuevoDetalle.setCanceladoPorCliente(false);

                            nuevosDetalles.add(nuevoDetalle);
                            nuevoTotalAcumulado += (detalleOriginal.getPrecioUnitario() * nuevaCantidad);
                        }
                    }
                }
            }

            nuevoPedido.setListaDetalles(nuevosDetalles);
            nuevoPedido.setMontoTotal(nuevoTotalAcumulado);

            String comprobanteOficial = comprobanteSequenceService.generarSiguienteNumero(nuevoTipoCpe);
            String correlativoPuro = comprobanteOficial.split("-")[1];

            var respuestaSunat = facturacionService.emitirComprobanteSunat(nuevoPedido, correlativoPuro);

            if (respuestaSunat != null) {
                nuevoPedido.setComprobanteNumero(comprobanteOficial);
                nuevoPedido.setComprobantePdfUrl(respuestaSunat.getPdfTicket());
                nuevoPedido.setComprobanteA4Url(respuestaSunat.getPdfA4());
                nuevoPedido.setComprobanteXmlContenido(respuestaSunat.getXmlFirmado());

                nuevoPedido.setEstado(EstadoPedido.PAGADO);
                pedidoService.guardar(nuevoPedido);

                // 📧 DISPARO ASÍNCRONO DE CORREO ELECTRONICO PARA LA ORDEN CLONADA Y CORREGIDA
                emailService.enviarComprobante(nuevoPedido.getClienteCorreo(), nuevoPedido);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "¡Comprobante corregido generado con éxito! Número: " + comprobanteOficial
                ));
            } else {
                return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "message", "Error de comunicación con miapi.cloud. Estructura rechazada por SUNAT."
                ));
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Fallo al procesar el timbrado de re-emisión: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/comprobantes/api/lista")
    @ResponseBody
    public ResponseEntity<?> listarComprobantesJson(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {

        List<Pedido> lista;

        if (fechaInicio != null || fechaFin != null) {
            LocalDate inicio = fechaInicio != null ? fechaInicio : LocalDate.now();
            LocalDate fin    = fechaFin    != null ? fechaFin    : LocalDate.now();
            lista = pedidoService.obtenerPedidosPorRango(inicio, fin);
        } else {
            lista = pedidoService.obtenerPedidosParaCajaHoy();
        }

        // Mapeamos solo lo que el frontend necesita pintar
        List<Map<String, Object>> dto = lista.stream().map(p -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id",                   p.getId());
            m.put("fechaCreacion",        p.getFechaCreacion() != null
                    ? p.getFechaCreacion().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "");
            m.put("numeroMesa",           p.getNumeroMesa());
            m.put("cliente",              p.getCliente());
            m.put("montoTotal",           p.getMontoTotal());
            m.put("metodoPago",           p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");
            m.put("preferenciaComprobante", p.getPreferenciaComprobante() != null
                    ? p.getPreferenciaComprobante().toUpperCase() : "BOLETA");
            m.put("comprobanteNumero",    p.getComprobanteNumero());
            m.put("comprobanteNotaNumero", p.getComprobanteNotaNumero());
            m.put("estado",               p.getEstado() != null ? p.getEstado().name() : "");
            m.put("documentoCliente",     p.getDocumentoCliente());
            m.put("comprobanteA4Url",     p.getComprobanteA4Url());
            m.put("comprobantePdfUrl",    p.getComprobantePdfUrl());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dto);
    }

}