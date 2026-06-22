// === CONEXIÓN WEBSOCKET PARA ALERTAS DE MERMA EN TIEMPO REAL ===
var socket = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Monitor de Cocina Conectado: ' + frame);
    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        procesarAlertaCocina(notificacion.body);
    });
});

function procesarAlertaCocina(mensaje) {
    if (mensaje.includes("🚨 ALERTA DE MERMA")) {
        var audioAlarma = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
        audioAlarma.play().catch(e => console.log("Sonido bloqueado por directiva de navegador"));

        Swal.fire({
            icon: 'error',
            title: '¡DETENER PRODUCCIÓN!',
            text: mensaje,
            background: '#fff3f3',
            color: '#dc3545',
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'ENTENDIDO / LEÍDO',
            allowOutsideClick: false
        }).then(() => {
            window.location.reload();
        });
    }
}

// === CRONÓMETROS Y LOGÍSTICA ORIGINAL ===
function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(container => {
        const startAttr = container.getAttribute('data-start');
        if (!startAttr) return;

        const startTime = new Date(startAttr);
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);

        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');

        const display = container.querySelector('.timer-display');
        if (display) display.innerText = `${mins}:${secs}`;

        if (diff > 600) {
            container.classList.add('timer-urgent');
        } else {
            container.classList.remove('timer-urgent');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateTimers, 1000);
    updateTimers();

    const formulariosDespachar = document.querySelectorAll('.form-despachar');

    formulariosDespachar.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const pedidoId = form.querySelector('input[name="pedidoId"]').value;

            AppUtils.showConfirmationDialog({
                title: '¿Despachar de Fogones?',
                text: `¿Confirmas que toda la comanda caliente de la Orden #${pedidoId} está lista para salir al salón?`,
                icon: 'question',
                confirmButtonColor: '#1B3A2C',
                confirmButtonText: 'Sí, despachar'
            }, function() {
                AppUtils.showLoading(true);
                form.submit();
            });
        });
    });

    const botonesImprimir = document.querySelectorAll('a[href^="/admin/cocina/ticket"]');

    botonesImprimir.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('btn-alerta-ticket')) {
                this.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Procesando...';
                this.classList.remove('btn-danger', 'btn-alerta-ticket');
                this.classList.add('btn-secondary');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        });
    });

    setInterval(() => {
        const tarjetasVivas = document.querySelectorAll('.pedidos-grid .card-pedido');
        if (!Swal.isVisible() && tarjetasVivas.length === 0) {
            console.log("Sincronizando monitor de cocina caliente vacío en background...");
            location.reload();
        }
    }, 45000);
});

// ─── 🚀 FUNCIÓN COMPLETA ACTUALIZADA COHESIVA (CERO REFRESH) ───
function despacharItemCocina(pedidoId, detalleId, nombrePlato, elementoBoton) {
    if (elementoBoton && (elementoBoton.disabled || elementoBoton.classList.contains('processing-jama'))) {
        return;
    }

    AppUtils.showConfirmationDialog({
        title: '¿Plato Listo?',
        text: `¿Enviar "${nombrePlato}" a la barra para que el mesero lo recoja?`,
        icon: 'question',
        confirmButtonColor: '#198754',
        confirmButtonText: 'Sí, despachar'
    }, async function() {
        AppUtils.showLoading(true);

        if (elementoBoton) {
            elementoBoton.disabled = true;
            elementoBoton.classList.add('processing-jama');
            elementoBoton.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        }

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);
        params.append("tipoEstacion", "caliente");

        try {
            const res = await fetch('/admin/cocina/completar-item', {
                method: 'POST',
                body: params
            });

            if (res.ok) {
                AppUtils.showLoading(false);

                // 👨‍🍳 ALERTA EXCLUSIVA PARA EL COCINERO (CERO F5 - CERO REBOTES)
                if (window.AppUtils && AppUtils.showNotification) {
                    AppUtils.showNotification(`✅ Despacho exitoso: "${nombrePlato}" enviado a barra.`, "success");
                }

                // ── 🪐 ENTORNO DINÁMICO REACTIVO DEL DOM ──
                const contenedorPlato = elementoBoton.closest('.item-plato');
                if (contenedorPlato) {
                    contenedorPlato.classList.add('animate__animated', 'animate__fadeOutLeft');

                    setTimeout(() => {
                        const itemsListaContenedor = contenedorPlato.closest('.items-lista');
                        contenedorPlato.remove();

                        if (itemsListaContenedor && itemsListaContenedor.querySelectorAll('.item-plato').length === 0) {
                            const tarjetaComandaCompleta = document.getElementById(`pedido-${pedidoId}`);
                            if (tarjetaComandaCompleta) {
                                tarjetaComandaCompleta.classList.add('animate__animated', 'animate__zoomOut');
                                setTimeout(() => {
                                    tarjetaComandaCompleta.remove();
                                    actualizarContadorOrdenesPendientes();
                                }, 400);
                            }
                        }
                    }, 400);
                }

            } else {
                if (elementoBoton) {
                    elementoBoton.disabled = false;
                    elementoBoton.classList.remove('processing-jama');
                    elementoBoton.innerHTML = '<i class="bi bi-check2-all"></i> Despachar';
                }
                AppUtils.showLoading(false);
                AppUtils.showNotification("Error al despachar el plato", "error");
            }
        } catch (error) {
            if (elementoBoton) {
                elementoBoton.disabled = false;
                elementoBoton.classList.remove('processing-jama');
                elementoBoton.innerHTML = '<i class="bi bi-check2-all"></i> Despachar';
            }
            AppUtils.showLoading(false);
            console.error("Error en la petición asíncrona de cocina:", error);
            AppUtils.showNotification("💥 Conexión interrumpida con el microservicio", "error");
        }
    });
}

function actualizarContadorOrdenesPendientes() {
    const contadorSpan = document.querySelector('.status-badge-jama span');
    const tarjetasVivas = document.querySelectorAll('.pedidos-grid .card-pedido');

    if (contadorSpan) {
        contadorSpan.innerText = tarjetasVivas.length;
    }

    if (tarjetasVivas.length === 0) {
        const gridContenedor = document.querySelector('.pedidos-grid');
        if (gridContenedor) {
            gridContenedor.insertAdjacentHTML('beforebegin', `
                <div class="text-center py-5 mt-5 text-muted animate__animated animate__fadeIn">
                    <i class="bi bi-clipboard2-check-fill text-warning" style="font-size: 5rem; opacity: 0.8;"></i>
                    <h3 class="mt-3 fw-bold text-dark">No hay pedidos recientes</h3>
                    <p class="fs-5 text-muted">Los fogones están controlados y al día. ¡Buen trabajo equipo!</p>
                </div>
            `);
            gridContenedor.remove();
        }
    }
}