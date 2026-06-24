// api-client.js
import { aplicarFiltroBinarizado } from './image-processor.js';
import { inicializarScannerTesseract } from './ocr-config.js';
import { carrito, actualizarUI, renderCarrito } from './core-cart.js';
import { estadoCheckout, navegarEtapa } from './checkout-wizard.js';

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
    let file = estadoCheckout.metodoPago === 'YAPE' ? document.getElementById('yapeImgInput').files[0] : document.getElementById('plinImgInput').files[0];
    if ((estadoCheckout.metodoPago === 'YAPE' || estadoCheckout.metodoPago === 'PLIN') && !file) {
        Swal.fire({ icon: 'error', title: 'Falta Voucher', text: 'Suba la captura del pago.' });
        return;
    }

    Swal.fire({ title: 'Analizando Voucher...', text: 'Ejecutando OCR...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let textoOcr = "";
    if (file) {
        try {
            const blobProcesado = await aplicarFiltroBinarizado(file);
            const scanner = await inicializarScannerTesseract();
            const result = await scanner.recognize(blobProcesado);
            textoOcr = result.data.text ? result.data.text : "";
            await scanner.terminate();
        } catch (err) {
            console.error("OCR Error, pasando a failsafe", err);
        }
    }

    const total = carrito.reduce((s, i) => s + i.precio, 0);

        const pedidoPayload = {
        cliente: document.getElementById('nombreCliente').value.trim(), // ✅ Regresa a 'cliente'
        direccion: estadoCheckout.tipoEntrega === 'RECOGER' ? 'Recojo local' : document.getElementById('direccionCliente').value.trim(), // ✅ Regresa a 'direccion'
        latitud: parseFloat(document.getElementById('latCliente').value) || null,
        longitud: parseFloat(document.getElementById('lngCliente').value) || null,
        montoTotal: total,
        metodoPago: estadoCheckout.metodoPago,
        textoVoucherCrudo: textoOcr,
        tipoPedido: estadoCheckout.tipoEntrega === 'RECOGER' ? 'LOCAL' : 'DELIVERY',

        // 🔥 Conservamos tus nuevos campos de metadata fiscal perfectamente mapeados:
        clienteCorreo: document.getElementById('clienteCorreo') ? document.getElementById('clienteCorreo').value.trim() : null,
        preferenciaComprobante: document.getElementById('preferenciaComprobante') ? document.getElementById('preferenciaComprobante').value : 'BOLETA',
        documentoCliente: document.getElementById('numeroDocumento') ? document.getElementById('numeroDocumento').value.trim() : null,

        listaDetalles: carrito.map(i => ({ producto: { id: parseInt(i.id) }, cantidad: 1, precioUnitario: i.precio, subtotal: i.precio }))
    };

    const formData = new FormData();
    formData.append("pedido", new Blob([JSON.stringify(pedidoPayload)], { type: "application/json" }));
    if (file) formData.append("voucher", file);

    try {
        const res = await fetch('/carta/pedido', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error en validación.");

        localStorage.removeItem("carrito");
        carrito.length = 0;
        actualizarUI();
        document.getElementById('modalCarrito').classList.remove('show');
        Swal.fire({ icon: 'success', title: '¡Enviado!', text: 'Pedido recibido en cocina.' });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Rechazado', text: err.message });
    }
}