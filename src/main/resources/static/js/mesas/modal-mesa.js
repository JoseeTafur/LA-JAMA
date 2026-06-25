// =========================================================================
// 💎 LA JAMA MASTER - GESTIÓN OPERATIVA DE COMANDAS Y CONTROLES DE MESA
// =========================================================================

// ─── 1. CARGADOR ASÍNCRONO DE PRECUENTAS Y SEGMENTACIÓN DE PAGOS ───
function cargarDetalleComandaAsincrono(pedidoEstado) {
    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos       = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal       = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio        = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal     = document.getElementById('panel-subtotal-modal');
    const badgeTicket       = document.getElementById('badge-ticket');

    const tarjetaMesaDOM = document.getElementById(`mesa-card-${currentMesaId}`);
    const esPadreGrupo   = tarjetaMesaDOM ? tarjetaMesaDOM.getAttribute('data-es-padre') === 'SI' : false;
    const esUnificada    = tarjetaMesaDOM ? tarjetaMesaDOM.classList.contains('unificada') : false;

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                if (txtSubtotal) txtSubtotal.innerText = data.montoTotal.toFixed(2);
                if (listaPlatos) listaPlatos.innerHTML = "";

                const ticketImpreso = data.ticketImpresoCocina === true || data.ticketImpreso === true;
                if (badgeTicket) badgeTicket.classList.toggle('d-none', !ticketImpreso);

                if (data.detalles.length === 0) {
                    if (avisoVacio)        avisoVacio.classList.remove('d-none');
                    if (contenedorComanda) contenedorComanda.classList.add('d-none');
                    if (panelSubtotal)     panelSubtotal.classList.add('d-none');
                    currentPedidoId = "";
                    renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
                    return;
                }

                // 📦 CONTENEDORES COMPARTIMENTADOS PARA SEGREGACIÓN CONTABLE VISUAL
                let htmlPlatosActivos = "";
                let htmlPlatosPagados = "";

                data.detalles.forEach(d => {
                    if (d.canceladoPorCliente) {
                        htmlPlatosActivos += `
                            <div class="d-flex justify-content-between align-items-center p-2 rounded border mb-2"
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

                    // ─── 🔒 CASO LIQUIDADO: ENVIAR AL FINAL EN COLOR GRIS DE CONTROL ───
                    if (d.pagado === true) {
                        htmlPlatosPagados += `
                            <div class="d-flex justify-content-between align-items-center p-2 rounded bg-secondary bg-opacity-10 border mb-2 item-plato-comanda"
                                 data-estado="Pagado"
                                 data-precio="${d.subtotal}"
                                 style="font-size:0.9rem; border-left:4px solid #6b7280 !important; opacity: 0.75;">
                                <div class="d-flex align-items-center gap-2" style="max-width:50%;">
                                    <span class="badge bg-secondary text-white rounded-pill fw-bold">${d.cantidad}x</span>
                                    <span class="text-muted fw-bold text-decoration-line-through text-truncate" style="max-width:140px;">${d.producto.nombre}</span>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="text-muted small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
                                    <span class="badge bg-secondary text-white rounded-pill px-2 py-1" style="font-size:0.7rem;"><i class="bi bi-cash-coin me-1"></i>Pagado</span>
                                    <button class="btn btn-sm btn-link text-muted p-1 ms-1" disabled><i class="bi bi-trash3 opacity-50 fs-5"></i></button>
                                    <div style="width:27px; margin-left:10px;"></div>
                                </div>
                            </div>`;
                        return;
                    }

                    // ─── 🚀 EVALUACIÓN INTERMEDIA DE JERARQUÍA DE ESTADOS ───
                    let badgeColor = 'bg-primary text-white'; // Por defecto: Enviado (Azul)
                    let badgeTexto = 'Enviado';

                    if (d.cocinado && d.entregado) {
                        badgeColor = 'bg-secondary text-white';
                        badgeTexto = 'Entregado';
                    } else if (d.cocinado) {
                        badgeColor = 'bg-success text-white';
                        badgeTexto = 'Listo';
                    } else if (ticketImpreso === true || d.impresoEnCocina === true) {
                        badgeColor = 'bg-danger text-white';
                        badgeTexto = 'En cocina';
                    }

                    let btnEliminarHTML = '';
                    if (!d.cocinado) {
                        const esMerma = (ticketImpreso === true || d.impresoEnCocina === true) ? 'true' : 'false';
                        const icono = (ticketImpreso === true || d.impresoEnCocina === true) ? 'bi-exclamation-triangle-fill text-warning' : 'bi-trash3-fill text-danger';
                        btnEliminarHTML = `
                            <button class="btn btn-sm btn-link p-1 ms-1" title="${esMerma === 'true' ? 'Declarar merma' : 'Anular plato'}"
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

                    const precioSeguro = d.subtotal ? d.subtotal : (d.precioUnitario ? d.precioUnitario : 0);
                    const idCheckModalMesa = `cbx_mesa_modal_${d.id}`;

                    // ─── 🛡️ ADUANA CRÍTICA DE PAGOS: EXCEPTO EN ESTADO "ENVIADO" ───
                    let checkboxHTML = '';
                    if (badgeTexto === 'Enviado') {
                        // Si está solo enviado, se bloquea el cobro pintando un espacio ciego simétrico
                        checkboxHTML = `<div style="width:27px; margin-left:10px;"></div>`;
                    } else {
                        // En cualquier otro estado (En cocina, Listo, Entregado) se habilita el checkbox de gelatina
                        checkboxHTML = `
                            <div class="cntr" style="margin-left: 10px;">
                                <input type="checkbox"
                                       id="${idCheckModalMesa}"
                                       class="hidden-xs-up chk-mesa-confirmar"
                                       value="${d.id}"
                                       data-precio="${precioSeguro}"
                                       data-estado-plato="${badgeTexto}"
                                       onchange="evaluarBotonConfirmarPago()">
                                <label for="${idCheckModalMesa}" class="cbx"></label>
                            </div>`;
                    }

                    htmlPlatosActivos += `
                        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border item-plato-comanda mb-2"
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

                listaPlatos.innerHTML = htmlPlatosActivos + htmlPlatosPagados;

                if (contenedorComanda) contenedorComanda.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.remove('d-none');
                if (avisoVacio)        avisoVacio.classList.add('d-none');

                renderizarControlesModal(esPadreGrupo, esUnificada, pedidoEstado, tarjetaMesaDOM);
            })
            .catch(err => {
                console.warn("Manejo controlado de precuenta vacía:", err.message);
                if (avisoVacio)        avisoVacio.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.add('d-none');
                if (contenedorComanda) contenedorComanda.classList.add('d-none');
                currentPedidoId = "";
                renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
            });
    } else {
        if (avisoVacio)        avisoVacio.classList.remove('d-none');
        if (panelSubtotal)     panelSubtotal.classList.add('d-none');
        if (contenedorComanda) contenedorComanda.classList.add('d-none');
        renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
    }
}

// ─── 2. MAQUINA DE ESTADOS Y CONFIGURACIÓN REACTIVA OPERATIVA DE BOTONES ───
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

    const btnMudarReserva   = document.getElementById('btnMudarAReserva');
    const btnLiberarReserva = document.getElementById('btnLiberarReservaIndividual');

    const txtElegido = document.getElementById('txt-subtotal-elegido');
    if (txtElegido) txtElegido.innerText = "0.00";

    if (btnSelectTodo)   btnSelectTodo.innerHTML = `<i class="bi bi-check-all me-1"></i> Seleccionar todo`;
    if (txtConfirmacion) txtConfirmacion.classList.add('d-none');

    if (btnCambiarMesa)    btnCambiarMesa.classList.remove('d-none');
    if (btnDividirComanda) btnDividirComanda.classList.remove('d-none');
    if (btnSelectTodo)     btnSelectTodo.classList.remove('d-none');
    if (btnDesvincular)    btnDesvincular.classList.add('d-none');
    if (btnDesagrupar)     btnDesagrupar.classList.add('d-none');

    if (btnDesocupar) {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
    }

    if (btnUnificar)  btnUnificar.classList.remove('d-none');
    if (btnAgregar)   btnAgregar.classList.remove('d-none');
    if (avisoVacio)   avisoVacio.classList.add('d-none');
    if (badgeTicket)  badgeTicket.classList.add('d-none');
    if (lblNumero)    lblNumero.innerText = currentMesaNumero;

    if (esPadre || esUnificada) {
        if (btnMudarReserva) btnMudarReserva.classList.add('d-none');
        if (btnLiberarReserva) btnLiberarReserva.classList.add('d-none');
    } else if (elemento) {
        const estaEnReserva = elemento.getAttribute('data-en-reserva') === 'true' ||
                              !document.getElementById('vista-reservas').classList.contains('d-none') ||
                              elemento.querySelector('.mesa-icon-wrapper i')?.classList.contains('bi-calendar-check-fill');

        if (estaEnReserva) {
            if (btnMudarReserva) btnMudarReserva.classList.add('d-none');
            if (btnLiberarReserva) btnLiberarReserva.classList.remove('d-none');
        } else {
            if (btnMudarReserva) btnMudarReserva.classList.remove('d-none');
            if (btnLiberarReserva) btnLiberarReserva.classList.add('d-none');
        }
    }

    if (esPadre) {
        if (btnUnificar) btnUnificar.classList.add('d-none');
        if (btnDesagrupar) {
            btnDesagrupar.classList.remove('d-none');
            btnDesagrupar.classList.remove('disabled');
            btnDesagrupar.disabled = false;
        }
        if (!currentPedidoId || pedidoEstado === 'NINGUNO') {
            if (btnSelectTodo)     btnSelectTodo.classList.add('d-none');
            if (btnCambiarMesa)    btnCambiarMesa.classList.add('d-none');
            if (btnDividirComanda) btnDividirComanda.classList.add('d-none');
            if (avisoVacio)        avisoVacio.classList.remove('d-none');
        }

    } else if (esUnificada) {
        if (btnSelectTodo)     btnSelectTodo.classList.add('d-none');
        if (btnCambiarMesa)    btnCambiarMesa.classList.add('d-none');
        if (btnDividirComanda) btnDividirComanda.classList.add('d-none');
        if (btnUnificar)       btnUnificar.classList.add('d-none');
        if (btnAgregar)        btnAgregar.classList.add('d-none');
        if (btnDesvincular)    btnDesvincular.classList.remove('d-none');
        if (lblNumero)         lblNumero.innerText = currentMesaNumero + " (Anexada)";

    } else {
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

// ─── 3. PUENTE LOGÍSTICO COMPLEMENTARIO DE ACCIONES INTERNAS ───
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
                cargarDetalleComandaAsincrono("EN_PROCESO");
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
    const titulo   = esMerma ? '¿Declarar Merma?' : '¿Eliminar de la Comanda?';
    const text     = esMerma
        ? `⚠️ El ticket ya se imprimió en cocina. Si anulas "${nombreProducto}" ahora, el cliente igual lo pagará y se alertará al cocinero para detener su preparación.`
        : `¿Estás seguro de remover "${nombreProducto}" de la orden actual? Se recalculará el total.`;
    const icono    = esMerma ? 'warning' : 'question';
    const textoBtn = esMerma ? 'Sí, anular and alertar' : 'Sí, remover plato';

    AppUtils.showConfirmationDialog({
        title: titulo, text, icon: icono,
        confirmButtonColor: '#dc3545', confirmButtonText: textoBtn
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
                AppUtils.showNotification(esMerma ? "Plato anuldado. Alerta enviada a cocina." : "Producto removido con éxito", "success");
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

async function gestionarClickMesa(elemento) {
    try {
        const res = await fetch('/api/admin/metricas/caja-activa');
        const cajaEstaAbierta = await res.json();

        if (!cajaEstaAbierta) {
            if (typeof AppUtils !== 'undefined' && typeof AppUtils.showNotification === 'function') {
                AppUtils.showNotification("Debe haber un turno de caja activo para poder crear o gestionar comandas.", "warning");
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Caja Cerrada',
                    text: 'Debe haber un turno de caja activo para poder crear o gestionar comandas.',
                    confirmButtonColor: '#1B3A2C'
                });
            }
            return;
        }

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

        const id           = elemento.getAttribute('data-id');
        const numero       = elemento.getAttribute('data-numero');
        const pedidoEstado = elemento.getAttribute('data-pedido-estado');
        const vistaReservasActiva = !document.getElementById('vista-reservas').classList.contains('d-none');

        if (vistaReservasActiva && (!pedidoEstado || pedidoEstado === 'NINGUNO')) {
            currentMesaId     = id;
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
                    procesarQuitarMesaDeReservaIndividual(id, numero);
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    prepararGestion(elemento);
                }
            });
            return;
        }

        prepararGestion(elemento);

    } catch (error) {
        console.error("Error al auditar la aduana de caja en La Jama:", error);
    }
}

function prepararGestion(elemento) {
    if (!elemento) return;

    const id          = elemento.getAttribute('data-id');
    currentMesaNumero = elemento.getAttribute('data-numero');
    currentPedidoId   = elemento.getAttribute('data-pedido-id');
    currentMesaId     = id;

    const pedidoEstado  = elemento.getAttribute('data-pedido-estado');
    const esUnificada   = elemento.classList.contains('unificada');
    const esTarjetaEstirada = elemento.classList.contains('tarjeta-unificada');
    const esPadre       = elemento.getAttribute('data-es-padre') === 'SI' || esTarjetaEstirada;

    renderizarControlesModal(esPadre, esUnificada, pedidoEstado, elemento);
    cargarDetalleComandaAsincrono(pedidoEstado);

    if (mesaModal) mesaModal.show();
}

function evaluarBotonConfirmarPago() {
    const checkboxesMarcados = document.querySelectorAll('.chk-mesa-confirmar:checked');
    const btnDesocupar = document.getElementById('btnDesocupar');
    if (!btnDesocupar) return;

    if (checkboxesMarcados.length > 0) {
        btnDesocupar.classList.remove('disabled');
        btnDesocupar.disabled = false;

        let subtotalElegido = 0;
        checkboxesMarcados.forEach(cb => {
            subtotalElegido += parseFloat(cb.getAttribute('data-precio') || 0);
        });
        const txtElegido = document.getElementById('txt-subtotal-elegido');
        if (txtElegido) txtElegido.innerText = subtotalElegido.toFixed(2);
    } else {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        const txtElegido = document.getElementById('txt-subtotal-elegido');
        if (txtElegido) txtElegido.innerText = "0.00";
    }
}

function toggleSeleccionarTodosLosPlatos() {
    // 🌟 REGLA RECTIFICADA EN SELECCIONADOR: Captura solo checkboxes que verdaderamente existan y estén activos en el DOM (excluyendo vacíos por Enviado)
    const checkboxesActivos = Array.from(document.querySelectorAll('.chk-mesa-confirmar'));
    const btn = document.getElementById('btnSeleccionarTodo');

    if (checkboxesActivos.length === 0) {
        AppUtils.showNotification("No hay platos disponibles en estados cobrables para seleccionar.", "warning");
        return;
    }

    const todosMarcados = checkboxesActivos.every(cb => cb.checked);
    checkboxesActivos.forEach(cb => { cb.checked = !todosMarcados; });

    if (btn) {
        btn.innerHTML = !todosMarcados
            ? `<i class="bi bi-x-circle me-1"></i> Desmarcar todo`
            : `<i class="bi bi-check-all me-1"></i> Seleccionar todo`;
    }
    evaluarBotonConfirmarPago();
}

function validarDesocupar() {
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
    fetch('/admin/mesas/precuenta/' + currentMesaNumero)
        .then(res => {
            AppUtils.showLoading(false);
            if (!res.ok) return;
            return res.json();
        })
        .then(data => {
            if (!data) return;
            const preferencia = data.preferenciaComprobante || 'BOLETA';
            const documento   = data.documentoCliente || '';
            inicializarFlujoCaja(data.montoTotal, currentMesaNumero, preferencia, documento);
            if (mesaModal)        mesaModal.hide();
            if (facturacionModal) facturacionModal.show();
        })
        .catch(error => {
            AppUtils.showLoading(false);
            console.error("Error al transferir control al módulo de cobros:", error);
        });
}

function irAMenu() {
    if (currentMesaId) {
        let url = '/admin/mesero/nuevo?mesaId=' + currentMesaId;
        if (currentPedidoId) url += '&pedidoId=' + currentPedidoId;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('embed') === 'true') url += '&embed=true';

        window.location.href = url;
    }
}