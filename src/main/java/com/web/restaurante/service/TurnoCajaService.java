package com.web.restaurante.service;

import com.web.restaurante.model.MovimientoCaja;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.TurnoCaja;
import com.web.restaurante.model.enums.TipoMovimientoCaja;
import com.web.restaurante.repository.MovimientoCajaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.TurnoCajaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TurnoCajaService {

    private final TurnoCajaRepository turnoCajaRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final TurnoSequenceService turnoSequenceService;
    private final MovimientoSequenceService movimientoSequenceService;
    private final CierreCajaSequenceService cierreCajaSequenceService;
    private final PedidoRepository pedidoRepository;

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

        String serieApertura = turnoSequenceService.generarSiguienteTurno();
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

        // 🔍 ───────── INICIO DEL RADAR DE AUDITORÍA EN CONSOLA ─────────
        System.out.println("\n==================================================================");
        System.out.println("🔍 [RADAR LA JAMA] AUDITORÍA DE ARQUEO PARA TURNO ID: #" + turno.getId());
        System.out.println("==================================================================");
        System.out.println(String.format("💵 Fondo de Apertura Inicial : S/. %.2f", turno.getMontoApertura()));

        // 🎯 1. Extracción e inspección de Pedidos / Notas de Venta
        List<Pedido> pedidosTurno = pedidoRepository.findAll().stream()
                .filter(p -> p.getTurnoCaja() != null && p.getTurnoCaja().getId().equals(turno.getId()))
                .filter(p -> com.web.restaurante.model.enums.EstadoPago.PAGADO.equals(p.getEstadoPago()))
                .filter(p -> p.getComprobanteNotaNumero() != null && !p.getComprobanteNotaNumero().trim().isEmpty())
                .collect(Collectors.toList());

        System.out.println("\n🛒 --- COMANDAS / NOTAS DE VENTA LIQUIDADAS DETECTADAS ---");
        double totalVendido = 0.0;
        if (pedidosTurno.isEmpty()) {
            System.out.println("   (Ninguna comanda pagada detectada para este turno)");
        } else {
            for (Pedido p : pedidosTurno) {
                double monto = p.getMontoTotal() != null ? p.getMontoTotal() : 0.0;
                totalVendido += monto;
                System.out.println(String.format("   👉 Pedido ID: #%-4d | Comprobante: %-10s | Monto: S/. %.2f",
                        p.getId(),
                        p.getComprobanteNotaNumero() != null ? p.getComprobanteNotaNumero() : "SIN COMPR.",
                        monto));
            }
        }
        System.out.println(String.format("💰 Subtotal Ventas del Turno : S/. %.2f", totalVendido));

        // 🎯 2. Extracción e inspección de Ingresos y Egresos Manuales
        System.out.println("\n📊 --- MOVIMIENTOS MANUALES REGISTRADOS EN BITÁCORA ---");
        double totalIngresosManuales = 0.0;
        double totalEgresosManuales = 0.0;

        for (MovimientoCaja m : movimientos) {
            if (m.getTipo() == TipoMovimientoCaja.INGRESO_MANUAL) {
                totalIngresosManuales += m.getMonto();
                System.out.println(String.format("   🟩 [INGRESO MANUAL] ID: #%-4d | Concepto: %-30s | Monto: +S/. %.2f", m.getId(), m.getConcepto(), m.getMonto()));
            } else if (m.getTipo() != null && m.getTipo().getGrupoMacro().equals("EGRESO") && m.getTipo() != TipoMovimientoCaja.CIERRE) {
                totalEgresosManuales += m.getMonto();
                System.out.println(String.format("   🟥 [EGRESO MANUAL]  ID: #%-4d | Concepto: %-30s | Monto: S/. %.2f", m.getId(), m.getConcepto(), m.getMonto()));
            }
        }

        // 🎯 3. Balance matemático final
        double saldoTeorico = turno.getMontoApertura() + totalVendido + totalIngresosManuales + totalEgresosManuales;
        double diferencia = montoCierre - saldoTeorico;

        System.out.println("\n🧮 --- FORMULACIÓN MATEMÁTICA DEL ARQUEO ---");
        System.out.println(String.format("   Apertura(%.2f) + Ventas(%.2f) + IngresosMan(%.2f) + EgresosMan(%.2f)",
                turno.getMontoApertura(), totalVendido, totalIngresosManuales, totalEgresosManuales));
        System.out.println(String.format("   👉 Saldo Teórico Esperado en Sistema   : S/. %.2f", saldoTeorico));
        System.out.println(String.format("   👉 Arqueo Físico Digitado por Cajero   : S/. %.2f", montoCierre));
        System.out.println(String.format("   🚨 DESCUADRE FINAL REGISTRADO         : S/. %.2f", diferencia));
        System.out.println("==================================================================\n");
        // 🔍 ────────── FIN DEL RADAR DE AUDITORÍA EN CONSOLA ──────────

        // Registro del movimiento de cierre estricto
        String serieCierre = cierreCajaSequenceService.generarSiguienteCierreCaja();
        registrarMovimiento(turno, TipoMovimientoCaja.CIERRE, "Cierre estricto de caja por el operador", montoCierre, serieCierre);

        // Asentamos los valores en la entidad del turno que va al Historial Cerrado
        turno.setMontoCierre(montoCierre);
        turno.setTotalVendido(totalVendido);
        turno.setDiferencia(diferencia);
        turno.setObservaciones(observaciones);
        turno.setFechaCierre(LocalDateTime.now());
        turno.setActivo(false);

        return turnoCajaRepository.save(turno);
    }


    private void registrarMovimiento(TurnoCaja turno, TipoMovimientoCaja tipo,
                                     String concepto, Double monto, String comprobante) {
        MovimientoCaja mov = new MovimientoCaja();
        mov.setTurno(turno);
        mov.setTipo(tipo);
        mov.setConcepto(concepto);
        mov.setMonto(monto);
        mov.setComprobante(comprobante);
        mov.setFecha(LocalDateTime.now());
        mov.setMetodoPago(com.web.restaurante.model.enums.MetodoPago.EFECTIVO);
        movimientoCajaRepository.save(mov);
    }
}