package com.web.restaurante.service;

import com.web.restaurante.dto.KardexProteinaDTO;
import com.web.restaurante.dto.LoteInsumoDTO;
import com.web.restaurante.dto.MovimientoPorcionesDTO;
import com.web.restaurante.dto.ProduccionPorcionesDTO;
import com.web.restaurante.mapper.ProteinaMapper;
import com.web.restaurante.model.*;
import com.web.restaurante.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProteinaService {

    private final InsumoRepository insumoRepository;
    private final LoteInsumoRepository loteInsumoRepository;
    private final ProduccionPorcionesRepository produccionRepository;
    private final MovimientoPorcionesRepository movimientoPorcionesRepository;
    private final ProteinaMapper proteinaMapper;

    // ─── LOTES ───────────────────────────────────────────────

    public List<LoteInsumoDTO> listarLotesPorInsumo(Long idInsumo) {
        return loteInsumoRepository.findTop50ByInsumoIdOrderByFechaCompraDesc(idInsumo)
                .stream()
                .map(proteinaMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public LoteInsumoDTO registrarLote(LoteInsumoDTO dto) {
        Insumo insumo = insumoRepository.findById(dto.getIdInsumo())
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        LoteInsumo lote = new LoteInsumo();
        lote.setInsumo(insumo);
        lote.setKgComprados(dto.getKgComprados());
        lote.setSaldoKg(dto.getKgComprados());
        lote.setCostoTotal(dto.getCostoTotal());
        lote.setObservacion(dto.getObservacion());
        lote.setFechaCompra(LocalDateTime.now());
        lote.setPorcionesPorKg(dto.getPorcionesPorKg());

        insumo.setPorcionesPorKg(dto.getPorcionesPorKg());
        insumoRepository.save(insumo);

        return proteinaMapper.toDTO(loteInsumoRepository.save(lote));
    }

    // ─── PRODUCCIÓN ───────────────────────────────────────────

    public List<ProduccionPorcionesDTO> listarProduccionPorInsumo(Long idInsumo) {
        return produccionRepository.findTop50ByLoteInsumoIdOrderByFechaProduccionDesc(idInsumo)
                .stream()
                .map(proteinaMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProduccionPorcionesDTO registrarProduccion(ProduccionPorcionesDTO dto) {
        LoteInsumo lote = loteInsumoRepository.findById(dto.getIdLote())
                .orElseThrow(() -> new RuntimeException("Lote no encontrado"));

        if (lote.getSaldoKg() < dto.getKgProcesados()) {
            throw new RuntimeException("Error: El lote seleccionado solo cuenta con "
                    + lote.getSaldoKg() + " kg disponibles.");
        }

        if (dto.getMermaKg() > dto.getKgProcesados()) {
            throw new RuntimeException("Error: La merma registrada (" + dto.getMermaKg()
                    + " kg) no puede ser superior a los kg procesados (" + dto.getKgProcesados() + " kg).");
        }

        double nuevoSaldoLote = lote.getSaldoKg() - dto.getKgProcesados();
        lote.setSaldoKg(nuevoSaldoLote);
        loteInsumoRepository.save(lote);

        double porcionesEsperadasTeoricas = dto.getKgProcesados() * lote.getPorcionesPorKg();
        int esperadasRedondeadas = (int) Math.round(porcionesEsperadasTeoricas);

        double porcentajeEficiencia = esperadasRedondeadas > 0
                ? ((double) dto.getPorcionesObtenidas() / esperadasRedondeadas) * 100
                : 0.0;

        ProduccionPorciones produccion = new ProduccionPorciones();
        produccion.setLote(lote);
        produccion.setKgProcesados(dto.getKgProcesados());
        produccion.setPorcionesEsperadas(esperadasRedondeadas);
        produccion.setPorcionesObtenidas(dto.getPorcionesObtenidas());
        produccion.setMermaKg(dto.getMermaKg());
        produccion.setObservacion(dto.getObservacion());
        produccion.setFechaProduccion(LocalDateTime.now());

        Insumo insumo = lote.getInsumo();
        int stockActual = insumo.getStockActual() != null ? insumo.getStockActual().intValue() : 0;
        int nuevoStock = stockActual + dto.getPorcionesObtenidas();
        insumo.setStockActual((double) nuevoStock);
        insumoRepository.save(insumo);

        String detalleHistorialKardex = String.format(
                "Producción: %d porc. obtenidas / %d esperadas (Eficiencia: %.1f%%, Merma en Balanza: %.3f kg)",
                dto.getPorcionesObtenidas(),
                esperadasRedondeadas,
                porcentajeEficiencia,
                dto.getMermaKg()
        );

        if (dto.getObservacion() != null && !dto.getObservacion().trim().isEmpty()) {
            detalleHistorialKardex += " — Obs: " + dto.getObservacion();
        }

        registrarMovimiento(insumo, dto.getPorcionesObtenidas(), "INGRESO", detalleHistorialKardex, nuevoStock, dto.getMermaKg());

        return proteinaMapper.toDTO(produccionRepository.save(produccion));
    }

    // ─── MOVIMIENTOS (ajustes manuales) ──────────────────────

    public List<MovimientoPorcionesDTO> listarMovimientosPorInsumo(Long idInsumo) {
        return movimientoPorcionesRepository.findTop50ByInsumoIdOrderByFechaDesc(idInsumo)
                .stream()
                .map(proteinaMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public MovimientoPorcionesDTO ajustarPorciones(Long idInsumo, Integer cantidad, String tipo, String motivo) {
        Insumo insumo = insumoRepository.findById(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        int stockActual = insumo.getStockActual() != null ? insumo.getStockActual().intValue() : 0;
        int nuevoStock = tipo.equals("INGRESO") ? stockActual + cantidad : stockActual - cantidad;

        if (nuevoStock < 0) throw new RuntimeException("Stock insuficiente para realizar el ajuste");

        insumo.setStockActual((double) nuevoStock);
        insumoRepository.save(insumo);

        return proteinaMapper.toDTO(registrarMovimiento(insumo, cantidad, tipo, motivo, nuevoStock, 0.0));
    }

    @Transactional
    public void descontarPorcionesPorVenta(Long idInsumo, Integer cantidad) {
        ajustarPorciones(idInsumo, cantidad, "EGRESO", "VENTA");
    }

    // ─── PRIVADO ──────────────────────────────────────────────

    private MovimientoPorciones registrarMovimiento(Insumo insumo, Integer cantidad, String tipo,
                                                    String motivo, Integer stockResultante, Double mermaKg) {
        MovimientoPorciones mov = new MovimientoPorciones();
        mov.setInsumo(insumo);
        mov.setCantidadPorciones(cantidad);
        mov.setTipo(tipo);
        mov.setMotivo(motivo);
        mov.setStockResultante(stockResultante);
        mov.setMermaKg(mermaKg != null ? mermaKg : 0.0);
        mov.setFecha(LocalDateTime.now());
        return movimientoPorcionesRepository.save(mov);
    }

    public List<KardexProteinaDTO> obtenerKardexUnificado(Long idInsumo) {
        List<KardexProteinaDTO> linea = new ArrayList<>();

        // 1. Lotes
        loteInsumoRepository.findTop50ByInsumoIdOrderByFechaCompraDesc(idInsumo)
                .forEach(lote -> {
                    String detalle = lote.getKgComprados() + " kg comprados";
                    if (lote.getCostoTotal() != null)
                        detalle += " — S/. " + lote.getCostoTotal();
                    if (lote.getObservacion() != null)
                        detalle += " (" + lote.getObservacion() + ")";

                    LocalDateTime fecha = lote.getFechaCompra() != null ? lote.getFechaCompra() : LocalDateTime.now();

                    linea.add(new KardexProteinaDTO(
                            fecha,
                            "LOTE",
                            detalle,
                            "+",
                            lote.getKgComprados() + " kg",
                            null
                    ));
                });

        // 2. Producciones
        produccionRepository.findTop50ByLoteInsumoIdOrderByFechaProduccionDesc(idInsumo)
                .forEach(prod -> {
                    String detalle = prod.getPorcionesObtenidas() + " porc. obtenidas"
                            + " / " + prod.getPorcionesEsperadas() + " esperadas"
                            + " / merma " + prod.getMermaKg() + " kg";
                    if (prod.getObservacion() != null)
                        detalle += " (" + prod.getObservacion() + ")";

                    LocalDateTime fecha = prod.getFechaProduccion() != null ? prod.getFechaProduccion() : LocalDateTime.now();

                    KardexProteinaDTO dto = new KardexProteinaDTO(
                            fecha,
                            "PRODUCCION",
                            detalle,
                            "+",
                            prod.getPorcionesObtenidas() + " porc.",
                            null
                    );
                    dto.setMermaKg(prod.getMermaKg());
                    linea.add(dto);
                });

        // ─── 3. Movimientos (DENTRO DE obtenerKardexUnificado) ───
        movimientoPorcionesRepository.findTop50ByInsumoIdOrderByFechaDesc(idInsumo)
                .forEach(mov -> {
                    LocalDateTime fecha = mov.getFecha() != null ? mov.getFecha() : LocalDateTime.now();
                    String tipoOperacion = "AJUSTE";
                    if (mov.getMotivo() != null && (mov.getMotivo().startsWith("VENTA") || mov.getMotivo().equals("VENTA"))) {
                        tipoOperacion = "VENTA";
                    }

                    KardexProteinaDTO dto = new KardexProteinaDTO(
                            fecha,
                            tipoOperacion,
                            mov.getMotivo(),
                            mov.getTipo().equals("INGRESO") ? "+" : "-",
                            mov.getCantidadPorciones() + " porc.",
                            mov.getStockResultante()
                    );
                    dto.setMermaKg(mov.getMermaKg());
                    linea.add(dto);
                });

        linea.sort(Comparator.comparing(KardexProteinaDTO::getFecha, Comparator.nullsLast(Comparator.reverseOrder())));

        return linea;
    }

    @Transactional
    public void registrarKardexPorVenta(Long insumoId, double cantidad, Long pedidoId) {
        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        int stockActual = insumo.getStockActual() != null ? insumo.getStockActual().intValue() : 0;
        int cantidadResta = (int) cantidad;
        int nuevoStock = stockActual - cantidadResta;

        if (nuevoStock < 0) {
            System.out.println("[La Jama - Alerta] Procesando venta en negativo para control de comandas.");
        }
        insumo.setStockActual((double) nuevoStock);
        insumoRepository.saveAndFlush(insumo);

        MovimientoPorciones mov = new MovimientoPorciones();
        mov.setInsumo(insumo);
        mov.setCantidadPorciones(cantidadResta);
        mov.setTipo("EGRESO");
        mov.setMotivo("VENTA_SALA - Despacho de comanda");
        mov.setStockResultante(nuevoStock);
        mov.setMermaKg(0.0);
        mov.setFecha(LocalDateTime.now());

        movimientoPorcionesRepository.saveAndFlush(mov);
        System.out.println("[La Jama - Logística] Venta procesada unitariamente de 1 en 1 para el Insumo ID: " + insumoId);
    }
}