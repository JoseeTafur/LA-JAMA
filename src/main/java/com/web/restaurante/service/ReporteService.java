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
import com.web.restaurante.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReporteService {

    @Autowired
    private PedidoRepository pedidoRepository;

    public byte[] generarReporteLiquidados(String formato, String texto, String metodo, String origen) {
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime finDia = LocalDate.now().atTime(23, 59, 59);

        List<Pedido> lista = pedidoRepository.findByFechaCreacionBetweenOrderByFechaCreacionDesc(inicioDia, finDia);

        List<Pedido> filtrados = lista.stream().filter(p -> {
            boolean cumpleTexto = true;
            if (texto != null && !texto.trim().isEmpty()) {
                String t = texto.toLowerCase();
                String cliente = p.getCliente() != null ? p.getCliente().toLowerCase() : "";
                String mesa = p.getNumeroMesa() != null ? String.valueOf(p.getNumeroMesa()) : "";
                String id = String.valueOf(p.getId());
                cumpleTexto = cliente.contains(t) || mesa.contains(t) || id.contains(t);
            }

            boolean cumpleMetodo = true;
            if (metodo != null && !metodo.equals("TODOS")) {
                String mp = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";
                cumpleMetodo = mp.equals(metodo);
            }

            boolean cumpleOrigen = true;
            if (origen != null && !origen.equals("TODOS")) {
                if (origen.equals("SALON")) cumpleOrigen = p.getNumeroMesa() != null;
                else if (origen.equals("DELIVERY")) cumpleOrigen = p.getNumeroMesa() == null;
            }
            return cumpleTexto && cumpleMetodo && cumpleOrigen;
        }).collect(Collectors.toList());

        return procesarReporteEstructurado(filtrados, formato);
    }

    public byte[] generarReporteBitacoraCaja(String formato) {
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime finDia = LocalDate.now().atTime(23, 59, 59);
        List<Pedido> lista = pedidoRepository.findByFechaCreacionBetweenOrderByFechaCreacionDesc(inicioDia, finDia);
        return procesarReporteEstructurado(lista, formato);
    }

    public byte[] generarReporteHistorialCompleto(String formato, String inicio, String fin, String metodo, String origen) {
        LocalDate fechaInicio = (inicio != null && !inicio.isEmpty()) ? LocalDate.parse(inicio) : LocalDate.now().minusDays(30);
        LocalDate fechaFin = (fin != null && !fin.isEmpty()) ? LocalDate.parse(fin) : LocalDate.now();

        Page<Pedido> pagina = pedidoRepository.findHistorialComprobantes(fechaInicio, fechaFin, PageRequest.of(0, Integer.MAX_VALUE));
        List<Pedido> lista = pagina.getContent();

        List<Pedido> filtrados = lista.stream().filter(p -> {
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

            // 🎨 PALETA DE COLORES "LA JAMA" (Standard XSSFColor)
            byte[] rgbPrimario = new byte[]{(byte) 27, (byte) 58, (byte) 44};     // #1B3A2C (Verde Oscuro)
            byte[] rgbSecundario = new byte[]{(byte) 147, (byte) 61, (byte) 45};  // #933D2D (Dorado/Óxido)
            byte[] rgbFilaPar = new byte[]{(byte) 245, (byte) 247, (byte) 245};   // Cebra sutil

            XSSFColor colorPrimario = new XSSFColor(rgbPrimario, null);
            XSSFColor colorSecundario = new XSSFColor(rgbSecundario, null);
            XSSFColor colorFilaPar = new XSSFColor(rgbFilaPar, null);

            // 🔤 FUENTES EXCEL
            org.apache.poi.ss.usermodel.Font fontCabecera = workbook.createFont();
            fontCabecera.setBold(true);
            fontCabecera.setColor(IndexedColors.WHITE.getIndex());
            fontCabecera.setFontHeightInPoints((short) 10);

            org.apache.poi.ss.usermodel.Font fontDatos = workbook.createFont();
            fontDatos.setFontHeightInPoints((short) 9.5);

            org.apache.poi.ss.usermodel.Font fontTotal = workbook.createFont();
            fontTotal.setBold(true);
            fontTotal.setFontHeightInPoints((short) 11);

            // 📝 ESTILOS DE CELDAS EXCEL
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

            XSSFCellStyle styleTotalLabel = workbook.createCellStyle();
            styleTotalLabel.setFont(fontTotal);
            styleTotalLabel.setAlignment(HorizontalAlignment.RIGHT);

            XSSFCellStyle styleTotalMonto = workbook.createCellStyle();
            styleTotalMonto.setFont(fontTotal);
            styleTotalMonto.setAlignment(HorizontalAlignment.RIGHT);
            styleTotalMonto.setDataFormat(formatoMoneda);
            styleTotalMonto.setBorderTop(BorderStyle.THIN);
            styleTotalMonto.setBorderBottom(BorderStyle.DOUBLE);

            // 🏁 GENERACIÓN DE CABECERAS
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);

            String[] columnas = {"ID Comprobante", "Tipo Servicio", "Cliente / Origen", "Fecha Emisión", "Método Pago", "Monto Cobrado"};
            for (int i = 0; i < columnas.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(columnas[i]);
                if (columnas[i].equals("Monto Cobrado")) {
                    cell.setCellStyle(styleCabeceraMonto);
                } else {
                    cell.setCellStyle(styleCabecera);
                }
            }

            double total = 0.0;
            int rowIndex = 1;

            // INYECCIÓN DE REGISTROS DE PEDIDOS
            for (Pedido p : pedidos) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIndex);
                row.setHeightInPoints(18);

                boolean esCebra = (rowIndex % 2 == 0);
                org.apache.poi.ss.usermodel.CellStyle currentStyle = esCebra ? styleDataCebra : styleDataBlanca;
                org.apache.poi.ss.usermodel.CellStyle currentMontoStyle = esCebra ? styleMontoCebra : styleMontoBlanco;

                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
                total += monto;

                String nroDoc = p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "NV-" + p.getId();
                String tipoServicio = p.getNumeroMesa() != null ? "Salón" : "Delivery";
                String cliente = p.getCliente() != null ? p.getCliente() : "Mesa #" + p.getNumeroMesa();
                String fecha = p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-";
                String metodo = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";

                org.apache.poi.ss.usermodel.Cell c0 = row.createCell(0); c0.setCellValue(nroDoc); c0.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c1 = row.createCell(1); c1.setCellValue(tipoServicio); c1.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c2 = row.createCell(2); c2.setCellValue(cliente); c2.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c3 = row.createCell(3); c3.setCellValue(fecha); c3.setCellStyle(currentStyle);
                org.apache.poi.ss.usermodel.Cell c4 = row.createCell(4); c4.setCellValue(metodo); c4.setCellStyle(currentStyle);

                org.apache.poi.ss.usermodel.Cell c5 = row.createCell(5);
                c5.setCellValue(monto);
                c5.setCellStyle(currentMontoStyle);

                rowIndex++;
            }

            // TOTAL CONSOLIDADO EN EXCEL
            org.apache.poi.ss.usermodel.Row totalRow = sheet.createRow(rowIndex + 1);
            totalRow.setHeightInPoints(22);

            org.apache.poi.ss.usermodel.Cell labelCell = totalRow.createCell(4);
            labelCell.setCellValue("TOTAL CONSOLIDADO:");
            labelCell.setCellStyle(styleTotalLabel);

            org.apache.poi.ss.usermodel.Cell totalMontoCell = totalRow.createCell(5);
            totalMontoCell.setCellValue(total);
            totalMontoCell.setCellStyle(styleTotalMonto);

            // 📐 FORMATO DINÁMICO DE ANCHOS
            for (int i = 0; i < columnas.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1200);
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

            // 🎨 COLORES CORPORATIVOS "LA JAMA"
            DeviceRgb colorPrimario = new DeviceRgb(27, 58, 44);     // Verde
            DeviceRgb colorSecundario = new DeviceRgb(147, 61, 45);  // Óxido
            DeviceRgb colorTextoCelda = new DeviceRgb(40, 40, 40);
            DeviceRgb colorFilaPar = new DeviceRgb(245, 247, 245);

            // 🏛️ ENCABEZADO
            Table headerTable = new Table(new float[]{350f, 150f});
            headerTable.setWidth(UnitValue.createPercentValue(100));

            headerTable.addCell(new Cell().add(new Paragraph("LA JAMA")
                            .setFontSize(22).setBold().setFontColor(colorPrimario).setMarginBottom(2))
                    .add(new Paragraph("SISTEMA DE AUDITORÍA Y CONTROL CONTABLE").setFontSize(9).setBold().setFontColor(new DeviceRgb(120, 120, 120)))
                    .setBorder(Border.NO_BORDER));

            headerTable.addCell(new Cell().add(new Paragraph("REPORTE DE CAJA")
                            .setFontSize(12).setBold().setFontColor(colorSecundario).setTextAlignment(TextAlignment.RIGHT))
                    .add(new Paragraph("Fecha: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                            .setFontSize(8).setTextAlignment(TextAlignment.RIGHT).setFontColor(colorTextoCelda))
                    .setBorder(Border.NO_BORDER));

            document.add(headerTable);

            document.add(new Paragraph("").setMarginTop(5).setMarginBottom(15)
                    .setBorderBottom(new SolidBorder(colorPrimario, 1f)));

            // 📊 TABLA ESTRUCTURADA
            float[] columnWidths = {100f, 75f, 130f, 95f, 75f, 65f};
            Table table = new Table(columnWidths);
            table.setWidth(UnitValue.createPercentValue(100));

            String[] headers = {"ID Documento", "Servicio", "Cliente / Origen", "Fecha / Hora", "Método", "Monto"};
            for (String h : headers) {
                table.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(9).setFontColor(DeviceRgb.WHITE))
                        .setBackgroundColor(colorPrimario)
                        .setPadding(6)
                        .setTextAlignment(h.equals("Monto") ? TextAlignment.RIGHT : TextAlignment.LEFT)
                        .setBorder(Border.NO_BORDER));
            }

            double totalAcumulado = 0.0;
            int index = 0;

            for (Pedido p : pedidos) {
                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
                totalAcumulado += monto;

                Color rowBg = (index % 2 == 0) ? DeviceRgb.WHITE : colorFilaPar;

                String nroDoc = p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "NV-" + p.getId();
                String tipoServicio = p.getNumeroMesa() != null ? "Salón" : "Delivery";
                String cliente = p.getCliente() != null ? p.getCliente() : "Mesa #" + p.getNumeroMesa();
                String fecha = p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-";
                String metodo = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";

                table.addCell(new Cell().add(new Paragraph(nroDoc).setBold().setFontSize(8.5f)).setBackgroundColor(rowBg).setPadding(6).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(tipoServicio).setFontSize(8.5f)).setBackgroundColor(rowBg).setPadding(6).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(cliente).setFontSize(8.5f)).setBackgroundColor(rowBg).setPadding(6).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(fecha).setFontSize(8.5f)).setBackgroundColor(rowBg).setPadding(6).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(metodo).setFontSize(8.5f)).setBackgroundColor(rowBg).setPadding(6).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));

                table.addCell(new Cell().add(new Paragraph(String.format("S/ %.2f", monto)).setFontSize(8.5f).setBold())
                        .setBackgroundColor(rowBg).setPadding(6).setBorder(Border.NO_BORDER)
                        .setTextAlignment(TextAlignment.RIGHT).setFontColor(colorTextoCelda));

                index++;
            }

            document.add(table);

            // 💰 TOTAL GENERAL
            Table footerTable = new Table(new float[]{300f, 240f});
            footerTable.setWidth(UnitValue.createPercentValue(100));
            footerTable.setMarginTop(20);

            footerTable.addCell(new Cell().add(new Paragraph("Fin del reporte de auditoría corporativa.")
                            .setFontSize(8).setItalic().setFontColor(new DeviceRgb(140, 140, 140)))
                    .setBorder(Border.NO_BORDER));

            Cell totalCell = new Cell().add(new Paragraph("TOTAL CONSOLIDADO")
                            .setFontSize(9).setBold().setFontColor(colorPrimario).setTextAlignment(TextAlignment.RIGHT))
                    .add(new Paragraph(String.format("S/ %.2f", totalAcumulado))
                            .setFontSize(16).setBold().setFontColor(colorSecundario).setTextAlignment(TextAlignment.RIGHT))
                    .setBackgroundColor(colorFilaPar)
                    .setPadding(8)
                    .setBorder(new SolidBorder(colorPrimario, 1f));

            footerTable.addCell(totalCell);
            document.add(footerTable);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }
}