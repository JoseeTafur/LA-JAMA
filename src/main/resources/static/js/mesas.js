// =======================================================
// ESTADO GLOBAL
// =======================================================
let currentMesaId     = null;
let currentMesaNumero = null;
let currentPedidoId   = null;
let mesaModal         = null;
let facturacionModal  = null;

// ─── Unificación de mesas ───────────────────────────────
let modoUnificacionActivo = false;
let modoReservaMasivaActiva = false;

// ─── Modal de acción unificado (Cambiar / Dividir) ──────
let modoAccionMesaActual        = null;   // 'CAMBIAR_TODO' | 'DIVIDIR_PARCIAL'
let mesaDestinoSeleccionadaId   = null;
let instanciaModalAccion        = null;

// ─── Pago parcial ───────────────────────────────────────
let esPagoParcialComanda = false;

// =======================================================
// CONEXIÓN WEBSOCKET PARA COCINA
// =======================================================
var socket      = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Conectado a WebSocket: ' + frame);
    // Escuchador de notificaciones generales de cocina
    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        mostrarNotificacionCocina(notificacion.body);
    });

    // 🔥 OPTIMIZACIÓN: Suscripción a cambios de estado de mesas en tiempo real
    stompClient.subscribe('/topic/mesas/estados', function (payload) {
        const evento = JSON.parse(payload.body);
        // evento = { numeroMesa: 5, nuevoEstado: 'lista-para-recoger', pedidoId: 102, pedidoEstado: 'EN_COCINA' }
        actualizarEstadoMesaEnPlano(evento.numeroMesa, evento.nuevoEstado, evento.pedidoId, evento.pedidoEstado);
    });

    stompClient.subscribe('/topic/notificaciones/mozos', function (notificacion) {
            procesarNotificacionMozoInPlano(notificacion.body);
    });
});

function procesarNotificacionMozoInPlano(mensaje) {
    var audioNotif = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioNotif.play().catch(e => console.log("Audio en espera"));

    if (mensaje.includes("⏳") || mensaje.includes("🚨")) {
        AppUtils.showNotification(mensaje, 'warning');
    } else if (mensaje.includes("⚠️")) {
        // Reservas expiradas
        AppUtils.showNotification(mensaje, 'error');
    } else {
        AppUtils.showNotification(mensaje, 'success');
    }

    // Refresca la grilla de reservas de fondo si el DataTable está renderizado en pantalla
    if (typeof dataTable !== 'undefined') {
        dataTable.ajax.reload(null, false);
    }
}

function mostrarNotificacionCocina(mensaje) {
    if (mensaje.includes("🚨 ALERTA DE MERMA")) {
        var audioAlarma = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
        audioAlarma.play().catch(e => console.log("Sonido bloqueado"));
        AppUtils.showNotification(mensaje, 'error');
    } else {
        var audioNormal = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioNormal.play().catch(e => console.log("Sonido bloqueado"));
        AppUtils.showNotification(`📢 AVISO: ${mensaje}`, 'warning');

        // 🚀 SOLUCIONADO: Ya no usamos window.location.reload().
        // El WebSocket '/topic/mesas/estados' se encargará de refrescar la mesa específica de forma reactiva.
    }
}

// =======================================================
// INICIALIZACIÓN DOM
// =======================================================
document.addEventListener('DOMContentLoaded', function () {

    const modalElement = document.getElementById('modalMesa');
    if (modalElement) mesaModal = new bootstrap.Modal(modalElement);

    const facturacionElement = document.getElementById('modalFacturacion');
    if (facturacionElement) facturacionModal = new bootstrap.Modal(facturacionElement);

    // Inicialización del Modal Unificado Interactivo
    const accionMesaElement = document.getElementById('modalAccionMesa');
    if (accionMesaElement) instanciaModalAccion = new bootstrap.Modal(accionMesaElement);
});

// =======================================================
// GESTIÓN DEL PLANO DE MESAS (CLICS)
// =======================================================
function gestionarClickMesa(elemento) {
    if (modoUnificacionActivo) {
        const checkbox = elemento.querySelector('.check-salon-unir');
        if (checkbox && !elemento.classList.contains('unificada') && elemento.getAttribute('data-id') !== currentMesaId) {
            checkbox.checked = !checkbox.checked;
            elemento.style.border    = checkbox.checked ? "3px solid #4c1d95" : "2px solid transparent";
            elemento.style.transform = checkbox.checked ? "scale(0.96)" : "none";
            actualizarContadorUnificacion();
        }
        return;
    }

    if (modoReservaMasivaActiva) {
        const checkboxReserva = elemento.querySelector('.check-reserva-masiva');
        if (checkboxReserva) {
            const vistaActual = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';

            if (vistaActual === 'salon' && (elemento.classList.contains('ocupada') || elemento.classList.contains('unificada'))) return;
            if (vistaActual === 'reservas' && elemento.classList.contains('unificada')) return;

            checkboxReserva.checked = !checkboxReserva.checked;
            elemento.style.border    = checkboxReserva.checked ? "3px solid #1B3A2C" : "2px solid transparent";
            elemento.style.transform = checkboxReserva.checked ? "scale(0.96)" : "none";
            actualizarContadorReservaMasiva();
        }
        return;
    }

    const id = elemento.getAttribute('data-id');
    const numero = elemento.getAttribute('data-numero');
    const pedidoEstado = elemento.getAttribute('data-pedido-estado');

    const vistaReservasActiva = !document.getElementById('vista-reservas').classList.contains('d-none');

    // ADUANA OPERATIVA: Si la mesa está en la pestaña de reservas y no tiene comanda todavía
    if (vistaReservasActiva && (!pedidoEstado || pedidoEstado === 'NINGUNO')) {
        currentMesaId = id;
        currentMesaNumero = numero;

        Swal.fire({
            title: `Mesa #${numero} Custodiada`,
            text: "¿Deseas liberar esta mesa al salón ordinario o abrir atención para la reserva?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-unlock-fill me-1"></i> Quitar de Reserva',
            cancelButtonText: 'Atender Mesa'
        }).then((result) => {
            if (result.isConfirmed) {
                // Delegamos la acción. La aduana física se ejecutará adentro cuando el servidor responda OK.
                procesarQuitarMesaDeReservaIndividual(id, numero);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                prepararGestion(elemento);
            }
        });
        return;
    }

    // Flujo ordinario para mesas comunes o con comida activa
    prepararGestion(elemento);
}

// =======================================================
// PREPARAR GESTIÓN DE UNA MESA (abre el modal principal)
// =======================================================
function prepararGestion(elemento) {
    if (!elemento) return;

    const id             = elemento.getAttribute('data-id');
    currentMesaNumero    = elemento.getAttribute('data-numero');
    currentPedidoId      = elemento.getAttribute('data-pedido-id');
    currentMesaId        = id;

    const pedidoEstado   = elemento.getAttribute('data-pedido-estado');
    const esUnificada    = elemento.classList.contains('unificada');
    const esTarjetaEstirada = elemento.classList.contains('tarjeta-unificada');
    const esPadre        = elemento.getAttribute('data-es-padre') === 'SI' || esTarjetaEstirada;

    // Ejecutar renderizado base de controles del modal
    renderizarControlesModal(esPadre, esUnificada, pedidoEstado, elemento);

    // ── Carga asíncrona aislada de la comanda ──────────────────
    cargarDetalleComandaAsincrono(pedidoEstado);

    if (mesaModal) mesaModal.show();
}

