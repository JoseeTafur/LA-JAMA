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
});

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
        if (checkbox
            && !elemento.classList.contains('unificada')
            && elemento.getAttribute('data-id') !== currentMesaId) {

            checkbox.checked = !checkbox.checked;
            elemento.style.border     = checkbox.checked ? "3px solid #4c1d95" : "2px solid transparent";
            elemento.style.transform  = checkbox.checked ? "scale(0.96)" : "none";
            actualizarContadorUnificacion();
        }
        return;
    }
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

// 🚀 FUNCIÓN EXTRACTADA: Configura la visualización de botones del modal base
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
    if (btnCambiarMesa)    btnCambiarMesa.classList.add('d-none');
    if (btnDesvincular)    btnDesvincular.classList.add('d-none');
    if (btnDividirComanda) btnDividirComanda.classList.add('d-none');
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

    if (esPadre) {
        if (btnSelectTodo)  btnSelectTodo.classList.add('d-none');
        if (btnUnificar)    btnUnificar.classList.add('d-none');
        if (btnDesagrupar)  {
            btnDesagrupar.classList.remove('d-none');
            btnDesagrupar.classList.toggle('disabled', (pedidoEstado === 'EN_COCINA' || pedidoEstado === 'PENDIENTE'));
        }
    } else if (esUnificada) {
        if (btnSelectTodo)  btnSelectTodo.classList.add('d-none');
        if (btnUnificar)    btnUnificar.classList.add('d-none');
        if (btnAgregar)     btnAgregar.classList.add('d-none');
        if (btnDesvincular) btnDesvincular.classList.remove('d-none');
        if (lblNumero)      lblNumero.innerText = currentMesaNumero + " (Anexada)";
    } else {
        if (!currentPedidoId || pedidoEstado === 'NINGUNO') {
            if (btnSelectTodo) btnSelectTodo.classList.add('d-none');
            if (avisoVacio)    avisoVacio.classList.remove('d-none');
            return;
        }

        if (btnSelectTodo)     btnSelectTodo.classList.remove('d-none');
        if (btnCambiarMesa)    btnCambiarMesa.classList.remove('d-none');
        if (btnDividirComanda) btnDividirComanda.classList.remove('d-none');

        if (elemento && elemento.classList.contains('lista-para-recoger')) {
            if (numMesaTexto)    numMesaTexto.innerText = currentMesaNumero;
            if (txtConfirmacion) txtConfirmacion.classList.remove('d-none');
        }
    }
}

// 🚀 FUNCIÓN EXTRACTADA: Consume la precuenta y redibuja la lista interna del modal de forma limpia
function cargarDetalleComandaAsincrono(pedidoEstado) {
    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos       = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal       = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio        = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal     = document.getElementById('panel-subtotal-modal');
    const badgeTicket       = document.getElementById('badge-ticket');

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                if (txtSubtotal) txtSubtotal.innerText = data.montoTotal.toFixed(2);
                if (listaPlatos) listaPlatos.innerHTML = "";

                const ticketImpreso = data.ticketImpreso === true;
                if (badgeTicket) badgeTicket.classList.toggle('d-none', !ticketImpreso);

                if (data.detalles.length === 0) {
                    if (avisoVacio) avisoVacio.classList.remove('d-none');
                    if (contenedorComanda) contenedorComanda.classList.add('d-none');
                    if (panelSubtotal) panelSubtotal.classList.add('d-none');
                    return;
                }

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

                evaluarBotonConfirmarPago();
            })
            .catch(err => {
                console.warn("Error al cargar comanda:", err);
                if (avisoVacio)    avisoVacio.classList.remove('d-none');
                if (panelSubtotal) panelSubtotal.classList.add('d-none');
                if (contenedorComanda) contenedorComanda.classList.add('d-none');
            });
    } else {
        if (avisoVacio)    avisoVacio.classList.remove('d-none');
        if (panelSubtotal) panelSubtotal.classList.add('d-none');
        if (contenedorComanda) contenedorComanda.classList.add('d-none');
    }
}

