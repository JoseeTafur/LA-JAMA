// ============================================================================
// CAJA MÓVIL - ESTADO GLOBAL Y EXTRACCIÓN DE PLATOS (LA JAMA)
// ============================================================================

let platosSeleccionadosParaCobro = [];
let totalConsumoMesa = 0;
let platosDisponibles = [];
let ticketsDeCobro = [];
const TASA_IGV = 0.18;

function inicializarFlujoCaja(montoTotal, numeroMesa, preferenciaComprobante = 'BOLETA', documentoCliente = '') {
    currentMesaNumero = numeroMesa;
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = 0;
    document.getElementById('cobroNumMesa').innerText = numeroMesa;
    document.getElementById('cobroTotalBase').innerText = totalConsumoMesa.toFixed(2);

    const contenedorAviso = document.getElementById('cobroIndicacionCliente');
    if (contenedorAviso) {
        if (preferenciaComprobante === 'FACTURA') {
            contenedorAviso.innerHTML = `
                <div class="d-flex align-items-center gap-2 p-2 rounded-3"
                     style="background-color: var(--lajama-skin); color: var(--lajama-green); border: 2px solid var(--lajama-peach); font-weight: 800; font-size: 0.8rem;">
                    <i class="bi bi-building-fill-check fs-5"></i>
                    <span>ALERTA: EL CLIENTE SOLICITA FACTURA</span>
                </div>`;
        } else {
            contenedorAviso.innerHTML = `
                <div class="d-flex align-items-center gap-2 p-2 rounded-3"
                     style="background-color: var(--lajama-cream); color: var(--lajama-green); border: 2px solid var(--lajama-peach); font-weight: 700; font-size: 0.8rem;">
                    <i class="bi bi-file-earmark-text-fill fs-5"></i>
                    <span>ALERTA: EL CLIENTE SOLICITA BOLETA</span>
                </div>`;
        }
    }

    extraerPlatosDelModal();
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
        console.log("🍽️ [La Jama Salón] Ejecutando escaneo físico del DOM de mesas...");
        document.querySelectorAll('#lista-platos-previsualizar > div').forEach((row) => {

            // 🚀 REPARACIÓN MASTER ANTI-BLANQUEO:
            // Eliminamos la línea restrictiva de row.style.backgroundColor que descartaba las mermas.
            // Ahora, las mermas de color rojo pasaran libremente por la aduana fiscal de la caja.

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

            const elementoPrecio = row.querySelector('.text-muted.small.fw-bold') || row.querySelector('span.small.fw-bold') || row.querySelector('.font-monospace');
            let subtotalPlato = 0;
            if (elementoPrecio) {
                subtotalPlato = parseFloat(elementoPrecio.innerText.replace('S/. ', '').replace('S/.', '')) || 0;
            } else {
                const todosLosSpans = row.querySelectorAll('.d-flex.align-items-center.gap-2 span');
                for (let span of todosLosSpans) {
                    if (span.innerText.includes('S/.')) {
                        subtotalPlato = parseFloat(span.innerText.replace('S/. ', '').replace('S/.', '')) || 0;
                        break;
                    }
                }
            }

            // 🍳 Si el plato es una merma, le concatenamos la etiqueta al nombre para que el cajero sepa qué está cobrando
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