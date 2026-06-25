// =========================================================================
// 📅 LA JAMA (2026) - GESTIÓN DE RESERVAS MASIVAS E INDIVIDUALES BLINDADAS
// =========================================================================

function activarModoReservaMasiva() {
    const vistaActual = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';
    modoReservaMasivaActiva = true;

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

    // ─── 🔓 LIBERACIÓN UNIVERSAL: HABILITA SELECCIÓN PARA CUALQUIER ESTADO ───
    document.querySelectorAll(`${contenedorId} .mesa-box`).forEach(box => {
        // Removemos las líneas que opacaban (.style.opacity = "0.3") y bloqueaban los clics (.pointerEvents = "none")
        box.querySelector(".checkbox-seleccion-reserva-masiva")?.classList.remove("d-none");
    });

    actualizarContadorReservaMasiva();
}

function cancelarModoReservaMasiva() {
    modoReservaMasivaActiva = false;

    const barraSalon = document.getElementById('barre-reserva-masiva-salon');
    if (barraSalon) barraSalon.classList.add('d-none');

    const barraReservas = document.getElementById('barre-reserva-masiva-reservas');
    if (barraReservas) barraReservas.classList.add('d-none');

    document.querySelectorAll(".mesa-box").forEach(box => {
        box.style.opacity       = "1";
        box.style.pointerEvents = "auto";
        box.style.border        = "2px solid transparent";
        box.style.transform     = "none";
        const check = box.querySelector(".check-reserva-masiva");
        if (check) check.checked = false;
        box.querySelector(".checkbox-seleccion-reserva-masiva")?.classList.add("d-none");
    });

    actualizarContadorReservaMasiva();
}

