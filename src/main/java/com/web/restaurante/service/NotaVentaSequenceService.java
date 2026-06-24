package com.web.restaurante.service;

import com.web.restaurante.model.NotaVentaSerie;
import com.web.restaurante.repository.NotaVentaSerieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotaVentaSequenceService {

    private final NotaVentaSerieRepository notaVentaSerieRepository;

    @Transactional
    public String generarSiguienteNota() {
        String serieDefecto = "NV01";

        NotaVentaSerie serieControl = notaVentaSerieRepository.findBySerieConBloqueoNativo(serieDefecto)
                .orElseThrow(() -> new RuntimeException("🚨 Error de Configuración: No existe la serie '" + serieDefecto + "'"));

        int nuevoCorrelativo = serieControl.getUltimoCorrelativo() + 1;
        serieControl.setUltimoCorrelativo(nuevoCorrelativo);
        notaVentaSerieRepository.save(serieControl);

        String correlativoFormateado = String.format("%08d", nuevoCorrelativo);
        return serieControl.getSerie() + "-" + correlativoFormateado;
    }
}