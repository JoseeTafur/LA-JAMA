package com.web.restaurante.service;

import com.web.restaurante.model.MovimientoSerie;
import com.web.restaurante.repository.MovimientoSerieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MovimientoSequenceService {

    private final MovimientoSerieRepository movimientoSerieRepository;

    @Transactional
    public String generarSiguienteMovimiento() {
        String serieDefecto = "MV01";

        MovimientoSerie serieControl = movimientoSerieRepository.findBySerieConBloqueoNativo(serieDefecto)
                .orElseThrow(() -> new RuntimeException("🚨 Error: No existe la serie contable '" + serieDefecto + "'"));

        int nuevoCorrelativo = serieControl.getUltimoCorrelativo() + 1;
        serieControl.setUltimoCorrelativo(nuevoCorrelativo);
        movimientoSerieRepository.save(serieControl);

        return serieControl.getSerie() + "-" + String.format("%08d", nuevoCorrelativo);
    }
}