let currentMesaId = null;
let currentMesaNumero = null;
let currentPedidoId = null;
let mesaModal = null;
let facturacionModal = null;

let modoUnificacionActivo = false;

// =======================================================
// CONEXIÓN WEBSOCKET PARA COCINA
// =======================================================
var socket = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Conectado a WebSocket: ' + frame);
    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        mostrarNotificacionCocina(notificacion.body);
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
        setTimeout(() => { window.location.reload(); }, 2500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('modalMesa');
    if (modalElement) mesaModal = new bootstrap.Modal(modalElement);

    const facturacionElement = document.getElementById('modalFacturacion');
    if (facturacionElement) facturacionModal = new bootstrap.Modal(facturacionElement);

    const triggerTabList = document.querySelectorAll('#pills-tab button')
    triggerTabList.forEach(triggerEl => {
        triggerEl.addEventListener('click', event => {
            event.preventDefault()
            bootstrap.Tab.getInstance(triggerEl).show()
        })
    })
});

// =======================================================
// GESTIÓN DEL PLANO DE MESAS (CLICS)
// =======================================================
function gestionarClickMesa(elemento) {
    if (modoUnificacionActivo) {
        const checkbox = elemento.querySelector('.check-salon-unir');
        if (checkbox && !elemento.classList.contains('unificada') && elemento.getAttribute('data-id') !== currentMesaId) {
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                elemento.style.border = "3px solid #4c1d95";
                elemento.style.transform = "scale(0.96)";
            } else {
                elemento.style.border = "2px solid transparent";
                elemento.style.transform = "none";
            }
            actualizarContadorUnificacion();
        }
        return;
    }
    prepararGestion(elemento);
}

