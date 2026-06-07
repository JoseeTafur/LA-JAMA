let carrito = {};
let mapa = null;
let marcador = null;
let modalCarrito = null;
let tipoEntrega = 'DELIVERY'; // por defecto
let metodoPago = 'YAPE';

/* ── TIPO ENTREGA ── */
function seleccionarTipo(tipo) {
    tipoEntrega = tipo;
    document.getElementById('btnRecoger').className = 'btn-tipo' + (tipo === 'RECOGER' ? ' activo' : '');
    document.getElementById('btnDelivery').className = 'btn-tipo' + (tipo === 'DELIVERY' ? ' activo' : '');
    document.getElementById('seccionDireccion').style.display = tipo === 'DELIVERY' ? 'block' : 'none';
    if (tipo === 'DELIVERY' && !mapa) setTimeout(iniciarMapa, 300);
}

function seleccionarPago(metodo) {
    metodoPago = metodo;
    document.getElementById('btnYape').className = 'btn-tipo' + (metodo === 'YAPE' ? ' activo' : '');
    document.getElementById('btnPlin').className = 'btn-tipo' + (metodo === 'PLIN' ? ' activo' : '');
    document.getElementById('seccionYape').style.display = metodo === 'YAPE' ? 'block' : 'none';
    document.getElementById('seccionPlin').style.display = metodo === 'PLIN' ? 'block' : 'none';
}


/* ── CARRITO ── */
function agregarDesdeCard(el) {
    const id     = el.getAttribute('data-id');
    const nombre = el.getAttribute('data-nombre');
    const precio = parseFloat(el.getAttribute('data-precio'));
    agregarProducto(id, nombre, precio);

    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 400);
}

function agregarProducto(id, nombre, precio) {
    if (carrito[id]) {
        carrito[id].cantidad++;
    } else {
        carrito[id] = { id, nombre, precio, cantidad: 1 };
    }
    actualizarUI();
}

function cambiarCantidad(id, delta) {
    if (!carrito[id]) return;
    carrito[id].cantidad += delta;
    if (carrito[id].cantidad <= 0) delete carrito[id];
    actualizarUI();
    renderCarrito();
}

function actualizarUI() {
    const total = Object.values(carrito).reduce((s, i) => s + i.cantidad, 0);
    document.getElementById('badgeCount').textContent = total;
    const btn = document.getElementById('btnCarrito');
    btn.style.display = total > 0 ? 'flex' : 'none';
}

function renderCarrito() {
    const lista = document.getElementById('listaCarrito');
    const items = Object.values(carrito);

    if (items.length === 0) {
        lista.innerHTML = '<p class="text-muted text-center py-3" style="font-size:0.9rem;">Tu carrito está vacío</p>';
        document.getElementById('totalCarrito').textContent = '0.00';
        return;
    }

    let total = 0;
    lista.innerHTML = items.map(item => {
        const sub = item.precio * item.cantidad;
        total += sub;
        return `
            <div class="item-carrito">
                <div style="flex:1; min-width:0;">
                    <div class="item-nombre">${item.nombre}</div>
                    <div class="item-precio">S/ ${item.precio.toFixed(2)} c/u</div>
                </div>
                <div class="controles-cant">
                    <button class="btn-cant" onclick="cambiarCantidad(${item.id}, -1)">−</button>
                    <span style="font-weight:700; min-width:18px; text-align:center;">${item.cantidad}</span>
                    <button class="btn-cant" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                </div>
            </div>`;
    }).join('');

    document.getElementById('totalCarrito').textContent = total.toFixed(2);
}

function abrirCarrito() {
    renderCarrito();
    if (!modalCarrito) {
        modalCarrito = new bootstrap.Modal(document.getElementById('modalCarrito'));
    }
    modalCarrito.show();
    if (!mapa && tipoEntrega === 'DELIVERY') setTimeout(iniciarMapa, 300);
}

/* ── MAPA ── */
function iniciarMapa() {
    mapa = L.map('mapa-pedido').setView([-6.7768, -79.8428], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

    mapa.on('click', async (e) => {
        fijarPunto(e.latlng.lat, e.latlng.lng);
        try {
            const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=es`);
            const data = await res.json();
            if (data.display_name) {
                document.getElementById('direccionCliente').value =
                    data.display_name.split(',').slice(0, 3).join(',').trim();
            }
        } catch(err) {}
    });

    const inputDir  = document.getElementById('direccionCliente');
    const listaDir  = document.getElementById('sugerencias-dir');
    let timer = null;

    inputDir.addEventListener('input', () => {
        clearTimeout(timer);
        const q = inputDir.value.trim();
        if (q.length < 3) { listaDir.style.display = 'none'; return; }
        timer = setTimeout(async () => {
            try {
                const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=pe&limit=6&accept-language=es`);
                const data = await res.json();
                if (!data.length) { listaDir.style.display = 'none'; return; }
                listaDir.innerHTML = data.map(r =>
                    `<li onclick="elegirSugerencia(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g,"\\'")}')">
                        <i class="bi bi-geo-alt-fill"></i><span>${r.display_name}</span>
                    </li>`
                ).join('');
                listaDir.style.display = 'block';
            } catch(err) {}
        }, 350);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.direccion-wrap')) listaDir.style.display = 'none';
    });
}