function renderizarControlesModal(esPadre, esUnificada, pedidoEstado, elemento) {
    const btnDesocupar      = document.getElementById('btnDesocupar');
    const txtConfirmacion   = document.getElementById('textoConfirmacion');
    const btnUnificar       = document.getElementById('btnUnificarMesas');
    const btnAgregar        = document.getElementById('btnAgregarPedido');
    const btnDesvincular    = document.getElementById('btnDesvincularMesa');
    const btnDesagrupar     = document.getElementById('btnDesagruparGrupo');
    const btnCambiarMesa    = document.getElementById('btnCambiarMesa');
    const btnDividirComanda = document.getElementById('btnDividirComanda');
    const btnSelectTodo     = document.getElementById('btnSeleccionarTodo');
    const numMesaTexto      = document.getElementById('numMesaTexto');
    const lblNumero         = document.getElementById('lblNumero');
    const badgeTicket       = document.getElementById('badge-ticket');
    const avisoVacio        = document.getElementById('comanda-vacia-aviso');

    // Reset del subtotal elegido
    const txtElegido = document.getElementById('txt-subtotal-elegido');
    if (txtElegido) txtElegido.innerText = "0.00";

    if (btnSelectTodo)     { btnSelectTodo.innerHTML = `<i class="bi bi-check-all me-1"></i> Seleccionar todo`; }
    if (txtConfirmacion)   txtConfirmacion.classList.add('d-none');

    // 🟩 REPARACIÓN CORE DE UI: Mostramos las herramientas operativas por defecto
    if (btnCambiarMesa)    btnCambiarMesa.classList.remove('d-none');
    if (btnDividirComanda) btnDividirComanda.classList.remove('d-none');
    if (btnSelectTodo)     btnSelectTodo.classList.remove('d-none');

    if (btnDesvincular)    btnDesvincular.classList.add('d-none');
    if (btnDesagrupar)     btnDesagrupar.classList.add('d-none');

    if (btnDesocupar) {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
    }

    if (btnUnificar)        btnUnificar.classList.remove('d-none');
    if (btnAgregar)         btnAgregar.classList.remove('d-none');
    if (avisoVacio)         avisoVacio.classList.add('d-none');
    if (badgeTicket)        badgeTicket.classList.add('d-none');
    if (lblNumero)          lblNumero.innerText = currentMesaNumero;

    // ============================================================================
    // 🎯 MOTOR INTERACTIVO DE ACCIONES SEGÚN JERARQUÍA DEL SALÓN
    // ============================================================================
    if (esPadre) {
        // Si es la Mesa Controladora de un grupo:
        if (btnUnificar)   btnUnificar.classList.add('d-none'); // Ya está agrupada, no puede agrupar más
        if (btnDesagrupar) {
            // El botón de disolución manual queda 100% activo y libre
            btnDesagrupar.classList.remove('d-none');
            btnDesagrupar.classList.remove('disabled');
            btnDesagrupar.disabled = false;
        }

        // Failsafe por si el grupo aún no registra ningún consumo activo
        if (!currentPedidoId || pedidoEstado === 'NINGUNO') {
            if (btnSelectTodo)     btnSelectTodo.classList.add('d-none');
            if (btnCambiarMesa)    btnCambiarMesa.classList.add('d-none');
            if (btnDividirComanda) btnDividirComanda.classList.add('d-none');
            if (avisoVacio)        avisoVacio.classList.remove('d-none');
        }

    } else if (esUnificada) {
        // Si es una Mesa Hija anexada (Mesa Satélite):
        if (btnSelectTodo)     btnSelectTodo.classList.add('d-none');
        if (btnCambiarMesa)    btnCambiarMesa.classList.add('d-none');
        if (btnDividirComanda) btnDividirComanda.classList.add('d-none');
        if (btnUnificar)       btnUnificar.classList.add('d-none');
        if (btnAgregar)        btnAgregar.classList.add('d-none');

        // Se le permite desvincularse de forma satelital e independiente
        if (btnDesvincular)    btnDesvincular.classList.remove('d-none');
        if (lblNumero)         lblNumero.innerText = currentMesaNumero + " (Anexada)";

    } else {
        // Si es una Mesa Común estándar de salón:
        if (!currentPedidoId || pedidoEstado === 'NINGUNO') {
            if (btnSelectTodo)     btnSelectTodo.classList.add('d-none');
            if (btnCambiarMesa)    btnCambiarMesa.classList.add('d-none');
            if (btnDividirComanda) btnDividirComanda.classList.add('d-none');
            if (avisoVacio)        avisoVacio.classList.remove('d-none');
            return;
        }

        if (elemento && elemento.classList.contains('lista-para-recoger')) {
            if (numMesaTexto)    numMesaTexto.innerText = currentMesaNumero;
            if (txtConfirmacion) txtConfirmacion.classList.remove('d-none');
        }
    }
}

// =========================================================================
// 🚀 ADUANA ASÍNCRONA: REFRESCADOR DE COMANDAS Y BOTONES EN CALIENTE (SIN F5)
// =========================================================================
function cargarDetalleComandaAsincrono(pedidoEstado) {
    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos       = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal       = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio        = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal     = document.getElementById('panel-subtotal-modal');
    const badgeTicket       = document.getElementById('badge-ticket');

    // Ubicamos la tarjeta física del salón para leer sus atributos jerárquicos reales
    const tarjetaMesaDOM = document.getElementById(`mesa-card-${currentMesaId}`);
    const esPadreGrupo = tarjetaMesaDOM ? tarjetaMesaDOM.getAttribute('data-es-padre') === 'SI' : false;
    const esUnificada = tarjetaMesaDOM ? tarjetaMesaDOM.classList.contains('unificada') : false;

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                // Si el servidor responde 404 es porque la mesa se quedó sin platos vivos
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                if (txtSubtotal) txtSubtotal.innerText = data.montoTotal.toFixed(2);
                if (listaPlatos) listaPlatos.innerHTML = "";

                const ticketImpreso = data.ticketImpreso === true;
                if (badgeTicket) badgeTicket.classList.toggle('d-none', !ticketImpreso);

                // ESCENARIO A: El JSON llegó pero el array de detalles está en cero
                if (data.detalles.length === 0) {
                    if (avisoVacio) avisoVacio.classList.remove('d-none');
                    if (contenedorComanda) contenedorComanda.classList.add('d-none');
                    if (panelSubtotal) panelSubtotal.classList.add('d-none');

                    // 🎯 RECONFIGURACIÓN ASÍNCRONA EN CALIENTE (Apaga botones)
                    currentPedidoId = "";
                    renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
                    return;
                }

                // Renderizado normal de platos si la lista tiene ítems activos
                data.detalles.forEach(d => {
                    if (d.canceladoPorCliente) {
                        listaPlatos.innerHTML += `
                            <div class="d-flex justify-content-between align-items-center p-2 rounded border"
                                 style="background-color:#ffe5e5; border-left:4px solid #dc3545 !important; opacity:0.8;">
                                <div class="d-flex align-items-center gap-2" style="max-width:50%;">
                                    <span class="badge bg-danger text-white rounded-pill fw-bold">${d.cantidad}</span>
                                    <span class="text-danger fw-bold text-decoration-line-through text-truncate" style="max-width:140px;">${d.producto.nombre}</span>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="text-danger small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
                                    <span class="badge bg-danger rounded-pill px-2 py-1" style="font-size:0.7rem;">MERMA</span>
                                </div>
                            </div>`;
                        return;
                    }

                    let badgeColor = 'bg-danger';
                    let badgeTexto = 'En cocina';
                    if (d.cocinado && d.entregado)  { badgeColor = 'bg-secondary'; badgeTexto = 'Entregado'; }
                    else if (d.cocinado)             { badgeColor = 'bg-success';   badgeTexto = 'Listo'; }

                    let btnEliminarHTML = '';
                    if (!d.cocinado) {
                        const esMerma = ticketImpreso ? 'true' : 'false';
                        const icono   = ticketImpreso ? 'bi-exclamation-triangle-fill text-warning' : 'bi-trash3-fill text-danger';
                        btnEliminarHTML = `
                            <button class="btn btn-sm btn-link p-1 ms-1" title="Anular plato"
                                    onclick="eliminarItemComanda(${currentPedidoId}, ${d.id}, '${d.producto.nombre}', ${esMerma})">
                                <i class="bi ${icono} fs-5"></i>
                            </button>`;
                    } else {
                        btnEliminarHTML = `<button class="btn btn-sm btn-link text-muted p-1 ms-1" disabled><i class="bi bi-trash3 opacity-50 fs-5"></i></button>`;
                    }

                    let btnCheckUnitarioHTML = '';
                    if (d.cocinado && !d.entregado) {
                        btnCheckUnitarioHTML = `
                            <button class="btn btn-sm btn-warning text-dark px-2 py-1 rounded-pill ms-1"
                                    onclick="entregarPlatoUnitario(${currentPedidoId}, ${d.id}, '${d.producto.nombre}')"
                                    style="font-size:0.75rem; font-weight:700;">
                                <i class="bi bi-check2"></i> Entregar
                            </button>`;
                    }

                    let checkboxHTML = '';
                    if (!d.canceladoPorCliente) {
                        const precioSeguro = d.subtotal ? d.subtotal : (d.precioUnitario ? d.precioUnitario : 0);
                        checkboxHTML = `
                            <input type="checkbox" class="form-check-input chk-mesa-confirmar"
                                   style="width:18px; height:18px; cursor:pointer; border:2px solid #1B3A2C; margin-left:10px;"
                                   value="${d.id}"
                                   data-precio="${precioSeguro}"
                                   data-estado-plato="${badgeTexto}"
                                   onchange="evaluarBotonConfirmarPago()">`;
                    } else {
                        checkboxHTML = `<div style="width:28px;"></div>`;
                    }

                    listaPlatos.innerHTML += `
                        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border item-plato-comanda"
                             data-estado="${badgeTexto}"
                             data-precio="${d.subtotal}"
                             style="font-size:0.9rem; border-left:4px solid var(--lajama-green) !important;">
                            <div class="d-flex align-items-center gap-2" style="max-width:50%;">
                                <span class="badge bg-dark text-white rounded-pill fw-bold">${d.cantidad}x</span>
                                <span class="text-dark fw-semibold text-truncate" style="max-width:140px;">${d.producto.nombre}</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="text-muted small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
                                <span class="badge ${badgeColor} rounded-pill px-2 py-1" style="font-size:0.7rem;">${badgeTexto}</span>
                                ${btnCheckUnitarioHTML}
                                ${btnEliminarHTML}
                                ${checkboxHTML}
                            </div>
                        </div>`;
                });

                if (contenedorComanda) contenedorComanda.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.remove('d-none');
                if (avisoVacio)        avisoVacio.classList.add('d-none');

                // 🎯 RECONFIGURACIÓN ASÍNCRONA EN CALIENTE (Prende botones de acción porque hay comida)
                renderizarControlesModal(esPadreGrupo, esUnificada, pedidoEstado, tarjetaMesaDOM);
            })
            .catch(err => {
                // ESCENARIO B: Saltó el error 404 (Sin consumos) atrapado desde tu consola
                console.warn("Manejo controlado de precuenta vacía:", err.message);

                if (avisoVacio)    avisoVacio.classList.remove('d-none');
                if (panelSubtotal) panelSubtotal.add ? panelSubtotal.add('d-none') : panelSubtotal.classList.add('d-none');
                if (contenedorComanda) contenedorComanda.classList.add('d-none');

                // 🎯 LA SOLUCIÓN REACIVA: Forzamos el apagado y bloqueo de botones al instante de ver que no hay comida
                currentPedidoId = "";
                renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
            });
    } else {
        // ESCENARIO C: Variables inicializadas vacías por defecto
        if (avisoVacio)    avisoVacio.classList.remove('d-none');
        if (panelSubtotal) panelSubtotal.classList.add('d-none');
        if (contenedorComanda) contenedorComanda.classList.add('d-none');

        // 🎯 Forzamos bloqueo preventivo de control de botones
        renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
    }
}

