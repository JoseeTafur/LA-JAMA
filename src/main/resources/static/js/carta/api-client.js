// api-client.js
import { carrito, actualizarUI } from './core-cart.js';
import { estadoCheckout } from './checkout-wizard.js';

let mapa = null; let marcador = null;

export function iniciarMapa() {
    if (mapa) { setTimeout(() => mapa.invalidateSize(), 200); return; }
    mapa = L.map('mapa-pedido').setView([-6.7768, -79.8428], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

    mapa.on('click', async (e) => {
        fijarUbicacionMarcador(e.latlng.lat, e.latlng.lng);

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=es`);
            const data = await res.json();
            if (data.display_name) {
                document.getElementById('direccionCliente').value =
                    data.display_name.split(',').slice(0, 3).join(',').trim();
            }
        } catch (err) {
            console.warn("No se pudo recuperar la dirección de texto del mapa:", err);
        }
    });

    configurarAutocompletado();
}

function fijarUbicacionMarcador(lat, lng) {
    document.getElementById('latCliente').value = lat;
    document.getElementById('lngCliente').value = lng;
    if (marcador) mapa.removeLayer(marcador);
    marcador = L.marker([lat, lng]).addTo(mapa).bindPopup('<b>Tu Entrega</b>').openPopup();
}

function configurarAutocompletado() {
    const input = document.getElementById('direccionCliente');
    const lista = document.getElementById('sugerencias-dir');
    input.addEventListener('input', () => {
        if (input.value.trim().length < 3) { lista.style.display = 'none'; return; }
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input.value)}&countrycodes=pe&limit=5`)
            .then(res => res.json()).then(data => {
                lista.innerHTML = data.map(r => `<li onclick="window.seleccionarSugerencia(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g, "\\'")}')">${r.display_name}</li>`).join('');
                lista.style.display = 'block';
            });
    });
}

window.seleccionarSugerencia = (lat, lng, nombre) => {
    document.getElementById('direccionCliente').value = nombre.split(',').slice(0, 3).join(',').trim();
    document.getElementById('sugerencias-dir').style.display = 'none';
    fijarUbicacionMarcador(lat, lng);
    mapa.setView([lat, lng], 16);
};

export async function enviarPedidoFinal() {
    Swal.fire({ title: 'Registrando pedido...', text: 'Enviando a cocina...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const total = carrito.reduce((s, i) => s + i.precio, 0);

    // Jalamos los datos que la IA inyectó en caliente en el paso anterior
    const codigoPago = window.estadoCheckout.codigoOperacion || "PENDIENTE";
    // Pasamos la url de la imagen que ya vive en Cloudinary
    const urlVoucherYaSubido = window.estadoCheckout.imgUrlVoucher || "sin_imagen.jpg";

    const pedidoPayload = {
        cliente: document.getElementById('nombreCliente').value.trim(),
        direccion: estadoCheckout.tipoEntrega === 'LLEVAR' ? 'Recojo local - Mostrador' : document.getElementById('direccionCliente').value.trim(),
        latitud: parseFloat(document.getElementById('latCliente').value) || null,
        longitud: parseFloat(document.getElementById('lngCliente').value) || null,
        montoTotal: total,
        metodoPago: estadoCheckout.metodoPago,
        codigoPagoOperacion: codigoPago,
        tipoPedido: estadoCheckout.tipoEntrega,
        clienteCorreo: document.getElementById('clienteCorreo') ? document.getElementById('clienteCorreo').value.trim() : null,
        preferenciaComprobante: document.getElementById('preferenciaComprobante') ? document.getElementById('preferenciaComprobante').value : 'BOLETA',
        documentoCliente: document.getElementById('numeroDocumento') ? document.getElementById('numeroDocumento').value.trim() : null,
        textoVoucherCrudo: urlVoucherYaSubido,
        listaDetalles: carrito.map(i => ({ producto: { id: parseInt(i.id) }, cantidad: 1, precioUnitario: i.precio, subtotal: i.precio }))
    };

    const formData = new FormData();
    formData.append("pedido", new Blob([JSON.stringify(pedidoPayload)], { type: "application/json" }));

    try {
        const res = await fetch('/carta/pedido', { method: 'POST', body: formData });
        if (!res.ok) throw new Error("Error al asentar el pedido.");

        localStorage.removeItem("carrito");
        carrito.length = 0;
        actualizarUI();
        document.getElementById('modalCarrito').classList.remove('show');
        Swal.fire({ icon: 'success', title: '¡Enviado!', text: 'Pedido recibido en cocina.' });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Rechazado', text: err.message });
    }
}