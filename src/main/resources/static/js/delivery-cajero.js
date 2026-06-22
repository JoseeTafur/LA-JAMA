/**
 * LA JAMA - Terminal de Pedidos para Cajero Directo
 * Lógica 100% Vanilla JS (Cero Bootstrap). Sincronización estricta por pasos.
 */

let carrito = [];
let tipoEntrega = 'DELIVERY'; // Alineado al HTML
let metodoPago = 'YAPE';      // Alineado al HTML
let etapaActual = 1;
const totalEtapas = 4;        // 1:Carta, 2:Entrega, 3:Fiscal, 4:Pago
let mapa = null;
let marcador = null;

window.addEventListener('load', () => {
    if (typeof L !== 'undefined') {
        setTimeout(iniciarMapaCajero, 300);
    }
    configurarBuscadorCarta();
    renderizarCarritoCajero();
});

/* ======================================================== */
/* 🛡️ 1. ADUANAS DE VALIDACIÓN EN TIEMPO REAL              */
/* ======================================================== */

function validarPasoActual() {
    // Validaciones al intentar salir del PASO 1 (Carta)
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

    // Validaciones al intentar salir del PASO 2 (Logística)
    if (etapaActual === 2 && tipoEntrega === 'DELIVERY') {
        const dir = document.getElementById('direccionCliente').value.trim();
        const lat = document.getElementById('latCliente').value;

        if (!dir || !lat || parseFloat(lat) === 0) {
            Swal.fire({ icon: 'warning', title: 'Falta Dirección', text: 'Para envíos por delivery, busca y selecciona un punto en el mapa.', confirmButtonColor: '#1B3A2C' });
            return false;
        }
    }

    // Validaciones al intentar salir del PASO 3 (Fiscal)
    if (etapaActual === 3) {
        const tipoDoc = document.getElementById('preferenciaComprobante').value;
        const numDoc = document.getElementById('numeroDocumento').value.trim();

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
            // 🚀 REPARADO AQUÍ: isNaN puro y conforme
            if (numDoc && (numDoc.length !== 8 || isNaN(numDoc))) {
                Swal.fire({ icon: 'error', title: 'DNI Inválido', text: 'El DNI debe contener exactamente 8 dígitos numéricos.', confirmButtonColor: '#933D2D' });
                return false;
            }
        }
    }

    return true;
}

/* ======================================================== */
/* 🪐 2. MOTOR DE NAVEGACIÓN PROGRESIVA VANILLA JS          */
/* ======================================================== */