// =========================================================================
// 🚀 MOTOR EN VIVO: REACTIVIDAD PURA Y ADUANA DE RETENCIÓN VERDE/MORADO
// =========================================================================
function actualizarEstadoMesaEnPlano(numeroMesa, nuevoEstado, nuevoPedidoId, pedidoEstado) {
    const tarjeta = document.querySelector(`[data-numero="${numeroMesa}"]`);
    if (!tarjeta) return;

    // 1. Purgamos absolutamente todas las clases operativas de color anteriores
    tarjeta.classList.remove('disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar', 'unificada', 'reservada');

    // 2. Sincronizamos metadatos de la orden activa
    if (nuevoPedidoId) tarjeta.setAttribute('data-pedido-id', nuevoPedidoId);
    if (pedidoEstado) tarjeta.setAttribute('data-pedido-estado', pedidoEstado);

        const contenedorSalon    = document.querySelector('#vista-salon .grid-mesas');
        const contenedorReservas = document.querySelector('#vista-reservas .grid-mesas') || document.getElementById('contenedor-mesas-reservadas-pestaña');

        // 🟩 MUDANZA OPERATIVA REAL
        if (nuevoEstado === 'reservada' || nuevoEstado === 'RESERVADA') {
            tarjeta.setAttribute('data-en-reserva', 'true');
            if (contenedorReservas && !contenedorReservas.contains(tarjeta)) {
                contenedorReservas.appendChild(tarjeta);
            }
        } else if (nuevoEstado === 'disponible' || nuevoEstado === 'ocupada' || nuevoEstado === 'lista-para-recoger' || nuevoEstado === 'lista-para-pagar') {
            tarjeta.setAttribute('data-en-reserva', 'false');
            if (contenedorSalon && !contenedorSalon.contains(tarjeta)) {
                // Inyecta directamente en la grilla de la Vista Salón ordinaria
                contenedorSalon.appendChild(tarjeta);
            }
        }

    // 4. ASIGNACIÓN CROMÁTICA DIRECTA
    if (nuevoEstado === 'reservada' || nuevoEstado === 'RESERVADA' || nuevoEstado === 'disponible') {
        tarjeta.classList.add('disponible');
    } else {
        tarjeta.classList.add(nuevoEstado);
    }

    // REPARACIÓN EN CALIENTE DE ATRIBUTOS JERÁRQUICOS
    if (nuevoEstado === 'disponible' || nuevoEstado === 'ocupada' || nuevoEstado === 'lista-para-recoger' || nuevoEstado === 'lista-para-pagar') {
            // Al romperse el grupo, el nodo deja de actuar como mesa controladora en el DOM instantáneamente
            tarjeta.setAttribute('data-es-padre', 'NO');

            if (nuevoEstado === 'disponible') {
                tarjeta.removeAttribute('data-id-mesa-padre');
                tarjeta.setAttribute('data-pedido-id', '');
                tarjeta.setAttribute('data-pedido-estado', 'NINGUNO');
            }
        }


    // 5. CORRECCIÓN DE ÍCONOS EN CALIENTE: Evaluamos la variable limpia 'nuevoEstado' en vez de clases del DOM
    const icono = tarjeta.querySelector('.mesa-icon-wrapper i');
        if (icono) {
            icono.className = "";

            // Evaluamos el 'nuevoEstado' crudo recibido por el WebSocket/servidor
            if (nuevoEstado === 'unificada') {
                icono.className = "bi bi-link-45deg";
            } else if (nuevoEstado === 'lista-para-recoger') {
                icono.className = "bi bi-bell-fill"; // Amarillo parpadeante culinario
            } else if (nuevoEstado === 'lista-para-pagar') {
                icono.className = "bi bi-person-check-fill";
            } else if (nuevoEstado === 'ocupada') {
                icono.className = "bi bi-cup-hot-fill";
            } else {
                // Si la mesa se liberó o regresó al estado disponible/reservado, dibuja el ícono base según su pestaña
                const estaFisicamenteEnReservas = (contenedorReservas && contenedorReservas.contains(tarjeta));
                icono.className = estaFisicamenteEnReservas ? "bi bi-calendar-check-fill" : "bi bi-cup-hot-fill";
            }
        }

        // 🟩 ADUANA ASÍNCRONA DE RESERVAS: Reevalúa dinámicamente si el panel quedó vacío
            if (contenedorReservas) {
                const totalMesasEnReservas = contenedorReservas.querySelectorAll('.mesa-box').length;
                let avisoReservaVacio = document.getElementById('reserva-vacia-aviso');

                if (totalMesasEnReservas === 0) {
                    // Si el contenedor se quedó sin casilleros y no existe el aviso, lo inyectamos de inmediato
                    if (!avisoReservaVacio) {
                        contenedorReservas.insertAdjacentHTML('afterend', `
                            <div class="text-center py-5 animate__animated animate__fadeIn" id="reserva-vacia-aviso">
                                <i class="bi bi-calendar-x text-muted" style="font-size: 4rem;"></i>
                                <h5 class="fw-bold text-muted mt-3">No hay mesas en custodia de reserva</h5>
                                <p class="text-muted small">Asigna bloques de mesas desde la pestaña "Vista Salón" para resguardarlas.</p>
                            </div>`);
                    }
                } else {
                    // En cuanto ingrese al menos una mesa al panel, destruimos el aviso dinámicamente
                    if (avisoReservaVacio) {
                        avisoReservaVacio.remove();
                    }
                }
            }

    // 6. Sincronización de la UI del modal operativo abierto
    if (currentMesaNumero == numeroMesa && mesaModal && document.getElementById('modalMesa').classList.contains('show')) {
        const pedidoEstadoActual = tarjeta.getAttribute('data-pedido-estado');
        const esPadreActual = tarjeta.getAttribute('data-es-padre') === 'SI' || tarjeta.classList.contains('tarjeta-unificada');
        const esUnificadaActual = tarjeta.classList.contains('unificada');

        if (nuevoPedidoId) currentPedidoId = nuevoPedidoId;

        renderizarControlesModal(esPadreActual, esUnificadaActual, pedidoEstadoActual, tarjeta);
        cargarDetalleComandaAsincrono(pedidoEstadoActual);
    }
}

