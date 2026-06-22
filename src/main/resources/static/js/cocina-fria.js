// === CONEXIÓN WEBSOCKET PARA ALERTAS DE MERMA EN TIEMPO REAL ===
var socket = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Monitor de Barra Fría Conectado: ' + frame);
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
            title: '¡DETENER PREPARACIÓN!',
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

// === CRONÓMETROS Y LOGÍSTICA ===
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
                title: '¿Despachar de Barra Fría?',
                text: `¿Confirmas que toda la orden fría (ensaladas/bebidas) del Pedido #${pedidoId} está lista para salir?`,
                icon: 'question',
                confirmButtonColor: '#0dcaf0',
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
                this.classList.remove('btn-info', 'btn-alerta-ticket');
                this.classList.add('btn-secondary');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        });
    });

    // Auto-recarga inteligente reactiva de fondo (solo si la estación está vacía)
    setInterval(() => {
        const tarjetasVivas = document.querySelectorAll('.pedidos-grid .card-pedido');
        if (!Swal.isVisible() && tarjetasVivas.length === 0) {
            console.log("Sincronizando monitor de barra fría en background...");
            location.reload();
        }
    }, 45000);
});

// =========================================================================
// 🚀 ENTORNO DINÁMICO REACTIVO: DESPACHAR INDIVIDUAL ASÍNCRONO (CERO REFRESH)
// =========================================================================
function despacharItemCocina(pedidoId, detalleId, nombrePlato, elementoBoton) {
    if (elementoBoton && (elementoBoton.disabled || elementoBoton.classList.contains('processing-jama'))) {
        return;
    }

    AppUtils.showConfirmationDialog({
        title: '¿Preparación Lista?',
        text: `¿Enviar "${nombrePlato}" al área de entrega para que el mesero lo recoja?`,
        icon: 'question',
        confirmButtonColor: '#0dcaf0',
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
        params.append("tipoEstacion", "fria");

        try {
            const res = await fetch('/admin/cocina/completar-item', {
                method: 'POST',
                body: params
            });

            if (res.ok) {
                AppUtils.showLoading(false);

                // 👨‍🍳 ALERTA LOCAL COMPACTA EXCLUSIVA PARA EL COCINERO FRÍO
                if (window.AppUtils && AppUtils.showNotification) {
                    AppUtils.showNotification(`✅ Despacho exitoso: "${nombrePlato}" enviado a barra.`, "success");
                }

                // ── 🪐 ENTORNO DINÁMICO REACTIVO DEL DOM (CERO F5) ──
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
                AppUtils.showNotification("Error al despachar la preparación", "error");
            }
        } catch (error) {
            if (elementoBoton) {
                elementoBoton.disabled = false;
                elementoBoton.classList.remove('processing-jama');
                elementoBoton.innerHTML = '<i class="bi bi-check2-all"></i> Despachar';
            }
            AppUtils.showLoading(false);
            console.error("Error en la petición asíncrona de barra fría:", error);
            AppUtils.showNotification("💥 Conexión interrumpida con el microservicio", "error");
        }
    });
}

// ── 🧠 FUNCIÓN COMPLEMENTARIA PARA RECALCULAR CONTADORES EN CALIENTE ──
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
                    <i class="bi bi-clipboard2-check-fill text-info" style="font-size: 5rem; opacity: 0.8;"></i>
                    <h3 class="mt-3 fw-bold text-dark">No hay pedidos recientes</h3>
                    <p class="fs-5 text-muted">La barra fría está totalmente al día. ¡Excelente trabajo!</p>
                </div>
            `);
            gridContenedor.remove();
        }
    }
}