// 🚀 NUEVA FUNCIÓN MOTOR: Modifica el plano de mesas en tiempo real sin recargar la página entera
function actualizarEstadoMesaEnPlano(numeroMesa, nuevoEstado, nuevoPedidoId, pedidoEstado) {
    // Buscar la mesa tanto en la Grid normal como en las tarjetas estiradas de agrupamiento
    const tarjetasMesa = document.querySelectorAll(`[data-numero="${numeroMesa}"]`);

    tarjetasMesa.forEach(tarjeta => {
        if (!tarjeta) return;

        // 1. Limpiar clases cromáticas viejas
        tarjeta.classList.remove('disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar', 'unificada');

        // 2. Insertar la nueva clase de estado
        tarjeta.classList.add(nuevoEstado);

        // 3. Mutar los metadatos de estados en el DOM
        if (nuevoPedidoId) tarjeta.setAttribute('data-pedido-id', nuevoPedidoId);
        if (pedidoEstado) tarjeta.setAttribute('data-pedido-estado', pedidoEstado);

        // 4. Cambiar dinámicamente el icono de Bootstrap Icons de la caja
        const icono = tarjeta.querySelector('.mesa-icon-wrapper i');
        if (icono) {
            icono.className = ""; // Limpiar clases
            if (nuevoEstado === 'unificada') icono.className = "bi bi-link-45deg";
            else if (nuevoEstado === 'lista-para-recoger') icono.className = "bi bi-bell-fill";
            else if (nuevoEstado === 'lista-para-pagar') icono.className = "bi bi-person-check-fill";
            else icono.className = "bi bi-cup-hot-fill"; // disponible u ocupada estándar
        }
    });

    // Si el mesero tiene el modal abierto justamente de ESA mesa que cambió en cocina, refrescamos el modal internamente en caliente
    if (currentMesaNumero == numeroMesa && mesaModal && document.getElementById('modalMesa').classList.contains('show')) {
        if (nuevoPedidoId) currentPedidoId = nuevoPedidoId;
        renderizarControlesModal(tarjetasMesa[0].classList.contains('tarjeta-unificada'), nuevoEstado === 'unificada', pedidoEstado, tarjetasMesa[0]);
        cargarDetalleComandaAsincrono(pedidoEstado);
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
    // Capturamos los números de mesa reales para renderizarlos asíncronamente
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

                // 🚀 SOLUCIÓN ASÍNCROA: Actualizamos el plano del salón en caliente
                actualizarEstadoMesaEnPlano(currentMesaNumero, 'unificada', currentPedidoId, 'AGRUPADO');
                checks.forEach(c => {
                    const numHija = c.closest('.mesa-box').getAttribute('data-numero');
                    actualizarEstadoMesaEnPlano(numHija, 'unificada', null, 'NINGUNO');
                });

                // 🚀 SOLUCIÓN ASÍNCRONA: Renderizamos la tarjeta en la pestaña de Grupos sin F5
                actualizarPanelGruposUnificados(currentMesaNumero, numerosHijas, 'AGRUPADO', currentPedidoId);

                cancelarModoUnificacion();
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
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
            const res = await fetch(`/admin/mesas/desagrupar-grupo/${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Grupo disuelto con éxito", "success");

                // 🚀 SOLUCIÓN ASÍNCRONA: Quitar la tarjeta del panel de grupos en caliente
                const tarjetaGrupo = document.querySelector(`#contenedor-tarjetas-unificadas [data-numero="${currentMesaNumero}"]`);
                if (tarjetaGrupo) {
                    tarjetaGrupo.remove();
                    actualizarContadorBadgePestaña();
                }

                actualizarEstadoMesaEnPlano(currentMesaNumero, 'disponible', null, 'NINGUNO');
                if (mesaModal) mesaModal.hide();
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
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
        inicializarFlujoCaja(data.montoTotal, currentMesaNumero);

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

// =======================================================
// MODAL UNIFICADO DE ACCIÓN (CAMBIAR MESA / DIVIDIR COMANDA)
// =======================================================
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
    if (contenedorLista) contenedorLista.innerHTML = '<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Cargando mapa de mesas...</div>';

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
                const tarjetaMesaOriginal = document.getElementById('mesa-card-' + idMesa);
                let estaOcupada = false;

                if (tarjetaMesaOriginal) {
                    const estadoPedido = tarjetaMesaOriginal.getAttribute('data-pedido-estado');
                    estaOcupada = (estadoPedido && estadoPedido !== 'NINGUNO');
                }

                const badgeEstado = estaOcupada
                    ? '<span class="badge bg-warning text-dark rounded-pill" style="font-size:0.7rem;">Con Consumo</span>'
                    : '<span class="badge bg-success text-white rounded-pill" style="font-size:0.7rem;">Libre</span>';

                if (contenedorLista) {
                    contenedorLista.innerHTML += `
                        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3 item-mesa-accion"
                                data-id="${idMesa}" data-numero="${numeroMesa}" onclick="seleccionarMesaDestinoAccion(this, ${idMesa})">
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

function _ejecutarTrasladoCompleto(idMesaDestino) {
    let textoMesaDestino = `Mesa N° ${idMesaDestino}`;
    const itemSeleccionado = document.querySelector('.item-mesa-accion.active');
    let numeroMesaDestino = idMesaDestino;

    if (itemSeleccionado) {
        const numAtributo = itemSeleccionado.getAttribute('data-numero');
        if (numAtributo) {
            textoMesaDestino = `Mesa #${numAtributo}`;
            numeroMesaDestino = parseInt(numAtributo);
        }
    }

    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Traslado?',
        text: `¿Estás seguro de mudar todos los platos de la Mesa #${currentMesaNumero} hacia la ${textoMesaDestino}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, trasladar'
    }, async function () {
        AppUtils.showLoading(true);
        const todosLosChecks = document.querySelectorAll('.chk-mesa-confirmar');

        if (todosLosChecks.length > 0) {
            const idsDetallesAMover = Array.from(todosLosChecks).map(cb => cb.value);
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

                AppUtils.showLoading(false);
                if (res.ok) {
                    AppUtils.showNotification("Comanda reubicada con éxito", "success");
                    // 🚀 CAMBIO ASÍNCRONO: Liberar mesa origen y ocupar mesa destino localmente sin recargar
                    actualizarEstadoMesaEnPlano(currentMesaNumero, 'disponible', null, 'NINGUNO');
                    actualizarEstadoMesaEnPlano(numeroMesaDestino, 'ocupada', currentPedidoId, 'ATENDIDO');
                    if (mesaModal) mesaModal.hide();
                } else {
                    const errorTxt = await res.text();
                    AppUtils.showNotification(errorTxt || "Error al procesar el traslado", "error");
                }
            } catch (error) {
                AppUtils.showLoading(false);
                console.error(error);
            }
        }
    });
}

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

        AppUtils.showLoading(false);

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Comanda Dividida!',
                text: `Los platos fueron trasladados con éxito a la Mesa #${numeroMesaDestino}.`,
                confirmButtonColor: '#1B3A2C'
            });
            // 🚀 CAMBIO ASÍNCRONO: Actualizamos la mesa de destino a 'ocupada' y limpiamos los platos del modal origen
            actualizarEstadoMesaEnPlano(numeroMesaDestino, 'ocupada', null, 'EN_PROCESO');
            cargarDetalleComandaAsincrono("EN_PROCESO");
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error(error);
    }
}