// =======================================================
// ACCIONES DE PLATOS
// =======================================================
function entregarPlatoUnitario(pedidoId, detalleId, nombreProducto) {
    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Entrega?',
        text: `¿Confirmas que ya serviste "${nombreProducto}" en la Mesa N° ${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, entregado'
    }, async function () {
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);

        try {
            const res = await fetch('/admin/mesas/comanda/entregar-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Plato entregado correctamente", "success");

                // 🚀 CAMBIO ASÍNCRONO: Recargamos solo la comanda dentro del modal y el estado local de la mesa
                cargarDetalleComandaAsincrono("EN_PROCESO");
                // Consultamos si quedan platos pendientes para cambiar el color en el plano principal
                const tarjetaMesa = document.getElementById(`mesa-card-${currentMesaId}`);
                if (tarjetaMesa) {
                    // Si ya no tiene la clase parpadeante de cocina, actualizar plano localmente
                    cargarDetalleComandaAsincrono("EN_PROCESO");
                }
            } else {
                AppUtils.showNotification("Error al registrar la entrega", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
        }
    });
}

function eliminarItemComanda(pedidoId, detalleId, nombreProducto, esMerma) {
    const titulo    = esMerma ? '¿Declarar Merma?' : '¿Eliminar de la Comanda?';
    const text      = esMerma
        ? `⚠️ El ticket ya se imprimió en cocina. Si anulas "${nombreProducto}" ahora, el cliente igual lo pagará y se alertará al cocinero para detener su preparación.`
        : `¿Estás seguro de remover "${nombreProducto}" de la orden actual? Se recalculará el total.`;
    const icono     = esMerma ? 'warning' : 'question';
    const colorBtn  = '#dc3545';
    const textoBtn  = esMerma ? 'Sí, anular and alertar' : 'Sí, remover plato';

    AppUtils.showConfirmationDialog({
        title: titulo, text, icon: icono,
        confirmButtonColor: colorBtn, confirmButtonText: textoBtn
    }, async function () {
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);

        try {
            const res = await fetch("/admin/mesas/comanda/eliminar-item", {
                method: "POST",
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification(esMerma ? "Plato anulado. Alerta enviada a cocina." : "Producto removido con éxito", "success");
                // 🚀 CAMBIO ASÍNCRONO: Refrescar la lista de platos del modal directamente
                cargarDetalleComandaAsincrono("EN_COCINA");
            } else {
                const errorText = await res.text();
                AppUtils.showNotification(errorText || "Error al anular el producto", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
        }
    });
}

function irAMenu() {
    if (currentMesaId) {
        let url = '/admin/mesero/nuevo?mesaId=' + currentMesaId;
        if (currentPedidoId) url += '&pedidoId=' + currentPedidoId;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('embed') === 'true') {
            url += '&embed=true';
        }

        window.location.href = url;
    }
}

// =======================================================
// UNIFICACIÓN DE MESAS
// =======================================================
function activarModoSeleccionUnificacion() {
    if (!currentMesaId) return;
    modoUnificacionActivo = true;
    if (mesaModal) mesaModal.hide();

    document.getElementById("txtMesaPadreHerramienta").innerText = currentMesaNumero;
    document.getElementById("barre-unificacion").classList.remove("d-none");
    document.getElementById("barre-unificacion").classList.add("d-flex");

    document.querySelectorAll(".mesa-box").forEach(box => {
        const idMesaBox = box.getAttribute("data-id");
        if (box.classList.contains("unificada") || idMesaBox === currentMesaId) {
            box.style.opacity       = "0.4";
            box.style.pointerEvents = "none";
        } else {
            box.querySelector(".checkbox-seleccion-unificacion")?.classList.remove("d-none");
        }
    });
    actualizarContadorUnificacion();
}

function cancelarModoUnificacion() {
    modoUnificacionActivo = false;
    document.getElementById("barre-unificacion").classList.add("d-none");
    document.getElementById("barre-unificacion").classList.remove("d-flex");

    document.querySelectorAll(".mesa-box").forEach(box => {
        box.style.opacity       = "1";
        box.style.pointerEvents = "auto";
        box.style.border        = "2px solid transparent";
        box.style.transform     = "none";
        const check = box.querySelector(".check-salon-unir");
        if (check) check.checked = false;
        box.querySelector(".checkbox-seleccion-unificacion")?.classList.add("d-none");
    });
}

function actualizarContadorUnificacion() {
    const seleccionadas = document.querySelectorAll(".check-salon-unir:checked").length;
    document.getElementById("count-seleccionadas").innerText = seleccionadas;
}

function actualizarPanelGruposUnificados(numeroMesaPadre, numerosHijasArray, pedidoEstado = 'NINGUNO', pedidoId = '') {
    const contenedor = document.getElementById('contenedor-tarjetas-unificadas');
    if (!contenedor) return;

    // 1. Eliminar el aviso de "No hay grupos unificados activos" si existe
    const avisoVacio = document.getElementById('grupo-vacio-aviso');
    if (avisoVacio) avisoVacio.remove();

    // 2. Determinar la clase cromática de la tarjeta basada en el estado de la comanda
    let claseCromatica = 'disponible';
    let iconoClase = 'bi-person-check-fill';

    if (pedidoEstado === 'EN_COCINA' || pedidoEstado === 'PENDIENTE') {
        claseCromatica = 'ocupada';
        iconoClase = 'bi-cup-hot-fill';
    } else if (pedidoEstado === 'LISTO_PARA_RECOGER') {
        claseCromatica = 'lista-para-recoger';
        iconoClase = 'bi-bell-fill';
    } else if (pedidoEstado === 'LISTO_PARA_PAGAR') {
        claseCromatica = 'lista-para-pagar';
    }

    // 3. Generar el listado de badges de las mesas hijas seleccionadas
    let badgesHijasHTML = '';
    numerosHijasArray.forEach(num => {
        badgesHijasHTML += `<span class="badge bg-dark bg-opacity-25 text-dark rounded-pill px-2 py-1 fs-6 ms-1">#${num}</span>`;
    });

    // 4. Construir la estructura de la tarjeta Shadcn de La Jama de forma limpia
    const nuevaTarjetaHTML = `
        <div class="card border-0 shadow-sm rounded-4 tarjeta-unificada ${claseCromatica}"
             data-id="${currentMesaId}"
             data-numero="${numeroMesaPadre}"
             data-pedido-id="${pedidoId}"
             data-pedido-status="${pedidoEstado}"
             onclick="prepararGestion(this)">
            <div class="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="text-white rounded-circle d-flex justify-content-center align-items-center shadow-sm"
                         style="width:55px; height:55px; background-color: var(--lajama-green);">
                        <i class="bi ${iconoClase} fs-4"></i>
                    </div>
                    <div>
                        <h5 class="fw-bold mb-1">Mesa Controladora #${numeroMesaPadre}</h5>
                        <p class="mb-0 small opacity-75">
                            Mesas acopladas físicamente en salón: ${badgesHijasHTML}
                        </p>
                    </div>
                </div>
                <div class="badge-accion-grupo fw-bold shadow-sm">
                    <i class="bi bi-box-arrow-in-up-right me-1"></i> Administrar Comanda Colectiva
                </div>
            </div>
        </div>`;

    // 5. Inyectar la tarjeta al inicio del contenedor asíncronamente
    contenedor.insertAdjacentHTML('afterbegin', nuevaTarjetaHTML);

    // 6. Actualizar el contador rojo de la pestaña superior en caliente
    actualizarContadorBadgePestaña();
}