function prepararGestion(elemento) {
    const id = elemento.getAttribute('data-id');
    currentMesaNumero = elemento.getAttribute('data-numero');
    const pedidoEstado = elemento.getAttribute('data-pedido-estado');

    currentPedidoId = elemento.getAttribute('data-pedido-id');
    currentMesaId = id;

    const esUnificada = elemento.classList.contains('unificada');
    const esTarjetaEstirada = elemento.classList.contains('tarjeta-unificada');
    const esPadre = elemento.getAttribute('data-es-padre') === 'SI' || esTarjetaEstirada;

    const btnEntregar = document.getElementById('btnEntregarPlato');
    const btnDesocupar = document.getElementById('btnDesocupar');
    const txtConfirmacion = document.getElementById('textoConfirmacion');
    const btnUnificar = document.getElementById('btnUnificarMesas');
    const btnAgregar = document.getElementById('btnAgregarPedido');
    const btnDesvincular = document.getElementById('btnDesvincularMesa');
    const btnDesagrupar = document.getElementById('btnDesagruparGrupo');
    const numMesaTexto = document.getElementById('numMesaTexto');
    const tarjetaMesa = elemento;

    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal = document.getElementById('panel-subtotal-modal');

    btnEntregar.classList.add('d-none');
    txtConfirmacion.classList.add('d-none');
    if (btnDesvincular) btnDesvincular.classList.add('d-none');
    if (btnDesagrupar) btnDesagrupar.classList.add('d-none');
    btnDesocupar.classList.add('disabled');
    if (btnUnificar) btnUnificar.classList.remove('d-none');
    if (btnAgregar) btnAgregar.classList.remove('d-none');
    if (contenedorComanda) contenedorComanda.classList.add('d-none');
    if (avisoVacio) avisoVacio.classList.add('d-none');
    if (panelSubtotal) panelSubtotal.classList.add('d-none');

    const badgeTicket = document.getElementById('badge-ticket');
    if (badgeTicket) badgeTicket.classList.add('d-none');

    if (listaPlatos) listaPlatos.innerHTML = "";
    document.getElementById('lblNumero').innerText = currentMesaNumero;

    if (esPadre) {
        if (btnUnificar) btnUnificar.classList.add('d-none');
        if (btnDesagrupar) btnDesagrupar.classList.remove('d-none');
        if (pedidoEstado === 'EN_COCINA' || pedidoEstado === 'PENDIENTE') {
            if (btnDesagrupar) btnDesagrupar.classList.add('disabled');
        }
        if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO' && pedidoEstado !== 'EN_COCINA' && pedidoEstado !== 'PENDIENTE') {
            btnDesocupar.classList.remove('disabled');
        }
    }
    else if (esUnificada) {
        if (btnUnificar) btnUnificar.classList.add('d-none');
        if (btnAgregar) btnAgregar.classList.add('d-none');
        btnDesocupar.classList.add('disabled');
        if (btnDesvincular) btnDesvincular.classList.remove('d-none');
        document.getElementById('lblNumero').innerText = currentMesaNumero + " (Anexada)";
    }
    else {
        if (!currentPedidoId || pedidoEstado === 'NINGUNO') {
            if (avisoVacio) avisoVacio.classList.remove('d-none');
            if (mesaModal) mesaModal.show();
            return;
        }

        if (tarjetaMesa.classList.contains('lista-para-recoger')) {
            numMesaTexto.innerText = currentMesaNumero;
            txtConfirmacion.classList.remove('d-none');
            btnEntregar.classList.remove('d-none');
            if (btnUnificar) btnUnificar.classList.remove('d-none');
        }
        else if (pedidoEstado === 'ASIGNADO') {
            btnDesocupar.classList.remove('disabled');
        }
    }

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                txtSubtotal.innerText = data.montoTotal.toFixed(2);
                listaPlatos.innerHTML = "";

                const ticketImpreso = data.ticketImpreso === true;
                if (badgeTicket) badgeTicket.classList.toggle('d-none', !ticketImpreso);

                if (data.detalles.length === 0) {
                    if (avisoVacio) avisoVacio.classList.remove('d-none');
                    return;
                }

                data.detalles.forEach(d => {
                    if (d.canceladoPorCliente) {
                        listaPlatos.innerHTML += `
                            <div class="d-flex justify-content-between align-items-center p-2 rounded border" style="background-color: #ffe5e5; border-left: 4px solid #dc3545 !important; opacity: 0.8;">
                                <div class="d-flex align-items-center gap-2" style="max-width: 50%;">
                                    <span class="badge bg-danger text-white rounded-pill fw-bold">${d.cantidad}</span>
                                    <span class="text-danger fw-bold text-decoration-line-through text-truncate" style="max-width: 140px;">${d.producto.nombre}</span>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="text-danger small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
                                    <span class="badge bg-danger rounded-pill px-2 py-1" style="font-size: 0.7rem;">MERMA</span>
                                </div>
                            </div>`;
                        return;
                    }

                    let badgeColor = 'bg-danger';
                    let badgeTexto = 'En cocina';

                    if (d.cocinado && d.entregado) {
                        badgeColor = 'bg-secondary';
                        badgeTexto = 'Entregado';
                    } else if (d.cocinado) {
                        badgeColor = 'bg-success';
                        badgeTexto = 'Listo';
                    }

                    let btnEliminarHTML = '';
                    if (!d.cocinado) {
                        const esMerma = ticketImpreso ? 'true' : 'false';
                        const icono = ticketImpreso ? 'bi-exclamation-triangle-fill text-warning' : 'bi-trash3-fill text-danger';

                        btnEliminarHTML = `
                            <button class="btn btn-sm btn-link p-1 ms-1" title="Anular plato" onclick="eliminarItemComanda(${currentPedidoId}, ${d.id}, '${d.producto.nombre}', ${esMerma})">
                                <i class="bi ${icono} fs-5"></i>
                            </button>
                        `;
                    } else {
                        btnEliminarHTML = `<button class="btn btn-sm btn-link text-muted p-1 ms-1" disabled><i class="bi bi-trash3 opacity-50 fs-5"></i></button>`;
                    }

                    let btnCheckUnitarioHTML = '';
                    if (d.cocinado && !d.entregado) {
                        btnCheckUnitarioHTML = `
                            <button class="btn btn-sm btn-warning text-dark px-2 py-1 rounded-pill ms-1" onclick="entregarPlatoUnitario(${currentPedidoId}, ${d.id}, '${d.producto.nombre}')" style="font-size: 0.75rem; font-weight:700;">
                                <i class="bi bi-check2"></i> Entregar
                            </button>
                        `;
                    }

                    const itemHTML = `
                        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border" style="font-size: 0.9rem; border-left: 4px solid var(--lajama-green) !important;">
                            <div class="d-flex align-items-center gap-2" style="max-width: 50%;">
                                <span class="badge bg-dark text-white rounded-pill fw-bold">${d.cantidad}</span>
                                <span class="text-dark fw-semibold text-truncate" style="max-width: 140px;">${d.producto.nombre}</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="text-muted small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
                                <span class="badge ${badgeColor} rounded-pill px-2 py-1" style="font-size: 0.7rem;">${badgeTexto}</span>
                                ${btnCheckUnitarioHTML}
                                ${btnEliminarHTML}
                            </div>
                        </div>
                    `;
                    listaPlatos.innerHTML += itemHTML;
                });

                if (contenedorComanda) contenedorComanda.classList.remove('d-none');
                if (panelSubtotal) panelSubtotal.classList.remove('d-none');
                if (avisoVacio) avisoVacio.classList.add('d-none');
            })
            .catch(err => {
                console.warn("Mesa unificada temporalmente vacía:", err);
                if (avisoVacio) avisoVacio.classList.remove('d-none');
                if (panelSubtotal) panelSubtotal.classList.add('d-none');
            });
    } else {
        if (avisoVacio) avisoVacio.classList.remove('d-none');
        if (panelSubtotal) panelSubtotal.classList.add('d-none');
    }

    if (mesaModal) mesaModal.show();
}

