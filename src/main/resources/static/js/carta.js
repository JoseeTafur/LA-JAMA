let carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
actualizarUI();
let mapa = null;
let marcador = null;
let modalCarrito = null;
let tipoEntrega = 'DELIVERY'; // por defecto
let metodoPago = 'YAPE';

const BASE_IMG_URL = '';

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
    const timestampUnico = Date.now() + Math.random();

    carrito.push({
        idTemporal: timestampUnico,
        id: id,
        nombre: nombre,
        precio: precio,
        cantidad: 1
    });

    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarUI();
}

function actualizarUI() {
    const total = carrito.length;
    document.getElementById('badgeCount').textContent = total;
    const btn = document.getElementById('btnCarrito');
    if (btn) btn.style.display = total > 0 ? 'flex' : 'none';
}

function renderCarrito() {
    const lista = document.getElementById('listaCarrito');
    if (!lista) return;

    if (carrito.length === 0) {
        lista.innerHTML = '<p class="text-muted text-center py-3" style="font-size:0.9rem;">Tu carrito está vacío</p>';
        document.getElementById('totalCarrito').textContent = '0.00';
        return;
    }

    let total = 0;
    lista.innerHTML = carrito.map((item, index) => {
        total += item.precio;
        return `
            <div class="item-carrito">
                <div style="flex:1; min-width:0;">
                    <div class="item-nombre">${item.nombre}</div>
                    <div class="item-precio">S/ ${item.precio.toFixed(2)} c/u</div>
                </div>
                <div class="controles-cant">
                    <button class="btn-cant text-danger" onclick="removerItemCarta(${index})">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </div>
            </div>`;
    }).join('');

    document.getElementById('totalCarrito').textContent = total.toFixed(2);
}

function removerItemCarta(index) {
    carrito.splice(index, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarUI();
    renderCarrito();
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

async function subirImagen(file) {
    const cloudName = "dyjnbddit";
    const unsignedUploadPreset = "vouchers_preset";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", unsignedUploadPreset);

    console.log("📷 [CLOUDINARY] Intentando subir archivo desde la carta...");

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const errorTxt = await res.text();
            console.error("❌ [CLOUDINARY] El servidor rechazó la imagen:", errorTxt);
            return null;
        }

        const data = await res.json();
        console.log("✅ [CLOUDINARY] Subida exitosa. Objeto de retorno:", data);
        return data.public_id;

    } catch (err) {
        console.error("❌ [CLOUDINARY] Error de red al intentar subir:", err);
        return null;
    }
}