// Incrementa o decrementa el contador de la notificación de la pestaña superior
function actualizarContadorBadgePestaña() {
    const totalTarjetas = document.querySelectorAll('#contenedor-tarjetas-unificadas .tarjeta-unificada').length;
    // Buscamos el elemento badge dentro de la estructura de radio-inputs de La Jama
    const badgePestaña = document.querySelector('.radio-inputs-jama label:nth-child(2) .badge');
    if (badgePestaña) {
        if (totalTarjetas > 0) {
            badgePestaña.innerText = totalTarjetas;
            badgePestaña.classList.remove('d-none');
        } else {
            badgePestaña.classList.add('d-none');
        }
    }
}

function procesarUnificacionDirecta() {
    const checks = document.querySelectorAll(".check-salon-unir:checked");
    if (checks.length === 0) {
        AppUtils.showNotification("Por favor, selecciona al menos una mesa en el plano.", "warning");
        return;
    }
    const idsHijas = Array.from(checks).map(c => c.value);
    const numerosHijas = Array.from(checks).map(c => c.closest('.mesa-box').getAttribute('data-numero'));

    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Agrupación Masiva?',
        text: `¿Estás seguro de anexar estas ${idsHijas.length} mesas a la cuenta de la Mesa #${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, agrupar mesas'
    }, async function () {
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("idMesaPrincipal", currentMesaId);
        idsHijas.forEach(id => params.append("idsMesasHijas", id));

        try {
            const res = await fetch("/admin/mesas/unificar", { method: "POST", body: params });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesas unificadas correctamente", "success");

                const tarjetaPadreDOM = document.querySelector(`[data-id="${currentMesaId}"]`);
                if (tarjetaPadreDOM) {
                    tarjetaPadreDOM.setAttribute('data-es-padre', 'SI');
                }

                // Le estampamos el estado operativo real
                actualizarEstadoMesaEnPlano(currentMesaNumero, 'unificada', currentPedidoId, 'AGRUPADO');

                checks.forEach(c => {
                    const cajaHijaDOM = c.closest('.mesa-box');
                    if (cajaHijaDOM) {
                        cajaHijaDOM.setAttribute('data-es-padre', 'NO');
                        cajaHijaDOM.setAttribute('data-id-mesa-padre', currentMesaId);

                        const numHija = cajaHijaDOM.getAttribute('data-numero');
                        actualizarEstadoMesaEnPlano(numHija, 'unificada', null, 'NINGUNO');
                    }
                });

                actualizarPanelGruposUnificados(currentMesaNumero, numerosHijas, 'AGRUPADO', currentPedidoId);
                cancelarModoUnificacion();
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al procesar la unificación masiva en caliente:", error);
        }
    });
}

function procesarDesvincular() {
    AppUtils.showConfirmationDialog({
        title: '¿Desunificar Mesa?',
        text: `La Mesa #${currentMesaNumero} volverá a estar libre físicamente.`,
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, liberar mesa'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desvincular/${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesa desvinculada y libre", "success");
                actualizarEstadoMesaEnPlano(currentMesaNumero, 'disponible', null, 'NINGUNO');
                if (mesaModal) mesaModal.hide();
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
        }
    });
}

function procesarDesfragmentacionGrupo() {
    if (!currentMesaId) return;

    AppUtils.showConfirmationDialog({
        title: '¿Desagrupar Todo el Bloque?',
        text: 'Se disolverá el grupo de mesas colectivas.',
        icon: 'warning',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, desagrupar todo'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desagrupar-grupo/${currentMesaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            AppUtils.showLoading(false);

            if (res.ok) {
                const data = await res.json();

                if (data.success) {
                    AppUtils.showNotification(data.message || "Grupo disuelto con éxito", "success");

                    const tarjetaGrupo = document.querySelector(`#contenedor-tarjetas-unificadas [data-numero="${currentMesaNumero}"]`);
                    if (tarjetaGrupo) {
                        tarjetaGrupo.remove();
                        actualizarContadorBadgePestaña();
                    }

                    // Sincronizamos localmente la mesa principal
                    actualizarEstadoMesaEnPlano(currentMesaNumero, 'disponible', null, 'NINGUNO');
                    if (mesaModal) mesaModal.hide();
                } else {
                    // Muestra el SweetAlert2 explicativo si hay platos vivos
                    Swal.fire({
                        icon: 'warning',
                        title: 'Operación Restringida',
                        text: data.message || "No se puede desagrupar el bloque con pedidos activos.",
                        confirmButtonColor: '#1B3A2C'
                    });
                }
            } else {
                AppUtils.showNotification("Error de comunicación con el servidor.", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al intentar desagrupar bloque:", error);
        }
    });
}

// =======================================================
// DELEGACIÓN DEL CONTROL A CAJA-MOVIL.JS
// =======================================================
async function validarDesocupar() {
    if (!currentMesaNumero) return;

    let totalPlatosEnMesa = 0;
    document.querySelectorAll('#lista-platos-previsualizar > div').forEach(row => {
        if (row.style.backgroundColor.includes('rgb(255, 229, 229)')) return;
        totalPlatosEnMesa++;
    });

    const checkboxesMarcados = document.querySelectorAll('.chk-mesa-confirmar:checked').length;

    if (checkboxesMarcados === 0) {
        AppUtils.showNotification("Por favor, selecciona al menos un plato entregado para procesar su pago.", "warning");
        return;
    }

    esPagoParcialComanda = (checkboxesMarcados < totalPlatosEnMesa);

    if (!currentPedidoId || currentPedidoId === "") {
        AppUtils.showNotification("Esta cuenta grupal no registra consumos activos.", "warning");
        return;
    }

    AppUtils.showLoading(true);
    try {
        const res = await fetch('/admin/mesas/precuenta/' + currentMesaNumero);
                AppUtils.showLoading(false);
                if (!res.ok) return;

                const data = await res.json();

                const preferencia = data.preferenciaComprobante || 'BOLETA';
                const documento = data.documentoCliente || '';

                inicializarFlujoCaja(data.montoTotal, currentMesaNumero, preferencia, documento);

                if (mesaModal)       mesaModal.hide();
                if (facturacionModal) facturacionModal.show();

            } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error al transferir control al módulo de cobros:", error);
    }
}

