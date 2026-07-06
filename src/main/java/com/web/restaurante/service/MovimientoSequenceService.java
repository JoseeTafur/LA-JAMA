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

        // 🏁 Conexión legítima al repositorio de series operativas con bloqueo nativo
        MovimientoSerie serieControl = movimientoSerieRepository.findBySerieConBloqueoNativo(serieDefecto)
                .orElseThrow(() -> new RuntimeException("🚨 Error: No existe la serie contable '" + serieDefecto + "'"));

        // Incrementamos de forma segura el contador contable
        int nuevoCorrelativo = serieControl.getUltimoCorrelativo() + 1;
        serieControl.setUltimoCorrelativo(nuevoCorrelativo);
        movimientoSerieRepository.save(serieControl);

        // Retorna el String formateado con los 8 dígitos correspondientes (Ej: MV01-00000001)
        return serieControl.getSerie() + "-" + String.format("%08d", nuevoCorrelativo);
    }
}