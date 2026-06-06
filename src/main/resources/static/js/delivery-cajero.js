/**
 * LA JAMA - Módulo Delivery (OpenStreetMap Version)
 */
let carrito = [];
let mapaPreview;
let marcadorPreview = null;
let tipoPedidoCajero = 'DELIVERY';

document.addEventListener('DOMContentLoaded', () => {
    initModuloEntrega();
    configurarBuscadorProductos();
});

function initModuloEntrega() {
    mapaPreview = L.map('mapa-preview').setView([-6.771, -79.838], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapaPreview);

    const provider = new window.GeoSearch.OpenStreetMapProvider({
        params: {
            'accept-language': 'es',
            countrycodes: 'pe',
            viewbox: '-79.9500,-6.7000,-79.7400,-6.8500',
            bounded: 1
        }
    });

    const searchControl = new window.GeoSearch.GeoSearchControl({
        provider: provider,
        style: 'bar',
        container: document.getElementById('search-container'),
        showMarker: false,
        autoClose: true,
        searchLabel: 'Escribe calle o lugar en Chiclayo...'
    });

    mapaPreview.addControl(searchControl);

    mapaPreview.on('geosearch/showlocation', (result) => {
        const { x, y, label } = result.location;
        actualizarPuntoEntrega(y, x, label);
    });

    mapaPreview.on('click', async (e) => {
        const { lat, lng } = e.latlng;

        document.getElementById('lat').value = lat.toFixed(6);
        document.getElementById('lng').value = lng.toFixed(6);
        document.getElementById('inputDireccion').value = "Obteniendo dirección exacta...";

        dibujarMarcador(lat, lng, "Cargando dirección...");

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`);
            const data = await response.json();
            const direccionReal = data.display_name ? data.display_name : `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            actualizarPuntoEntrega(lat, lng, direccionReal);

        } catch (error) {
            console.error("Error al obtener la dirección por click:", error);
            actualizarPuntoEntrega(lat, lng, `Dirección seleccionada (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
    });
}

function actualizarPuntoEntrega(lat, lng, direccion) {
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;
    document.getElementById('inputDireccion').value = direccion;

    dibujarMarcador(lat, lng, direccion);
    mapaPreview.setView([lat, lng], 16);
}

function dibujarMarcador(lat, lng, textoPopup) {
    if (marcadorPreview) mapaPreview.removeLayer(marcadorPreview);

    marcadorPreview = L.marker([lat, lng]).addTo(mapaPreview)
        .bindPopup(`<b>Punto de Entrega:</b><br>${textoPopup}`)
        .openPopup();
}

function agregarAlCarrito(id, nombre, precio) {
    const existe = carrito.find(item => item.id === id);
    if (existe) {
        existe.cantidad++;
        existe.subtotal = existe.cantidad * precio;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1, subtotal: precio });
    }
    renderizarCarrito();
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    renderizarCarrito();
}

function renderizarCarrito() {
    const tabla = document.getElementById('tabla-carrito');
    const labelTotal = document.getElementById('label-total');
    let html = '';
    let total = 0;

    carrito.forEach(item => {
        total += item.subtotal;
        html += `
            <tr class="animate__animated animate__fadeIn">
                <td><span class="badge bg-jama rounded-pill">${item.cantidad}</span></td>
                <td class="small fw-bold">${item.nombre}</td>
                <td class="text-ocre fw-bold">S/ ${item.subtotal.toFixed(2)}</td>
                <td class="text-end">
                    <i class="bi bi-trash3 text-danger cursor-pointer" onclick="eliminarDelCarrito(${item.id})"></i>
                </td>
            </tr>
        `;
    });

    tabla.innerHTML = html || '<tr><td colspan="4" class="text-center py-4 text-muted">Carrito vacío</td></tr>';
    labelTotal.innerText = total.toFixed(2);
}

function configurarBuscadorProductos() {
    const input = document.getElementById('busqueda');
    if (input) {
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.item-producto').forEach(div => {
                const nombre = div.getAttribute('data-nombre').toLowerCase();
                div.style.display = nombre.includes(term) ? 'block' : 'none';
            });
        });
    }
}

function seleccionarTipo(tipo) {
    tipoPedidoCajero = tipo;
    const esDelivery = tipo === 'DELIVERY';

    document.getElementById('btnDelivery').style.background = esDelivery ? 'var(--lajama-brown)' : '#e9ecef';
    document.getElementById('btnDelivery').style.color = esDelivery ? 'white' : '#333';
    document.getElementById('btnParaLlevar').style.background = !esDelivery ? 'var(--lajama-brown)' : '#e9ecef';
    document.getElementById('btnParaLlevar').style.color = !esDelivery ? 'white' : '#333';

    document.getElementById('bloqueDir').style.display = esDelivery ? 'block' : 'none';
    document.getElementById('mapa-preview').style.display = esDelivery ? 'block' : 'none';

    document.getElementById('tituloEntrega').innerHTML = esDelivery
        ? '<i class="bi bi-geo-alt-fill me-2"></i> Datos de Entrega'
        : '<i class="bi bi-bag me-2"></i> Datos del Cliente';
}

// --- ACOPLE INTERACTIVO CON APPUTILS LOGÍSTICA ---
function confirmarPedido() {
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const cliente = document.getElementById('cliente_nombre').value.trim();
    const esDelivery = tipoPedidoCajero === 'DELIVERY';

    // 1. Validaciones usando las alertas estandarizadas de AppUtils
    if (esDelivery && (!lat || !cliente || carrito.length === 0)) {
        AppUtils.showNotification("⚠️ Datos incompletos: ingresa cliente, dirección en mapa y productos.", "warning");
        return;
    }

    if (!esDelivery && (!cliente || carrito.length === 0)) {
        AppUtils.showNotification("⚠️ Datos incompletos: ingresa el nombre del cliente y añade productos.", "warning");
        return;
    }

    // 2. Cuadro de confirmación estructurado por callback
    AppUtils.showConfirmationDialog({
        title: esDelivery ? '¿Enviar a Despacho Delivery?' : '¿Enviar a Cocina Local?',
        text: `Se registrará la comanda a nombre de ${cliente} por un total de S/ ${document.getElementById('label-total').innerText}`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, confirmar comanda'
    }, function() {

        // Activamos la pantalla de carga para evitar colisiones concurrentes en la persistencia
        AppUtils.showLoading(true);

        const data = {
            cliente: cliente,
            direccion: esDelivery ? document.getElementById('inputDireccion').value : 'Recojo en local',
            latitud: esDelivery ? parseFloat(lat) : null,
            longitud: esDelivery ? parseFloat(lng) : null,
            montoTotal: parseFloat(document.getElementById('label-total').innerText),
            tipoPedido: esDelivery ? 'DELIVERY' : 'LOCAL',
            listaDetalles: carrito.map(i => ({
                producto: { id: i.id },
                cantidad: i.cantidad,
                precioUnitario: i.precio,
                subtotal: i.subtotal
            }))
        };

        fetch('/admin/caja/delivery/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => {
            AppUtils.showLoading(false);
            if (res.ok) {
                const msg = esDelivery ? 'Orden enviada a despacho con éxito' : 'Orden enviada a cocina con éxito';
                const redirect = esDelivery ? '/admin/despacho' : '/admin/caja';

                // Dispara el SweetAlert de confirmación final
                Swal.fire({
                    icon: 'success',
                    title: '¡Comanda Registrada!',
                    text: msg,
                    confirmButtonColor: '#1B3A2C'
                }).then(() => {
                    window.location.href = redirect;
                });
            } else {
                AppUtils.showNotification("❌ Error en el servidor al guardar comanda", "error");
            }
        })
        .catch(err => {
            AppUtils.showLoading(false);
            console.error("Fallo de red:", err);
            AppUtils.showNotification("❌ Fallo de conexión con el servidor", "error");
        });
    });
}