/**
 * LA JAMA - Terminal de Pedidos para Cajero Directo
 * PARTE 2: Mapa Leaflet, fiscal, método de pago y envío al servidor
 */

// ─── MAPA Y LOGÍSTICA ─────────────────────────────────────────────────────

function seleccionarTipo(tipo) {
    tipoEntrega = tipo;
    const btnDelivery    = document.getElementById('btnDelivery');
    const btnRecoger     = document.getElementById('btnRecoger');
    const seccionDir     = document.getElementById('seccionDireccion');
    const inputDireccion = document.getElementById('direccionCliente');

    if (tipo === 'DELIVERY') {
        btnDelivery?.classList.add('active');
        btnRecoger?.classList.remove('active');
        if (seccionDir)     seccionDir.style.display = 'flex';
        if (inputDireccion) { inputDireccion.value = ''; inputDireccion.readOnly = false; }
        if (mapa) setTimeout(() => mapa.invalidateSize(), 200);
    } else {
        btnDelivery?.classList.remove('active');
        btnRecoger?.classList.add('active');
        if (seccionDir)     seccionDir.style.display = 'none';
        if (inputDireccion) {
            inputDireccion.value    = 'Recojo en tienda';
            inputDireccion.readOnly = true;
            document.getElementById('latCliente').value = '0.0';
            document.getElementById('lngCliente').value = '0.0';
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
            const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=es`);
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
                const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Chiclayo')}&countrycodes=pe&limit=5&accept-language=es`);
                const data = await res.json();
                if (!data.length) return;
                listaDir.innerHTML = data.map(r =>
                    `<li style="padding:8px;border-bottom:1px solid #eee;cursor:pointer;font-size:0.8rem;"
                         onclick="elegirDir(${r.lat},${r.lon},'${r.display_name.replace(/'/g, "\\'")}')">
                         <i class="bi bi-geo-alt-fill text-danger me-2"></i>${r.display_name.split(',').slice(0, 3).join(',')}
                     </li>`
                ).join('');
                listaDir.style.display = 'block';
            } catch(err) {}
        }, 350);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.position-relative') && listaDir) listaDir.style.display = 'none';
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

// ─── FISCAL ───────────────────────────────────────────────────────────────

function conmutarTipoDocumento() {
    const tipo  = document.getElementById('preferenciaComprobante').value;
    const label = document.getElementById('labelDocumento');
    const input = document.getElementById('numeroDocumento');
    input.value = '';

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

// ─── MÉTODO DE PAGO Y VUELTO ──────────────────────────────────────────────

function seleccionarPago(metodo) {
    metodoPago = metodo;
    ['btnPagoEfectivo', 'btnPagoYape', 'btnPagoPlin', 'btnPagoTarjeta'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById(`btnPago${metodo.charAt(0) + metodo.slice(1).toLowerCase()}`)?.classList.add('active');

    const panelVuelto  = document.getElementById('panelVuelto');
    const panelMensaje = document.getElementById('panelMensajePagoDigital');

    if (metodo === 'EFECTIVO') {
        panelVuelto?.classList.remove('jama-hidden');
        panelMensaje?.classList.add('jama-hidden');
    } else {
        panelVuelto?.classList.add('jama-hidden');
        panelMensaje?.classList.remove('jama-hidden');
    }
    calcularVuelto();
}

function calcularVuelto() {
    const total    = carrito.reduce((s, item) => s + item.precio, 0);
    const pagaCon  = parseFloat(document.getElementById('inputPagaCon').value) || 0;
    const lblVuelto = document.getElementById('lblVuelto');
    if (lblVuelto) {
        lblVuelto.textContent = (metodoPago === 'EFECTIVO' && pagaCon >= total) ? (pagaCon - total).toFixed(2) : '0.00';
    }
}

// ─── ENVÍO AL SERVIDOR ────────────────────────────────────────────────────

async function enviarPedidoFinal() {
    const total         = carrito.reduce((s, item) => s + item.precio, 0);
    const nombre        = document.getElementById('cliente_nombre').value.trim();
    const correo        = document.getElementById('cliente_correo').value.trim();
    const prefComp      = document.getElementById('preferenciaComprobante').value;
    const numDocumento  = document.getElementById('numeroDocumento').value.trim();
    const direccion     = tipoEntrega === 'RECOGER' ? 'Recojo en local' : document.getElementById('direccionCliente').value.trim();
    const lat           = document.getElementById('latCliente').value;
    const lng           = document.getElementById('lngCliente').value;

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
        latitud:  lat ? parseFloat(lat) : 0.0,
        longitud: lng ? parseFloat(lng) : 0.0,
        montoTotal: parseFloat(total.toFixed(2)),
        metodoPago: metodoPago,
        tipoPedido: tipoEntrega === 'DELIVERY' ? 'DELIVERY' : 'LOCAL',
        clienteCorreo: correo || null,
        preferenciaComprobante: prefComp,
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoDataJson)
        });

        if (!resPedido.ok) {
            const errorTexto = await resPedido.text();
            throw new Error(errorTexto || "El servidor central rechazó la transacción directa.");
        }

        const dataPedido = await resPedido.json();

        // Limpiar estado
        carrito = [];
        renderizarCarritoCajero();
        ['cliente_nombre', 'cliente_correo', 'numeroDocumento', 'inputPagaCon'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (marcador && mapa) mapa.removeLayer(marcador);

        // Resetear al Paso 1
        etapaActual = 1;
        document.querySelectorAll('.jama-checkout-step').forEach((step, idx) => {
            if (idx === 0) step.classList.remove('jama-hidden');
            else           step.classList.add('jama-hidden');
        });
        document.querySelectorAll('.jama-step-node').forEach((node, idx) => {
            node.className = idx === 0 ? 'jama-step-node paso-activo' : 'jama-step-node paso-pendiente';
        });

        Swal.fire({ icon: 'success', title: '¡Comanda Despachada!', text: `La comanda N° ${dataPedido.id || ''} fue timbrada y enviada a producción.`, confirmButtonColor: '#1B3A2C' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error Operativo', text: e.message, confirmButtonColor: '#d33' });
    }
}
