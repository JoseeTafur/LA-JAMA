let carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
actualizarUI();
let mapa = null;
let marcador = null;
let modalCarrito = null;
let tipoEntrega = 'DELIVERY'; // por defecto
let metodoPago = 'YAPE';

// Variables globales para el control del Multi-Step Wizard
let etapaActualCheckout = 1;
const totalEtapasCheckout = 4;

const BASE_IMG_URL = '';

// ============================================================================
// 🚀 MOTOR CONTROLLER: MULTI-STEP WIZARD NAVEGACIÓN (LA JAMA)
// ============================================================================
function navegarEtapa(direccion) {
    // 🛡️ ADUANA FRONTEND: Validaciones estrictas antes de permitir avanzar de paso
    if (direccion === 1) {
        if (etapaActualCheckout === 1) {
            const nombre = document.getElementById('nombreCliente').value.trim();
            if (!nombre) {
                Swal.fire({ icon: 'warning', title: 'Dato Obligatorio', text: 'Por favor, ingrese su nombre para continuar con su pedido.', confirmButtonColor: '#1B3A2C' });
                return;
            }
        }
        if (etapaActualCheckout === 2 && tipoEntrega === 'DELIVERY') {
            const direccion = document.getElementById('direccionCliente').value.trim();
            const lat = document.getElementById('latCliente').value;
            if (!direccion || !lat) {
                Swal.fire({ icon: 'warning', title: 'Ubicación Requerida', text: 'Por favor, busque su dirección o marque su punto exacto en el mapa para el delivery.', confirmButtonColor: '#1B3A2C' });
                return;
            }
        }
        if (etapaActualCheckout === 3) {
            const correo = document.getElementById('clienteCorreo').value.trim();
            const tipoDoc = document.getElementById('preferenciaComprobante').value;
            const numDoc = document.getElementById('numeroDocumento').value.trim();

            if (correo && !Validation.correoValido(correo)) {
                Swal.fire({ icon: 'error', title: 'Correo Inválido', text: 'Por favor, ingrese un formato de correo electrónico válido.', confirmButtonColor: '#1B3A2C' });
                return;
            }

            if (tipoDoc === 'FACTURA') {
                if (!numDoc) {
                    Swal.fire({ icon: 'error', title: 'Error Fiscal', text: 'El número de RUC es obligatorio para la emisión de Facturas.', confirmButtonColor: '#1B3A2C' });
                    return;
                }
                if (numDoc.length !== 11 || !Validation.soloNumeros(numDoc)) {
                    Swal.fire({ icon: 'error', title: 'RUC Inválido', text: 'El RUC comercial debe contener exactamente 11 dígitos numéricos.', confirmButtonColor: '#1B3A2C' });
                    return;
                }
                if (!correo) {
                    Swal.fire({ icon: 'error', title: 'Dato Obligatorio', text: 'El correo electrónico es obligatorio para Facturas.', confirmButtonColor: '#1B3A2C' });
                    return;
                }
            } else {
                if (numDoc && (numDoc.length !== 8 || !Validation.soloNumeros(numDoc))) {
                    Swal.fire({ icon: 'error', title: 'DNI Inválido', text: 'El DNI civil debe contener exactamente 8 dígitos numéricos.', confirmButtonColor: '#1B3A2C' });
                    return;
                }
            }
        }
    }

    // Calculamos el destino matemático seguro
    etapaActualCheckout += direccion;
    if (etapaActualCheckout < 1) etapaActualCheckout = 1;
    if (etapaActualCheckout > totalEtapasCheckout) etapaActualCheckout = totalEtapasCheckout;

    // 🔄 CONMUTACIÓN DE PANELES HTML
    document.querySelectorAll('.jama-checkout-step').forEach(step => step.classList.add('d-none'));
    document.getElementById(`checkout-step-${etapaActualCheckout}`).classList.remove('d-none');

    // Sincronizamos la barra de nodos superiores de la cabecera
    for (let i = 1; i <= totalEtapasCheckout; i++) {
        const node = document.getElementById(`indicator-step-${i}`);
        if (i < etapaActualCheckout) {
            node.className = "jama-step-node completed";
        } else if (i === etapaActualCheckout) {
            node.className = "jama-step-node active";
        } else {
            node.className = "jama-step-node";
        }
    }

    // Actualizamos el porcentaje de llenado de la barra de progreso
    const porcentajeProgreso = ((etapaActualCheckout - 1) / (totalEtapasCheckout - 1)) * 100;
    const progressBar = document.getElementById('stepProgressBar');
    if (progressBar) progressBar.style.width = `${porcentajeProgreso}%`;

    // 🎮 CONTROL DINÁMICO DE BOTONES DE ACCIÓN (FOOTER)
    const btnAtras = document.getElementById('btnAtrasStep');
    const btnCancelar = document.getElementById('btnCancelarCheckout');
    const btnSiguiente = document.getElementById('btnSiguienteStep');
    const btnFinalizar = document.getElementById('btnFinalizarPedido');

    // Visibilidad del botón de retorno
    if (etapaActualCheckout === 1) {
        btnAtras.classList.add('d-none');
        btnCancelar.classList.remove('d-none');
    } else {
        btnAtras.classList.remove('d-none');
        btnCancelar.classList.add('d-none');
    }

    // Visibilidad del disparador final
    if (etapaActualCheckout === totalEtapasCheckout) {
        btnSiguiente.classList.add('d-none');
        btnFinalizar.classList.remove('d-none');
    } else {
        btnSiguiente.classList.remove('d-none');
        btnFinalizar.classList.add('d-none');
    }

    // 🗺️ CORRECCIÓN DE MOTOR DE MAPA EN SEGUNDA ETAPA
    if (etapaActualCheckout === 2 && tipoEntrega === 'DELIVERY') {
        if (!mapa) {
            setTimeout(iniciarMapa, 300);
        } else {
            // Re-calculamos las dimensiones físicas de Leaflet para corregir casillas grises
            setTimeout(() => { mapa.invalidateSize(); }, 200);
        }
    }
}

