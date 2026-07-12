// ============================================================================
// CAJA MÓVIL - ESTADO GLOBAL Y EXTRACCIÓN DE PLATOS (LA JAMA) - estado.js
// ============================================================================

let platosSeleccionadosParaCobro = [];
let totalConsumoMesa = 0;
let platosDisponibles = [];
let ticketsDeCobro = [];
const TASA_IGV = 0.18;

function inicializarFlujoCaja(montoTotal, numeroMesa, preferenciaComprobante = 'BOLETA', documentoCliente = '') {
    currentMesaNumero = numeroMesa;
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = Math.round((parseFloat(montoTotal) || 0) * 100) / 100;

    document.getElementById('cobroNumMesa').innerText = numeroMesa || 'N/A';
    document.getElementById('cobroTotalBase').innerText = totalConsumoMesa.toFixed(2);

    extraerPlatosDelModal();

    if (totalConsumoMesa <= 0 && montoTotal > 0) {
        totalConsumoMesa = Math.round((parseFloat(montoTotal) || 0) * 100) / 100;
        const txtTotalBase = document.getElementById('cobroTotalBase');
        if (txtTotalBase) txtTotalBase.innerText = totalConsumoMesa.toFixed(2);
    }

    configurarSelectorPersonas();
    reconstruirCanastas(preferenciaComprobante, documentoCliente);
}

function extraerPlatosDelModal() {
    platosDisponibles = [];
    platosSeleccionadosParaCobro = [];
    let sumaSeleccionados = 0;
    let indexCobro = 0;

    if (typeof datosPedidoActualCaja !== 'undefined' && datosPedidoActualCaja && datosPedidoActualCaja.detalles) {
        console.log("🎯 [La Jama POS] Procesando platos directamente desde el objeto JSON del pedido...");
        datosPedidoActualCaja.detalles.forEach((d) => {
            if (d.canceladoPorCliente || d.pagado) return;

            const chkCajero = document.querySelector(`.chk-plato-caja-seleccion[value="${d.id}"]`);
            const quiereCobrar = chkCajero ? chkCajero.checked : true;
            if (!quiereCobrar) return;

            let nombrePlato = "Producto";
            if (d.producto && d.producto.nombre) {
                nombrePlato = d.producto.nombre;
            } else if (d.nombreProducto) {
                nombrePlato = d.nombreProducto;
            }

            platosDisponibles.push({
                id: indexCobro,
                productoId: d.producto ? d.producto.id : (d.productoId || d.id),
                nombre: nombrePlato,
                cantidad: d.cantidad || 1,
                subtotal: parseFloat(d.subtotal) || 0,
                idTicketAsignado: -1,
                permitidoCobrar: true
            });

            platosSeleccionadosParaCobro.push(indexCobro);
            sumaSeleccionados += parseFloat(d.subtotal) || 0;
            indexCobro++;
        });
    } else {
        console.log("🍽️ [La Jama Salón] Ejecutando escaneo físico del DOM de mesas con extractor multiformato...");
        document.querySelectorAll('#lista-platos-previsualizar > div').forEach((row) => {

            const estadoPlato = row.getAttribute('data-estado');
            if (estadoPlato === 'Enviado') return;

            const checkbox = row.querySelector('.chk-mesa-confirmar');
            if (!checkbox || !checkbox.checked) return;

            const badgeCantidad = row.querySelector('.badge.bg-dark') || row.querySelector('.badge');
            let cantidad = 1;
            if (badgeCantidad) {
                cantidad = parseInt(badgeCantidad.innerText.replace('x', '')) || 1;
            }

            const elementoNombre = row.querySelector('.fw-semibold') || row.querySelector('span');
            let nombrePlato = elementoNombre ? elementoNombre.innerText : 'Producto';
            nombrePlato = nombrePlato.replace(/^\d+x\s*/, '');

            // ── 🎯 EXTRACTOR MULTIFORMATO SEGURO CON EXPRESIÓN REGULAR ──
            const elementoPrecio = row.querySelector('.text-muted.small.fw-bold') ||
                                   row.querySelector('span.small.fw-bold') ||
                                   row.querySelector('.font-monospace');

            let textoPrecioCrudo = "";
            if (elementoPrecio) {
                textoPrecioCrudo = elementoPrecio.innerText;
            } else {
                const todosLosSpans = row.querySelectorAll('.d-flex.align-items-center.gap-2 span');
                for (let span of todosLosSpans) {
                    if (span.innerText.includes('S/') || span.innerText.includes('S/.')) {
                        textoPrecioCrudo = span.innerText;
                        break;
                    }
                }
            }

            // Limpieza radical: eliminamos S/, S/., espacios y cambiamos comas decimales por puntos de flotación
            let textoLimpio = textoPrecioCrudo.replace(/S\/\.?\s*/g, '').replace(/,/, '.').trim();
            let subtotalPlato = parseFloat(textoLimpio) || 0;

            const esUnaMermaReal = estadoPlato === 'MERMA' || row.style.backgroundColor.includes('rgb(255, 229, 229)');
            let nombreFinalCaja = esUnaMermaReal ? `${nombrePlato.trim()} (MERMA)` : nombrePlato.trim();

            platosDisponibles.push({
                id: indexCobro,
                productoId: row.getAttribute('data-producto-id') || indexCobro,
                nombre: nombreFinalCaja,
                cantidad: cantidad,
                subtotal: subtotalPlato,
                idTicketAsignado: -1,
                permitidoCobrar: true
            });

            platosSeleccionadosParaCobro.push(indexCobro);
            sumaSeleccionados += subtotalPlato;
            indexCobro++;
        });
    }

    totalConsumoMesa = Math.round(sumaSeleccionados * 100) / 100;
    const txtTotalBase = document.getElementById('cobroTotalBase');
    if (txtTotalBase) txtTotalBase.innerText = totalConsumoMesa.toFixed(2);
}

function limpiarInstanciaCaja() {
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = 0;
    platosDisponibles = [];
    ticketsDeCobro = [];
}