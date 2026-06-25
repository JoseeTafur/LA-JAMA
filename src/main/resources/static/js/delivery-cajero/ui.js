/**
 * LA JAMA - Terminal de Pedidos para Cajero Directo
 * PARTE 1: Estado, validación, navegación y carrito
 */

let carrito      = [];
let tipoEntrega  = 'DELIVERY';
let metodoPago   = 'YAPE';
let etapaActual  = 1;
const totalEtapas = 4;
let mapa    = null;
let marcador = null;

window.addEventListener('load', () => {
    if (typeof L !== 'undefined') setTimeout(iniciarMapaCajero, 300);
    configurarBuscadorCarta();
    renderizarCarritoCajero();
});

// ─── VALIDACIÓN ───────────────────────────────────────────────────────────

function validarPasoActual() {
    if (etapaActual === 1) {
        const nombre = document.getElementById('cliente_nombre').value.trim();
        if (carrito.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Comanda Vacía', text: 'Agrega al menos un plato a la orden antes de avanzar.', confirmButtonColor: '#1B3A2C' });
            return false;
        }
        if (!nombre) {
            Swal.fire({ icon: 'warning', title: 'Falta Cliente', text: 'Ingresa el Nombre o Razón Social en el panel derecho.', confirmButtonColor: '#1B3A2C' });
            document.getElementById('cliente_nombre').focus();
            return false;
        }
    }

    if (etapaActual === 2 && tipoEntrega === 'DELIVERY') {
        const dir = document.getElementById('direccionCliente').value.trim();
        const lat = document.getElementById('latCliente').value;
        if (!dir || !lat || parseFloat(lat) === 0) {
            Swal.fire({ icon: 'warning', title: 'Falta Dirección', text: 'Para envíos por delivery, busca y selecciona un punto en el mapa.', confirmButtonColor: '#1B3A2C' });
            return false;
        }
    }

    if (etapaActual === 3) {
        const tipoDoc = document.getElementById('preferenciaComprobante').value;
        const numDoc  = document.getElementById('numeroDocumento').value.trim();
        if (tipoDoc === 'FACTURA') {
            if (!numDoc || numDoc.length !== 11 || isNaN(numDoc)) {
                Swal.fire({ icon: 'error', title: 'RUC Inválido', text: 'La Factura Electrónica requiere un RUC válido de 11 dígitos.', confirmButtonColor: '#933D2D' });
                return false;
            }
            if (!numDoc.startsWith('10') && !numDoc.startsWith('20')) {
                Swal.fire({ icon: 'error', title: 'Prefijo Incorrecto', text: 'El RUC debe iniciar con 10 o 20.', confirmButtonColor: '#933D2D' });
                return false;
            }
        } else {
            if (numDoc && (numDoc.length !== 8 || isNaN(numDoc))) {
                Swal.fire({ icon: 'error', title: 'DNI Inválido', text: 'El DNI debe contener exactamente 8 dígitos numéricos.', confirmButtonColor: '#933D2D' });
                return false;
            }
        }
    }

    return true;
}

// ─── NAVEGACIÓN ───────────────────────────────────────────────────────────

function navegarEtapa(direccion) {
    if (direccion === 1 && !validarPasoActual()) return;

    const proximaEtapa = etapaActual + direccion;
    if (proximaEtapa < 1 || proximaEtapa > totalEtapas) return;
    etapaActual = proximaEtapa;

    for (let i = 1; i <= totalEtapas; i++) {
        const divPaso       = document.getElementById(`checkout-step-${i}`);
        const nodoIndicador = document.getElementById(`indicator-step-${i}`);

        if (divPaso) {
            if (i === etapaActual) divPaso.classList.remove('jama-hidden');
            else                   divPaso.classList.add('jama-hidden');
        }

        if (nodoIndicador) {
            if (i === etapaActual) {
                nodoIndicador.className = 'jama-step-node paso-activo';
            } else if (i < etapaActual) {
                nodoIndicador.className = 'jama-step-node';
                nodoIndicador.style.backgroundColor = 'var(--lajama-green-alpha)';
                nodoIndicador.style.color = 'var(--lajama-green)';
            } else {
                nodoIndicador.className = 'jama-step-node paso-pendiente';
                nodoIndicador.style.backgroundColor = '';
                nodoIndicador.style.color = '';
            }
        }
    }

    if (etapaActual === 2 && mapa && tipoEntrega === 'DELIVERY') setTimeout(() => mapa.invalidateSize(), 250);

    const btnAtras     = document.getElementById('btnAtrasStep');
    const btnSiguiente = document.getElementById('btnSiguienteStep');
    const btnFinalizar = document.getElementById('btnFinalizarPedido');

    if (btnAtras) {
        if (etapaActual === 1) btnAtras.classList.add('jama-hidden');
        else                   btnAtras.classList.remove('jama-hidden');
    }
    if (etapaActual === totalEtapas) {
        if (btnSiguiente) btnSiguiente.classList.add('jama-hidden');
        if (btnFinalizar) btnFinalizar.classList.remove('jama-hidden');
    } else {
        if (btnSiguiente) btnSiguiente.classList.remove('jama-hidden');
        if (btnFinalizar) btnFinalizar.classList.add('jama-hidden');
    }
}

// ─── CARRITO ──────────────────────────────────────────────────────────────

window.agregarDesdeCard = function(el) {
    carrito.push({
        idTemporal: Date.now() + Math.random(),
        id:     el.getAttribute('data-id'),
        nombre: el.getAttribute('data-nombre'),
        precio: parseFloat(el.getAttribute('data-precio'))
    });
    el.classList.add('jama-flash-active');
    setTimeout(() => el.classList.remove('jama-flash-active'), 250);
    renderizarCarritoCajero();
};

function removerItemCajero(index) {
    carrito.splice(index, 1);
    renderizarCarritoCajero();
}

function renderizarCarritoCajero() {
    const tbody    = document.getElementById('listaCarrito');
    const lblTotal = document.getElementById('totalCarrito');
    if (!tbody) return;

    if (carrito.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-muted small border-bottom-0">Aún no hay platos en la comanda</td></tr>`;
        lblTotal.textContent = '0.00';
        return;
    }

    let total = 0;
    tbody.innerHTML = carrito.map((item, index) => {
        total += item.precio;
        return `
            <tr>
                <td class="fw-bold text-dark" style="font-size: 0.8rem;">${item.nombre}</td>
                <td class="text-end fw-bold text-success" style="font-size: 0.85rem;">S/ ${item.precio.toFixed(2)}</td>
                <td class="text-end"><i class="bi bi-trash3-fill text-danger cursor-pointer" onclick="removerItemCajero(${index})"></i></td>
            </tr>`;
    }).join('');

    lblTotal.textContent = total.toFixed(2);
    calcularVuelto();
}

function configurarBuscadorCarta() {
    const inputBuscar = document.getElementById('inputBuscar');
    if (!inputBuscar) return;
    inputBuscar.addEventListener('input', function () {
        const termino = this.value.trim().toLowerCase();
        document.querySelectorAll('.jama-card-cuadrada').forEach(card => {
            const nombre = (card.getAttribute('data-nombre') || '').toLowerCase();
            card.style.display = nombre.includes(termino) ? '' : 'none';
        });
    });
}