function actualizarContadorReservaMasiva() {
    const vistaActual   = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';
    const contenedorId  = vistaActual === 'salon' ? '#vista-salon' : '#contenedor-mesas-reservadas-pestaña';
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
    const idsMesas    = Array.from(checks).map(c => c.value);
    const tituloTxt   = vistaActual === 'salon' ? '¿Apartar bloque para Reservas?' : '¿Liberar bloque de Reservas?';
    const msgTxt      = vistaActual === 'salon'
        ? `Se guardarán estas ${idsMesas.length} mesas en custodia de reservas.`
        : `Estas ${idsMesas.length} mesas volverán a estar libres en el salón ordinario.`;
    const endpoint    = vistaActual === 'salon'
        ? '/admin/mesas/api/trasladar-a-reserva-masivo'
        : '/admin/mesas/api/quitar-de-reserva-masivo';

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

            // ─── 🛡️ PASO 1: MAPEO PREDICTIVO Y ACTIVACIÓN DEL ESCUDO EN CADA TARJETA MESA MULTIPLE ───
            let bitacoraMesasProcesadas = [];

            checks.forEach(c => {
                const box = c.closest('.mesa-box');
                if (box) {
                    const mesaId = box.getAttribute('data-id');
                    const numMesa = box.getAttribute('data-numero');
                    const pId = box.getAttribute('data-pedido-id') || '';
                    const pEst = box.getAttribute('data-pedido-estado') || 'NINGUNO';

                    // Detectamos qué clase exacta de color de alerta tiene actualmente en la UI
                    let colorOriginal = 'disponible';
                    if (box.classList.contains('ocupada')) colorOriginal = 'ocupada';
                    if (box.classList.contains('lista-para-recoger')) colorOriginal = 'lista-para-recoger';
                    if (box.classList.contains('lista-para-pagar')) colorOriginal = 'lista-para-pagar';

                    // Activamos el candado temporal para que las ráfagas del WebSocket Stomp se estrellen
                    box.setAttribute('data-bloqueo-reserva-live', 'true');

                    bitacoraMesasProcesadas.push({
                        domElement: box,
                        id: mesaId,
                        numero: numMesa,
                        pedidoId: pId,
                        pedidoEstado: pEst,
                        claseColor: colorOriginal
                    });
                }
            });

            const res = await fetch(window.location.origin + endpoint, { method: "POST", body: params });
            AppUtils.showLoading(false);

            if (res.ok) {
                AppUtils.showNotification("Plano actualizado correctamente en bloque", "success");

                const contenedorReservas = document.getElementById('contenedor-mesas-reservadas-pestaña');

                // ─── 🚀 PASO 2: RECONSTRUCCIÓN SÍNCRONA INDIVIDUAL EN CALIENTE ───
                bitacoraMesasProcesadas.forEach(mesa => {
                    const box = mesa.domElement;

                    const tienePedidoActivo = mesa.pedidoId !== '' && mesa.pedidoId !== 'null' && mesa.pedidoId !== 'NINGUNO'
                                              && mesa.pedidoEstado !== 'NINGUNO' && mesa.pedidoEstado !== '';

                    if (vistaActual === 'salon') {
                        // CASO A: MUDANDO COMPLETO DE SALÓN A RESERVAS
                        document.getElementById('reserva-vacia-aviso')?.remove();
                        if (contenedorReservas) {
                            contenedorReservas.appendChild(box); // Traslado físico de contenedor
                        }

                        box.setAttribute('data-en-reserva', 'true');

                        if (!tienePedidoActivo) {
                            // Mesa libre -> Look gris de reserva + Calendario
                            box.className = "mesa-box shadow-sm disponible";
                            box.setAttribute('data-pedido-id', '');
                            box.setAttribute('data-pedido-estado', 'NINGUNO');

                            const iconoI = box.querySelector('.mesa-icon-wrapper i');
                            if (iconoI) iconoI.className = "bi bi-calendar-check-fill";

                            if (typeof actualizarEstadoMesaEnPlano === 'function') {
                                actualizarEstadoMesaEnPlano(mesa.numero, 'reservada', '', 'NINGUNO');
                            }
                        } else {
                            // Mesa con comanda -> Forzamos congelamiento total de sus datos y colores de alerta
                            box.className = `mesa-box shadow-sm ${mesa.claseColor}`;
                            box.setAttribute('data-pedido-id', mesa.pedidoId);
                            box.setAttribute('data-pedido-estado', mesa.pedidoEstado);

                            const iconoI = box.querySelector('.mesa-icon-wrapper i');
                            if (iconoI) {
                                if (mesa.claseColor === 'lista-para-recoger') iconoI.className = "bi bi-bell-fill";
                                else if (mesa.claseColor === 'lista-para-pagar') iconoI.className = "bi bi-person-check-fill";
                                else iconoI.className = "bi bi-cup-hot-fill";
                            }

                            if (typeof actualizarEstadoMesaEnPlano === 'function') {
                                actualizarEstadoMesaEnPlano(mesa.numero, mesa.claseColor, mesa.pedidoId, mesa.pedidoEstado);
                            }
                        }
                    } else {
                        // CASO B: DEVUELVE CUSTODIA DE RESERVAS AL SALÓN ORDINARIO
                        const contenedorGridSalon = document.getElementById('contenedor-grid-salon');
                        if (contenedorGridSalon) {
                            contenedorGridSalon.appendChild(box); // Regresa físicamente al contenedor del salón
                        }

                        box.removeAttribute('data-en-reserva');

                        if (!tienePedidoActivo) {
                            // Si regresa libre, vuelve a su icono clásico de taza de café
                            box.className = "mesa-box shadow-sm disponible";
                            box.setAttribute('data-pedido-id', '');
                            box.setAttribute('data-pedido-estado', 'NINGUNO');

                            const iconoI = box.querySelector('.mesa-icon-wrapper i');
                            if (iconoI) iconoI.className = "bi bi-cup-hot-fill";

                            if (typeof actualizarEstadoMesaEnPlano === 'function') {
                                actualizarEstadoMesaEnPlano(mesa.numero, 'disponible', '', 'NINGUNO');
                            }
                        } else {
                            // Si regresa con consumo, mantiene el color y comanda intactos
                            box.className = `mesa-box shadow-sm ${mesa.claseColor}`;
                            box.setAttribute('data-pedido-id', mesa.pedidoId);
                            box.setAttribute('data-pedido-estado', mesa.pedidoEstado);

                            const iconoI = box.querySelector('.mesa-icon-wrapper i');
                            if (iconoI) {
                                if (mesa.claseColor === 'lista-para-recoger') iconoI.className = "bi bi-bell-fill";
                                else if (mesa.claseColor === 'lista-para-pagar') iconoI.className = "bi bi-person-check-fill";
                                else iconoI.className = "bi bi-cup-hot-fill";
                            }

                            if (typeof actualizarEstadoMesaEnPlano === 'function') {
                                actualizarEstadoMesaEnPlano(mesa.numero, mesa.claseColor, mesa.pedidoId, mesa.pedidoEstado);
                            }
                        }
                    }
                });

                _auditarPanelReservasVacio();
                cancelarModoReservaMasiva();
            } else {
                AppUtils.showNotification("Error al procesar el lote de mesas", "error");
            }

            // ─── 🛡️ PASO 3: LIBERACIÓN CONTROLADA POST-ONDA DE RED ───
            setTimeout(() => {
                bitacoraMesasProcesadas.forEach(mesa => {
                    if (mesa.domElement) mesa.domElement.removeAttribute('data-bloqueo-reserva-live');
                });
            }, 1500);

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

        const res = await fetch(window.location.origin + '/admin/mesas/api/quitar-de-reserva-masivo', {
            method: 'POST',
            body: params
        });
        AppUtils.showLoading(false);

        if (res.ok) {
            AppUtils.showNotification(`Mesa #${numeroMesa} devuelta al salón de venta libre.`, "success");
            actualizarEstadoMesaEnPlano(numeroMesa, 'disponible', '', 'NINGUNO');
        } else {
            AppUtils.showNotification("No se pudo liberar la mesa.", "error");
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error al quitar custodia individual:", error);
    }
}