/* ── CONFIGURACIÓN LOGÍSTICA DE SERVICIO ── */
function seleccionarTipo(tipo) {
    tipoEntrega = tipo;
    document.getElementById('btnRecoger').className = 'btn-tipo' + (tipo === 'RECOGER' ? ' activo' : '');
    document.getElementById('btnDelivery').className = 'btn-tipo' + (tipo === 'DELIVERY' ? ' activo' : '');
    document.getElementById('seccionDireccion').style.display = tipo === 'DELIVERY' ? 'block' : 'none';

    if (tipo === 'DELIVERY' && etapaActualCheckout === 2) {
        if (!mapa) {
            setTimeout(iniciarMapa, 300);
        } else {
            setTimeout(() => { mapa.invalidateSize(); }, 200);
        }
    }
}

function seleccionarPago(metodo) {
    metodoPago = metodo;
    document.getElementById('btnYape').className = 'btn-tipo' + (metodo === 'YAPE' ? ' activo' : '');
    document.getElementById('btnPlin').className = 'btn-tipo' + (metodo === 'PLIN' ? ' activo' : '');
    document.getElementById('seccionYape').style.display = metodo === 'YAPE' ? 'block' : 'none';
    document.getElementById('seccionPlin').style.display = metodo === 'PLIN' ? 'block' : 'none';
}

/* ── ACCIONES DEL CARRITO DE COMPRAS ── */
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
    const badge = document.getElementById('badgeCount');
    if (badge) badge.textContent = total;

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
                    <button class="btn-cant text-danger" onclick="removerItemCarta(${index})" style="background:transparent; border:none;">
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

    // Si borra el último plato y el carrito se vacía, cerramos el modal automáticamente
    if (carrito.length === 0 && modalCarrito) {
        modalCarrito.hide();
    }
}

