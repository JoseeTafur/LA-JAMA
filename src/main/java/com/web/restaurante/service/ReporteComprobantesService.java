package com.web.restaurante.service;

// ── IMPORTACIONES NATIVAS DE JAVA ──
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

// ── IMPORTACIONES DE SPRING BOOT Y PERSISTENCIA ──
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

// ── IMPORTACIONES DE TU MODELO DE LA JAMA ──
import com.web.restaurante.model.Pedido;
import com.web.restaurante.repository.PedidoRepository;

// ── IMPORTACIONES DE ITEXT PDF (Estructura del Documento) ──
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.borders.SolidBorder;

// ── IMPORTACIONES DE APACHE POI EXCEL (XSSF) ──
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;



@Service
public class ReporteComprobantesService {

    @Autowired
    private PedidoRepository pedidoRepository;

    public byte[] generarReporteComprobantes(String pestaña, String formato) {
        List<Pedido> todasLasOrdenes = pedidoRepository.findAll();
        List<Pedido> filtrados;

        // Clasificación contable exacta alineada al 100% con tu vista HTML de tres pestañas
        if ("PENDIENTES".equalsIgnoreCase(pestaña)) {
            filtrados = todasLasOrdenes.stream()
                    .filter(p -> p.getComprobanteNumero() == null
                            && p.getComprobanteNotaNumero() != null
                            && !p.getComprobanteNotaNumero().isEmpty()
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            && p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.EXTORNADO)
                    .collect(Collectors.toList());
        } else if ("EMITIDOS".equalsIgnoreCase(pestaña)) {
            filtrados = todasLasOrdenes.stream()
                    .filter(p -> p.getComprobanteNumero() != null
                            && p.getEstado() != com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            && p.getEstadoPago() != com.web.restaurante.model.enums.EstadoPago.EXTORNADO)
                    .collect(Collectors.toList());
        } else { // ANULADOS
            filtrados = todasLasOrdenes.stream()
                    .filter(p -> p.getComprobanteNumero() != null
                            && (p.getMetodoPago() != null)
                            && (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            || p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.EXTORNADO))
                    .collect(Collectors.toList());
        }

        // Ordenamos cronológicamente (Más nuevos arriba)
        filtrados.sort((a, b) -> b.getId().compareTo(a.getId()));

        if ("EXCEL".equalsIgnoreCase(formato)) {
            return exportarExcelComprobantes(filtrados, pestaña);
        } else {
            return exportarPDFComprobantes(filtrados, pestaña);
        }
    }

    private byte[] exportarExcelComprobantes(List<Pedido> lista, String titulo) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Comprobantes");
            sheet.setDisplayGridlines(true);

            // 🚀 CORRECCIÓN 1: Tipeo de XSSFColor corregido
            XSSFColor colorPrimario = new XSSFColor(new byte[]{(byte) 27, (byte) 58, (byte) 44}, null);
            XSSFFont fontHeader = workbook.createFont();
            fontHeader.setBold(true);
            fontHeader.setColor(IndexedColors.WHITE.getIndex());

            XSSFCellStyle styleHeader = workbook.createCellStyle();
            styleHeader.setFillForegroundColor(colorPrimario);
            styleHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleHeader.setFont(fontHeader);

            // 🚀 CORRECCIÓN 2: Declaración explícita con 'org.apache.poi.ss.usermodel.Row' para evitar conflictos con iText
            org.apache.poi.ss.usermodel.Row rHeader = sheet.createRow(0);
            String[] cabeceras = {"Nota Venta", "CPE SUNAT", "Nota Crédito", "Cliente", "Fecha", "Monto", "Método"};
            for (int i = 0; i < cabeceras.length; i++) {
                // 🚀 CORRECCIÓN 3: Uso explícita de 'org.apache.poi.ss.usermodel.Cell'
                org.apache.poi.ss.usermodel.Cell c = rHeader.createCell(i);
                c.setCellValue(cabeceras[i]);
                c.setCellStyle(styleHeader);
            }

            int rIdx = 1;
            for (Pedido p : lista) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);

                org.apache.poi.ss.usermodel.Cell c0 = row.createCell(0);
                c0.setCellValue(p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "—");

                org.apache.poi.ss.usermodel.Cell c1 = row.createCell(1);
                c1.setCellValue(p.getComprobanteENumero() != null ? p.getComprobanteENumero() : (p.getComprobanteNumero() != null ? p.getComprobanteNumero() : "—"));

                org.apache.poi.ss.usermodel.Cell c2 = row.createCell(2);
                c2.setCellValue(p.getCreditoNotaNumero() != null ? p.getCreditoNotaNumero() : "—");

                org.apache.poi.ss.usermodel.Cell c3 = row.createCell(3);
                c3.setCellValue(p.getCliente() != null ? p.getCliente() : "—");

                org.apache.poi.ss.usermodel.Cell c4 = row.createCell(4);
                c4.setCellValue(p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "—");

                org.apache.poi.ss.usermodel.Cell c5 = row.createCell(5);
                c5.setCellValue(p.getMontoTotal() != null ? p.getMontoTotal() : 0.0);

                org.apache.poi.ss.usermodel.Cell c6 = row.createCell(6);
                c6.setCellValue(p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");
            }

            for (int i = 0; i < cabeceras.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private byte[] exportarPDFComprobantes(List<Pedido> lista, String titulo) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            DeviceRgb lajamaGreen = new DeviceRgb(27, 58, 44);
            doc.add(new Paragraph("LA JAMA - COMPROBANTES FISCALES").setFontSize(16).setBold().setFontColor(lajamaGreen));
            doc.add(new Paragraph("SUB-REPORTE OPERATIVO: TABLA DE " + titulo.toUpperCase()).setFontSize(9).setItalic());
            doc.add(new Paragraph("").setBorderBottom(new SolidBorder(lajamaGreen, 1f)).setMarginBottom(15));

            float[] widths = {70f, 75f, 75f, 110f, 85f, 55f, 55f};
            Table table = new Table(widths).setWidth(UnitValue.createPercentValue(100));

            String[] cabeceras = {"Nota Venta", "CPE SUNAT", "Nota Crédito", "Cliente", "Fecha", "Monto", "Método"};
            for (String c : cabeceras) {
                table.addHeaderCell(new Cell().add(new Paragraph(c).setFontSize(8.5f).setBold().setFontColor(DeviceRgb.WHITE)).setBackgroundColor(lajamaGreen).setPadding(4));
            }

            for (Pedido p : lista) {
                table.addCell(new Cell().add(new Paragraph(p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "—").setFontSize(8f)));
                table.addCell(new Cell().add(new Paragraph(p.getComprobanteENumero() != null ? p.getComprobanteENumero() : (p.getComprobanteNumero() != null ? p.getComprobanteNumero() : "—")).setFontSize(8f)));
                table.addCell(new Cell().add(new Paragraph(p.getCreditoNotaNumero() != null ? p.getCreditoNotaNumero() : "—").setFontSize(8f)));
                table.addCell(new Cell().add(new Paragraph(p.getCliente()).setFontSize(8f)));
                table.addCell(new Cell().add(new Paragraph(p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "—").setFontSize(8f)));
                table.addCell(new Cell().add(new Paragraph(String.format("S/ %.2f", p.getMontoTotal())).setFontSize(8f).setBold()));
                table.addCell(new Cell().add(new Paragraph(p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO").setFontSize(8f)));
            }

            doc.add(table);
            doc.close();
        } catch (Exception e) { e.printStackTrace(); }
        return out.toByteArray();
    }
}