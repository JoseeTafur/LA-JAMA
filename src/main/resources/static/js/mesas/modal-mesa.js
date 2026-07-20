// =========================================================================
// 💎 LA JAMA MASTER - GESTIÓN OPERATIVA DE COMANDAS Y CONTROLES DE MESA - modal-mesa.js
// =========================================================================

// ─── 1. CARGADOR ASÍNCRONO DE PRECUENTAS Y SEGMENTACIÓN DE PAGOS (CORREGIDO) ───
function cargarDetalleComandaAsincrono(pedidoEstado) {
    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos       = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal       = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio        = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal     = document.getElementById('panel-subtotal-modal');
    const badgeTicket       = document.getElementById('badge-ticket');

    const tarjetaMesaDOM = document.getElementById(`mesa-card-${currentMesaId}`);

    const esPadreGrupo   = tarjetaMesaDOM ? tarjetaMesaDOM.getAttribute('data-es-padre') === 'SI' : false;
    const esUnificada    = tarjetaMesaDOM ? (tarjetaMesaDOM.classList.contains('unificada') ||
                            tarjetaMesaDOM.getAttribute('data-id-mesa-padre') != null ||
                            esPadreGrupo) : false;

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                if (data.idPedido) {
                    currentPedidoId = data.idPedido;
                }

                if (txtSubtotal) txtSubtotal.innerText = (data.montoTotal != null ? data.montoTotal : 0.0).toFixed(2);
                if (listaPlatos) listaPlatos.innerHTML = "";

                const ticketImpreso = data.ticketImpresoCocina === true || data.ticketImpreso === true;
                if (badgeTicket) badgeTicket.classList.toggle('d-none', !ticketImpreso);

                const platosArray = data.listaDetalles || data.detalles || [];

const tienePlatosPorPagar = platosArray.some(d => !d.pagado);
                const tienePlatosPorEntregar = platosArray.some(d => !d.canceladoPorCliente && d.cocinado && !d.entregado);
                const tienePlatosEnCocina = platosArray.some(d => !d.canceladoPorCliente && !d.cocinado);

                const btnCambiarMesaActivo = document.getElementById('btnCambiarMesa');
                const btnDividirComandaActiva = document.getElementById('btnDividirComanda');

                if (btnCambiarMesaActivo && btnDividirComandaActiva) {
                    // 🛡️ ALINEACIÓN MATRICIAL TOTAL CON EL BACKEND
                    // Un plato es legítimamente movible si NO es merma y NO está "pagado y entregado" (consumo cerrado)
                    const platosMovibles = platosArray.filter(d => !d.canceladoPorCliente && !(d.pagado && d.entregado));
                    const tieneElementosMovibles = platosMovibles.length > 0;

                    // 🎯 REGLA DE NEGOCIO: si solo queda 1 plato movible, se fuerza el uso de
                    // "Dividir Comanda" (que en este caso mueve el único plato igual que un traslado total,
                    // pero exige selección explícita vía checkbox en vez del traslado ciego de "Cambiar Mesa").
                    const soloUnPlatoMovible = platosMovibles.length === 1;

                    // "Cambiar Mesa" se habilita solo si hay 2+ elementos movibles
                    if (tieneElementosMovibles && !soloUnPlatoMovible) {
                        btnCambiarMesaActivo.classList.remove('disabled', 'd-none');
                        btnCambiarMesaActivo.disabled = false;
                    } else {
                        btnCambiarMesaActivo.classList.add('disabled');
                        btnCambiarMesaActivo.disabled = true;
                    }

                    // "Dividir Comanda" (Parcial) sigue activo si hay ítems en la orden
                    if (platosArray.length > 0) {
                        btnDividirComandaActiva.classList.remove('disabled', 'd-none');
                        btnDividirComandaActiva.disabled = false;
                    } else {
                        btnDividirComandaActiva.classList.add('disabled');
                        btnDividirComandaActiva.disabled = true;
                    }
                }

                // 🎯 AUTO-CIERRE OPERATIVO AUTOMÁTICO
                if (platosArray.length === 0 || (!tienePlatosPorPagar && !tienePlatosPorEntregar && !tienePlatosEnCocina)) {
                    if (tarjetaMesaDOM) {
                        tarjetaMesaDOM.classList.remove('ocupada', 'lista-para-recoger', 'lista-para-pagar');
                        tarjetaMesaDOM.classList.add('disponible');
                        tarjetaMesaDOM.setAttribute('data-pedido-id', '');
                        tarjetaMesaDOM.setAttribute('data-pedido-estado', 'NINGUNO');
                        const iconoI = tarjetaMesaDOM.querySelector('.mesa-icon-wrapper i');
                        if (iconoI) iconoI.className = "bi bi-cup-hot-fill";
                    }
                    if (avisoVacio)        avisoVacio.classList.remove('d-none');
                    if (contenedorComanda) contenedorComanda.classList.add('d-none');
                    if (panelSubtotal)     panelSubtotal.classList.add('d-none');

                    currentPedidoId = "";
                    if (mesaModal) mesaModal.hide();
                    return;
                }

                if (tarjetaMesaDOM && !esUnificada) {
                    tarjetaMesaDOM.classList.remove('disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar');
                    let claseDestino = 'ocupada';
                    let iconoDestino = 'bi bi-cup-hot-fill';

                    if (tienePlatosPorEntregar) { claseDestino = 'lista-para-recoger'; iconoDestino = 'bi bi-bell-fill'; }
                    else if (tienePlatosEnCocina) { claseDestino = 'ocupada'; iconoDestino = 'bi bi-cup-hot-fill'; }
                    else if (tienePlatosPorPagar) { claseDestino = 'lista-para-pagar'; iconoDestino = 'bi bi-person-check-fill'; }

                    tarjetaMesaDOM.classList.add(claseDestino);
                    const iconoI = tarjetaMesaDOM.querySelector('.mesa-icon-wrapper i');
                    if (iconoI) iconoI.className = `bi ${iconoDestino}`;
                    tarjetaMesaDOM.setAttribute('data-pedido-estado', tienePlatosEnCocina ? 'EN_COCINA' : 'PREPARADO');
                }

                let htmlPlatosActivos = "";
                platosArray.forEach(d => {
                    const nombreProducto = d.producto && d.producto.nombre ? d.producto.nombre : (d.nombre || "Producto");
                    let badgeColor = 'bg-primary text-white', badgeTexto = 'Enviado', estiloFila = 'background-color: #ffffff;', bordeFila = 'border-left:4px solid var(--lajama-green) !important;', nombreClaseTexto = 'text-dark';
                    if (d.canceladoPorCliente) { badgeColor = 'bg-danger text-white'; badgeTexto = 'MERMA'; estiloFila = 'background-color: #ffe5e5; opacity: 0.85;'; bordeFila = 'border-left:4px solid #dc2626 !important;'; nombreClaseTexto = 'text-danger fw-bold text-decoration-line-through'; }
                    else if (d.cocinado && d.entregado) { badgeColor = 'bg-secondary text-white'; badgeTexto = 'Entregado'; estiloFila = 'opacity: 0.65; background-color: #f3f4f6;'; bordeFila = 'border-left:4px solid #6b7280 !important;'; }
                    else if (d.cocinado) { badgeColor = 'bg-success text-white'; badgeTexto = 'Listo'; bordeFila = 'border-left:4px solid #ffc107 !important;'; }
                    else if (ticketImpreso === true || d.impresoEnCocina === true) { badgeColor = 'bg-danger text-white'; badgeTexto = 'En cocina'; }
                    let btnCheckUnitarioHTML = ''; if (d.cocinado && !d.entregado && !d.canceladoPorCliente) { btnCheckUnitarioHTML = `<button type="button" class="btn btn-sm btn-warning text-dark px-2 py-1 rounded-pill ms-1" onclick="entregarPlatoUnitario(${currentPedidoId}, ${d.id}, '${nombreProducto}')" style="font-size:0.75rem; font-weight:700;"><i class="bi bi-check2"></i> Entregar</button>`; }
                    let btnEliminarHTML = ''; if (!d.cocinado && !d.pagado && !d.canceladoPorCliente) { const esMerma = (ticketImpreso === true || d.impresoEnCocina === true) ? 'true' : 'false'; const icono = (ticketImpreso === true || d.impresoEnCocina === true) ? 'bi-exclamation-triangle-fill text-warning' : 'bi-trash3-fill text-danger'; btnEliminarHTML = `<button type="button" class="btn btn-sm btn-link p-1 ms-1" onclick="eliminarItemComanda(${currentPedidoId}, ${d.id}, '${nombreProducto}', ${esMerma})"><i class="bi ${icono} fs-5"></i></button>`; }
                    let badgeFinancieroHTML = ''; if (d.pagado) { badgeFinancieroHTML = `<span class="badge bg-light text-success border border-success rounded-pill px-2 py-1" style="font-size:0.7rem;"><i class="bi bi-cash-coin me-1"></i>Pagado</span>`; }
                    const precioSeguro = d.subtotal ? d.subtotal : (d.precioUnitario ? d.precioUnitario : 0);
                    const idCheckModalMesa = `cbx_mesa_modal_${d.id}`;
                    let checkboxHTML = '';

                    const esInamovible = (d.pagado && d.entregado) || (d.canceladoPorCliente && d.pagado);

                    if (esInamovible) {
                        checkboxHTML = `<div class="cntr" style="margin-left: 10px; opacity: 0.35; cursor: not-allowed;">
                            <input type="checkbox" id="${idCheckModalMesa}" class="hidden-xs-up chk-mesa-confirmar" value="${d.id}" data-ya-pagado="true" disabled>
                            <label for="${idCheckModalMesa}" class="cbx" style="cursor: not-allowed;"></label>
                        </div>`;
                    } else {
                        checkboxHTML = `<div class="cntr" style="margin-left: 10px;">
                            <input type="checkbox" id="${idCheckModalMesa}" class="hidden-xs-up chk-mesa-confirmar" value="${d.id}" data-precio="${precioSeguro}" data-estado-plato="${badgeTexto}" data-ya-pagado="${d.pagado}" onchange="evaluarBotonConfirmarPago()">
                            <label for="${idCheckModalMesa}" class="cbx"></label>
                        </div>`;
                    }

                    htmlPlatosActivos += `<div class="d-flex justify-content-between align-items-center p-2 rounded border item-plato-comanda mb-2 shadow-sm" data-estado="${badgeTexto}" data-precio="${d.subtotal || 0}" style="font-size:0.9rem; ${estiloFila} ${bordeFila}"><div class="d-flex align-items-center gap-2" style="max-width:50%;"><span class="badge bg-dark text-white rounded-pill fw-bold">${d.cantidad}x</span><span class="${nombreClaseTexto} fw-semibold text-truncate" style="max-width:140px;">${nombreProducto}</span></div><div class="d-flex align-items-center gap-2"><span class="text-muted small fw-bold">S/. ${precioSeguro.toFixed(2)}</span>${badgeFinancieroHTML}<span class="badge ${badgeColor} rounded-pill px-2 py-1" style="font-size:0.7rem;">${badgeTexto}</span>${btnCheckUnitarioHTML}${btnEliminarHTML}${checkboxHTML}</div></div>`;
                });

                listaPlatos.innerHTML = htmlPlatosActivos;
                if (contenedorComanda) contenedorComanda.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.remove('d-none');
                if (avisoVacio)        avisoVacio.classList.add('d-none');

                renderizarControlesModal(esPadreGrupo, esUnificada, tienePlatosEnCocina ? 'EN_COCINA' : 'PREPARADO', tarjetaMesaDOM);
            })
            .catch(err => {
                console.error("🚨 [La Jama] Error en precuenta:", err);

                // 🎯 EL DESENGANCHADOR DE ATRIBUTOS VISUALES (ANTI-ZOMBIE)
                // Si el servidor ya limpió la mesa, forzamos a la tarjeta del plano a ponerse en verde disponible
                if (tarjetaMesaDOM) {
                    tarjetaMesaDOM.classList.remove('ocupada', 'lista-para-recoger', 'lista-para-pagar', 'unificada');
                    tarjetaMesaDOM.classList.add('disponible');
                    tarjetaMesaDOM.setAttribute('data-pedido-id', '');
                    tarjetaMesaDOM.setAttribute('data-pedido-estado', 'NINGUNO');
                    const iconoI = tarjetaMesaDOM.querySelector('.mesa-icon-wrapper i');
                    if (iconoI) iconoI.className = "bi bi-cup-hot-fill";
                }

                if (avisoVacio)        avisoVacio.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.add('d-none');
                if (contenedorComanda) contenedorComanda.classList.add('d-none');

                currentPedidoId = "";
                renderizarControlesModal(false, false, 'NINGUNO', tarjetaMesaDOM);

                // 🚀 CIERRE MANDATORIO AUTOMÁTICO:
                // Ocultamos el modal en el acto para que el mozo vea el plano limpio y actualizado
                if (mesaModal) mesaModal.hide();
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

    const btnLiberarReset = document.getElementById('btnLiberarMesa');
    if (btnLiberarReset) {
        btnLiberarReset.disabled = true;
        btnLiberarReset.classList.add('disabled');
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
    const valorMermaReal = (esMerma === true || esMerma === 'true');

    const titulo   = valorMermaReal ? '¿Declarar Merma?' : '¿Eliminar de la Comanda?';
    const text     = valorMermaReal
        ? `⚠️ El ticket ya se imprimió en cocina. Si anulas "${nombreProducto}" ahora, el cliente igual lo pagará y se alertará al cocinero para detener su preparación.`
        : `¿Estás seguro de remover "${nombreProducto}" de la orden actual? Se recalculará el total.`;
    const icono    = valorMermaReal ? 'warning' : 'question';
    const textoBtn = valorMermaReal ? 'Sí, anular y alertar' : 'Sí, remover plato';

    AppUtils.showConfirmationDialog({
        title: titulo, text, icon: icono,
        confirmButtonColor: '#dc3545', confirmButtonText: textoBtn
    }, async function () {
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);
        params.append("esMerma", valorMermaReal); // 🛡️ Sincronizamos el parámetro exacto

        try {
            const res = await fetch("/admin/mesas/comanda/eliminar-item", {
                method: "POST",
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification(valorMermaReal ? "Plato anulado. Alerta enviada a cocina." : "Producto removido con éxito", "success");
                cargarDetalleComandaAsincrono("EN_PROCESO");
            } else {
                const errorText = await res.text();
                AppUtils.showNotification(errorText || "Error al anular el producto", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("💥 Error en la comunicación con el servidor:", error);
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
                if (checkbox.checked) {
                    elemento.style.border    = "3px solid #4c1d95";
                    elemento.style.transform = "scale(0.96)";
                } else {
                    elemento.style.removeProperty('border');
                    elemento.style.removeProperty('transform');
                }
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
                if (checkboxReserva.checked) {
                    elemento.style.border    = "3px solid #1B3A2C";
                    elemento.style.transform = "scale(0.96)";
                } else {
                    elemento.style.removeProperty('border');
                    elemento.style.removeProperty('transform');
                }
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
    const btnDividirComandaActiva = document.getElementById('btnDividirComanda');

    // 1. Calcular el subtotal sumando únicamente los platos que faltan cancelar
    let subtotalElegido = 0;
    checkboxesMarcados.forEach(cb => {
        if (cb.getAttribute('data-ya-pagado') === 'false') {
            subtotalElegido += parseFloat(cb.getAttribute('data-precio') || 0);
        }
    });
    const txtElegido = document.getElementById('txt-subtotal-elegido');
    if (txtElegido) txtElegido.innerText = subtotalElegido.toFixed(2);

    // 2. Controlar el botón de Dividir/Trasladar Comanda
    if (btnDividirComandaActiva) {
        if (checkboxesMarcados.length > 0) {
            btnDividirComandaActiva.classList.remove('disabled');
            btnDividirComandaActiva.disabled = false;
        }
    }

    if (!btnDesocupar) return;

    // 3. ADUANA DE CONTROL PARA EL BOTÓN DE PAGO (Desocupar)
    let tieneItemEnviado = Array.from(checkboxesMarcados).some(cb => cb.getAttribute('data-estado-plato') === 'Enviado');
    let tieneItemYaPagado = Array.from(checkboxesMarcados).some(cb => cb.getAttribute('data-ya-pagado') === 'true');

    // El botón de pagar (Caja) SOLO se activa si seleccionaron cosas que NO estén en cocina y que NO estén pagadas
    if (checkboxesMarcados.length > 0 && !tieneItemEnviado && !tieneItemYaPagado) {
        btnDesocupar.classList.remove('disabled');
        btnDesocupar.disabled = false;
        btnDesocupar.style.opacity = "1";
    } else {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        btnDesocupar.style.opacity = "0.5";
    }
}

function toggleSeleccionarTodosLosPlatos() {
    // 🎯 REPARADO: Capturamos selectivamente todo lo que NO esté deshabilitado por la aduana estricta
    const checkboxesActivos = Array.from(document.querySelectorAll('.chk-mesa-confirmar:not([disabled])'));
    const btn = document.getElementById('btnSeleccionarTodo');

    if (checkboxesActivos.length === 0) {
        AppUtils.showNotification("No hay platos disponibles en estados movibles para seleccionar.", "warning");
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

function liberarMesaManualmente() {
    if (!currentMesaNumero) return;

    AppUtils.showConfirmationDialog({
        title: '¿Liberar Mesa?',
        text: `La Mesa #${currentMesaNumero} quedará libre y disponible en el plano.`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, liberar mesa'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/liberar-manual/${currentMesaNumero}`, { method: 'POST' });
            const data = await res.json();
            AppUtils.showLoading(false);

            if (res.ok && data.success) {
                AppUtils.showNotification("Mesa liberada con éxito", "success");
                actualizarEstadoMesaEnPlano(currentMesaNumero, 'disponible', null, 'NINGUNO');
                if (mesaModal) mesaModal.hide();
            } else {
                AppUtils.showNotification(data.message || "No se pudo liberar la mesa", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al liberar mesa manualmente:", error);
        }
    });
}