package com.web.restaurante.service;

import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.TurnoCaja;
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

    public Optional<TurnoCaja> obtenerTurnoActivo() {
        return turnoCajaRepository.findByActivoTrue();
    }

    public Double obtenerMontoAperturaSugerido() {
        List<TurnoCaja> cerrados = turnoCajaRepository.findTurnosCerradosOrdenados();
        if (cerrados.isEmpty()) return 0.0;
        Double montoCierre = cerrados.get(0).getMontoCierre();
        return montoCierre != null ? montoCierre : 0.0;
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
        turno.setFechaApertura(LocalDateTime.now());
        turno.setActivo(true);
        turnoCajaRepository.save(turno);

        registrarMovimiento(turno, "APERTURA", "Fondo inicial", montoApertura, null);
        return turno;
    }

    /** Llamado automáticamente desde PedidoService al cobrar un pedido. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarVenta(String concepto, Double monto) {
        turnoCajaRepository.findByActivoTrue().ifPresent(turno ->
                registrarMovimiento(turno, "VENTA", concepto, monto, null)
        );
    }

    /** Egreso manual: compra de hielo, pago a proveedor, etc. */
    @Transactional
    public void registrarEgreso(String concepto, Double monto) {
        TurnoCaja turno = turnoCajaRepository.findByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay turno activo."));
        registrarMovimiento(turno, "EGRESO", concepto, -Math.abs(monto), null);
    }

    @Transactional
    public void registrarIngresoManual(String concepto, Double monto) {
        TurnoCaja turno = turnoCajaRepository.findByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay turno activo."));
        // 💡 Fijamos el tipo como "INGRESO" nativo e indestructible
        registrarMovimiento(turno, "INGRESO", concepto, Math.abs(monto), null);
    }

    @Transactional
    public TurnoCaja cerrarTurno(Double montoCierre, String observaciones) {
        TurnoCaja turno = turnoCajaRepository.findByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay ningún turno de caja abierto."));

        // 1. Recuperamos TODOS los movimientos asociados a este turno para no perder un solo sol
        List<MovimientoCaja> movimientos = movimientoCajaRepository.findByTurnoIdOrderByFechaAsc(turno.getId());

        double totalVendido = movimientos.stream().filter(m -> "VENTA".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalIngresos = movimientos.stream().filter(m -> "INGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();
        double totalEgresos = movimientos.stream().filter(m -> "EGRESO".equals(m.getTipo())).mapToDouble(MovimientoCaja::getMonto).sum();

        // 2. FÓRMULA DE RECAUDACIÓN EXACTA: Fondo inicial + Ventas + Inyecciones Manuales - Egresos de pánico
        // (Nota: totalEgresos ya se guarda en negativo en la aduana de persistencia)
        double saldoTeorico = turno.getMontoApertura() + totalVendido + totalIngresos + totalEgresos;
        double diferencia = montoCierre - saldoTeorico;

        // 3. Persistimos los datos del arqueo de auditoría
        turno.setMontoCierre(montoCierre);
        turno.setTotalVendido(totalVendido);
        turno.setDiferencia(diferencia);
        turno.setObservaciones(observaciones);
        turno.setFechaCierre(LocalDateTime.now());
        turno.setActivo(false); // Clausura del turno en memoria

        registrarMovimiento(turno, "CIERRE", "Cierre estricto de caja por el operador", montoCierre, null);

        // 🚨 REGISTRO DE ALERTA DE SEGURIDAD EN BITÁCORA
        if (Math.abs(diferencia) > 0.1) {
            System.out.println("⚠️ [ALERTA DE SEGURIDAD CONTABLE - LA JAMA]");
            System.out.println("Se ha detectado un descuadre en el arqueo del turno ID #" + turno.getId());
            System.out.println("Diferencia registrada: S/. " + diferencia);
            // Aquí puedes inyectar luego el envío de tu notificación o bandera al administrador
        }

        return turnoCajaRepository.save(turno);
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private void registrarMovimiento(TurnoCaja turno, String tipo,
                                     String concepto, Double monto, String comprobante) {
        MovimientoCaja mov = new MovimientoCaja();
        mov.setTurno(turno);
        mov.setTipo(tipo);
        mov.setConcepto(concepto);
        mov.setMonto(monto);
        mov.setComprobante(comprobante);
        movimientoCajaRepository.save(mov);
    }
}