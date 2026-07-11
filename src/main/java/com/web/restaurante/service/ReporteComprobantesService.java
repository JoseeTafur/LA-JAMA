package com.web.restaurante.service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.web.restaurante.model.Pedido;
import com.web.restaurante.repository.PedidoRepository;

// ── IMPORTACIONES DE ITEXT PDF ──
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;

// ── IMPORTACIONES DE APACHE POI EXCEL ──
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@Service
public class ReporteComprobantesService {

    @Autowired
    private PedidoRepository pedidoRepository;

    public byte[] generarReporteComprobantes(String pestaña, String formato, String inicio, String fin, String texto, String metodo, String origen) {
        List<Pedido> todasLasOrdenes = pedidoRepository.findAll();
        List<Pedido> filtrados;

        // 1. Clasificación base por Pestaña Operativa
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
                            && (p.getEstado() == com.web.restaurante.model.enums.EstadoPedido.CANCELADO
                            || p.getEstadoPago() == com.web.restaurante.model.enums.EstadoPago.EXTORNADO))
                    .collect(Collectors.toList());
        }

        // 2. Motor de Filtrado Cruzado Asíncrono (Misma lógica que la UI)
        final String txtLimpio = texto != null ? texto.toLowerCase().trim() : "";
        final String metodoUpper = metodo != null ? metodo.toUpperCase().trim() : "TODOS";
        final String origenUpper = origen != null ? origen.toUpperCase().trim() : "TODOS";

        LocalDate dateInicio = (inicio != null && !inicio.isEmpty()) ? LocalDate.parse(inicio) : null;
        LocalDate dateFin = (fin != null && !fin.isEmpty()) ? LocalDate.parse(fin) : null;

        filtrados = filtrados.stream()
                .filter(p -> {
                    // Filtro de Rango Cronológico (La pestaña PENDIENTES ignora rangos históricos por regla de negocio)
                    if (!"PENDIENTES".equalsIgnoreCase(pestaña) && p.getFechaCreacion() != null) {
                        LocalDate fPedido = p.getFechaCreacion().toLocalDate();
                        if (dateInicio != null && fPedido.isBefore(dateInicio)) return false;
                        if (dateFin != null && fPedido.isAfter(dateFin)) return false;
                    }

                    // Filtro de Texto (Nombre, Serie CPE, Serie Nota de Venta, DNI/RUC)
                    if (!txtLimpio.isEmpty()) {
                        String cliente = p.getCliente() != null ? p.getCliente().toLowerCase() : "";
                        String cpe = p.getComprobanteNumero() != null ? p.getComprobanteNumero().toLowerCase() : "";
                        String nv = p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero().toLowerCase() : "";
                        String doc = p.getDocumentoCliente() != null ? p.getDocumentoCliente().toLowerCase() : "";

                        if (!cliente.contains(txtLimpio) && !cpe.contains(txtLimpio) && !nv.contains(txtLimpio) && !doc.contains(txtLimpio)) {
                            return false;
                        }
                    }

                    // Filtro de Método de Pago con Desacoplamiento de Billeteras Digitales
                    if (!"TODOS".equals(metodoUpper)) {
                        String mp = p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO";

                        if ("YAPE".equals(metodoUpper)) {
                            // Si se pide YAPE, se excluye drásticamente a PLIN
                            if (!"YAPE".equals(mp) && !"YAPE_PLIN".equals(mp)) return false;
                        } else if ("PLIN".equals(metodoUpper)) {
                            // Si se pide PLIN, se excluye drásticamente a YAPE
                            if (!"PLIN".equals(mp) && !"YAPE_PLIN".equals(mp)) return false;
                        } else {
                            // Para EFECTIVO o TARJETA de forma exacta
                            if (!mp.equals(metodoUpper)) return false;
                        }
                    }

                    // Filtro de Origen o Canal del Pedido
                    if (!"TODOS".equals(origenUpper)) {
                        String tipo = p.getTipoPedido() != null ? p.getTipoPedido().name() : "SALON";
                        if (!tipo.equals(origenUpper)) return false;
                    }

                    return true;
                })
                .collect(Collectors.toList());

        // Ordenamos cronológicamente descendente (Lo más nuevo arriba)
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
            XSSFSheet sheet = workbook.createSheet("Comprobantes Fiscales");
            sheet.setDisplayGridlines(true);

            // Paleta de Colores de La Jama
            byte[] rgbPrimario = new byte[]{(byte) 27, (byte) 58, (byte) 44};     // #1B3A2C
            byte[] rgbFilaPar = new byte[]{(byte) 245, (byte) 247, (byte) 245};  // #F5F7F5
            byte[] rgbAnulado = new byte[]{(byte) 255, (byte) 242, (byte) 242};  // #FFF2F2

            XSSFColor colorPrimario = new XSSFColor(rgbPrimario, null);
            XSSFColor colorFilaPar = new XSSFColor(rgbFilaPar, null);
            XSSFColor colorAnulado = new XSSFColor(rgbAnulado, null);

            XSSFFont fontHeader = workbook.createFont();
            fontHeader.setBold(true);
            fontHeader.setColor(IndexedColors.WHITE.getIndex());
            fontHeader.setFontHeightInPoints((short) 10);

            XSSFFont fontDatos = workbook.createFont();
            fontDatos.setFontHeightInPoints((short) 9.5);

            XSSFFont fontTotal = workbook.createFont();
            fontTotal.setBold(true);
            fontTotal.setFontHeightInPoints((short) 11);

            // Estilos de Celda
            XSSFCellStyle styleHeader = workbook.createCellStyle();
            styleHeader.setFillForegroundColor(colorPrimario);
            styleHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            styleHeader.setFont(fontHeader);
            styleHeader.setAlignment(HorizontalAlignment.LEFT);
            styleHeader.setVerticalAlignment(VerticalAlignment.CENTER);

            XSSFCellStyle styleHeaderMonto = workbook.createCellStyle();
            styleHeaderMonto.cloneStyleFrom(styleHeader);
            styleHeaderMonto.setAlignment(HorizontalAlignment.RIGHT);

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

            // Formato Numérico Contable
            DataFormat df = workbook.createDataFormat();
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

            CellStyle styleTotalLabel = workbook.createCellStyle();
            styleTotalLabel.setFont(fontTotal);
            styleTotalLabel.setAlignment(HorizontalAlignment.RIGHT);

            CellStyle styleTotalMonto = workbook.createCellStyle();
            styleTotalMonto.setFont(fontTotal);
            styleTotalMonto.setAlignment(HorizontalAlignment.RIGHT);
            styleTotalMonto.setDataFormat(formatoMoneda);
            styleTotalMonto.setBorderTop(BorderStyle.THIN);
            styleTotalMonto.setBorderBottom(BorderStyle.DOUBLE);

            // Construcción de Cabeceras
            org.apache.poi.ss.usermodel.Row rHeader = sheet.createRow(0);
            rHeader.setHeightInPoints(24);
            String[] cabeceras = {"Nota Venta", "CPE SUNAT", "Nota Crédito", "Cliente", "Fecha / Hora", "Origen", "Método", "Monto Total"};

            for (int i = 0; i < cabeceras.length; i++) {
                org.apache.poi.ss.usermodel.Cell c = rHeader.createCell(i);
                c.setCellValue(cabeceras[i]);
                c.setCellStyle(cabeceras[i].equals("Monto Total") ? styleHeaderMonto : styleHeader);
            }

            int rIdx = 1;
            double totalAcumuladoGeneral = 0.0;
            boolean esPestañaAnulados = "ANULADOS".equalsIgnoreCase(titulo);

            for (Pedido p : lista) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx);
                row.setHeightInPoints(18);

                boolean esCebra = (rIdx % 2 == 0);
                CellStyle currentStyle = esPestañaAnulados ? styleDataAnulado : (esCebra ? styleDataCebra : styleDataBlanca);
                CellStyle currentMontoStyle = esPestañaAnulados ? styleMontoAnulado : (esCebra ? styleMontoCebra : styleMontoBlanco);

                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
                totalAcumuladoGeneral += monto;

                String origenTxt = "Salón";
                if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.DELIVERY) origenTxt = "Delivery";
                else if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.LLEVAR) origenTxt = "Para Llevar";

                row.createCell(0).setCellValue(p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "—");
                row.createCell(1).setCellValue(p.getComprobanteENumero() != null ? p.getComprobanteENumero() : (p.getComprobanteNumero() != null ? p.getComprobanteNumero() : "—"));
                row.createCell(2).setCellValue(p.getCreditoNotaNumero() != null ? p.getCreditoNotaNumero() : "—");
                row.createCell(3).setCellValue(p.getCliente() != null ? p.getCliente() : "Mesa #" + p.getNumeroMesa());
                row.createCell(4).setCellValue(p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "—");
                row.createCell(5).setCellValue(origenTxt);
                row.createCell(6).setCellValue(p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO");

                // Inyección de celdas con sus respectivos estilos corporativos
                for (int i = 0; i <= 6; i++) {
                    row.getCell(i).setCellStyle(currentStyle);
                }

                org.apache.poi.ss.usermodel.Cell cMonto = row.createCell(7);
                cMonto.setCellValue(monto);
                cMonto.setCellStyle(currentMontoStyle);

                rIdx++;
            }

            // Pie de Página - Acumulador Neto de la Tabla
            org.apache.poi.ss.usermodel.Row rowTotal = sheet.createRow(rIdx + 1);
            rowTotal.setHeightInPoints(22);

            org.apache.poi.ss.usermodel.Cell labelTotal = rowTotal.createCell(6);
            labelTotal.setCellValue(esPestañaAnulados ? "TOTAL REVERTIDO:" : "TOTAL SECCIÓN:");
            labelTotal.setCellStyle(styleTotalLabel);

            org.apache.poi.ss.usermodel.Cell valorTotal = rowTotal.createCell(7);
            valorTotal.setCellValue(totalAcumuladoGeneral);
            valorTotal.setCellStyle(styleTotalMonto);

            for (int i = 0; i < cabeceras.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, sheet.getColumnWidth(i) != 0 ? sheet.getColumnWidth(i) + 800 : 4000);
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
            doc.setMargins(30, 36, 30, 36);

            DeviceRgb colorPrimario = new DeviceRgb(27, 58, 44);      // #1B3A2C
            DeviceRgb colorSecundario = new DeviceRgb(147, 61, 45);   // #933D2D
            DeviceRgb colorTextoCelda = new DeviceRgb(40, 40, 40);
            DeviceRgb colorFilaPar = new DeviceRgb(245, 247, 245);
            DeviceRgb colorFondoAnulado = new DeviceRgb(255, 242, 242);

            // Encabezado Estilizado
            Table headerTable = new Table(new float[]{340f, 160f}).setWidth(UnitValue.createPercentValue(100));
            headerTable.addCell(new Cell().add(new Paragraph("LA JAMA").setFontSize(22).setBold().setFontColor(colorPrimario).setMarginBottom(2))
                    .add(new Paragraph("SISTEMA DE AUDITORÍA Y CONTROL CONTABLE").setFontSize(9).setBold().setFontColor(new DeviceRgb(120, 120, 120)))
                    .setBorder(Border.NO_BORDER));

            headerTable.addCell(new Cell().add(new Paragraph("AUDITORÍA DE CPE").setFontSize(12).setBold().setFontColor(colorSecundario).setTextAlignment(TextAlignment.RIGHT))
                    .add(new Paragraph("Fecha: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).setFontSize(8).setTextAlignment(TextAlignment.RIGHT).setFontColor(colorTextoCelda))
                    .setBorder(Border.NO_BORDER));

            doc.add(headerTable);
            doc.add(new Paragraph("SUB-REPORTE OPERATIVO: COMPROBANTES [" + titulo.toUpperCase() + "]").setFontSize(9).setItalic().setFontColor(colorPrimario).setMarginTop(8));
            doc.add(new Paragraph("").setMarginTop(2).setMarginBottom(15).setBorderBottom(new SolidBorder(colorPrimario, 1f)));

            // Grilla de Datos
            float[] widths = {65f, 65f, 65f, 110f, 85f, 55f, 55f, 60f};
            Table table = new Table(widths).setWidth(UnitValue.createPercentValue(100));

            String[] cabeceras = {"Nota Venta", "CPE SUNAT", "Nota Crédito", "Cliente", "Fecha / Hora", "Origen", "Método", "Monto"};
            for (String c : cabeceras) {
                table.addHeaderCell(new Cell().add(new Paragraph(c).setFontSize(8.5f).setBold().setFontColor(DeviceRgb.WHITE))
                        .setBackgroundColor(colorPrimario).setPadding(5).setTextAlignment(c.equals("Monto") ? TextAlignment.RIGHT : TextAlignment.LEFT).setBorder(Border.NO_BORDER));
            }

            int index = 0;
            double totalAcumuladoGeneral = 0.0;
            boolean esPestañaAnulados = "ANULADOS".equalsIgnoreCase(titulo);

            for (Pedido p : lista) {
                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
                totalAcumuladoGeneral += monto;

                com.itextpdf.kernel.colors.Color rowBg = esPestañaAnulados ? colorFondoAnulado : ((index % 2 == 0) ? DeviceRgb.WHITE : colorFilaPar);

                String origenTxt = "Salón";
                if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.DELIVERY) origenTxt = "Delivery";
                else if (p.getTipoPedido() == com.web.restaurante.model.enums.TipoPedido.LLEVAR) origenTxt = "Para Llevar";

                String clienteTxt = p.getCliente() != null ? p.getCliente() : "Mesa #" + p.getNumeroMesa();

                table.addCell(new Cell().add(new Paragraph(p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "—").setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(p.getComprobanteENumero() != null ? p.getComprobanteENumero() : (p.getComprobanteNumero() != null ? p.getComprobanteNumero() : "—")).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(p.getCreditoNotaNumero() != null ? p.getCreditoNotaNumero() : "—").setFontSize(8f).setBold().setFontColor(colorSecundario)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER));
                table.addCell(new Cell().add(new Paragraph(clienteTxt).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(p.getFechaCreacion() != null ? p.getFechaCreacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "—").setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(origenTxt).setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));
                table.addCell(new Cell().add(new Paragraph(p.getMetodoPago() != null ? p.getMetodoPago().name() : "EFECTIVO").setFontSize(8f)).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER).setFontColor(colorTextoCelda));

                table.addCell(new Cell().add(new Paragraph(String.format("S/ %.2f", monto)).setFontSize(8.5f).setBold()).setBackgroundColor(rowBg).setPadding(5).setBorder(Border.NO_BORDER)
                        .setTextAlignment(TextAlignment.RIGHT).setFontColor(esPestañaAnulados ? colorSecundario : colorTextoCelda));

                index++;
            }

            doc.add(table);

            // Pie de Página con Balance Final de Sección
            Table footerTable = new Table(new float[]{300f, 200f}).setWidth(UnitValue.createPercentValue(100)).setMarginTop(20);
            footerTable.addCell(new Cell().add(new Paragraph("Fin del reporte de auditoría de comprobantes fiscales electrónicos.").setFontSize(8).setItalic().setFontColor(new DeviceRgb(140, 140, 140))).setBorder(Border.NO_BORDER));

            Cell totalCell = new Cell().add(new Paragraph(esPestañaAnulados ? "TOTAL REVERTIDO SUNAT" : "TOTAL SECCIÓN").setFontSize(9).setBold().setFontColor(colorPrimario).setTextAlignment(TextAlignment.RIGHT))
                    .add(new Paragraph(String.format("S/ %.2f", totalAcumuladoGeneral)).setFontSize(15).setBold().setFontColor(colorPrimario).setTextAlignment(TextAlignment.RIGHT))
                    .setBackgroundColor(colorFilaPar).setPadding(6).setBorder(new SolidBorder(colorPrimario, 1f));

            footerTable.addCell(totalCell);
            doc.add(footerTable);

            doc.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }
}