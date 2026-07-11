package com.web.restaurante.service;

import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.model.enums.TipoMovimientoCaja;
import com.web.restaurante.repository.MovimientoCajaRepository;
import com.web.restaurante.repository.TurnoCajaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TurnoCajaService {

    private final TurnoCajaRepository turnoCajaRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final TurnoSequenceService turnoSequenceService;
    private final MovimientoSequenceService movimientoSequenceService;
    private final CierreCajaSequenceService cierreCajaSequenceService;

    public Optional<TurnoCaja> obtenerTurnoActivo() {
        return turnoCajaRepository.findByActivoTrue();
    }

    public Double obtenerMontoAperturaSugerido() {
        List<TurnoCaja> cerrados = turnoCajaRepository.findTurnosCerradosOrdenados();
        if (cerrados.isEmpty()) return 200.0;

        Double montoCierre = cerrados.get(0).getMontoCierre();
        return montoCierre != null ? montoCierre : 200.0;
    }

    public List<MovimientoCaja> obtenerMovimientosDelTurnoActivo() {
        return turnoCajaRepository.findByActivoTrue()
                .map(t -> movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(t.getId()))
                .orElse(List.of());
    }

    @Transactional
    public TurnoCaja abrirTurno(Double montoApertura) {
        if (turnoCajaRepository.findByActivoTrue().isPresent()) {
            throw new IllegalStateException("Ya hay un turno de caja abierto. Debes cerrarlo primero.");
        }

        TurnoCaja turno = new TurnoCaja();
        turno.setMontoApertura(montoApertura);

        LocalDateTime ahora = LocalDateTime.now();
        turno.setFechaApertura(ahora);
        turno.setActivo(true);

        int horaApertura = ahora.getHour();
        if (horaApertura >= 8 && horaApertura < 18) {
            turno.setTipoTurno("DIA");
        } else {
            turno.setTipoTurno("NOCHE");
        }

        turnoCajaRepository.save(turno);

        // Generamos la secuencia atómica de apertura
        String serieApertura = turnoSequenceService.generarSiguienteTurno();

        // 🔥 CORRECCIÓN: Pasamos 'serieApertura' en vez de 'null'
        registrarMovimiento(turno, TipoMovimientoCaja.APERTURA, "Fondo inicial", montoApertura, serieApertura);
        return turno;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarVenta(String concepto, Double monto) {
        turnoCajaRepository.findByActivoTrue().ifPresent(turno ->
                registrarMovimiento(turno, TipoMovimientoCaja.INGRESO_VENTA, concepto, monto, null)
        );
    }

    @Transactional
    public void registrarEgreso(String concepto, Double monto) {
        TurnoCaja turno = turnoCajaRepository.findByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay turno activo."));
        String serieMovimiento = movimientoSequenceService.generarSiguienteMovimiento();
        registrarMovimiento(turno, TipoMovimientoCaja.EGRESO_MANUAL, concepto, -Math.abs(monto), serieMovimiento);
    }

    @Transactional
    public void registrarIngresoManual(String concepto, Double monto) {
        TurnoCaja turno = turnoCajaRepository.findByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay turno activo."));
        String serieMovimiento = movimientoSequenceService.generarSiguienteMovimiento();
        registrarMovimiento(turno, TipoMovimientoCaja.INGRESO_MANUAL, concepto, Math.abs(monto), serieMovimiento);
    }

    @Transactional
    public TurnoCaja cerrarTurno(Double montoCierre, String observaciones) {
        TurnoCaja turno = turnoCajaRepository.findByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay ningun turno de caja abierto."));

        List<MovimientoCaja> movimientos = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(turno.getId());

        double totalVendido = movimientos.stream()
                .filter(m -> m.getTipo() == TipoMovimientoCaja.INGRESO_VENTA)
                .mapToDouble(MovimientoCaja::getMonto)
                .sum();

        double totalIngresos = movimientos.stream()
                .filter(m -> m.getTipo() == TipoMovimientoCaja.INGRESO_MANUAL)
                .mapToDouble(MovimientoCaja::getMonto)
                .sum();

        double totalEgresos = movimientos.stream()
                .filter(m -> m.getTipo() != null && m.getTipo().getGrupoMacro().equals("EGRESO"))
                .mapToDouble(MovimientoCaja::getMonto)
                .sum();

        double saldoTeorico = turno.getMontoApertura() + totalVendido + totalIngresos + totalEgresos;
        double diferencia = montoCierre - saldoTeorico;

        turno.setMontoCierre(montoCierre);
        turno.setTotalVendido(totalVendido);
        turno.setDiferencia(diferencia);
        turno.setObservaciones(observaciones);
        turno.setFechaCierre(LocalDateTime.now());
        turno.setActivo(false);

        String serieCierre = cierreCajaSequenceService.generarSiguienteCierreCaja();
        registrarMovimiento(turno, TipoMovimientoCaja.CIERRE, "Cierre estricto de caja por el operador", montoCierre, serieCierre);

        if (Math.abs(diferencia) > 0.1) {
            System.out.println("[ALERTA DE SEGURIDAD CONTABLE - LA JAMA]");
            System.out.println("Se ha detectado un descuadre en el arqueo del turno ID #" + turno.getId());
            System.out.println("Diferencia registrada: S/. " + diferencia);
        }

        return turnoCajaRepository.save(turno);
    }


    private void registrarMovimiento(TurnoCaja turno, TipoMovimientoCaja tipo,
                                     String concepto, Double monto, String comprobante) {
        MovimientoCaja mov = new MovimientoCaja();
        mov.setTurno(turno);
        mov.setTipo(tipo); // 🛡️ Recibe el objeto Enum de manera rigurosa y tipada
        mov.setConcepto(concepto);
        mov.setMonto(monto);
        mov.setComprobante(comprobante);
        mov.setFecha(LocalDateTime.now());
        mov.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.EFECTIVO);
        movimientoCajaRepository.save(mov);
    }
}