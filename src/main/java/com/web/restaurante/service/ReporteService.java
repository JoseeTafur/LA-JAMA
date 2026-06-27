package com.web.restaurante.service;

import com.itextpdf.kernel.colors.Color;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.properties.UnitValue;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.MovimientoCajaRepository;
import com.web.restaurante.repository.TurnoCajaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReporteService {

    @Autowired
    private PedidoRepository pedidoRepository;

    // 🚨 CORRECCIÓN CLAVE: Inyectamos con @Autowired individual para fulminar el NullPointerException
    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private TurnoCajaRepository turnoCajaRepository;

    public byte[] generarReporteLiquidados(String formato, String texto, String metodo, String origen) {
        List<Pedido> filtrados = new ArrayList<>();

        // 🚀 SINCRONIZACIÓN CONTABLE PERFECTA: Buscamos el turno activo de la caja
        // para jalar exactamente los mismos pedidos liquidados que pinta el panel web.
        turnoCajaRepository.findByActivoTrue().ifPresent(turnoActivo -> {

            List<Pedido> listaBase = pedidoRepository.findAll().stream()
                    // Aduana temporal del turno activo
                    .filter(p -> p.getFechaCreacion() != null
                            && turnoActivo.getFechaApertura() != null
                            && p.getFechaCreacion().isAfter(turnoActivo.getFechaApertura()))
                    // 🛡️ CONDICIÓN SOLICITADA: Excluir tajantemente los que no tengan comprobante_nota_numero
                    .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                    // Solo entran los estados financieros de liquidación reales
                    .filter(p -> com.web.restaurante.model.enums.EstadoPago.PAGADO.equals(p.getEstadoPago())
                            || com.web.restaurante.model.enums.EstadoPago.EXTORNADO.equals(p.getEstadoPago()))
                    .collect(Collectors.toList());

            // Aplicamos los filtros dinámicos de texto, método de pago y origen sobre la data real
            List<Pedido> procesados = listaBase.stream().filter(p -> {
                boolean cumpleTexto = true;
                if (texto != null && !texto.trim().isEmpty()) {
                    String t = texto.toLowerCase().trim();
                    String cliente = p.getCliente() != null ? p.getCliente().toLowerCase() : "";
                    String mesa = p.getNumeroMesa() != null ? String.valueOf(p.getNumeroMesa()) : "";
                    String id = String.valueOf(p.getId());
                    cumpleTexto = cliente.contains(t) || mesa.contains(t) || id.contains(t);
                }

                boolean cumpleMetodo = true;
                if (metodo != null && !metodo.isEmpty() && !"TODOS".equals(metodo)) {
                    String mp = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";
                    cumpleMetodo = mp.equalsIgnoreCase(metodo.trim());
                }

                boolean cumpleOrigen = true;
                if (origen != null && !origen.isEmpty() && !"TODOS".equals(origen)) {
                    String origenFiltro = origen.toUpperCase().trim();
                    if ("SALON".equals(origenFiltro) || "LOCAL".equals(origenFiltro)) {
                        cumpleOrigen = p.getNumeroMesa() != null;
                    } else if ("DELIVERY".equals(origenFiltro)) {
                        cumpleOrigen = p.getNumeroMesa() == null;
                    }
                }
                return cumpleTexto && cumpleMetodo && cumpleOrigen;
            }).collect(Collectors.toList());

            filtrados.addAll(procesados);
        });

        // Orden cronológico descendente (Lo más nuevo arriba en la hoja)
        filtrados.sort((a, b) -> b.getId().compareTo(a.getId()));

        return procesarReporteEstructurado(filtrados, formato);
    }

    public byte[] generarReporteBitacoraCaja(String formato) {
        List<Pedido> pedidosSimuladosBitacora = new ArrayList<>();

        // Buscamos el turno en vivo usando el repositorio inyectado
        turnoCajaRepository.findByActivoTrue().ifPresent(turno -> {
            List<MovimientoCaja> movs = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(turno.getId());
            for (MovimientoCaja m : movs) {
                if (m == null) continue;
                String tipo = m.getTipo() != null ? m.getTipo().toUpperCase().trim() : "INGRESO";
                String concepto = m.getConcepto() != null ? m.getConcepto() : "";
                String conceptoUpper = concepto.toUpperCase();

                if (!(conceptoUpper.contains("LIQUIDACIÓN") || conceptoUpper.contains("LIQUIDACION") || conceptoUpper.contains("EXTORNO") || tipo.equals("VENTA") || tipo.equals("CIERRE"))) {

                    Pedido pSimulado = new Pedido();
                    pSimulado.setId(m.getId());
                    pSimulado.setComprobanteNotaNumero("M-" + m.getId());
                    pSimulado.setCliente(concepto.startsWith("Manual: ") ? concepto.substring(8) : concepto);
                    pSimulado.setFechaCreacion(m.getFecha() != null ? m.getFecha() : LocalDateTime.now());
                    pSimulado.setMontoTotal(Math.abs(m.getMonto())); // Siempre absoluto positivo

                    if ("EGRESO".equals(tipo)) {
                        pSimulado.setClienteCorreo("MANUAL_EGRESO");
                        pSimulado.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.EXTORNADO);
                    } else {
                        pSimulado.setClienteCorreo("MANUAL_INGRESO");
                        pSimulado.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
                    }
                    pedidosSimuladosBitacora.add(pSimulado);
                }
            }
        });

        pedidosSimuladosBitacora.sort((a, b) -> b.getId().compareTo(a.getId()));
        return procesarReporteEstructurado(pedidosSimuladosBitacora, formato);
    }

    public byte[] generarReporteHistorialCompleto(String formato, String inicio, String fin, String metodo, String origen) {
        LocalDate fechaInicio = (inicio != null && !inicio.isEmpty()) ? LocalDate.parse(inicio) : LocalDate.now().minusDays(30);
        LocalDate fechaFin = (fin != null && !fin.isEmpty()) ? LocalDate.parse(fin) : LocalDate.now();

        Page<Pedido> pagina = pedidoRepository.findHistorialComprobantes(fechaInicio, fechaFin, PageRequest.of(0, Integer.MAX_VALUE));
        List<Pedido> lista = pagina.getContent();

        // 1. 🛡️ RE-ACTIVACIÓN DEL CANDADO CONTABLE: Filtra únicamente las notas formalizadas legítimas
        List<Pedido> filtrados = lista.stream()
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .filter(p -> {
                    boolean cumpleMetodo = true;
                    if (metodo != null && !metodo.isEmpty() && !metodo.equals("TODOS")) {
                        String mp = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";
                        cumpleMetodo = mp.equals(metodo);
                    }
                    boolean cumpleOrigen = true;
                    if (origen != null && !origen.isEmpty() && !origen.equals("TODOS")) {
                        if (origen.equals("LOCAL") || origen.equals("SALON")) cumpleOrigen = p.getNumeroMesa() != null;
                        else if (origen.equals("DELIVERY")) cumpleOrigen = p.getNumeroMesa() == null;
                    }
                    return cumpleMetodo && cumpleOrigen;
                }).collect(Collectors.toList());

        // 2. Acople de los movimientos manuales en la misma lista si los filtros lo permiten
        if (metodo == null || metodo.isEmpty() || "TODOS".equals(metodo) || "EFECTIVO".equalsIgnoreCase(metodo)) {
            if (origen == null || origen.isEmpty() || "TODOS".equals(origen) || "SALON".equals(origen) || "LOCAL".equals(origen)) {

                LocalDateTime ldtInicio = fechaInicio.atTime(8, 0);
                LocalDateTime ldtFin = fechaFin.plusDays(1).atTime(7, 0);

                List<TurnoCaja> turnosRango = turnoCajaRepository.findAll().stream()
                        .filter(t -> t.getFechaApertura() != null && !t.getFechaApertura().isBefore(ldtInicio) && !t.getFechaApertura().isAfter(ldtFin))
                        .collect(Collectors.toList());

                for (TurnoCaja t : turnosRango) {
                    List<MovimientoCaja> movs = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(t.getId());
                    for (MovimientoCaja m : movs) {
                        if (m == null) continue;
                        String tipo = m.getTipo() != null ? m.getTipo().toUpperCase().trim() : "INGRESO";
                        String concepto = m.getConcepto() != null ? m.getConcepto() : "";
                        String conceptoUpper = concepto.toUpperCase();

                        if (!(conceptoUpper.contains("LIQUIDACIÓN") || conceptoUpper.contains("LIQUIDACION") || conceptoUpper.contains("EXTORNO") || tipo.equals("VENTA") || tipo.equals("CIERRE"))) {

                            Pedido pSimulado = new Pedido();
                            pSimulado.setId(m.getId());
                            pSimulado.setComprobanteNotaNumero("M-" + m.getId());
                            pSimulado.setCliente(concepto.startsWith("Manual: ") ? concepto.substring(8) : concepto);

                            // Asignamos la estampa de tiempo real para la ordenación cronológica exacta
                            pSimulado.setFechaCreacion(m.getFecha() != null ? m.getFecha() : LocalDateTime.now());
                            pSimulado.setMontoTotal(Math.abs(m.getMonto()));

                            pSimulado.setClienteCorreo("EGRESO".equals(tipo) ? "MANUAL_EGRESO" : "MANUAL_INGRESO");
                            pSimulado.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);
                            filtrados.add(pSimulado);
                        }
                    }
                }
            }
        }

        // 🔄 3. ORDENACIÓN CRONOLÓGICA DESCENDENTE FIEL (Por fechaCreacion):
        // Compara los objetos por su estampa de tiempo de más nuevo a más antiguo, igualando el comportamiento del JS.
        filtrados.sort((a, b) -> {
            LocalDateTime fechaA = a.getFechaCreacion() != null ? a.getFechaCreacion() : LocalDateTime.MIN;
            LocalDateTime fechaB = b.getFechaCreacion() != null ? b.getFechaCreacion() : LocalDateTime.MIN;
            return fechaB.compareTo(fechaA); // Lo más nuevo siempre primero arriba
        });

        return procesarReporteEstructurado(filtrados, formato);
    }

    private byte[] procesarReporteEstructurado(List<Pedido> pedidos, String formato) {
        if ("EXCEL".equalsIgnoreCase(formato) || "CSV".equalsIgnoreCase(formato)) {
            return exportarExcel(pedidos);
        } else {
            return exportarPDF(pedidos);
        }
    }

    private byte[] exportarExcel(List<Pedido> pedidos) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Auditoría Transacciones");
            sheet.setDisplayGridlines(true);

            byte[] rgbPrimario = new byte[]{(byte) 27, (byte) 58, (byte) 44};
            byte[] rgbFilaPar = new byte[]{(byte) 245, (byte) 247, (byte) 245};
            byte[] rgbAnulado = new byte[]{(byte) 255, (byte) 242, (byte) 242};

            XSSFColor colorPrimario = new XSSFColor(rgbPrimario, null);
            XSSFColor colorFilaPar = new XSSFColor(rgbFilaPar, null);
            XSSFColor colorAnulado = new XSSFColor(rgbAnulado, null);

            org.apache.poi.ss.usermodel.Font fontCabecera = workbook.createFont();
            fontCabecera.setBold(true);
            fontCabecera.setColor(IndexedColors.WHITE.getIndex());
            fontCabecera.setFontHeightInPoints((short) 10);

            org.apache.poi.ss.usermodel.Font fontDatos = workbook.createFont();
            fontDatos.setFontHeightInPoints((short) 9.5);

            org.apache.poi.ss.usermodel.Font fontTotal = workbook.createFont();
            fontTotal.setBold(true);
            fontTotal.setFontHeightInPoints((short) 11);

            XSSFCellStyle styleCabecera = workbook.createCellStyle();
            styleCabecera.setFillForegroundColor(colorPrimario);
            styleCabecera.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleCabecera.setFont(fontCabecera);
            styleCabecera.setAlignment(HorizontalAlignment.LEFT);
            styleCabecera.setVerticalAlignment(VerticalAlignment.CENTER);

            XSSFCellStyle styleCabeceraMonto = workbook.createCellStyle();
            styleCabeceraMonto.cloneStyleFrom(styleCabecera);
            styleCabeceraMonto.setAlignment(HorizontalAlignment.RIGHT);

            XSSFCellStyle styleDataBlanca = workbook.createCellStyle();
            styleDataBlanca.setFont(fontDatos);

            XSSFCellStyle styleDataCebra = workbook.createCellStyle();
            styleDataCebra.setFillForegroundColor(colorFilaPar);
            styleDataCebra.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleDataCebra.setFont(fontDatos);

            XSSFCellStyle styleDataAnulado = workbook.createCellStyle();
            styleDataAnulado.setFillForegroundColor(colorAnulado);
            styleDataAnulado.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleDataAnulado.setFont(fontDatos);

            org.apache.poi.ss.usermodel.DataFormat df = workbook.createDataFormat();
            short formatoMoneda = df.getFormat("\"S/.\" #,##0.00");

            XSSFCellStyle styleMontoBlanco = workbook.createCellStyle();
            styleMontoBlanco.setFont(fontDatos);
            styleMontoBlanco.setAlignment(HorizontalAlignment.RIGHT);
            styleMontoBlanco.setDataFormat(formatoMoneda);

            XSSFCellStyle styleMontoCebra = workbook.createCellStyle();
            styleMontoCebra.setFillForegroundColor(colorFilaPar);
            styleMontoCebra.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleMontoCebra.setFont(fontDatos);
            styleMontoCebra.setAlignment(HorizontalAlignment.RIGHT);
            styleMontoCebra.setDataFormat(formatoMoneda);

            XSSFCellStyle styleMontoAnulado = workbook.createCellStyle();
            styleMontoAnulado.setFillForegroundColor(colorAnulado);
            styleMontoAnulado.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleMontoAnulado.setFont(fontDatos);
            styleMontoAnulado.setAlignment(HorizontalAlignment.RIGHT);
            styleMontoAnulado.setDataFormat(formatoMoneda);

            XSSFCellStyle styleTotalLabel = workbook.createCellStyle();
            styleTotalLabel.setFont(fontTotal);
            styleTotalLabel.setAlignment(HorizontalAlignment.RIGHT);

            XSSFCellStyle styleTotalMonto = workbook.createCellStyle();
            styleTotalMonto.setFont(fontTotal);
            styleTotalMonto.setAlignment(HorizontalAlignment.RIGHT);
            styleTotalMonto.setDataFormat(formatoMoneda);
            styleTotalMonto.setBorderTop(BorderStyle.THIN);
            styleTotalMonto.setBorderBottom(BorderStyle.DOUBLE);

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);

            String[] columnas = {"ID Comprobante", "Operación", "Servicio", "Cliente / Origen", "Fecha Emisión", "Método Pago", "Monto Cobrado", "Estado"};
            for (int i = 0; i < columnas.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(columnas[i]);
                if (columnas[i].equals("Monto Cobrado")) {
                    cell.setCellStyle(styleCabeceraMonto);
                } else {
                    cell.setCellStyle(styleCabecera);
                }
            }

            double totalNetoFlujoExcel = 0.0;
            int rowIndex = 1;

            for (Pedido p : pedidos) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIndex);
                row.setHeightInPoints(18);

                String nroDoc = p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "NV-" + p.getId();

                // 🛡️ REGLA ESTRICTA DE ANULACIÓN: Mapeamos con exactitud los enums de La Jama
                boolean esAnulado = (p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.EXTORNADO
                        || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO);

                boolean esCebra = (rowIndex % 2 == 0);
                org.apache.poi.ss.usermodel.CellStyle currentStyle = esAnulado ? styleDataAnulado : (esCebra ? styleDataCebra : styleDataBlanca);
                org.apache.poi.ss.usermodel.CellStyle currentMontoStyle = esAnulado ? styleMontoAnulado : (esCebra ? styleMontoCebra : styleMontoBlanco);

                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;

                // Identificación exacta de la operación
                String tipoOperacion = "INGRESO";
                if (p.getClienteCorreo() != null && p.getClienteCorreo().contains("MANUAL_EGRESO")) {
                    tipoOperacion = "EGRESO";
                } else if (esAnulado) {
                    tipoOperacion = "EGRESO"; // En la UI los anulados se pintan como EGRESO
                }

                // 📐 CÁLCULO MATEMÁTICO REAL: Sincronizado al centavo con la UI de la web
                if (nroDoc.startsWith("M-")) {
                    if ("EGRESO".equals(tipoOperacion)) {
                        totalNetoFlujoExcel -= monto;
                    } else {
                        totalNetoFlujoExcel += monto;
                    }
                } else {
                    // Si es una nota de venta, si está ANULADA aporta 0 al flujo neto real (los ingresos ya se anularon contablemente)
                    if (!esAnulado) {
                        totalNetoFlujoExcel += monto;
                    }
                }

                String tipoServicio = "Salón";
                if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.DELIVERY) tipoServicio = "Delivery";
                else if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.LLEVAR) tipoServicio = "Para Llevar";
                else if (nroDoc.startsWith("M-")) tipoServicio = "—";

                String cliente = p.getCliente() != null ? p.getCliente() : "Mesa #" + p.getNumeroMesa();
                String fecha = p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy (HH:mm)")) : "-";
                String metodo = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";

                // Forzar etiquetas exactas
                String estadoTxt = esAnulado ? "ANULADO" : (nroDoc.startsWith("M-") ? "MOV. MANUAL" : "LIQUIDADO");

                org.apache.poi.ss.usermodel.Cell c0 = row.createCell(0); c0.setCellValue(nroDoc); c0.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c1 = row.createCell(1); c1.setCellValue(tipoOperacion); c1.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c2 = row.createCell(2); c2.setCellValue(tipoServicio); c2.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c3 = row.createCell(3); c3.setCellValue(cliente); c3.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c4 = row.createCell(4); c4.setCellValue(fecha); c4.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c5 = row.createCell(5); c5.setCellValue(metodo); c5.setCellStyle(currentStyle);

                org.apache.poi.ss.usermodel.Cell c6 = row.createCell(6);
                c6.setCellValue(monto);
                c6.setCellStyle(currentMontoStyle);

                org.apache.poi.ss.usermodel.Cell c7 = row.createCell(7); c7.setCellValue(estadoTxt); c7.setCellStyle(currentStyle);

                rowIndex++;
            }

            org.apache.poi.ss.usermodel.Row totalRow = sheet.createRow(rowIndex + 1);
            totalRow.setHeightInPoints(22);

            org.apache.poi.ss.usermodel.Cell labelCell = totalRow.createCell(5);
            labelCell.setCellValue("FLUJO NETO REAL CAJA:");
            labelCell.setCellStyle(styleTotalLabel);

            org.apache.poi.ss.usermodel.Cell totalMontoCell = totalRow.createCell(6);
            totalMontoCell.setCellValue(totalNetoFlujoExcel);
            totalMontoCell.setCellStyle(styleTotalMonto);

            for (int i = 0; i < columnas.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 800);
            }

            workbook.write(out);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private byte[] exportarPDF(List<Pedido> pedidos) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);
            document.setMargins(30, 36, 30, 36);

            DeviceRgb colorPrimario = new DeviceRgb(27, 58, 44);
            DeviceRgb colorSecundario = new DeviceRgb(147, 61, 45);
            DeviceRgb colorTextoCelda = new DeviceRgb(40, 40, 40);
            DeviceRgb colorFilaPar = new DeviceRgb(245, 247, 245);
            DeviceRgb colorFondoAnulado = new DeviceRgb(255, 242, 242);

            Table headerTable = new Table(new float[]{350f, 150f});
            headerTable.setWidth(UnitValue.createPercentValue(100));

            headerTable.addCell(new Cell().add(new Paragraph("LA JAMA").setFontSize(22).setBold().setFontColor(colorPrimario).setMarginBottom(2))
                    .add(new Paragraph("SISTEMA DE AUDITORÍA Y CONTROL CONTABLE").setFontSize(9).setBold().setFontColor(new DeviceRgb(120, 120, 120)))
                    .setBorder(Border.NO_BORDER));

            headerTable.addCell(new Cell().add(new Paragraph("REPORTE DE CAJA").setFontSize(12).setBold().setFontColor(colorSecundario).setTextAlignment(TextAlignment.RIGHT))
                    .add(new Paragraph("Fecha: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).setFontSize(8).setTextAlignment(TextAlignment.RIGHT).setFontColor(colorTextoCelda))
                    .setBorder(Border.NO_BORDER));

            document.add(headerTable);
            document.add(new Paragraph("").setMarginTop(5).setMarginBottom(15).setBorderBottom(new SolidBorder(colorPrimario, 1f)));

            float[] columnWidths = {90f, 65f, 75f, 125f, 85f, 65f, 65f, 65f};
            Table table = new Table(columnWidths);
            table.setWidth(UnitValue.createPercentValue(100));

            String[] headers = {"ID Comprobante", "Operación", "Servicio", "Cliente / Origen", "Fecha / Hora", "Método", "Monto", "Estado"};
            for (String h : headers) {
                table.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(8.5f).setFontColor(DeviceRgb.WHITE))
                        .setBackgroundColor(colorPrimario).setPadding(5).setTextAlignment(h.equals("Monto") ? TextAlignment.RIGHT : TextAlignment.LEFT).setBorder(Border.NO_BORDER));
            }

            double totalNetoFlujo = 0.0;
            int index = 0;

            for (Pedido p : pedidos) {
                String nroDoc = p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "NV-" + p.getId();

                boolean esAnulado = (p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.EXTORNADO
                        || p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO);

                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;

                String tipoOperacion = "INGRESO";
                if (p.getClienteCorreo() != null && p.getClienteCorreo().contains("MANUAL_EGRESO")) {
                    tipoOperacion = "EGRESO";
                } else if (esAnulado) {
                    tipoOperacion = "EGRESO";
                }

                if (nroDoc.startsWith("M-")) {
                    if ("EGRESO".equals(tipoOperacion)) totalNetoFlujo -= monto;
                    else totalNetoFlujo += monto;
                } else {
                    if (!esAnulado) totalNetoFlujo += monto;
                }

                Color rowBg = esAnulado ? colorFondoAnulado : ((index % 2 == 0) ? DeviceRgb.WHITE : colorFilaPar);
                String tipoServicio = "Salón";
                if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.DELIVERY) tipoServicio = "Delivery";
                else if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.LLEVAR) tipoServicio = "Para Llevar";
                else if (nroDoc.startsWith("M-")) tipoServicio = "—";

                String cliente = p.getCliente() != null ? p.getCliente() : "Mesa #" + p.getNumeroMesa();
                String fecha = p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-";
                String metodo = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";
                String estadoTxt = esAnulado ? "ANULADO" : (nroDoc.startsWith("M-") ? "MOV. MANUAL" : "LIQUIDADO");

                table.addCell(new Cell().add(new Paragraph(nroDoc).setBold().setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(tipoOperacion).setBold().setFontSize(8f).setFontColor(esAnulado ? colorSecundario : colorPrimario)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER));
                table.addCell(new Cell().add(new Paragraph(tipoServicio).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(cliente).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(fecha).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(metodo).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(String.format("S/ %.2f", monto)).setFontSize(8f).setBold()).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setFontColor(esAnulado ? colorSecundario : colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(estadoTxt).setBold().setFontSize(8f).setFontColor(esAnulado ? colorSecundario : colorPrimario)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER));

                index++;
            }

            document.add(table);

            Table footerTable = new Table(new float[]{300f, 240f});
            footerTable.setWidth(UnitValue.createPercentValue(100)).setMarginTop(20);
            footerTable.addCell(new Cell().add(new Paragraph("Fin del reporte de auditoría corporativa.").setFontSize(8).setItalic().setFontColor(new DeviceRgb(140, 140, 140))).setBorder(Border.NO_BORDER));

            Cell totalCell = new Cell().add(new Paragraph("FLUJO NETO REAL CAJA").setFontSize(9).setBold().setFontColor(colorPrimario).setTextAlignment(TextAlignment.RIGHT))
                    .add(new Paragraph(String.format("S/ %.2f", totalNetoFlujo)).setFontSize(16).setBold().setFontColor(colorPrimario).setTextAlignment(TextAlignment.RIGHT))
                    .setBackgroundColor(colorFilaPar).setPadding(8).setBorder(new SolidBorder(colorPrimario, 1f));

            footerTable.addCell(totalCell);
            document.add(footerTable);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }
}