// =========================================================================
// 💎 LA JAMA MASTER - MOTOR DE UNIFICACIÓN Y DESFRAGMENTACIÓN EN CALIENTE - unificacion.js
// =========================================================================

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

function procesarUnificacionDirecta() {
    const checks = document.querySelectorAll(".check-salon-unir:checked");
    if (checks.length === 0) {
        AppUtils.showNotification("Por favor, selecciona al menos una mesa en el plano.", "warning");
        return;
    }
    const idsHijas     = Array.from(checks).map(c => c.value);
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
        idsHijas.forEach(id => params.append("idsMesasHijas[]", id));

        try {
            const res = await fetch("/admin/mesas/unificar", { method: "POST", body: params });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesas unificadas correctamente", "success");

                const tarjetaPadreDOM = document.querySelector(`[data-id="${currentMesaId}"]`);
                if (tarjetaPadreDOM) tarjetaPadreDOM.setAttribute('data-es-padre', 'SI');

                actualizarEstadoMesaEnPlano(currentMesaNumero, 'unificada', currentPedidoId, 'AGRUPADO');

                checks.forEach(c => {
                    const cajaHijaDOM = c.closest('.mesa-box');
                    if (cajaHijaDOM) {
                        cajaHijaDOM.setAttribute('data-es-padre', 'NO');
                        cajaHijaDOM.setAttribute('data-id-mesa-padre', currentMesaId);
                        actualizarEstadoMesaEnPlano(cajaHijaDOM.getAttribute('data-numero'), 'unificada', null, 'NINGUNO');
                    }
                });

                actualizarPanelGruposUnificados(currentMesaNumero, numerosHijas, 'AGRUPADO', currentPedidoId);
                cancelarModoUnificacion();
            } else {
                const errorTxt = await res.text();
                AppUtils.showNotification(errorTxt || "No se pudo unificar las mesas", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al procesar la unificación masiva en caliente:", error);
        }
    });
}

function actualizarPanelGruposUnificados(numeroMesaPadre, numerosHijasArray, pedidoEstado = 'NINGUNO', pedidoId = '') {
    const contenedor = document.getElementById('contenedor-tarjetas-unificadas');
    if (!contenedor) return;

    const avisoVacio = document.getElementById('grupo-vacio-aviso');
    if (avisoVacio) avisoVacio.remove();

    let claseCromatica = 'disponible';
    let iconoClase     = 'bi-person-check-fill';

    if (pedidoEstado === 'EN_COCINA' || pedidoEstado === 'PENDIENTE') {
        claseCromatica = 'ocupada';
        iconoClase     = 'bi-cup-hot-fill';
    } else if (pedidoEstado === 'LISTO_PARA_RECOGER') {
        claseCromatica = 'lista-para-recoger';
        iconoClase     = 'bi-bell-fill';
    } else if (pedidoEstado === 'LISTO_PARA_PAGAR') {
        claseCromatica = 'lista-para-pagar';
    }

    let badgesHijasHTML = '';
    numerosHijasArray.forEach(num => {
        badgesHijasHTML += `<span class="badge bg-dark bg-opacity-25 text-dark rounded-pill px-2 py-1 fs-6 ms-1">#${num}</span>`;
    });

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

    contenedor.insertAdjacentHTML('afterbegin', nuevaTarjetaHTML);
    actualizarContadorBadgePestaña();
}

