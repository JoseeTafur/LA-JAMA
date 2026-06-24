// =======================================================
// GESTIÓN DE RESERVAS MASIVAS E INDIVIDUALES
// =======================================================
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

    document.querySelectorAll(`${contenedorId} .mesa-box`).forEach(box => {
        const pedidoEstado = box.getAttribute('data-pedido-estado');
        if (box.classList.contains('ocupada') || box.classList.contains('unificada')
            || (pedidoEstado && pedidoEstado !== 'NINGUNO')) {
            box.style.opacity       = "0.3";
            box.style.pointerEvents = "none";
        } else {
            box.querySelector(".checkbox-seleccion-reserva-masiva")?.classList.remove("d-none");
        }
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
        ? `Se guardarán estas ${idsMesas.length} mesas en custodia.`
        : `Estas ${idsMesas.length} mesas volverán a estar libres en el salón ordinario.`;
    const endpoint    = vistaActual === 'salon'
        ? '/admin/mesas/api/trasladar-a-reserva-masivo'
        : '/admin/mesas/api/quitar-de-reserva-masivo';

    AppUtils.showConfirmationDialog({
        title: tituloTxt, text: msgTxt,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, procesar bloque'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            const params = new URLSearchParams();
            idsMesas.forEach(id => params.append("idsMesas", id));

            const res = await fetch(window.location.origin + endpoint, { method: "POST", body: params });
            AppUtils.showLoading(false);

            if (res.ok) {
                AppUtils.showNotification("Plano actualizado correctamente en bloque", "success");

                checks.forEach(c => {
                    const box = c.closest('.mesa-box');
                    if (box) {
                        const num      = box.getAttribute('data-numero');
                        const nuevoEst = vistaActual === 'salon' ? 'reservada' : 'disponible';
                        actualizarEstadoMesaEnPlano(num, nuevoEst, '', 'NINGUNO');
                    }
                });

                // Auditoría del panel de reservas
                const contenedorReservas = document.getElementById('contenedor-mesas-reservadas-pestaña');
                if (contenedorReservas) {
                    const totalMesas      = contenedorReservas.querySelectorAll('.mesa-box').length;
                    let avisoReservaVacio = document.getElementById('reserva-vacia-aviso');

                    if (totalMesas === 0) {
                        if (!avisoReservaVacio) {
                            contenedorReservas.insertAdjacentHTML('afterend', `
                                <div class="text-center py-5 animate__animated animate__fadeIn" id="reserva-vacia-aviso">
                                    <i class="bi bi-calendar-x text-muted" style="font-size: 4rem;"></i>
                                    <h5 class="fw-bold text-muted mt-3">No hay mesas en custodia de reserva</h5>
                                    <p class="text-muted small">Asigna bloques de mesas desde la pestaña "Vista Salón" para resguardarlas.</p>
                                </div>`);
                        }
                    } else {
                        if (avisoReservaVacio) avisoReservaVacio.remove();
                    }
                }

                cancelarModoReservaMasiva();
            } else {
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
