package com.web.restaurante.service;

import com.web.restaurante.model.ComprobanteSerie;
import com.web.restaurante.repository.ComprobanteSerieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ComprobanteSequenceService {

    private final ComprobanteSerieRepository comprobanteSerieRepository;

    @Transactional
    public String generarSiguienteNumero(String tipoComprobante) {
        ComprobanteSerie serieControl = comprobanteSerieRepository.obtenerSerieParaIncrementar(tipoComprobante)
                .orElseThrow(() -> new RuntimeException("🚨 Error Fiscal: No existe la serie configurada para " + tipoComprobante));

        int nuevoCorrelativo = serieControl.getUltimoCorrelativo() + 1;
        serieControl.setUltimoCorrelativo(nuevoCorrelativo);
        comprobanteSerieRepository.save(serieControl);

        String correlativoFormateado = String.format("%08d", nuevoCorrelativo);

        return serieControl.getSerie() + "-" + correlativoFormateado;
    }
}