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
        // El saldo inicial es igual a los kilos comprados
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

        // Control de stock finito
        if (lote.getSaldoKg() < dto.getKgProcesados()) {
            throw new RuntimeException("Error: El lote seleccionado solo cuenta con "
                    + lote.getSaldoKg() + " kg disponibles.");
        }

        // 🔥 RESTAR CANTIDAD: Aquí se descuenta el stock operativo del lote
        double nuevoSaldoLote = lote.getSaldoKg() - dto.getKgProcesados();
        lote.setSaldoKg(nuevoSaldoLote);
        loteInsumoRepository.save(lote);

        // Resto de tu código de producción (cálculo de mermas, stock de insumo maestro, etc.)
        double porcionesEsperadasTeoricas = dto.getKgProcesados() * lote.getPorcionesPorKg();
        double merma = dto.getKgProcesados() - (dto.getKgProcesados()
                * ((double) dto.getPorcionesObtenidas() / (porcionesEsperadasTeoricas > 0 ? porcionesEsperadasTeoricas : 1)));

        ProduccionPorciones produccion = new ProduccionPorciones();
        produccion.setLote(lote);
        produccion.setKgProcesados(dto.getKgProcesados());
        produccion.setPorcionesEsperadas((int) Math.round(porcionesEsperadasTeoricas));
        produccion.setPorcionesObtenidas(dto.getPorcionesObtenidas());
        produccion.setMermaKg(Math.round(merma * 1000.0) / 1000.0);
        produccion.setObservacion(dto.getObservacion());
        produccion.setFechaProduccion(LocalDateTime.now());

        Insumo insumo = lote.getInsumo();
        int stockActual = insumo.getStockActual() != null ? insumo.getStockActual().intValue() : 0;
        int nuevoStock = stockActual + dto.getPorcionesObtenidas();
        insumo.setStockActual((double) nuevoStock);
        insumoRepository.save(insumo);

        registrarMovimiento(insumo, dto.getPorcionesObtenidas(), "INGRESO", "PRODUCCION", nuevoStock);

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

        return proteinaMapper.toDTO(registrarMovimiento(insumo, cantidad, tipo, motivo, nuevoStock));
    }

    @Transactional
    public void descontarPorcionesPorVenta(Long idInsumo, Integer cantidad) {
        ajustarPorciones(idInsumo, cantidad, "EGRESO", "VENTA");
    }

    // ─── PRIVADO ──────────────────────────────────────────────

    private MovimientoPorciones registrarMovimiento(Insumo insumo, Integer cantidad,
                                                    String tipo, String motivo, Integer stockResultante) {
        MovimientoPorciones mov = new MovimientoPorciones();
        mov.setInsumo(insumo);
        mov.setCantidadPorciones(cantidad);
        mov.setTipo(tipo);
        mov.setMotivo(motivo);
        mov.setStockResultante(stockResultante);
        // 🛡️ Aseguramos la fecha en Java
        mov.setFecha(LocalDateTime.now());
        return movimientoPorcionesRepository.save(mov);
    }

    public List<KardexProteinaDTO> obtenerKardexUnificado(Long idInsumo) {
        List<KardexProteinaDTO> linea = new ArrayList<>();

        // 1. Lotes (compras del admin)
        loteInsumoRepository.findTop50ByInsumoIdOrderByFechaCompraDesc(idInsumo)
                .forEach(lote -> {
                    String detalle = lote.getKgComprados() + " kg comprados";
                    if (lote.getCostoTotal() != null)
                        detalle += " — S/. " + lote.getCostoTotal();
                    if (lote.getObservacion() != null)
                        detalle += " (" + lote.getObservacion() + ")";

                    // 🛡️ Si por alguna razón la fecha es nula en BD, usamos la actual para evitar caídas
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

        // 2. Producciones (cocinero)
        produccionRepository.findTop50ByLoteInsumoIdOrderByFechaProduccionDesc(idInsumo)
                .forEach(prod -> {
                    String detalle = prod.getPorcionesObtenidas() + " porc. obtenidas"
                            + " / " + prod.getPorcionesEsperadas() + " esperadas"
                            + " / merma " + prod.getMermaKg() + " kg";
                    if (prod.getObservacion() != null)
                        detalle += " (" + prod.getObservacion() + ")";

                    // 🛡️ Control de nulos
                    LocalDateTime fecha = prod.getFechaProduccion() != null ? prod.getFechaProduccion() : LocalDateTime.now();

                    linea.add(new KardexProteinaDTO(
                            fecha,
                            "PRODUCCION",
                            detalle,
                            "+",
                            prod.getPorcionesObtenidas() + " porc.",
                            null
                    ));
                });

        // 3. Movimientos (ajustes y ventas)
        movimientoPorcionesRepository.findTop50ByInsumoIdOrderByFechaDesc(idInsumo)
                .forEach(mov -> {
                    // 🛡️ Control de nulos
                    LocalDateTime fecha = mov.getFecha() != null ? mov.getFecha() : LocalDateTime.now();

                    linea.add(new KardexProteinaDTO(
                            fecha,
                            mov.getMotivo().equals("VENTA") ? "VENTA" : "AJUSTE",
                            mov.getMotivo(),
                            mov.getTipo().equals("INGRESO") ? "+" : "-",
                            mov.getCantidadPorciones() + " porc.",
                            mov.getStockResultante()
                    ));
                });

        // 🛡️ Ordenar todo por fecha descendente usando un comparador que tolera fallos de nulos por si acaso
        linea.sort(Comparator.comparing(KardexProteinaDTO::getFecha, Comparator.nullsLast(Comparator.reverseOrder())));

        return linea;
    }
}