// =========================================================================
// 📅 MUDAR MESA AL MÓDULO DE RESERVAS (BLINDAJE DE COMANDAS CONTRA WEBSOCKETS)
// =========================================================================
async function transferirMesaModuloReservas() {
    if (!currentMesaId || !currentMesaNumero) {
        AppUtils.showNotification("⚠️ Error: Foco de mesa no identificado de forma segura.", "error");
        return;
    }

    try {
        if (mesaModal) {
            mesaModal.hide();
        } else {
            const bsModal = bootstrap.Modal.getInstance(document.getElementById('modalMesa'));
            if (bsModal) bsModal.hide();
        }
    } catch (e) {
        console.warn("Limpieza manual de modal:", e);
    }

    const tarjetaMesaDOM = document.getElementById(`mesa-card-${currentMesaId}`);

    let prePedidoId = '';
    let prePedidoEstado = 'NINGUNO';
    let preClaseColor = 'disponible';
    let preIconoPrevisto = 'bi-calendar-check-fill';

    if (tarjetaMesaDOM) {
        // 🔒 CAPTURA SEGURA PRE-MUDANZA EN CLIENTE
        prePedidoId = tarjetaMesaDOM.getAttribute('data-pedido-id') || '';
        prePedidoEstado = tarjetaMesaDOM.getAttribute('data-pedido-estado') || 'NINGUNO';

        const tienePedidoActivo = prePedidoId !== '' && prePedidoId !== 'null' && prePedidoId !== 'NINGUNO'
                                  && prePedidoEstado !== 'NINGUNO' && prePedidoEstado !== '';

        if (tienePedidoActivo) {
            if (tarjetaMesaDOM.classList.contains('lista-para-recoger')) {
                preClaseColor = 'lista-para-recoger';
                preIconoPrevisto = 'bi-bell-fill';
            } else if (tarjetaMesaDOM.classList.contains('lista-para-pagar')) {
                preClaseColor = 'lista-para-pagar';
                preIconoPrevisto = 'bi-person-check-fill';
            } else {
                preClaseColor = 'ocupada';
                preIconoPrevisto = 'bi-cup-hot-fill';
            }
        }
    }

    console.log(
        `%c🔮 [LA JAMA PRE-FLUX AUDIT] Mapeando Mesa N° #${currentMesaNumero} %c\n` +
        `├─ ID Interno Mesa: ${currentMesaId}\n` +
        `├─ Comanda Encontrada: ${prePedidoId}\n` +
        `├─ Estado en Base de Datos: ${prePedidoEstado}\n` +
        `├─ Color de Alerta Destino: ${preClaseColor}\n` +
        `└─ Ícono Vectorial Destino: ${preIconoPrevisto}`,
        "color: #ffffff; background: #1B3A2C; font-weight: bold; padding: 4px; border-radius: 4px;",
        "color: #fca876; font-weight: bold;"
    );

    AppUtils.showConfirmationDialog({
        title: `¿Mudar Mesa #${currentMesaNumero} a Reservas?`,
        text: `Esta mesa se pondrá en custodia de reservas. Si tiene pedidos activos, su comanda y estado se conservarán de manera persistente.`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, trasladar custodia'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("idsMesas", currentMesaId);

            // 🛡️ EL ESCUDO: Activamos un flag de control supremo en el DOM.
            // Esto le indica a la función del STOMP WebSocket que ignore cualquier vaciado contable.
            if (tarjetaMesaDOM) {
                tarjetaMesaDOM.setAttribute('data-bloqueo-reserva-live', 'true');
            }

            const res = await fetch(window.location.origin + '/admin/mesas/api/trasladar-a-reserva-masivo', {
                method: "POST",
                body: params
            });
            AppUtils.showLoading(false);

            if (res.ok) {
                AppUtils.showNotification(`Mesa #${currentMesaNumero} mudada con éxito al lote de reservas.`, "success");

                const contenedorReservas = document.getElementById('contenedor-mesas-reservadas-pestaña');

                if (tarjetaMesaDOM && contenedorReservas) {
                    const tienePedidoActivo = prePedidoId !== '' && prePedidoId !== 'null' && prePedidoId !== 'NINGUNO'
                                              && prePedidoEstado !== 'NINGUNO' && prePedidoEstado !== '';

                    // 🔄 TRASLADO AL CONTENEDOR DE RESERVAS
                    document.getElementById('reserva-vacia-aviso')?.remove();
                    contenedorReservas.appendChild(tarjetaMesaDOM);

                    if (!tienePedidoActivo) {
                        tarjetaMesaDOM.className = "mesa-box shadow-sm disponible";
                        tarjetaMesaDOM.setAttribute('data-pedido-id', '');
                        tarjetaMesaDOM.setAttribute('data-pedido-estado', 'NINGUNO');

                        const iconoI = tarjetaMesaDOM.querySelector('.mesa-icon-wrapper i');
                        if (iconoI) iconoI.className = "bi bi-calendar-check-fill";
                    } else {
                        // Forzamos el congelamiento total pase lo que pase en las transmisiones del broker Stomp
                        tarjetaMesaDOM.className = `mesa-box shadow-sm ${preClaseColor}`;
                        tarjetaMesaDOM.setAttribute('data-pedido-id', prePedidoId);
                        tarjetaMesaDOM.setAttribute('data-pedido-estado', prePedidoEstado);

                        const iconoI = tarjetaMesaDOM.querySelector('.mesa-icon-wrapper i');
                        if (iconoI) iconoI.className = preIconoPrevisto;
                    }

                    tarjetaMesaDOM.setAttribute('data-en-reserva', 'true');
                    _auditarPanelReservasVacio();
                }

                // ── 🧭 TRANSICIÓN LÍQUIDA DE PESTAÑA ──
                setTimeout(() => {
                    const radioReservas = document.querySelector('input[name="vista-mesas"][value="reservas"]');
                    if (radioReservas) {
                        radioReservas.checked = true;
                        if (typeof alternarVistaMesas === 'function') alternarVistaMesas('reservas');
                    }
                }, 300);

                // 🛡️ LIBERACIÓN SEGURA DEL ESCUDO: Quitamos el candado una vez que se disipó la onda de red del WebSocket
                setTimeout(() => {
                    if (tarjetaMesaDOM) tarjetaMesaDOM.removeAttribute('data-bloqueo-reserva-live');
                }, 1500);

            } else {
                if (tarjetaMesaDOM) tarjetaMesaDOM.removeAttribute('data-bloqueo-reserva-live');
                AppUtils.showNotification("Error de persistencia: El servidor denegó la custodia.", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            if (tarjetaMesaDOM) tarjetaMesaDOM.removeAttribute('data-bloqueo-reserva-live');
            console.error("Error crítico en transferirMesaModuloReservas:", error);
            AppUtils.showNotification("❌ Fallo de conexión con la API de La Jama", "error");
        }
    });
}

function _auditarPanelReservasVacio() {
    const contenedorReservas = document.getElementById('contenedor-mesas-reservadas-pestaña');
    if (!contenedorReservas) return;

    const totalMesas      = contenedorReservas.querySelectorAll('.mesa-box').length;
    const avisoExistente  = document.getElementById('reserva-vacia-aviso');

    if (totalMesas === 0) {
        if (!avisoExistente) {
            contenedorReservas.insertAdjacentHTML('afterend', `
                <div class="text-center py-5 animate__animated animate__fadeIn" id="reserva-vacia-aviso">
                    <i class="bi bi-calendar-x text-muted" style="font-size: 4rem;"></i>
                    <h5 class="fw-bold text-muted mt-3">No hay mesas en custodia de reserva</h5>
                    <p class="text-muted small">Asigna bloques de mesas desde la pestaña "Vista Salón" para resguardarlas.</p>
                </div>`);
        }
    } else {
        if (avisoExistente) avisoExistente.remove();
    }
}

// =========================================================================
// 🔓 DISPARADOR RECOLECTOR PARA LIBERAR MESA DIRECTAMENTE DESDE EL MODAL
// =========================================================================
function ejecutarLiberacionIndividualDesdeModal() {
    if (!currentMesaId || !currentMesaNumero) return;

    // Cerramos de forma segura el modal operativo de la mesa
    if (typeof mesaModal !== 'undefined' && mesaModal) {
        mesaModal.hide();
    }

    // Ejecutamos tu función asíncrona nativa de liberación individual
    // Nota: Esta función ya actualiza la BD en Railway y cambia el plano visual a 'disponible' en vivo
    procesarQuitarMesaDeReservaIndividual(currentMesaId, currentMesaNumero);
}