function navegarEtapa(direccion) {
    // Si intenta avanzar, trancamos con la aduana primero
    if (direccion === 1 && !validarPasoActual()) {
        return;
    }

    let proximaEtapa = etapaActual + direccion;
    if (proximaEtapa < 1 || proximaEtapa > totalEtapas) return;

    etapaActual = proximaEtapa;

    // 🚀 REPARADO: Conmutador que maneja las clases jama-hidden del CSS de forma impecable
    for (let i = 1; i <= totalEtapas; i++) {
        const divPaso = document.getElementById(`checkout-step-${i}`);
        const nodoIndicador = document.getElementById(`indicator-step-${i}`);

        if (divPaso) {
            if (i === etapaActual) {
                divPaso.classList.remove('jama-hidden');
            } else {
                divPaso.classList.add('jama-hidden');
            }
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

    // Fix dinámico del mapa al entrar al Paso 2
    if (etapaActual === 2 && mapa && tipoEntrega === 'DELIVERY') {
        setTimeout(() => { mapa.invalidateSize(); }, 250);
    }

    // Control de Botones Inferiores usando jama-hidden
    const btnAtras = document.getElementById('btnAtrasStep');
    const btnSiguiente = document.getElementById('btnSiguienteStep');
    const btnFinalizar = document.getElementById('btnFinalizarPedido');

    if (btnAtras) {
        if (etapaActual === 1) btnAtras.classList.add('jama-hidden');
        else btnAtras.classList.remove('jama-hidden');
    }

    if (etapaActual === totalEtapas) {
        if (btnSiguiente) btnSiguiente.classList.add('jama-hidden');
        if (btnFinalizar) btnFinalizar.classList.remove('jama-hidden');
    } else {
        if (btnSiguiente) btnSiguiente.classList.remove('jama-hidden');
        if (btnFinalizar) btnFinalizar.classList.add('jama-hidden');
    }
}

/* ======================================================== */
/* 🍽️ 3. OPERACIONES DE COMANDA Y CARTA                     */
/* ======================================================== */

window.agregarDesdeCard = function(el) {
    const id = el.getAttribute('data-id');
    const nombre = el.getAttribute('data-nombre');
    const precio = parseFloat(el.getAttribute('data-precio'));

    // 🚀 RESTAURADO: Flujo original en caliente sin condicionales ni bloqueos falsos
    carrito.push({
        idTemporal: Date.now() + Math.random(),
        id: id,
        nombre: nombre,
        precio: precio
    });

    // Feedback kinetic
    el.classList.add('jama-flash-active');
    setTimeout(() => el.classList.remove('jama-flash-active'), 250);

    renderizarCarritoCajero();
};

function removerItemCajero(index) {
    carrito.splice(index, 1);
    renderizarCarritoCajero();
}

function renderizarCarritoCajero() {
    const tbody = document.getElementById('listaCarrito');
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

/* ======================================================== */
/* 🚚 4. MAPA LEAFLET Y LOGÍSTICA DE ENTREGA                */
/* ======================================================== */

function seleccionarTipo(tipo) {
    tipoEntrega = tipo;
    const btnDelivery = document.getElementById('btnDelivery');
    const btnRecoger = document.getElementById('btnRecoger');
    const seccionDireccion = document.getElementById('seccionDireccion');
    const inputDireccion = document.getElementById('direccionCliente');

    if (tipo === 'DELIVERY') {
        if (btnDelivery) btnDelivery.classList.add('active');
        if (btnRecoger) btnRecoger.classList.remove('active');
        if (seccionDireccion) seccionDireccion.style.display = 'flex';
        if (inputDireccion) {
            inputDireccion.value = '';
            inputDireccion.readOnly = false;
        }
        if (mapa) setTimeout(() => { mapa.invalidateSize(); }, 200);
    } else {
        if (btnDelivery) btnDelivery.classList.remove('active');
        if (btnRecoger) btnRecoger.classList.add('active');
        if (seccionDireccion) seccionDireccion.style.display = 'none';
        if (inputDireccion) {
            inputDireccion.value = 'Recojo en tienda';
            inputDireccion.readOnly = true;
            document.getElementById('latCliente').value = "0.0";
            document.getElementById('lngCliente').value = "0.0";
        }
    }
}

function iniciarMapaCajero() {
    if (mapa) return;
    mapa = L.map('mapa-pedido').setView([-6.7768, -79.8428], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

    mapa.on('click', async (e) => {
        fijarMarcador(e.latlng.lat, e.latlng.lng);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=es`);
            const data = await res.json();
            if (data.display_name) document.getElementById('direccionCliente').value = data.display_name.split(',').slice(0, 3).join(',').trim();
        } catch(err) {}
    });

    const inputDir = document.getElementById('direccionCliente');
    const listaDir = document.getElementById('sugerencias-dir');
    let timer = null;

    inputDir.addEventListener('input', () => {
        clearTimeout(timer);
        const q = inputDir.value.trim();
        if (q.length < 3) { listaDir.style.display = 'none'; return; }

        timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Chiclayo')}&countrycodes=pe&limit=5&accept-language=es`);
                const data = await res.json();
                if (!data.length) return;
                listaDir.innerHTML = data.map(r => `<li style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 0.8rem;" onclick="elegirDir(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g, "\\'")}')"><i class="bi bi-geo-alt-fill text-danger me-2"></i>${r.display_name.split(',').slice(0, 3).join(',')}</li>`).join('');
                listaDir.style.display = 'block';
            } catch(err) {}
        }, 350);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.position-relative')) if (listaDir) listaDir.style.display = 'none';
    });
}

function elegirDir(lat, lng, completo) {
    document.getElementById('direccionCliente').value = completo.split(',').slice(0, 3).join(',').trim();
    document.getElementById('sugerencias-dir').style.display = 'none';
    fijarMarcador(parseFloat(lat), parseFloat(lng));
    mapa.setView([lat, lng], 16);
}

function fijarMarcador(lat, lng) {
    document.getElementById('latCliente').value = lat;
    document.getElementById('lngCliente').value = lng;
    if (marcador) mapa.removeLayer(marcador);
    marcador = L.marker([lat, lng]).addTo(mapa);
}

/* ======================================================== */
/* 📄 5. FISCAL Y PAGOS                                     */
/* ======================================================== */

function conmutarTipoDocumento() {
    const tipo = document.getElementById('preferenciaComprobante').value;
    const label = document.getElementById('labelDocumento');
    const input = document.getElementById('numeroDocumento');
    input.value = "";

    if (tipo === 'FACTURA') {
        label.innerHTML = 'RUC (Obligatorio) *';
        input.placeholder = 'Ej. 20601234567';
        input.setAttribute('maxlength', '11');
    } else {
        label.innerHTML = 'DNI (Opcional)';
        input.placeholder = 'Ej. 74589632';
        input.setAttribute('maxlength', '8');
    }
}

document.getElementById('numeroDocumento')?.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
});

