// =======================================================
// MOTOR EN VIVO: REACTIVIDAD DEL PLANO DE MESAS
// =======================================================
function actualizarEstadoMesaEnPlano(numeroMesa, nuevoEstado, nuevoPedidoId, pedidoEstado) {
    const tarjeta = document.querySelector(`[data-numero="${numeroMesa}"]`);
    if (!tarjeta) return;

    tarjeta.classList.remove('disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar', 'unificada', 'reservada');

    if (nuevoPedidoId) tarjeta.setAttribute('data-pedido-id', nuevoPedidoId);
    if (pedidoEstado)  tarjeta.setAttribute('data-pedido-estado', pedidoEstado);

    const contenedorSalon    = document.querySelector('#vista-salon .grid-mesas');
    const contenedorReservas = document.querySelector('#vista-reservas .grid-mesas')
                            || document.getElementById('contenedor-mesas-reservadas-pestaña');

    // Mudanza física entre contenedores
    if (nuevoEstado === 'reservada' || nuevoEstado === 'RESERVADA') {
        tarjeta.setAttribute('data-en-reserva', 'true');
        if (contenedorReservas && !contenedorReservas.contains(tarjeta)) {
            contenedorReservas.appendChild(tarjeta);
        }
    } else if (['disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar'].includes(nuevoEstado)) {
        tarjeta.setAttribute('data-en-reserva', 'false');
        if (contenedorSalon && !contenedorSalon.contains(tarjeta)) {
            contenedorSalon.appendChild(tarjeta);
        }
    }

    // Asignación cromática
    if (nuevoEstado === 'reservada' || nuevoEstado === 'RESERVADA' || nuevoEstado === 'disponible') {
        tarjeta.classList.add('disponible');
    } else {
        tarjeta.classList.add(nuevoEstado);
    }

    // Reparación de atributos jerárquicos
    if (['disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar'].includes(nuevoEstado)) {
        tarjeta.setAttribute('data-es-padre', 'NO');
        if (nuevoEstado === 'disponible') {
            tarjeta.removeAttribute('data-id-mesa-padre');
            tarjeta.setAttribute('data-pedido-id', '');
            tarjeta.setAttribute('data-pedido-estado', 'NINGUNO');
        }
    }

    // Corrección de íconos en caliente
    const icono = tarjeta.querySelector('.mesa-icon-wrapper i');
    if (icono) {
        icono.className = "";
        if (nuevoEstado === 'unificada') {
            icono.className = "bi bi-link-45deg";
        } else if (nuevoEstado === 'lista-para-recoger') {
            icono.className = "bi bi-bell-fill";
        } else if (nuevoEstado === 'lista-para-pagar') {
            icono.className = "bi bi-person-check-fill";
        } else if (nuevoEstado === 'ocupada') {
            icono.className = "bi bi-cup-hot-fill";
        } else {
            const estaEnReservas = contenedorReservas && contenedorReservas.contains(tarjeta);
            icono.className = estaEnReservas ? "bi bi-calendar-check-fill" : "bi bi-cup-hot-fill";
        }
    }

    // Aduana del panel de reservas: mostrar/ocultar aviso vacío
    if (contenedorReservas) {
        const totalMesas     = contenedorReservas.querySelectorAll('.mesa-box').length;
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

    // Sincronización del modal si está abierto sobre esta mesa
    if (currentMesaNumero == numeroMesa && mesaModal
        && document.getElementById('modalMesa').classList.contains('show')) {

        const pedidoEstadoActual  = tarjeta.getAttribute('data-pedido-estado');
        const esPadreActual       = tarjeta.getAttribute('data-es-padre') === 'SI'
                                 || tarjeta.classList.contains('tarjeta-unificada');
        const esUnificadaActual   = tarjeta.classList.contains('unificada');

        if (nuevoPedidoId) currentPedidoId = nuevoPedidoId;

        renderizarControlesModal(esPadreActual, esUnificadaActual, pedidoEstadoActual, tarjeta);
        cargarDetalleComandaAsincrono(pedidoEstadoActual);
    }
}