function abrirCarrito() {
    renderCarrito();

    // Inicializamos y reseteamos el checkout secuencial al Paso 1
    etapaActualCheckout = 1;
    navegarEtapa(0);

    if (!modalCarrito) {
        modalCarrito = new bootstrap.Modal(document.getElementById('modalCarrito'));
    }
    modalCarrito.show();
}

/* ── MOTOR GEOLOCALIZACIÓN: MAPAS COBERTURA ── */
function iniciarMapa() {
    if (mapa) return; // Evita inicializaciones redundantes sobre el mismo contenedor

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

/* ── ADUANA DIGITAL DE CARGA DE VOUCHERS ── */
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

/* ── TRANSMISIÓN DEL PEDIDO CON LOGÍSTICA MULTIPART HÍBRIDA ANTIFRAUDE ── */
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
        case 'PLIN': file = document.getElementById('plinImgInput').files[0]; break;
        default:     file = null;
    }

    // Validaciones previas básicas en el Frontend
    if ((metodoPago === 'YAPE' || metodoPago === 'PLIN') && !file) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Por favor, añada la imagen del pago realizado.', confirmButtonColor: '#1B3A2C' });
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

    // Activamos la pantalla de bloqueo visual de La Jama
    if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
        AppUtils.showLoading(true);
    }

    // ── 🔥 PASO MAESTRO: PROCESAMIENTO OCR EN EL NAVEGADOR DEL CLIENTE ──
    let textoVoucherExtraido = "";
    if (file && (metodoPago === 'YAPE' || metodoPago === 'PLIN')) {
        Swal.fire({
            title: 'Validando Parámetros Financieros...',
            text: 'La IA está descifrando el monto y la fecha del voucher desde tu dispositivo de forma segura.',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // Inicialización local del Worker en el cliente sin consumir RAM en Railway
            const resultadoOcr = await Tesseract.recognize(file, 'spa');
            textoVoucherExtraido = resultadoOcr.data.text;
            console.log("🛰️ [OCR FRONTEND] Texto extraído con éxito:\n", textoVoucherExtraido);
        } catch (ocrError) {
            console.warn("⚠️ Falló el motor OCR en el navegador, pasando a contingencia:", ocrError);
            textoVoucherExtraido = ""; // Pasa vacío para que el backend lo marque como CHECK-MANUAL
        }
    }

    try {
        const formDataPayload = new FormData();

        const pedidoDataJson = {
            cliente:    nombre,
            direccion:  direccion,
            latitud:    lat ? parseFloat(lat) : null,
            longitud:   lng ? parseFloat(lng) : null,
            montoTotal: parseFloat(total.toFixed(2)),
            metodoPago: metodoPago,
            tipoPedido: tipoEntrega === 'DELIVERY' ? 'DELIVERY' : 'LOCAL',
            clienteCorreo: correoCliente ? correoCliente : null,
            preferenciaComprobante: prefComprobante,
            documentoCliente: numDocumento ? numDocumento : null,
            textoVoucherCrudo: textoVoucherExtraido, // 🌟 INYECTAMOS EL TEXTO EXTRAÍDO EN EL JSON
            listaDetalles: carrito.map(item => ({
                producto:       { id: parseInt(item.id) },
                cantidad:       1,
                precioUnitario: item.precio,
                subtotal:       item.precio
            }))
        };

        // Empaquetamos el json del DTO pedido
        formDataPayload.append("pedido", new Blob([JSON.stringify(pedidoDataJson)], { type: "application/json" }));

        // Adjuntamos el archivo binario del voucher para el filtro cromático de seguridad en el backend
        if (file) {
            formDataPayload.append("voucher", file);
        }

        const resPedido = await fetch('/carta/pedido', {
            method: 'POST',
            body: formDataPayload
        });

        const dataPedido = await resPedido.json();

        // 🛡️ CONTROL DE ADUANA ANTIFRAUDE
        if (!resPedido.ok) {
            if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
                AppUtils.showLoading(false);
            }
            Swal.fire({
                icon: 'error',
                title: 'Validación de Pago Fallida',
                text: dataPedido.message || 'El comprobante enviado no cumple con los requisitos mínimos de seguridad.',
                confirmButtonColor: '#933D2D'
            });
            return;
        }

        const id = dataPedido.id;

        // Tu flujo regular con tablas internas de auditoría de vouchers
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
            urlFinalImagen = await subirImagen(file);
        }

        if (urlFinalImagen) {
            await fetch(`/admin/pagos-digitales/api/actualizar-imagen/${idPago}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imgUrl: urlFinalImagen })
            });
        }

        if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
            AppUtils.showLoading(false);
        }

        // Limpieza y reseteo una vez que la transacción es exitosa
        localStorage.removeItem("carrito");
        carrito = [];
        actualizarUI();
        if (modalCarrito) modalCarrito.hide();

        Swal.fire({
            icon: 'success',
            title: '¡Solicitud Enviada!',
            text: 'Tu orden fue registrada con éxito en el sistema. Espera a que el cajero valide tu comprobante digital.',
            confirmButtonColor: '#1B3A2C',
            confirmButtonText: 'Abrir WhatsApp'
        }).then((result) => {
            window.open('https://wa.me/51955563199?text=' + encodeURIComponent(mensaje), '_blank');
        });

    } catch (e) {
        if (typeof AppUtils !== 'undefined' && AppUtils.showLoading) {
            AppUtils.showLoading(false);
        }
        Swal.fire({
            icon: 'error',
            title: 'Error en la Operación',
            text: e.message || 'Fallo crítico al conectar con el servidor central de La Jama.',
            confirmButtonColor: '#d33'
        });
    }
}

/* ── FILTRADO Y MOTOR DE BÚSQUEDA DE PLATOS ── */
const inputBuscar       = document.getElementById('inputBuscar');
const btnLimpiarBuscar  = document.getElementById('btnLimpiarBuscar');
const buscarCounter     = document.getElementById('buscarCounter');
const sinResultados     = document.getElementById('sinResultados');
const txtSinResultados  = document.getElementById('txtSinResultados');

if (inputBuscar) {
    inputBuscar.addEventListener('input', function () {
        const q = this.value.trim();
        if (btnLimpiarBuscar) btnLimpiarBuscar.style.display = q ? 'block' : 'none';
        filtrarCarta(q);
    });
}

function limpiarBusqueda() {
    if (inputBuscar) {
        inputBuscar.value = '';
        if (btnLimpiarBuscar) btnLimpiarBuscar.style.display = 'none';
        filtrarCarta('');
        inputBuscar.focus();
    }
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
        if (buscarCounter) {
            buscarCounter.style.display = 'inline';
            buscarCounter.textContent   = totalVisibles === 1 ? '1 resultado' : totalVisibles + ' resultados';
        }
        if (sinResultados) sinResultados.style.display = totalVisibles === 0 ? 'block' : 'none';
        if (txtSinResultados) txtSinResultados.textContent = q;
    } else {
        if (buscarCounter) buscarCounter.style.display = 'none';
        if (sinResultados) sinResultados.style.display = 'none';
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

/* ── RENDERIZADORES DE PREVISUALIZACIÓN DE IMÁGENES (VOUCHERS) ── */
function previewImageYape(event) {
    const reader = new FileReader();
    const preview = document.getElementById('imgPreviaYape');

    reader.onload = function() {
        if (preview) {
            preview.src = reader.result;
            preview.style.display = 'block';
        }
    };

    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

function previewImagePlin(event) {
    const reader = new FileReader();
    const preview = document.getElementById('imgPreviaPlin');

    reader.onload = function() {
        if (preview) {
            preview.src = reader.result;
            preview.style.display = 'block';
        }
    };

    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}