function seleccionarPago(metodo) {
    metodoPago = metodo;
    const btns = ['btnPagoEfectivo', 'btnPagoYape', 'btnPagoPlin', 'btnPagoTarjeta'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.classList.remove('active');
    });

    const btnActivo = document.getElementById(`btnPago${metodo.charAt(0) + metodo.slice(1).toLowerCase()}`);
    if (btnActivo) btnActivo.classList.add('active');

    const panelVuelto = document.getElementById('panelVuelto');
    const panelMensaje = document.getElementById('panelMensajePagoDigital');

    if (metodo === 'EFECTIVO') {
        if(panelVuelto) panelVuelto.classList.remove('jama-hidden');
        if(panelMensaje) panelMensaje.classList.add('jama-hidden');
    } else {
        if(panelVuelto) panelVuelto.classList.add('jama-hidden');
        if(panelMensaje) panelMensaje.classList.remove('jama-hidden');
    }
    calcularVuelto();
}

function calcularVuelto() {
    const total = carrito.reduce((s, item) => s + item.precio, 0);
    const pagaCon = parseFloat(document.getElementById('inputPagaCon').value) || 0;
    const lblVuelto = document.getElementById('lblVuelto');
    if (lblVuelto) {
        lblVuelto.textContent = (metodoPago === 'EFECTIVO' && pagaCon >= total) ? (pagaCon - total).toFixed(2) : '0.00';
    }
}

/* ======================================================== */
/* 🚀 6. DESPACHO AL SERVIDOR MULTIPART                     */
/* ======================================================== */

async function enviarPedidoFinal() {
    const total = carrito.reduce((s, item) => s + item.precio, 0);
    const nombre = document.getElementById('cliente_nombre').value.trim();
    const correo = document.getElementById('cliente_correo').value.trim();
    const prefComprobante = document.getElementById('preferenciaComprobante').value;
    const numDocumento = document.getElementById('numeroDocumento').value.trim();
    const direccion = tipoEntrega === 'RECOGER' ? 'Recojo en local' : document.getElementById('direccionCliente').value.trim();
    const lat = document.getElementById('latCliente').value;
    const lng = document.getElementById('lngCliente').value;

    if (metodoPago === 'EFECTIVO') {
        const pagaCon = parseFloat(document.getElementById('inputPagaCon').value) || 0;
        if (pagaCon < total) {
            Swal.fire({ icon: 'error', title: 'Dinero Insuficiente', text: 'El efectivo recibido es menor al total de la comanda.', confirmButtonColor: '#933D2D' });
            return;
        }
    }

    const pedidoDataJson = {
        cliente: nombre,
        direccion: direccion,
        latitud: lat ? parseFloat(lat) : 0.0,
        longitud: lng ? parseFloat(lng) : 0.0,
        montoTotal: parseFloat(total.toFixed(2)),
        metodoPago: metodoPago,
        tipoPedido: tipoEntrega === 'DELIVERY' ? 'DELIVERY' : 'LOCAL',
        clienteCorreo: correo || null,
        preferenciaComprobante: prefComprobante,
        documentoCliente: numDocumento || null,
        textoVoucherCrudo: "TRANSACCIÓN AUTORIZADA POR EL CAJERO INTERNO DE LA JAMA",
        listaDetalles: carrito.map(item => ({
            producto: { id: parseInt(item.id) },
            cantidad: 1,
            precioUnitario: item.precio,
            subtotal: item.precio
        }))
    };

    Swal.fire({ title: 'Timbrando CPE Directo...', text: 'Registrando comanda contable en el sistema.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const resPedido = await fetch('/admin/caja/delivery/guardar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pedidoDataJson)
        });

        if (!resPedido.ok) {
            const errorTexto = await resPedido.text();
            throw new Error(errorTexto || "El servidor central rechazó la transacción directa.");
        }

        const dataPedido = await resPedido.json();

        // Limpieza total y reactiva de la memoria del módulo
        carrito = [];
        renderizarCarritoCajero();
        document.getElementById('cliente_nombre').value = '';
        document.getElementById('cliente_correo').value = '';
        document.getElementById('numeroDocumento').value = '';
        document.getElementById('inputPagaCon').value = '';
        if (marcador && mapa) mapa.removeLayer(marcador);

        // Resetear visualmente el flujo al Paso 1 manipulando las clases jama-hidden del DOM
        etapaActual = 1;
        document.querySelectorAll('.jama-checkout-step').forEach((step, idx) => {
            if (idx === 0) step.classList.remove('jama-hidden');
            else step.classList.add('jama-hidden');
        });

        // Sincronizar los indicadores superiores de progreso
        document.querySelectorAll('.jama-step-node').forEach((node, idx) => {
            if (idx === 0) node.className = 'jama-step-node paso-activo';
            else node.className = 'jama-step-node paso-pendiente';
        });

        Swal.fire({ icon: 'success', title: '¡Comanda Despachada!', text: `La comanda N° ${dataPedido.id || ''} fue timbrada y enviada a producción.`, confirmButtonColor: '#1B3A2C' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error Operativo', text: e.message, confirmButtonColor: '#d33' });
    }
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