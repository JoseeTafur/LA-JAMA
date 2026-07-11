package com.web.restaurante.service;

import com.web.restaurante.model.CierreCajaSerie;
import com.web.restaurante.repository.CierreCajaSerieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CierreCajaSequenceService {

    private final CierreCajaSerieRepository cierreCajaSerieRepository;

    @Transactional
    public String generarSiguienteCierreCaja() {
        String serieDefecto = "CC01";

        CierreCajaSerie serieControl = cierreCajaSerieRepository.findBySerieConBloqueoNativo(serieDefecto)
                .orElseThrow(() -> new RuntimeException("Error: No existe la serie de cierre de caja '" + serieDefecto + "'"));

        int nuevoCorrelativo = serieControl.getUltimoCorrelativo() + 1;
        serieControl.setUltimoCorrelativo(nuevoCorrelativo);
        cierreCajaSerieRepository.save(serieControl);

        return serieControl.getSerie() + "-" + String.format("%08d", nuevoCorrelativo);
    }
}