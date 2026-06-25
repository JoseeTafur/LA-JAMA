package com.web.restaurante.service;

import com.web.restaurante.repository.MetricasRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MetricasService {

    private final MetricasRepository metricasRepository;

    public Map<String, Object> obtenerKpisGlobalesDashboard() {
        LocalDateTime inicioHoy = java.time.LocalDate.now().atStartOfDay();
        Map<String, Object> kpis = new HashMap<>();

        LocalDateTime fechaLimiteTurnos = metricasRepository.obtenerFechaAperturaHace10Turnos();
        if (fechaLimiteTurnos == null) {
            fechaLimiteTurnos = LocalDateTime.now().minusDays(7);
        }

        List<Map<String, Object>> platosRaw = metricasRepository.kpiTopPlatosUltimos10Turnos(fechaLimiteTurnos);
        Map<String, Long> platosMap = new LinkedHashMap<>();
        int count = 0;
        for (Map<String, Object> row : platosRaw) {
            if (count >= 5) break;
            Object keyNombre = row.get("nombre") != null ? row.get("nombre") : row.get("NOMBRE");
            Object valTotal  = row.get("total") != null ? row.get("total") : row.get("TOTAL");
            if (keyNombre != null && valTotal != null) {
                platosMap.put(keyNombre.toString().toUpperCase(), Math.round(Double.parseDouble(valTotal.toString())));
                count++;
            }
        }
        kpis.put("topPlatos", platosMap);

        List<Map<String, Object>> proteinasRaw = metricasRepository.kpiConsumoProteinas(inicioHoy);
        Map<String, Double> proteinasMap = new HashMap<>();
        for (Map<String, Object> row : proteinasRaw) {
            Object keyNombre = row.get("nombre") != null ? row.get("nombre") : row.get("NOMBRE");
            Object valTotal  = row.get("total") != null ? row.get("total") : row.get("TOTAL");
            if (keyNombre != null && valTotal != null) {
                proteinasMap.put(keyNombre.toString().toUpperCase(), Double.valueOf(valTotal.toString()));
            }
        }
        kpis.put("ventasProteinas", proteinasMap);

        List<Map<String, Object>> mesasRaw = metricasRepository.kpiEstadoMesasActual();
        Map<String, Long> mesasMap = new HashMap<>();
        mesasMap.put("DISPONIBLE", 0L);
        mesasMap.put("OCUPADA", 0L);
        mesasMap.put("RESERVADA", 0L);
        mesasMap.put("UNIFICADA", 0L);

        for (Map<String, Object> row : mesasRaw) {
            Object keyEstado = row.get("estado") != null ? row.get("estado") : row.get("ESTADO");
            Object valTotal  = row.get("total") != null ? row.get("total") : row.get("TOTAL");
            if (keyEstado != null && valTotal != null) {
                mesasMap.put(keyEstado.toString().toUpperCase(), Long.valueOf(valTotal.toString()));
            }
        }
        kpis.put("estadoMesas", mesasMap);

        Long totalPedidos = metricasRepository.kpiTotalPedidosAtendidosHoy(inicioHoy);
        kpis.put("totalPedidosHoy", totalPedidos != null ? totalPedidos : 0L);

        List<Map<String, Object>> canalesRaw = metricasRepository.kpiCanalesVenta(fechaLimiteTurnos);
        Map<String, Long> canalesMap = new HashMap<>();
        canalesMap.put("SALON", 0L);
        canalesMap.put("DELIVERY", 0L);
        canalesMap.put("CARTA_QR", 0L);

        for (Map<String, Object> row : canalesRaw) {
            Object keyCanal = row.get("canal") != null ? row.get("canal") : row.get("CANAL");
            Object valTotal = row.get("total") != null ? row.get("total") : row.get("TOTAL");

            if (keyCanal != null && valTotal != null) {
                String canalStr = keyCanal.toString().toUpperCase();
                Long total = Long.valueOf(valTotal.toString());

                if (canalStr.contains("DELIV")) {
                    canalesMap.put("DELIVERY", canalesMap.get("DELIVERY") + total);
                } else if (canalStr.contains("QR") || canalStr.contains("WEB") || canalStr.contains("CARTA")) {
                    canalesMap.put("CARTA_QR", canalesMap.get("CARTA_QR") + total);
                } else {
                    canalesMap.put("SALON", canalesMap.get("SALON") + total);
                }
            }
        }
        kpis.put("canalesVenta", canalesMap);

        return kpis;
    }
}