// =======================================================
// ACCIONES DE PLATOS (MICROSCÓPICAS)
// =======================================================
function entregarPlatoUnitario(pedidoId, detalleId, nombreProducto) {
    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Entrega?',
        text: `¿Confirmas que ya serviste "${nombreProducto}" en la Mesa N° ${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, entregado'
    }, async function() {
        if (mesaModal) mesaModal.hide();
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
                setTimeout(() => window.location.reload(), 800);
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
    const titulo = esMerma ? '¿Declarar Merma?' : '¿Eliminar de la Comanda?';
    const texto = esMerma
        ? `⚠️ El ticket ya se imprimió en cocina. Si anulas "${nombreProducto}" ahora, el cliente igual lo pagará y se alertará al cocinero para detener su preparación.`
        : `¿Estás seguro de remover "${nombreProducto}" de la orden actual? Se recalculará el total.`;
    const icono = esMerma ? 'warning' : 'question';
    const colorBtn = '#dc3545';
    const textoBtn = esMerma ? 'Sí, anular y alertar' : 'Sí, remover plato';

    AppUtils.showConfirmationDialog({
        title: titulo,
        text: texto,
        icon: icono,
        confirmButtonColor: colorBtn,
        confirmButtonText: textoBtn
    }, async function() {
        if (mesaModal) mesaModal.hide();
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
                setTimeout(() => window.location.reload(), 1000);
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
        if (currentPedidoId) {
            url += '&pedidoId=' + currentPedidoId;
        }
        window.location.href = url;
    }
}

function marcarComoEntregado() {
    if (!currentMesaNumero) return;
    AppUtils.showConfirmationDialog({
        title: '¿Registrar Conformidad General?',
        text: `¿Confirmas que todo el lote de cocina está conforme en la Mesa #${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Sí, todo conforme'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);
        try {
            const res = await fetch('/admin/mesero/marcar-en-mesa/' + currentPedidoId, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Servicio marcado en mesa", "success");
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
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
            box.style.opacity = "0.4";
            box.style.pointerEvents = "none";
        } else {
            box.querySelector(".checkbox-seleccion-unificacion").classList.remove("d-none");
        }
    });
    actualizarContadorUnificacion();
}