function actualizarContadorBadgePestaña() {
    const totalTarjetas = document.querySelectorAll('#contenedor-tarjetas-unificadas .tarjeta-unificada').length;
    const badgePestaña  = document.querySelector('.radio-inputs-jama label:nth-child(2) .badge');
    if (badgePestaña) {
        if (totalTarjetas > 0) {
            badgePestaña.innerText = totalTarjetas;
            badgePestaña.classList.remove('d-none');
        } else {
            badgePestaña.classList.add('d-none');
        }
    }
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

// ─── 🚀 BOTÓN DESAGRUPAR TODO: REFACTORIZADO Y BLINDADO EN VIVO (SIN F5) ───
function procesarDesfragmentacionGrupo() {
    if (!currentMesaId) return;

    // 1. Extraemos dinámicamente los números de las mesas hijas desde los badges antes de disolver el grupo
    const tarjetaGrupo = document.querySelector(`#contenedor-tarjetas-unificadas [data-numero="${currentMesaNumero}"]`);
    let numerosHijas = [];
    if (tarjetaGrupo) {
        tarjetaGrupo.querySelectorAll('.badge').forEach(badge => {
            const numTexto = badge.innerText.replace('#', '').trim();
            if (numTexto && numTexto !== currentMesaNumero) {
                numerosHijas.push(numTexto);
            }
        });
    }

    AppUtils.showConfirmationDialog({
        title: '¿Desagrupar Todo el Bloque?',
        text: 'Se disolverá el grupo de mesas colectivas de forma inmediata.',
        icon: 'warning',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, desagrupar todo'
    }, async function () {
        AppUtils.showLoading(true);
        try {
            // Detectamos en qué entorno de pestaña se encuentra operando el mesero (Salón o Reservas)
            const vistaActual = document.getElementById('vista-salon').classList.contains('d-none') ? 'reservas' : 'salon';

            // 🛡️ ACTIVACIÓN DEL ESCUDO ANTI-WEBSOCKET EN LA MESA PADRE
            const tarjetaPadreDOM = document.getElementById(`mesa-card-${currentMesaId}`) || document.querySelector(`.mesa-box[data-numero="${currentMesaNumero}"]`);
            if (tarjetaPadreDOM) {
                tarjetaPadreDOM.setAttribute('data-bloqueo-reserva-live', 'true');
            }

            // 🛡️ ACTIVACIÓN DEL ESCUDO EN CADA UNA DE LAS MESAS HIJAS ENCONTRADAS
            let tarjetasHijasDOM = [];
            numerosHijas.forEach(num => {
                const cajaHijaDOM = document.querySelector(`.mesa-box[data-numero="${num}"]`);
                if (cajaHijaDOM) {
                    cajaHijaDOM.setAttribute('data-bloqueo-reserva-live', 'true');
                    tarjetasHijasDOM.push(cajaHijaDOM);
                }
            });

            const res = await fetch(`/admin/mesas/desagrupar-grupo/${currentMesaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            AppUtils.showLoading(false);

            if (res.ok) {
                const dataText = await res.text();

                if (dataText.includes("éxito")) {
                    AppUtils.showNotification("Grupo disuelto con éxito", "success");

                    // Remoción limpia de la tarjeta colectiva del panel lateral
                    if (tarjetaGrupo) {
                        tarjetaGrupo.remove();
                        actualizarContadorBadgePestaña();
                    }

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

                    // ─── 🛠️ RE-CONSTRUCCIÓN SÍNCRONA COMPLETA (BYPASS DEL F5) ───

                    // A. Restauración milimétrica de la Mesa Padre
                    if (tarjetaPadreDOM) {
                        tarjetaPadreDOM.setAttribute('data-es-padre', 'NO');
                        tarjetaPadreDOM.removeAttribute('data-id-mesa-padre');

                        const pId = tarjetaPadreDOM.getAttribute('data-pedido-id') || '';
                        const pEst = tarjetaPadreDOM.getAttribute('data-pedido-estado') || 'NINGUNO';
                        const tienePedidoPadre = pId !== '' && pId !== 'null' && pEst !== 'NINGUNO';

                        let colorPadre = 'disponible';
                        let iconoPadre = (vistaActual === 'reservas') ? 'bi-calendar-check-fill' : 'bi-cup-hot-fill';

                        if (tienePedidoPadre) {
                            if (tarjetaPadreDOM.classList.contains('lista-para-recoger')) { colorPadre = 'lista-para-recoger'; iconoPadre = 'bi-bell-fill'; }
                            else if (tarjetaPadreDOM.classList.contains('lista-para-pagar')) { colorPadre = 'lista-para-pagar'; iconoPadre = 'bi-person-check-fill'; }
                            else { colorPadre = 'ocupada'; iconoPadre = 'bi-cup-hot-fill'; }
                        }

                        tarjetaPadreDOM.className = `mesa-box shadow-sm ${colorPadre}`;
                        const iconI = tarjetaPadreDOM.querySelector('.mesa-icon-wrapper i');
                        if (iconI) iconI.className = `bi ${iconoPadre}`;

                        if (typeof actualizarEstadoMesaEnPlano === 'function') {
                            actualizarEstadoMesaEnPlano(currentMesaNumero, colorPadre, pId !== '' ? pId : null, pEst);
                        }
                    }

                    // B. Restauración individual de cada una de las Mesas Hijas
                    tarjetasHijasDOM.forEach(hijaDOM => {
                        hijaDOM.setAttribute('data-es-padre', 'NO');
                        hijaDOM.removeAttribute('data-id-mesa-padre');

                        const hId = hijaDOM.getAttribute('data-pedido-id') || '';
                        const hEst = hijaDOM.getAttribute('data-pedido-estado') || 'NINGUNO';
                        const tienePedidoHija = hId !== '' && hId !== 'null' && hEst !== 'NINGUNO';

                        let colorHija = 'disponible';
                        let iconoHija = (vistaActual === 'reservas') ? 'bi-calendar-check-fill' : 'bi-cup-hot-fill';

                        if (tienePedidoHija) {
                            if (hijaDOM.classList.contains('lista-para-recoger')) { colorHija = 'lista-para-recoger'; iconoHija = 'bi-bell-fill'; }
                            else if (hijaDOM.classList.contains('lista-para-pagar')) { colorHija = 'lista-para-pagar'; iconoHija = 'bi-person-check-fill'; }
                            else { colorHija = 'ocupada'; iconoHija = 'bi-cup-hot-fill'; }
                        }

                        // Re-establecemos clases e iconos correspondientes según la pestaña activa
                        hijaDOM.className = `mesa-box shadow-sm ${colorHija}`;
                        const iconI = hijaDOM.querySelector('.mesa-icon-wrapper i');
                        if (iconI) iconI.className = `bi ${iconoHija}`;

                        if (typeof actualizarEstadoMesaEnPlano === 'function') {
                            actualizarEstadoMesaEnPlano(hijaDOM.getAttribute('data-numero'), colorHija, hId !== '' ? hId : null, hEst);
                        }
                    });

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

            // 🛡️ LIBERACIÓN PROGRESIVA DE LOS CANDADOS PROTECTORES DE RED
            setTimeout(() => {
                if (tarjetaPadreDOM) tarjetaPadreDOM.removeAttribute('data-bloqueo-reserva-live');
                tarjetasHijasDOM.forEach(hijaDOM => hijaDOM.removeAttribute('data-bloqueo-reserva-live'));
            }, 1500);

        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al intentar desagrupar bloque:", error);
        }
    });
}