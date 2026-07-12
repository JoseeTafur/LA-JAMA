// =======================================================
// MODAL DE ACCIÓN UNIFICADO (CAMBIAR / DIVIDIR) - acciones-mesa.js
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
    if (contenedorLista) contenedorLista.innerHTML = '<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Cargando mapa...</div>';

    const tarjetaOrigenDOM   = document.getElementById(`mesa-card-${currentMesaId}`);
    const origenEsReservada  = tarjetaOrigenDOM
        ? (tarjetaOrigenDOM.closest('#contenedor-mesas-reservadas-pestaña') !== null)
        : false;

    const selectNativo = document.getElementById('selectMesaDestino');
    if (selectNativo) {
        if (contenedorLista) contenedorLista.innerHTML = "";
        const opcionesValidas = Array.from(selectNativo.options)
            .filter(opt => opt.value !== "" && opt.text !== currentMesaNumero.toString());

        if (opcionesValidas.length === 0) {
            if (contenedorLista) contenedorLista.innerHTML = '<div class="p-3 text-center text-muted small">No hay otras mesas disponibles en el plano.</div>';
        } else {
            opcionesValidas.forEach(opt => {
                const idMesa   = opt.value;
                const numeroMesa = opt.text;
                const destinoEsReservada = opt.getAttribute('data-reserva-entorno') === 'true';
                const tarjetaMesaOriginal = document.getElementById('mesa-card-' + idMesa);

                let estaOcupada            = false;
                let esMesaHijaAgrupada     = false;
                let esMesaPadreControladora = false;

                if (tarjetaMesaOriginal) {
                    const estadoPedido = tarjetaMesaOriginal.getAttribute('data-pedido-estado');
                    estaOcupada        = (estadoPedido && estadoPedido !== 'NINGUNO');
                    const esUnificada  = tarjetaMesaOriginal.classList.contains('unificada');
                    const flagPadre    = tarjetaMesaOriginal.getAttribute('data-es-padre');
                    if (flagPadre === 'SI') {
                        esMesaPadreControladora = true;
                    } else if (esUnificada && flagPadre !== 'SI') {
                        esMesaHijaAgrupada = true;
                    }
                }

                let badgeEstado = '';
                let estiloAtributo = '';
                let deshabilitadoAttr = '';

                if (origenEsReservada !== destinoEsReservada) {
                    const mensajeBloqueo = origenEsReservada ? 'Mesa de Salón (Bloqueada)' : 'Mesa Reservada (Bloqueada)';
                    badgeEstado       = `<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill" style="font-size:0.7rem;"><i class="bi bi-lock-fill me-1"></i>${mensajeBloqueo}</span>`;
                    estiloAtributo    = 'background-color: #f8fafc; opacity: 0.45; cursor: not-allowed; border-left: 4px solid #64748b !important;';
                    deshabilitadoAttr = 'disabled';
                } else if (esMesaHijaAgrupada) {
                    badgeEstado       = '<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill" style="font-size:0.7rem;"><i class="bi bi-x-circle-fill me-1"></i>Hija (Bloqueada)</span>';
                    estiloAtributo    = 'background-color: #fef2f2; opacity: 0.55; cursor: not-allowed; border-left: 4px solid #ef4444 !important;';
                    deshabilitadoAttr = 'disabled';
                } else if (esMesaPadreControladora) {
                    badgeEstado    = '<span class="badge rounded-pill" style="font-size:0.75rem; background-color:#4c1d95; color:#fff7ed;"><i class="bi bi-link-45deg me-1"></i>Padre del Grupo</span>';
                    estiloAtributo = 'background-color: #f5f3ff; border-left: 4px solid #4c1d95 !important; font-weight:700;';
                } else if (estaOcupada) {
                    badgeEstado    = '<span class="badge bg-warning text-dark rounded-pill" style="font-size:0.7rem;"><i class="bi bi-exclamation-triangle-fill me-1"></i>Con Consumo</span>';
                    estiloAtributo = 'border-left: 4px solid #f59e0b !important;';
                } else {
                    badgeEstado    = '<span class="badge bg-success text-white rounded-pill" style="font-size:0.7rem;"><i class="bi bi-check-circle-fill me-1"></i>Libre</span>';
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
                const num = item.getAttribute('data-numero') || '';
                item.classList.toggle('d-none', !num.includes(termino));
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
    const destinoIdReal = idMesaDestino || mesaDestinoSeleccionadaId;
    if (!destinoIdReal) {
        AppUtils.showNotification("Por favor, selecciona una mesa de destino válida.", "warning");
        return;
    }

    // 🛡️ EL ESCUDO HISTÓRICO SUPREMO ANTI-ARRASTRE
    // Si la mesa contiene platos ya pagados, bloqueamos el traslado total de la orden principal
    //const filasPlatos = document.querySelectorAll('#lista-platos-previsualizar > div');
    //let tieneItemsPagados = false;

   // filasPlatos.forEach(row => {
       // if (row.innerHTML.includes('Pagado') || row.style.borderLeft.includes('rgb(22, 163, 74)')) {
         //   tieneItemsPagados = true;
      //  }
   // });

   // if (tieneItemsPagados) {
      //  AppUtils.showNotification("Esta mesa contiene platos ya pagados. Use 'Dividir Comanda' para trasladar solo los ítems pendientes.", "warning");
     //   return;
  //  }

    const itemSeleccionado = document.querySelector('.item-mesa-accion.active');
    let numeroMesaDestino  = currentMesaNumero;
    if (itemSeleccionado) {
        const numAtributo = itemSeleccionado.getAttribute('data-numero');
        if (numAtributo) numeroMesaDestino = parseInt(numAtributo);
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
            const urlParams = new URLSearchParams();
            urlParams.append("idMesaOrigen",  currentMesaId);
            urlParams.append("idMesaDestino", destinoIdReal);

            const res = await fetch(window.location.origin + '/admin/mesas/trasladar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: urlParams
            });

            if (res.ok) {
                cargarDetalleComandaAsincrono("NINGUNO");
                setTimeout(() => {
                    AppUtils.showLoading(false);
                    AppUtils.showNotification("Comanda reubicada con éxito", "success");
                    currentPedidoId = "";
                    const tarjetaOrigenDOM = document.getElementById(`mesa-card-${currentMesaId}`);
                    if (tarjetaOrigenDOM) {
                        const esOrigenPadre = tarjetaOrigenDOM.getAttribute('data-es-padre') === 'SI';
                        renderizarControlesModal(esOrigenPadre, tarjetaOrigenDOM.classList.contains('unificada'), 'NINGUNO', tarjetaOrigenDOM);
                    }
                    if (mesaModal) mesaModal.hide();
                }, 400);
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

async function confirmarDivisionComanda(idMesaDestino) {
    const checkboxesMarcados = document.querySelectorAll('.chk-mesa-confirmar:checked');
    const itemActivo         = document.querySelector('.item-mesa-accion.active');
    if (!itemActivo) return;

    const numeroMesaDestino  = parseInt(itemActivo.getAttribute('data-numero'));
    const idsDetallesAMover  = Array.from(checkboxesMarcados).map(cb => cb.value);

    // 🛡️ ADUANA PREVENTIVA LOCAL ULTRA-ESTRICTA:
    // Si por desfase del DOM asíncrono la lista está vacía, frenamos en seco.
    // Esto evita que viaje un payload corrupto al servidor y previene el Error 400/405.
    if (!idsDetallesAMover || idsDetallesAMover.length === 0) {
        if (typeof AppUtils !== 'undefined' && AppUtils.showNotification) {
            AppUtils.showNotification("⚠️ Operación cancelada: No se detectaron platos seleccionados en el DOM. Reintente.", "warning");
        } else {
            alert("⚠️ No se seleccionaron platos válidos para realizar el traslado.");
        }
        return;
    }

    AppUtils.showLoading(true);
    try {
        const urlParams = new URLSearchParams();
        urlParams.append("idMesaOrigen",      currentMesaId);
        urlParams.append("numeroMesaDestino", numeroMesaDestino);

        // Inyección multi-paramétrica limpia para Spring Boot (List<Long>)
        idsDetallesAMover.forEach(id => {
            urlParams.append("idsDetalles", id);
        });

        const res = await fetch(window.location.origin + '/admin/mesas/comanda/dividir-platos-por-numero', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams
        });

        if (res.ok) {
            cargarDetalleComandaAsincrono("EN_PROCESO");
            setTimeout(() => {
                AppUtils.showLoading(false);
                Swal.fire({
                    icon: 'success',
                    title: '¡Comanda Dividida!',
                    text: `Los platos fueron trasladados con éxito a la Mesa #${numeroMesaDestino}.`,
                    confirmButtonColor: '#1B3A2C'
                });

                const filasPlatosRestantes = document.querySelectorAll('#lista-platos-previsualizar > div').length;
                if (filasPlatosRestantes === 0) {
                    currentPedidoId = "";
                    const tarjetaOrigenDOM = document.getElementById(`mesa-card-${currentMesaId}`);
                    if (tarjetaOrigenDOM) {
                        const esOrigenPadre = tarjetaOrigenDOM.getAttribute('data-es-padre') === 'SI';
                        renderizarControlesModal(esOrigenPadre, tarjetaOrigenDOM.classList.contains('unificada'), 'NINGUNO', tarjetaOrigenDOM);
                    }
                    cargarDetalleComandaAsincrono("NINGUNO");
                }
            }, 400);
        } else {
            AppUtils.showLoading(false);
            const errorTxt = await res.text();

            // 🛡️ CAPTURA DE ERROR CONTROLADA: Mostramos la alerta flotante sin romper el hilo de ejecución
            AppUtils.showNotification(errorTxt || "Error al procesar la división de platos.", "error");
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error en split parcial asíncrono de comanda:", error);
    }
}