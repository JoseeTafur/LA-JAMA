// =======================================================
// GESTIÓN DEL PLANO DE MESAS (CLICS) Y MODAL PRINCIPAL
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
    const filasEntregadas      = Array.from(document.querySelectorAll('#lista-platos-previsualizar [data-estado="Entregado"]'));
    const checkboxesEntregados = filasEntregadas.map(row => row.querySelector('.chk-mesa-confirmar')).filter(cb => cb !== null);
    const btn = document.getElementById('btnSeleccionarTodo');

    if (checkboxesEntregados.length === 0) {
        AppUtils.showNotification("No hay platos en estado 'Entregado' para seleccionar.", "warning");
        return;
    }

    const todosMarcados = checkboxesEntregados.every(cb => cb.checked);
    checkboxesEntregados.forEach(cb => { cb.checked = !todosMarcados; });

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