/* ── ENVIAR PEDIDO MODIFICADO CON LOADING Y SWEETALERT DE ÉXITO ── */
async function enviarPedido() {
    const nombre    = document.getElementById('nombreCliente').value.trim();
    const direccion = tipoEntrega === 'RECOGER'
        ? 'Recojo en local - Calle Amarantos 091, Santa Victoria'
        : document.getElementById('direccionCliente').value.trim();
    const lat       = document.getElementById('latCliente').value;
    const lng       = document.getElementById('lngCliente').value;

    const prefComprobante = document.getElementById('preferenciaComprobante').value;
    const correoCliente   = document.getElementById('clienteCorreo').value.trim();
    const numDocumento    = document.getElementById('numeroDocumento').value.trim();

    let file;
    switch (metodoPago) {
        case 'YAPE': file = document.getElementById('yapeImgInput').files[0]; break;
        case 'PLIN':  file = document.getElementById('plinImgInput').files[0]; break;
        default:      file = null;
    }

    if (prefComprobante === 'FACTURA') {
        if (!numDocumento) {
            Swal.fire({icon: 'error', title: 'Error', text: 'El número de RUC es obligatorio para Factura.'});
            return;
        }
        if (numDocumento.length !== 11 || !Validation.soloNumeros(numDocumento)) {
            Swal.fire({icon: 'error', title: 'Error', text: 'El RUC debe contener exactamente 11 dígitos numéricos.'});
            return;
        }
        if (!correoCliente) {
            Swal.fire({icon: 'error', title: 'Error', text: 'El correo electrónico es obligatorio para Factura.'});
            return;
        }
    } else {
        if (numDocumento && (numDocumento.length !== 8 || !Validation.soloNumeros(numDocumento))) {
            Swal.fire({icon: 'error', title: 'Error', text: 'El DNI debe contener exactamente 8 dígitos numéricos.'});
            return;
        }
    }

    if (correoCliente && !Validation.correoValido(correoCliente)) {
        Swal.fire({icon: 'error', title: 'Error', text: 'Por favor, ingrese un formato de correo electrónico válido.'});
        return;
    }

    if ((metodoPago === 'YAPE' || metodoPago === 'PLIN') && !file) {
        Swal.fire({icon: 'error', title: 'Error', text: 'Por favor, añada la imagen del pago realizado.'});
        return;
    }

    const total   = carrito.reduce((s, item) => s + item.precio, 0);
    const detalle = carrito.map(item => `• 1x ${item.nombre} = S/ ${item.precio.toFixed(2)}`).join('\n');

    const mensaje =
`🍽️ PEDIDO LA JAMA

👤 Cliente: ${nombre}
📧 Correo: ${correoCliente || 'No registrado'}
📄 Solicitud: ${prefComprobante}
📍 ${tipoEntrega === 'RECOGER' ? 'Recojo en local' : 'Delivery'}: ${direccion}

🛒 Pedido:
${detalle}

💰 TOTAL: S/ ${total.toFixed(2)}`;

    // 🚀 PASO 1: Bloqueamos la interfaz mostrando la pantalla de carga del sistema
    if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
        AppUtils.showLoading(true);
    }

    try {
        // Enrutamos el pedido de la carta digital
        const resPedido = await fetch('/carta/pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente:    nombre,
                direccion:  direccion,
                latitud:    lat ? parseFloat(lat) : null,
                longitud:   lng ? parseFloat(lng) : null,
                montoTotal: parseFloat(total.toFixed(2)),
                tipoPedido: tipoEntrega === 'DELIVERY' ? 'DELIVERY' : 'LOCAL',
                clienteCorreo: correoCliente ? correoCliente : null,
                preferenciaComprobante: prefComprobante,
                documentoCliente: numDocumento ? numDocumento : null,
                listaDetalles: carrito.map(item => ({
                    producto:       { id: parseInt(item.id) },
                    cantidad:       1,
                    precioUnitario: item.precio,
                    subtotal:       item.precio
                }))
            })
        });

        const dataPedido = await resPedido.json();
        const id = dataPedido;

        // Registro de control en la bandeja de auditoría de vouchers
        const resGuardar = await fetch('/admin/pagos-digitales/api/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idPedido:    id,
                observacion: null,
                imgUrl:      null,
            })
        });

        const pagoData = await resGuardar.json();
        const idPago = pagoData.data.id;

        let urlFinalImagen = null;
        if (file) {
            console.log("⏳ Procesando archivo seleccionado por el usuario...");
            urlFinalImagen = await subirImagen(file);
            console.log("🎯 URL final que se enviará a la base de datos:", urlFinalImagen);
        }

        if (urlFinalImagen) {
            await fetch(`/admin/pagos-digitales/api/actualizar-imagen/${idPago}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imgUrl: urlFinalImagen
                })
            });
            console.log("💾 Base de datos actualizada con el identificador de Cloudinary.");
        }

        // 🚀 PASO 2: Liberamos la pantalla de carga una vez completados los hilos asíncronos
        if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
            AppUtils.showLoading(false);
        }

        // Limpieza atómica de estados locales
        localStorage.removeItem("carrito");
        carrito = [];
        actualizarUI();
        if (modalCarrito) modalCarrito.hide();

        // 🚀 PASO 3: Lanzamos la alerta de ÉXITO de SweetAlert2 con redirección controlada
        Swal.fire({
            icon: 'success',
            title: '¡Solicitud Enviada!',
            text: 'Tu orden fue registrada con éxito en el sistema. Espera a que el cajero valide tu comprobante digital.',
            confirmButtonColor: '#1B3A2C',
            confirmButtonText: 'Abrir WhatsApp'
        }).then((result) => {
            // Cuando le da clic a "Abrir WhatsApp", recién ahí disparamos la API externa
            window.open('https://wa.me/51955563199?text=' + encodeURIComponent(mensaje), '_blank');
        });

    } catch (e) {
        // En caso de fallo, forzamos la liberación del loading
        if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
            AppUtils.showLoading(false);
        }
        console.warn('No se pudo registrar en sistema:', e);
        Swal.fire({
            icon: 'error',
            title: 'Error de Red',
            text: 'Fallo crítico al conectar con el servidor central de La Jama.',
            confirmButtonColor: '#d33'
        });
    }
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

function conmutarTipoDocumento() {
    const tipo = document.getElementById('preferenciaComprobante').value;
    const label = document.getElementById('labelDocumento');
    const input = document.getElementById('numeroDocumento');

    if (tipo === 'FACTURA') {
        label.innerHTML = '<i class="bi bi-building me-1"></i>RUC (Obligatorio):';
        input.placeholder = 'Ej: 20601234567';
        input.setAttribute('maxlength', '11');
    } else {
        label.innerHTML = '<i class="bi bi-card-id me-1"></i>DNI (Opcional):';
        input.placeholder = 'Ej: 74589632';
        input.setAttribute('maxlength', '8');
    }
    input.value = "";
}

function previewImageYape(event) {
    const reader = new FileReader();
    const preview = document.getElementById('imgPreviaYape');

    reader.onload = function() {
        preview.src = reader.result;
        preview.style.display = 'block'; // Muestra la imagen dentro de la carpeta
    };

    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

// Añade esta función a tu archivo carta.js
function previewImagePlin(event) {
    const reader = new FileReader();
    const preview = document.getElementById('imgPreviaPlin');

    reader.onload = function() {
        preview.src = reader.result;
        preview.style.display = 'block';
    };

    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}