// =======================================================
// SELECCIÓN MASIVA DE PLATOS ENTREGADOS
// =======================================================
function toggleSeleccionarTodosLosPlatos() {
    const filasEntregadas = Array.from(document.querySelectorAll('#lista-platos-previsualizar [data-estado="Entregado"]'));
    const checkboxesEntregados = filasEntregadas.map(row => row.querySelector('.chk-mesa-confirmar')).filter(cb => cb !== null);
    const btn = document.getElementById('btnSeleccionarTodo');

    if (checkboxesEntregados.length === 0) {
        AppUtils.showNotification("No hay platos en estado 'Entregado' para seleccionar.", "warning");
        return;
    }

    const todosMarcados = checkboxesEntregados.every(cb => cb.checked);
    checkboxesEntregados.forEach(cb => { cb.checked = !todosMarcados; });

    if (btn) {
        btn.innerHTML = !todosMarcados ? `<i class="bi bi-x-circle me-1"></i> Desmarcar todo` : `<i class="bi bi-check-all me-1"></i> Seleccionar todo`;
    }
    evaluarBotonConfirmarPago();
}

// =========================================================================
// 🎨 ADUANA DE ACCIÓN CORREGIDA: ENRUTAMIENTO STRICTO HACIA LA MESA PADRE
// =========================================================================
function abrirModalAccionUnificado(modo) {
    modoAccionMesaActual      = modo;
    mesaDestinoSeleccionadaId = null;

    if (modo === 'DIVIDIR_PARCIAL') {
        const platosSeleccionados = document.querySelectorAll('.chk-mesa-confirmar:checked');
        if (platosSeleccionados.length === 0) {
            AppUtils.showNotification("Por favor, selecciona al menos un plato usando los checkboxes.", "warning");
            return;
        }
    }

    const titulo      = document.getElementById('txtTituloAccionMesa');
    const descripcion = document.getElementById('txtDescripcionAccionMesa');
    const btnProcesar = document.getElementById('btnProcesarAccionMesa');
    const lblOrigen   = document.getElementById('lblMesaOrigenAccion');
    const inputBuscar = document.getElementById('buscarMesaAccion');

    if (lblOrigen)   lblOrigen.innerText = currentMesaNumero;
    if (btnProcesar) btnProcesar.disabled = true;
    if (inputBuscar) inputBuscar.value = "";

    if (modo === 'CAMBIAR_TODO') {
        if (titulo)      titulo.innerHTML  = '<i class="bi bi-arrow-left-right me-2"></i>Trasladar Comanda Completa';
        if (descripcion) descripcion.innerText = "Moverá la totalidad de la comanda actual hacia la mesa que selecciones.";
    } else {
        if (titulo)      titulo.innerHTML  = '<i class="bi bi-bezier2 me-2"></i>Dividir Comanda / Trasladar Ítems';
        if (descripcion) descripcion.innerText = "Solo se transferirán los platos específicos que dejaste marcados con el check.";
    }

    const contenedorLista = document.getElementById('lista-mesas-destino-accion');
    if (contenedorLista) contenedorLista.innerHTML = '<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Cargando mapa...</div>';

    // 🟩 ADUANA DE ENTORNO: Leemos si la mesa origen actual está en Reservas o en el Salón
    const tarjetaOrigenDOM = document.getElementById(`mesa-card-${currentMesaId}`);
    const origenEsReservada = tarjetaOrigenDOM ? (tarjetaOrigenDOM.closest('#contenedor-mesas-reservadas-pestaña') !== null) : false;

    const selectNativo = document.getElementById('selectMesaDestino');
    if (selectNativo) {
        if (contenedorLista) contenedorLista.innerHTML = "";
        const opcionesValidas = Array.from(selectNativo.options).filter(opt => opt.value !== "" && opt.text !== currentMesaNumero.toString());

        if (opcionesValidas.length === 0) {
            if (contenedorLista) contenedorLista.innerHTML = '<div class="p-3 text-center text-muted small">No hay otras mesas disponibles en el plano.</div>';
        } else {
            opcionesValidas.forEach(opt => {
                const idMesa = opt.value;
                const numeroMesa = opt.text;

                // Leemos el flag de reserva inyectado en el option del select nativo
                const destinoEsReservada = opt.getAttribute('data-reserva-entorno') === 'true';
                const tarjetaMesaOriginal = document.getElementById('mesa-card-' + idMesa);

                let estaOcupada = false;
                let esMesaHijaAgrupada = false;
                let esMesaPadreControladora = false;

                if (tarjetaMesaOriginal) {
                    const estadoPedido = tarjetaMesaOriginal.getAttribute('data-pedido-estado');
                    estaOcupada = (estadoPedido && estadoPedido !== 'NINGUNO');

                    const esUnificada = tarjetaMesaOriginal.classList.contains('unificada');
                    const flagPadre = tarjetaMesaOriginal.getAttribute('data-es-padre');

                    if (flagPadre === 'SI') {
                        esMesaPadreControladora = true;
                    } else if (esUnificada && flagPadre !== 'SI') {
                        esMesaHijaAgrupada = true;
                    }
                }

                let badgeEstado = '';
                let estiloAtributo = '';
                let deshabilitadoAttr = '';

                // 🛡️ REGLA ABSOLUTA DE ENRUTAMIENTO: Si no pertenecen al mismo entorno boolean, se bloquea la fila
                if (origenEsReservada !== destinoEsReservada) {
                    const mensajeBloqueo = origenEsReservada ? 'Mesa de Salón (Bloqueada)' : 'Mesa Reservada (Bloqueada)';
                    badgeEstado = `<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill" style="font-size:0.7rem;"><i class="bi bi-lock-fill me-1"></i>${mensajeBloqueo}</span>`;
                    estiloAtributo = 'background-color: #f8fafc; opacity: 0.45; cursor: not-allowed; border-left: 4px solid #64748b !important;';
                    deshabilitadoAttr = 'disabled';
                } else if (esMesaHijaAgrupada) {
                    badgeEstado = '<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill" style="font-size:0.7rem;"><i class="bi bi-x-circle-fill me-1"></i>Hija (Bloqueada)</span>';
                    estiloAtributo = 'background-color: #fef2f2; opacity: 0.55; cursor: not-allowed; border-left: 4px solid #ef4444 !important;';
                    deshabilitadoAttr = 'disabled';
                } else if (esMesaPadreControladora) {
                    badgeEstado = '<span class="badge rounded-pill" style="font-size:0.75rem; background-color:#4c1d95; color:#fff7ed;"><i class="bi bi-link-45deg me-1"></i>Padre del Grupo</span>';
                    estiloAtributo = 'background-color: #f5f3ff; border-left: 4px solid #4c1d95 !important; font-weight:700;';
                } else if (estaOcupada) {
                    badgeEstado = '<span class="badge bg-warning text-dark rounded-pill" style="font-size:0.7rem;"><i class="bi bi-exclamation-triangle-fill me-1"></i>Con Consumo</span>';
                    estiloAtributo = 'border-left: 4px solid #f59e0b !important;';
                } else {
                    badgeEstado = '<span class="badge bg-success text-white rounded-pill" style="font-size:0.7rem;"><i class="bi bi-check-circle-fill me-1"></i>Libre</span>';
                    estiloAtributo = 'border-left: 4px solid #10b981 !important;';
                }

                if (contenedorLista) {
                    contenedorLista.innerHTML += `
                        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3 item-mesa-accion"
                                data-id="${idMesa}" data-numero="${numeroMesa}" style="${estiloAtributo}" ${deshabilitadoAttr}
                                onclick="if(!this.hasAttribute('disabled')) seleccionarMesaDestinoAccion(this, ${idMesa})">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-door-closed text-secondary fs-5"></i>
                                <span class="fw-semibold text-dark">Mesa ${numeroMesa}</span>
                            </div>
                            ${badgeEstado}
                        </button>`;
                }
            });
        }
    }

    if (inputBuscar) {
        inputBuscar.oninput = function (e) {
            const termino = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.item-mesa-accion').forEach(item => {
                const numeroMesaTexto = item.getAttribute('data-numero') || '';
                item.classList.toggle('d-none', !numeroMesaTexto.includes(termino));
            });
        };
    }

    if (instanciaModalAccion) instanciaModalAccion.show();
}

function seleccionarMesaDestinoAccion(elemento, idMesa) {
    document.querySelectorAll('.item-mesa-accion').forEach(item => item.classList.remove('active'));
    elemento.classList.add('active');
    mesaDestinoSeleccionadaId = idMesa;
    const btnProcesar = document.getElementById('btnProcesarAccionMesa');
    if (btnProcesar) btnProcesar.disabled = false;
}

