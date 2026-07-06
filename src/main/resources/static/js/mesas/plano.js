// =======================================================
// MOTOR EN VIVO: REACTIVIDAD DEL PLANO DE MESAS
// =======================================================
function actualizarEstadoMesaEnPlano(numeroMesa, nuevoEstado, nuevoPedidoId, pedidoEstado) {
    const tarjeta = document.querySelector(`[data-numero="${numeroMesa}"]`);
    if (!tarjeta) return;

    // 🛡️ CANDADO DE UNIFICACIÓN INTEGRAL: Si la tarjeta es o era parte de un grupo,
    // e intentan enviarle un estado ordinario (disponible, ocupada, etc.), ignoramos el cambio de color
    const esUnificadaActual = tarjeta.classList.contains('unificada') ||
                             tarjeta.getAttribute('data-es-padre') === 'SI' ||
                             tarjeta.getAttribute('data-id-mesa-padre') != null;

    if (esUnificadaActual && nuevoEstado !== 'unificada' && nuevoEstado !== 'disponible') {
        console.log(`🛡️ [La Jama Web Broker] Bloqueando alteración cromática para Mesa Unificada N° #${numeroMesa}`);
        // Actualizamos los ID relacionales en segundo plano para no perder consistencia
        if (nuevoPedidoId) tarjeta.setAttribute('data-pedido-id', nuevoPedidoId);
        if (pedidoEstado)  tarjeta.setAttribute('data-pedido-estado', pedidoEstado);
        return; // 🛑 Salimos del hilo, protegemos el color morado
    }

    // [Abajo continúa el resto de tu código original de plano.js intacto...]
    const tarjetaDOM = document.querySelector(`.mesa-box[data-numero="${numeroMesa}"]`);
    if (tarjetaDOM && tarjetaDOM.getAttribute('data-bloqueo-reserva-live') === 'true') {
        return;
    }

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

        const esPadreAntes = tarjeta.getAttribute('data-es-padre') === 'SI';
        if (!esPadreAntes) {
            tarjeta.setAttribute('data-es-padre', 'NO');
        }

        if (nuevoEstado === 'disponible') {
            // Si es Padre, NO le removemos sus atributos de control grupal, solo limpiamos la comanda
            if (!esPadreAntes) {
                tarjeta.removeAttribute('data-id-mesa-padre');
            }
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

            // Actualizamos las variables globales en caliente basándonos en lo que dictó el WebSocket
            if (nuevoPedidoId) currentPedidoId = nuevoPedidoId;

            const estadoLogisticoActual = pedidoEstado || tarjeta.getAttribute('data-pedido-estado') || 'NINGUNO';
            const esPadreActual       = tarjeta.getAttribute('data-es-padre') === 'SI' || tarjeta.classList.contains('tarjeta-unificada');
            const esUnificadaActual   = tarjeta.classList.contains('unificada');

            // Renderizamos los botones de control (como "Entregar") según la nueva realidad de la mesa
            renderizarControlesModal(esPadreActual, esUnificadaActual, estadoLogisticoActual, tarjeta);

            // Ejecutamos la llamada asíncrona para pintar los platos en gris (pagados) o actualizar sus badges a "Listo"
            cargarDetalleComandaAsincrono(estadoLogisticoActual);
        }
}
