package com.web.restaurante.service;

import com.web.restaurante.model.CajaSerie;
import com.web.restaurante.repository.CajaSerieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TurnoSequenceService {

    private final CajaSerieRepository cajaSerieRepository;

    @Transactional
    public String generarSiguienteTurno() {
        String serieDefecto = "AC01";
        CajaSerie serieControl = cajaSerieRepository.findBySerieConBloqueoNativo(serieDefecto)
                .orElseThrow(() -> new RuntimeException("🚨 Error: No existe la serie de turno '" + serieDefecto + "'"));

        int nuevoCorrelativo = serieControl.getUltimoCorrelativo() + 1;
        serieControl.setUltimoCorrelativo(nuevoCorrelativo);
        cajaSerieRepository.save(serieControl);

        return serieControl.getSerie() + "-" + String.format("%08d", nuevoCorrelativo);
    }
}