function procesarAccionMesaFinal() {
    if (!mesaDestinoSeleccionadaId) return;
    if (modoAccionMesaActual === 'CAMBIAR_TODO') {
        _ejecutarTrasladoCompleto(mesaDestinoSeleccionadaId);
    } else if (modoAccionMesaActual === 'DIVIDIR_PARCIAL') {
        confirmarDivisionComanda(mesaDestinoSeleccionadaId);
    }
    if (instanciaModalAccion) instanciaModalAccion.hide();
}

// =========================================================================
// 🔄 TRASLADO COMPLETO CORREGIDO: ENVÍO ATÓMICO DE KEYS Y REFRESCO EN CALIENTE
// =========================================================================
function _ejecutarTrasladoCompleto(idMesaDestino) {
    // Si no viene por parámetro, usamos la variable global del modal de traslados
    const destinoIdReal = idMesaDestino || mesaDestinoSeleccionadaId;
    if (!destinoIdReal) {
        AppUtils.showNotification("Por favor, selecciona una mesa de destino válida.", "warning");
        return;
    }

    // Ubicamos la tarjeta elegida en el modal de acción para saber su número visual
    const itemSeleccionado = document.querySelector('.item-mesa-accion.active');
    let numeroMesaDestino = currentMesaNumero; // Failsafe

    if (itemSeleccionado) {
        const numAtributo = itemSeleccionado.getAttribute('data-numero');
        if (numAtributo) {
            numeroMesaDestino = parseInt(numAtributo);
        }
    }

    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Traslado?',
        text: `¿Estás seguro de mudar todos los platos de la Mesa #${currentMesaNumero} hacia la Mesa #${numeroMesaDestino}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, trasladar'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            // Empaquetamos los nombres EXACTOS en formato Form-UrlEncoded que exige tu MesaController
            const urlParams = new URLSearchParams();
            urlParams.append("idMesaOrigen", currentMesaId);
            urlParams.append("idMesaDestino", destinoIdReal); // 🟩 ENVIAMOS EL ID REAL DE LA BD

            // Consumimos el endpoint oficial de traslados completos de tu MesaController
            const res = await fetch(window.location.origin + '/admin/mesas/trasladar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: urlParams
            });

            if (res.ok) {
                // 🚀 LIMPIEZA ASÍNCRONA EN CALIENTE DE LA MESA ORIGEN QUE QUEDÓ EN CERO
                cargarDetalleComandaAsincrono("NINGUNO");

                setTimeout(() => {
                    AppUtils.showLoading(false);
                    AppUtils.showNotification("Comanda reubicada con éxito", "success");

                    // Reseteamos las variables de control operativas del modal abierto
                    currentPedidoId = "";
                    const tarjetaOrigenDOM = document.getElementById(`mesa-card-${currentMesaId}`);
                    if (tarjetaOrigenDOM) {
                        const esOrigenPadre = tarjetaOrigenDOM.getAttribute('data-es-padre') === 'SI';
                        renderizarControlesModal(esOrigenPadre, tarjetaOrigenDOM.classList.contains('unificada'), 'NINGUNO', tarjetaOrigenDOM);
                    }

                    if (mesaModal) mesaModal.hide();
                }, 400); // Delay de tolerancia para que impacten los hilos de WebSockets
            } else {
                AppUtils.showLoading(false);
                const errorTxt = await res.text();
                AppUtils.showNotification(errorTxt || "Error al trasladar la comanda", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error crítico en traslado completo asíncrono:", error);
        }
    });
}

// =========================================================================
// ✂️ SPLIT DE COMANDA CORREGIDO: SEGUIMIENTO DE COCINA SIN F5
// =========================================================================
async function confirmarDivisionComanda(idMesaDestino) {
    const checkboxesMarcados = document.querySelectorAll('.chk-mesa-confirmar:checked');
    const itemActivo = document.querySelector('.item-mesa-accion.active');
    if (!itemActivo) return;

    const numeroMesaDestino = parseInt(itemActivo.getAttribute('data-numero'));
    const idsDetallesAMover = Array.from(checkboxesMarcados).map(cb => cb.value);

    AppUtils.showLoading(true);
    try {
        const urlParams = new URLSearchParams();
        urlParams.append("idMesaOrigen",       currentMesaId);
        urlParams.append("numeroMesaDestino",  numeroMesaDestino);
        urlParams.append("idsDetalles",        idsDetallesAMover.join(','));

        const res = await fetch(window.location.origin + '/admin/mesas/comanda/dividir-platos-por-numero', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams
        });

        if (res.ok) {
            // 🚀 INTERCEPTACIÓN ASÍNCRONA: Dejamos que el motor de Java calcule los colores reales de red
            // Refrescamos de inmediato la lista de platos que se quedaron en la mesa origen abierta
            cargarDetalleComandaAsincrono("EN_PROCESO");

            setTimeout(() => {
                AppUtils.showLoading(false);
                Swal.fire({
                    icon: 'success',
                    title: '¡Comanda Dividida!',
                    text: `Los platos fueron trasladados con éxito a la Mesa #${numeroMesaDestino}.`,
                    confirmButtonColor: '#1B3A2C'
                });

                // Auditoría interna del modal abierto: si ya no quedan filas de platos renderizadas
                const filasPlatosRestantes = document.querySelectorAll('#lista-platos-previsualizar > div').length;

                if (filasPlatosRestantes === 0) {
                    console.log("🧼 Mesa origen vaciada por completo asíncronamente.");
                    currentPedidoId = "";

                    const tarjetaOrigenDOM = document.getElementById(`mesa-card-${currentMesaId}`);
                    if (tarjetaOrigenDOM) {
                        const esOrigenPadre = tarjetaOrigenDOM.getAttribute('data-es-padre') === 'SI';
                        renderizarControlesModal(esOrigenPadre, tarjetaOrigenDOM.classList.contains('unificada'), 'NINGUNO', tarjetaOrigenDOM);
                    }
                    cargarDetalleComandaAsincrono("NINGUNO");
                }
            }, 400); // Tolerancia prudente de renderizado
        } else {
            AppUtils.showLoading(false);
            AppUtils.showNotification("Error al procesar la división", "error");
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error en split parcial asíncrono de comanda:", error);
    }
}


function procesarDesfragmentacionGrupo() {
    if (!currentMesaId) return;

    AppUtils.showConfirmationDialog({
        title: '¿Desagrupar Todo el Bloque?',
        text: 'Se disolverá el grupo de mesas colectivas.',
        icon: 'warning',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, desagrupar todo'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desagrupar-grupo/${currentMesaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            AppUtils.showLoading(false);

            if (res.ok) {
                // 🟩 REPARACIÓN: Leemos como texto crudo para acoplarnos al String de tu MesaController
                const dataText = await res.text();

            if (dataText.includes("éxito")) { // o data.success según uses texto o JSON
                    AppUtils.showNotification("Grupo disuelto con éxito", "success");

                    const tarjetaGrupo = document.querySelector(`#contenedor-tarjetas-unificadas [data-numero="${currentMesaNumero}"]`);
                    if (tarjetaGrupo) {
                        tarjetaGrupo.remove();
                        actualizarContadorBadgePestaña();
                    }

                    // 🟩 ADUANA ASÍNCRONA DE GRUPOS: Si ya no quedan tarjetas vivas, inyecta la leyenda premium de La Jama
                    const contenedorGrupos = document.getElementById('contenedor-tarjetas-unificadas');
                    if (contenedorGrupos) {
                        const tarjetasRestantes = contenedorGrupos.querySelectorAll('.tarjeta-unificada').length;
                        if (tarjetasRestantes === 0) {
                            contenedorGrupos.innerHTML = `
                                <div class="text-center py-5 animate__animated animate__fadeIn" id="grupo-vacio-aviso">
                                    <i class="bi bi-diagram-3 text-muted" style="font-size: 4rem;"></i>
                                    <h5 class="fw-bold text-muted mt-3">No hay grupos unificados activos</h5>
                                    <p class="text-muted small">Agrupa mesas desde la pestaña "Vista Salón" para gestionarlas colectivamente.</p>
                                </div>`;
                        }
                    }

                    if (mesaModal) mesaModal.hide();
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Operación Restringida',
                        text: dataText || "No se puede desagrupar el bloque con pedidos activos.",
                        confirmButtonColor: '#1B3A2C'
                    });
                }
            } else {
                AppUtils.showNotification("Error de comunicación con el servidor.", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al intentar desagrupar bloque:", error);
        }
    });
}