function cancelarModoUnificacion() {
    modoUnificacionActivo = false;
    document.getElementById("barre-unificacion").classList.add("d-none");
    document.getElementById("barre-unificacion").classList.remove("d-flex");

    document.querySelectorAll(".mesa-box").forEach(box => {
        box.style.opacity = "1";
        box.style.pointerEvents = "auto";
        box.style.border = "2px solid transparent";
        box.style.transform = "none";
        const check = box.querySelector(".check-salon-unir");
        if (check) check.checked = false;
        const checkDiv = box.querySelector(".checkbox-seleccion-unificacion");
        if (checkDiv) checkDiv.classList.add("d-none");
    });
}

function actualizarContadorUnificacion() {
    const seleccionadas = document.querySelectorAll(".check-salon-unir:checked").length;
    document.getElementById("count-seleccionadas").innerText = seleccionadas;
}

function procesarUnificacionDirecta() {
    const checks = document.querySelectorAll(".check-salon-unir:checked");
    if (checks.length === 0) {
        AppUtils.showNotification("Por favor, selecciona al menos una mesa en el plano.", "warning");
        return;
    }
    const idsHijas = Array.from(checks).map(c => c.value);

    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Agrupación Masiva?',
        text: `¿Estás seguro de anexar estas ${idsHijas.length} mesas a la cuenta de la Mesa #${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, agrupar mesas'
    }, async function() {
        cancelarModoUnificacion();
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("idMesaPrincipal", currentMesaId);
        idsHijas.forEach(id => params.append("idsMesasHijas", id));

        try {
            const res = await fetch("/admin/mesas/unificar", { method: "POST", body: params });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesas unificadas correctamente", "success");
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

function procesarDesvincularMesa() {
    AppUtils.showConfirmationDialog({
        title: '¿Desunificar Mesa?',
        text: `La Mesa #${currentMesaNumero} volverá a estar libre físicamente.`,
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, liberar mesa'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desvincular/${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesa desvinculada y libre", "success");
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

function procesarDesfragmentacionGrupo() {
    if (!currentMesaId) return;
    AppUtils.showConfirmationDialog({
        title: '¿Desagrupar Todo el Bloque?',
        text: `Se disolverá el grupo de mesas colectivas.`,
        icon: 'warning',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, desagrupar todo'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desagrupar-grupo/${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Grupo disuelto con éxito", "success");
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

// =======================================================
// DELEGACIÓN DEL CONTROL A CAJA-MOVIL.JS
// =======================================================
async function validarDesocupar() {
    if (!currentMesaNumero) return;

    let tarjetaMesa = document.querySelector(`.mesa-box[data-numero="${currentMesaNumero}"]`);
    if (tarjetaMesa) {
        const pedidoEstadoActual = tarjetaMesa.getAttribute('data-pedido-estado');
        const estadosNoCobrar = ['EN_COCINA', 'PENDIENTE'];
        if (estadosNoCobrar.includes(pedidoEstadoActual)) {
            AppUtils.showNotification(`¡No puedes cobrar la Mesa #${currentMesaNumero}! Aún hay productos en cocina.`, "warning");
            return;
        }
    }

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

        // 🔥 REPARADO: Ya no buscamos 'tablaCobroCuerpo'.
        // Delegamos la inicialización y el mapeo de platos directamente a caja-movil.js
        inicializarFlujoCaja(data.montoTotal, currentMesaNumero);

        // Control visual de los Modals de Bootstrap
        if (mesaModal) mesaModal.hide();
        if (facturacionModal) facturacionModal.show();

    } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error al transferir control al módulo de cobros Multiticket:", error);
    }
}