function elegirSugerencia(lat, lng, nombre) {
    document.getElementById('direccionCliente').value = nombre.split(',').slice(0, 3).join(',').trim();
    document.getElementById('sugerencias-dir').style.display = 'none';
    fijarPunto(parseFloat(lat), parseFloat(lng));
    mapa.setView([lat, lng], 16);
}

function fijarPunto(lat, lng) {
    document.getElementById('latCliente').value  = lat;
    document.getElementById('lngCliente').value  = lng;
    if (marcador) mapa.removeLayer(marcador);
    marcador = L.marker([lat, lng]).addTo(mapa).bindPopup('<b>Tu ubicación</b>').openPopup();
}

/* ── ENVIAR PEDIDO ── */
async function enviarPedido() {
    const nombre    = document.getElementById('nombreCliente').value.trim();
    const direccion = tipoEntrega === 'RECOGER'
        ? 'Recojo en local - Calle Amarantos 091, Santa Victoria'
        : document.getElementById('direccionCliente').value.trim();
    const lat       = document.getElementById('latCliente').value;
    const lng       = document.getElementById('lngCliente').value;
    const items     = Object.values(carrito);

    if (!nombre)       { alert('Por favor ingresa tu nombre');    return; }
    if (!items.length) { alert('Tu carrito está vacío');          return; }
    if (tipoEntrega === 'DELIVERY' && !direccion) {
        alert('Por favor escribe tu dirección'); return;
    }

    const total   = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const detalle = items.map(i => `• ${i.cantidad}x ${i.nombre} = S/${(i.precio*i.cantidad).toFixed(2)}`).join('\n');

    const mensaje =
`🍽️ PEDIDO LA JAMA

👤 Cliente: ${nombre}
📍 ${tipoEntrega === 'RECOGER' ? 'Recojo en local' : 'Delivery'}: ${direccion}

🛒 Pedido:
${detalle}

💰 TOTAL: S/ ${total.toFixed(2)}`;

    try {
        await fetch('/carta/pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente:    nombre,
                direccion:  direccion,
                latitud:    lat ? parseFloat(lat) : null,
                longitud:   lng ? parseFloat(lng) : null,
                montoTotal: parseFloat(total.toFixed(2)),
                tipoPedido: tipoEntrega === 'DELIVERY' ? 'DELIVERY' : 'LOCAL',
                listaDetalles: items.map(i => ({
                    producto:       { id: parseInt(i.id) },
                    cantidad:       i.cantidad,
                    precioUnitario: i.precio,
                    subtotal:       parseFloat((i.precio*i.cantidad).toFixed(2))
                }))
            })
        });
    } catch(e) { console.warn('No se pudo registrar en sistema:', e); }

    window.open('https://wa.me/51955563199?text=' + encodeURIComponent(mensaje), '_blank');
}

/* ── BUSCADOR ── */
const inputBuscar       = document.getElementById('inputBuscar');
const btnLimpiarBuscar  = document.getElementById('btnLimpiarBuscar');
const buscarCounter     = document.getElementById('buscarCounter');
const sinResultados     = document.getElementById('sinResultados');
const txtSinResultados  = document.getElementById('txtSinResultados');

inputBuscar.addEventListener('input', function () {
    const q = this.value.trim();
    btnLimpiarBuscar.style.display = q ? 'block' : 'none';
    filtrarCarta(q);
});

function limpiarBusqueda() {
    inputBuscar.value = '';
    btnLimpiarBuscar.style.display = 'none';
    filtrarCarta('');
    inputBuscar.focus();
}

function filtrarCarta(q) {
    const termino = q.toLowerCase();
    let totalVisibles = 0;

    document.querySelectorAll('.categoria-bloque').forEach(bloque => {
        let visiblesEnBloque = 0;

        bloque.querySelectorAll('.card-prod').forEach(card => {
            const nombre = (card.getAttribute('data-nombre') || '').toLowerCase();
            const desc   = (card.querySelector('.prod-desc') ? card.querySelector('.prod-desc').textContent : '').toLowerCase();
            const coincide = !termino || nombre.includes(termino) || desc.includes(termino);

            card.style.display = coincide ? '' : 'none';
            if (coincide) visiblesEnBloque++;
        });

        bloque.style.display = visiblesEnBloque > 0 ? '' : 'none';
        totalVisibles += visiblesEnBloque;
    });

    if (q) {
        buscarCounter.style.display = 'inline';
        buscarCounter.textContent   = totalVisibles === 1 ? '1 resultado' : totalVisibles + ' resultados';
        sinResultados.style.display = totalVisibles === 0 ? 'block' : 'none';
        txtSinResultados.textContent = q;
    } else {
        buscarCounter.style.display = 'none';
        sinResultados.style.display = 'none';
    }
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('imgPrevia').src = reader.result;
    };
    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}