function activarModoReservaMasiva() {
    const vistaActual = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';
    modoReservaMasivaActiva = true;

    // Mostramos la barra de herramientas superior correspondiente
    if (vistaActual === 'salon') {
        const barraSalon = document.getElementById('barre-reserva-masiva-salon');
        if (barraSalon) {
            barraSalon.classList.remove('d-none');
            barraSalon.classList.add('d-flex');
        }
    } else {
        const barraReservas = document.getElementById('barre-reserva-masiva-reservas');
        if (barraReservas) {
            barraReservas.classList.remove('d-none');
            barraReservas.classList.add('d-flex');
        }
    }

    const contenedorId = vistaActual === 'salon' ? '#vista-salon' : '#contenedor-mesas-reservadas-pestaña';

    document.querySelectorAll(`${contenedorId} .mesa-box`).forEach(box => {
        const pedidoEstado = box.getAttribute('data-pedido-estado');

        // Congelamos las mesas que tengan consumos activos o estén unificadas
        if (box.classList.contains('ocupada') ||
            box.classList.contains('unificada') ||
            (pedidoEstado && pedidoEstado !== 'NINGUNO')) {

            box.style.opacity = "0.3";
            box.style.pointerEvents = "none";
        } else {
            box.querySelector(".checkbox-seleccion-reserva-masiva")?.classList.remove("d-none");
        }
    });

    actualizarContadorReservaMasiva();
}

function cancelarModoReservaMasiva() {
    modoReservaMasivaActiva = false;

    // Apagamos ambas barras de herramientas
    const barraSalon = document.getElementById('barre-reserva-masiva-salon');
    if (barraSalon) barraSalon.classList.add('d-none');

    const barraReservas = document.getElementById('barre-reserva-masiva-reservas');
    if (barraReservas) barraReservas.classList.add('d-none');

    document.querySelectorAll(".mesa-box").forEach(box => {
        box.style.opacity = "1";
        box.style.pointerEvents = "auto";
        box.style.border = "2px solid transparent";
        box.style.transform = "none";

        const check = box.querySelector(".check-reserva-masiva");
        if (check) check.checked = false;

        box.querySelector(".checkbox-seleccion-reserva-masiva")?.classList.add("d-none");
    });

    actualizarContadorReservaMasiva();
}

function actualizarContadorReservaMasiva() {
    const vistaActual = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';
    const contenedorId = vistaActual === 'salon' ? '#vista-salon' : '#contenedor-mesas-reservadas-pestaña';

    const seleccionadas = document.querySelectorAll(`${contenedorId} .check-reserva-masiva:checked`).length;

    if (vistaActual === 'salon') {
        const btnSalon = document.getElementById('btnEjecutarReservaMasivaSalon');
        if (btnSalon) btnSalon.disabled = (seleccionadas === 0);

        const txtSalon = document.getElementById("count-seleccionadas-reserva-masiva-salon");
        if (txtSalon) txtSalon.innerText = seleccionadas;
    } else {
        const btnReservas = document.getElementById('btnEjecutarReservaMasivaReservas');
        if (btnReservas) btnReservas.disabled = (seleccionadas === 0);

        const txtReservas = document.getElementById("count-seleccionadas-reserva-masiva-reservas");
        if (txtReservas) txtReservas.innerText = seleccionadas;
    }
}

function procesarAccionReservaMasivaFinal() {
    const checks = document.querySelectorAll(".check-reserva-masiva:checked");
    if (checks.length === 0) return;

    const vistaActual = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';
    const idsMesas = Array.from(checks).map(c => c.value);

    const tituloTxt = vistaActual === 'salon' ? '¿Apartar bloque para Reservas?' : '¿Liberar bloque de Reservas?';
    const msgTxt = vistaActual === 'salon' ? `Se guardarán estas ${idsMesas.length} mesas en custodia.` : `Estas ${idsMesas.length} mesas volverán a estar libres en el salón ordinario.`;

    const endpoint = vistaActual === 'salon' ? '/admin/mesas/api/trasladar-a-reserva-masivo' : '/admin/mesas/api/quitar-de-reserva-masivo';

    AppUtils.showConfirmationDialog({
        title: tituloTxt,
        text: msgTxt,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, procesar bloque'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const params = new URLSearchParams();
            idsMesas.forEach(id => params.append("idsMesas", id));

            const res = await fetch(window.location.origin + endpoint, {
                method: "POST",
                body: params
            });

            AppUtils.showLoading(false);

        if (res.ok) {
                AppUtils.showNotification("Plano actualizado correctamente en bloque", "success");

                // 🟩 REACTIVIDAD EN CALIENTE: Forzamos la mudanza física en el DOM de inmediato
                checks.forEach(c => {
                    const box = c.closest('.mesa-box');
                    if (box) {
                        const num = box.getAttribute('data-numero');
                        const nuevoEst = vistaActual === 'salon' ? 'reservada' : 'disponible';

                        // ⚡ Mueve el nodo al contenedor correcto sin esperar a dar F5
                        actualizarEstadoMesaEnPlano(num, nuevoEst, '', 'NINGUNO');
                    }
                });

                // 🟩 AUDITORÍA MASIVA ASÍNCRONA: Evaluamos el panel justo después de mudar el lote
                const contenedorReservas = document.getElementById('contenedor-mesas-reservadas-pestaña');
                if (contenedorReservas) {
                    const totalMesasEnReservas = contenedorReservas.querySelectorAll('.mesa-box').length;
                    let avisoReservaVacio = document.getElementById('reserva-vacia-aviso');

                    if (totalMesasEnReservas === 0) {
                        if (!avisoReservaVacio) {
                            contenedorReservas.insertAdjacentHTML('afterend', `
                                <div class="text-center py-5 animate__animated animate__fadeIn" id="reserva-vacia-aviso">
                                    <i class="bi bi-calendar-x text-muted" style="font-size: 4rem;"></i>
                                    <h5 class="fw-bold text-muted mt-3">No hay mesas en custodia de reserva</h5>
                                    <p class="text-muted small">Asigna bloques de mesas desde la pestaña "Vista Salón" para resguardarlas.</p>
                                </div>`);
                        }
                    } else {
                        if (avisoReservaVacio) {
                            avisoReservaVacio.remove();
                        }
                    }
                }

                cancelarModoReservaMasiva();
            }else {
                AppUtils.showNotification("Error al procesar el lote de mesas", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error en operación por lotes de reservas:", error);
        }
    });
}

async function procesarQuitarMesaDeReservaIndividual(idMesa, numeroMesa) {
    AppUtils.showLoading(true);
    try {
        const params = new URLSearchParams();
        params.append("idsMesas", idMesa);

        // Llamamos al endpoint del controlador (que ya mapea correctamente)
        const res = await fetch(window.location.origin + '/admin/mesas/api/quitar-de-reserva-masivo', {
            method: 'POST',
            body: params
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            AppUtils.showNotification(`Mesa #${numeroMesa} devuelta al salón de venta libre.`, "success");

            // 🟩 ¡AQUÍ SÍ! Invocamos la mudanza física usando las variables correctas
            actualizarEstadoMesaEnPlano(numeroMesa, 'disponible', '', 'NINGUNO');
        } else {
            AppUtils.showNotification("No se pudo liberar la mesa.", "error");
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error al quitar custodia individual:", error);
    }
}